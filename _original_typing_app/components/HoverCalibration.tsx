import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';

export interface HoverMetrics {
  pathDeviation: number;
  microJitter: number;
  movementSmoothness: number;
  stabilityScore: number;
}

interface HoverCalibrationProps {
  width: number;
  height: number;
  onMetricsUpdate: (metrics: HoverMetrics) => void;
  onComplete: () => void;
  onCursorPathStatus?: (onPath: boolean) => void;
  soundEnabled?: boolean;
  audioContext?: AudioContext | null;
}

// Generate a curved path as a series of points along a bezier curve
const generatePathPoints = (w: number, h: number, numPoints: number = 200): { x: number; y: number }[] => {
  const points: { x: number; y: number }[] = [];
  const cx = w / 2;
  const cy = h / 2;
  const p0 = { x: cx - 120, y: cy + 80 };
  const p1 = { x: cx - 60, y: cy - 120 };
  const p2 = { x: cx + 60, y: cy + 120 };
  const p3 = { x: cx + 120, y: cy - 80 };

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const u = 1 - t;
    const x = u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x;
    const y = u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y;
    points.push({ x, y });
  }
  return points;
};

const getPathSVG = (w: number, h: number): string => {
  const cx = w / 2;
  const cy = h / 2;
  const p0 = { x: cx - 120, y: cy + 80 };
  const p1 = { x: cx - 60, y: cy - 120 };
  const p2 = { x: cx + 60, y: cy + 120 };
  const p3 = { x: cx + 120, y: cy - 80 };
  return `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`;
};

const distToSegment = (px: number, py: number, points: { x: number; y: number }[]): number => {
  let minDist = Infinity;
  for (const pt of points) {
    const d = Math.sqrt((px - pt.x) ** 2 + (py - pt.y) ** 2);
    if (d < minDist) minDist = d;
  }
  return minDist;
};

// Gentle hover tone — on-path produces a higher, warmer tone
const playHoverTone = (audioContext: AudioContext, onPath: boolean) => {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.frequency.value = onPath ? 440 : 330;
  osc.type = 'sine';
  gain.gain.setValueAtTime(onPath ? 0.025 : 0.01, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.18);
  osc.start(audioContext.currentTime);
  osc.stop(audioContext.currentTime + 0.22);
};

export default function HoverCalibration({
  width, height, onMetricsUpdate, onComplete,
  onCursorPathStatus, soundEnabled, audioContext,
}: HoverCalibrationProps) {
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [cursorOnPath, setCursorOnPath] = useState(false);
  const [glowIntensity, setGlowIntensity] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const pathPoints = useRef(generatePathPoints(width, height));
  const deviations = useRef<number[]>([]);
  const velocities = useRef<{ dx: number; dy: number; t: number }[]>([]);
  const lastPos = useRef<{ x: number; y: number; t: number } | null>(null);
  const directionChanges = useRef(0);
  const lastDirection = useRef<{ dx: number; dy: number } | null>(null);
  const progressRef = useRef(0);
  const metricsInterval = useRef<number>(0);
  const lastSoundTime = useRef(0);
  const wasOnPath = useRef(false);

  const TOLERANCE = 40;

  const startPoint = pathPoints.current[0];
  const endPoint = pathPoints.current[pathPoints.current.length - 1];

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!started || completed) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const now = performance.now();

    // Distance to path
    const dist = distToSegment(mx, my, pathPoints.current);
    deviations.current.push(dist);
    const isOnPath = dist < TOLERANCE;
    setCursorOnPath(isOnPath);
    setGlowIntensity(Math.max(0, 1 - dist / TOLERANCE));

    // Notify parent of on-path status
    onCursorPathStatus?.(isOnPath);

    // Play hover tone on path-status transitions or periodically while on path
    if (soundEnabled && audioContext && audioContext.state === 'running') {
      const timeSinceLastSound = now - lastSoundTime.current;
      // Play on transition (on/off path change) or every 400ms while on path
      if ((isOnPath !== wasOnPath.current) || (isOnPath && timeSinceLastSound > 400)) {
        playHoverTone(audioContext, isOnPath);
        lastSoundTime.current = now;
      }
    }
    wasOnPath.current = isOnPath;

    // Track velocity and jitter
    if (lastPos.current) {
      const dt = (now - lastPos.current.t) / 1000;
      if (dt > 0) {
        const dx = mx - lastPos.current.x;
        const dy = my - lastPos.current.y;
        velocities.current.push({ dx, dy, t: now });

        // Direction change detection for jitter
        if (lastDirection.current) {
          const dot = dx * lastDirection.current.dx + dy * lastDirection.current.dy;
          if (dot < 0) directionChanges.current++;
        }
        lastDirection.current = { dx, dy };
      }
    }
    lastPos.current = { x: mx, y: my, t: now };

    // Progress: find closest point on path to cursor
    let closestIdx = 0;
    let closestDist = Infinity;
    for (let i = 0; i < pathPoints.current.length; i++) {
      const pt = pathPoints.current[i];
      const d = Math.sqrt((mx - pt.x) ** 2 + (my - pt.y) ** 2);
      if (d < closestDist) {
        closestDist = d;
        closestIdx = i;
      }
    }
    const newProgress = Math.max(progressRef.current, closestIdx / pathPoints.current.length);
    progressRef.current = newProgress;
    setProgress(newProgress);

    // Check completion
    const distToEnd = Math.sqrt((mx - endPoint.x) ** 2 + (my - endPoint.y) ** 2);
    if (distToEnd < 25 && newProgress > 0.85) {
      setCompleted(true);
      onComplete();
    }
  }, [started, completed, endPoint, onComplete, onCursorPathStatus, soundEnabled, audioContext]);

  // Compute and emit metrics periodically
  useEffect(() => {
    if (!started || completed) return;
    metricsInterval.current = window.setInterval(() => {
      const devs = deviations.current;
      const avgDev = devs.length > 0 ? devs.reduce((a, b) => a + b, 0) / devs.length : 0;
      const pathDeviation = Math.min(100, Math.round((avgDev / TOLERANCE) * 100));

      const vels = velocities.current;
      const jitterRaw = vels.length > 10 ? directionChanges.current / vels.length : 0;
      const microJitter = Math.min(100, Math.round(jitterRaw * 200));

      // Smoothness: variance in velocity magnitudes
      let smoothness = 100;
      if (vels.length > 5) {
        const mags = vels.map(v => Math.sqrt(v.dx ** 2 + v.dy ** 2));
        const avgMag = mags.reduce((a, b) => a + b, 0) / mags.length;
        const variance = mags.reduce((a, b) => a + (b - avgMag) ** 2, 0) / mags.length;
        smoothness = Math.max(0, Math.min(100, 100 - Math.round(Math.sqrt(variance) * 2)));
      }

      const stabilityScore = Math.max(0, Math.min(100, Math.round(
        (100 - pathDeviation) * 0.4 + (100 - microJitter) * 0.3 + smoothness * 0.3
      )));

      onMetricsUpdate({ pathDeviation, microJitter, movementSmoothness: smoothness, stabilityScore });
    }, 500);

    return () => clearInterval(metricsInterval.current);
  }, [started, completed, onMetricsUpdate]);

  const handleStartClick = () => {
    setStarted(true);
    deviations.current = [];
    velocities.current = [];
    directionChanges.current = 0;
    lastPos.current = null;
    lastDirection.current = null;
    progressRef.current = 0;
  };

  const handleReset = () => {
    setStarted(false);
    setCompleted(false);
    setProgress(0);
    setCursorOnPath(false);
    setGlowIntensity(0);
    deviations.current = [];
    velocities.current = [];
    directionChanges.current = 0;
    lastPos.current = null;
    lastDirection.current = null;
    progressRef.current = 0;
    wasOnPath.current = false;
  };

  const pathD = getPathSVG(width, height);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      onMouseMove={handleMouseMove}
      style={{ cursor: 'none' }}
    >
      <svg width={width} height={height} className="absolute inset-0">
        {/* Background path */}
        <path
          d={pathD}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="2"
          strokeDasharray="6 4"
        />
        {/* Glow path */}
        <path
          d={pathD}
          fill="none"
          stroke={`rgba(52,211,153,${glowIntensity * 0.6})`}
          strokeWidth="4"
          style={{
            filter: cursorOnPath ? `drop-shadow(0 0 8px rgba(52,211,153,${glowIntensity * 0.8}))` : 'none',
            transition: 'all 0.15s ease',
          }}
        />
        {/* Progress overlay */}
        <path
          d={pathD}
          fill="none"
          stroke="rgba(52,211,153,0.3)"
          strokeWidth="2"
          strokeDasharray={`${progress * 500} 500`}
        />
      </svg>

      {/* Start node */}
      <motion.div
        className="absolute z-10 flex items-center justify-center"
        style={{ left: startPoint.x - 20, top: startPoint.y - 20, width: 40, height: 40 }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        {!started ? (
          <button
            onClick={handleStartClick}
            className="w-10 h-10 rounded-full border border-emerald-400/40 bg-emerald-400/10 hover:bg-emerald-400/20 transition-all duration-300 flex items-center justify-center group"
          >
            <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)] group-hover:shadow-[0_0_20px_rgba(52,211,153,0.8)] transition-shadow" />
          </button>
        ) : (
          <div className="w-6 h-6 rounded-full border border-emerald-400/20 bg-emerald-400/5 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-emerald-400/40" />
          </div>
        )}
        <span className="absolute -bottom-5 text-[7px] uppercase tracking-[0.2em] text-emerald-400/50 font-mono whitespace-nowrap">
          {started ? 'Start' : 'Begin'}
        </span>
      </motion.div>

      {/* End node */}
      <motion.div
        className="absolute z-10 flex items-center justify-center"
        style={{ left: endPoint.x - 20, top: endPoint.y - 20, width: 40, height: 40 }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: started ? 1 : 0.3, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <div className={`w-8 h-8 rounded-full border ${completed ? 'border-emerald-400/60 bg-emerald-400/20' : 'border-white/20 bg-white/5'} flex items-center justify-center transition-all duration-500`}>
          <div className={`w-2.5 h-2.5 rounded-full ${completed ? 'bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.8)]' : 'bg-white/20'} transition-all duration-500`} />
        </div>
        <span className="absolute -bottom-5 text-[7px] uppercase tracking-[0.2em] text-white/30 font-mono whitespace-nowrap">
          Finish
        </span>
      </motion.div>

      {/* Center label */}
      {!started && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <div className="text-center">
            <div className="text-[9px] uppercase tracking-[0.25em] text-white/25 font-mono mb-2">Hover Calibration</div>
            <div className="text-[10px] text-white/40">Click the start node, then trace the path</div>
          </div>
        </motion.div>
      )}

      {/* Completed message */}
      {completed && (
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <span className="text-[9px] uppercase tracking-[0.3em] text-emerald-400/60 font-mono">
            Path trace complete
          </span>
          <button
            onClick={handleReset}
            className="px-4 py-1.5 border border-white/15 text-[9px] uppercase tracking-[0.2em] font-mono text-white/40 hover:text-white/70 hover:border-white/30 transition-all duration-300"
          >
            Retry
          </button>
        </motion.div>
      )}
    </div>
  );
}
