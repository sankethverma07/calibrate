import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import LoadingScreen from '../imports/LoadingScreen7';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import HoverCalibration from './components/HoverCalibration';
import NeuralStatePanel, { type NeuralState } from './components/NeuralStatePanel';
import LoadingState from './components/LoadingState';
import LiveGraphs from './components/LiveGraphs';

const PARAGRAPHS = [
  "Welcome to the synchronization phase. Our objective is to calibrate your baseline cognitive and motor responses. This process ensures the interface adapts to your unique neural signature, minimizing latency between thought and action.",
  "We are establishing a seamless connection between you and the system. By analyzing your typing patterns, we can optimize the flow of information and reduce cognitive overhead during complex operations.",
  "Calibration sequence finalized. All subsystems are now synchronized with your neural profile. The interface will continue to adapt in real time as your interaction patterns evolve across sessions.",
];

const SOUND_STYLES = ['Mechanical', 'Soft Keys', 'Digital'] as const;
type SoundStyle = typeof SOUND_STYLES[number];
type CalibrationMode = 'typing' | 'hover';

const getBionicIndices = (text: string) => {
  const indices = new Set<number>();
  let wordStart = -1;
  let inWord = false;
  for (let i = 0; i < text.length; i++) {
    if (/[a-zA-Z]/.test(text[i])) {
      if (!inWord) { wordStart = i; inWord = true; }
      if (i - wordStart < 3) indices.add(i);
    } else { inWord = false; }
  }
  return indices;
};

// 8 cardinal/ordinal rim positions (in radians)
const RIM_POSITIONS = [
  0, Math.PI * 0.25, Math.PI * 0.5, Math.PI * 0.75,
  Math.PI, Math.PI * 1.25, Math.PI * 1.5, Math.PI * 1.75,
];

const generateCheckpointAngle = () => {
  return RIM_POSITIONS[Math.floor(Math.random() * RIM_POSITIONS.length)];
};

const ProgressBar = ({ value }: { value: number }) => (
  <div className="w-full h-0.5 bg-white/10 rounded-full overflow-hidden">
    <div className="h-full bg-white transition-all duration-300" style={{ width: `${value}%` }} />
  </div>
);

const ChecklistItem = ({ label, status, checked, isActive }: { label: string; status: string; checked: boolean; isActive?: boolean }) => (
  <div className="flex items-center justify-between group py-1.5">
    <div className="flex items-center gap-2.5">
      <div className={clsx(
        "w-2 h-2 rounded-full transition-all duration-500 relative",
        checked ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" : "bg-white/20"
      )}>
        {isActive && checked && (
          <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
        )}
      </div>
      <span className={clsx("transition-colors duration-500 text-[10px]", checked ? "text-white" : "text-white/40")}>
        {label}
      </span>
    </div>
    <span className={clsx("text-[9px] transition-colors duration-300", isActive && checked ? "text-emerald-400" : "text-white/30")}>
      [{status}]
    </span>
  </div>
);

const playTypingSound = (style: SoundStyle, audioContext: AudioContext) => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  switch (style) {
    case 'Mechanical':
      oscillator.frequency.value = 800 + Math.random() * 200;
      oscillator.type = 'square';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
      break;
    case 'Soft Keys':
      oscillator.frequency.value = 400 + Math.random() * 100;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
      break;
    case 'Digital':
      oscillator.frequency.value = 1200 + Math.random() * 300;
      oscillator.type = 'triangle';
      gainNode.gain.setValueAtTime(0.06, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.03);
      break;
  }
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.1);
};

// Play a gentle rhythmic metronome sound for overstimulation calming
const playRhythmicTick = (audioContext: AudioContext) => {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.frequency.value = 220;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.04, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
  osc.start(audioContext.currentTime);
  osc.stop(audioContext.currentTime + 0.35);
};

const CIRCLE_DIAMETER = 660;
const CIRCLE_RADIUS = CIRCLE_DIAMETER / 2;
const TEXT_WIDTH = 360;
const FONT_SIZE = 30;
const LINE_HEIGHT_VAL = 2.0;
const INNER_FRAME_HEIGHT = Math.round(CIRCLE_DIAMETER * 0.65);
const INNER_FRAME_TOP = Math.round((CIRCLE_DIAMETER - INNER_FRAME_HEIGHT) / 2);

const PAUSE_THRESHOLD = 2500; // ms

export default function App() {
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  
  // Calibration mode
  const [calibrationMode, setCalibrationMode] = useState<CalibrationMode>('typing');

  // Mobile detection and responsive sizing
  const [isMobile, setIsMobile] = useState(false);
  const [circleDiameter, setCircleDiameter] = useState(CIRCLE_DIAMETER);
  const [textWidth, setTextWidth] = useState(TEXT_WIDTH);
  const [fontSize, setFontSize] = useState(FONT_SIZE);

  const [currentParagraph, setCurrentParagraph] = useState(0);
  const [typedTexts, setTypedTexts] = useState<string[]>(PARAGRAPHS.map(() => ""));
  const [completedParagraphs, setCompletedParagraphs] = useState<Set<number>>(new Set());
  const [checkpointClicked, setCheckpointClicked] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState<'typing' | 'summary'>('typing');
  const [checkpointAngles, setCheckpointAngles] = useState<Map<number, number>>(new Map());

  const [orbitAngle, setOrbitAngle] = useState(0);
  const orbitAnimRef = useRef<number>(0);
  const orbitStartAngleRef = useRef(0);

  const [soundOn, setSoundOn] = useState(false);
  const [soundStyle, setSoundStyle] = useState<SoundStyle>('Mechanical');

  const [stats, setStats] = useState({ wpm: 0, accuracy: 100, backspaces: 0, randomness: 24 });
  const [taskStats, setTaskStats] = useState<Array<{ wpm: number; accuracy: number; backspaces: number; time: number }>>(
    PARAGRAPHS.map(() => ({ wpm: 0, accuracy: 100, backspaces: 0, time: 0 }))
  );

  // Hover calibration metrics
  const [hoverMetrics, setHoverMetrics] = useState({
    pathDeviation: 0, microJitter: 0, movementSmoothness: 100, stabilityScore: 100
  });
  const [hoverCompleted, setHoverCompleted] = useState(false);

  // Track cursor on-path status for hover sound feedback
  const [cursorOnPath, setCursorOnPath] = useState(false);

  const [mousePos, setMousePos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [isTypingActive, setIsTypingActive] = useState(false);

  // Neural state detection
  const [neuralState, setNeuralState] = useState<NeuralState>('baseline');
  const [isPaused, setIsPaused] = useState(false);
  const lastTypingTimeForPause = useRef(Date.now());

  // Corrected accuracy tracking
  const totalKeystrokesRef = useRef(0);
  const totalBackspacesRef = useRef(0);
  const totalErrorsRef = useRef(0);

  // Adaptive UI state
  const [contrastReduction, setContrastReduction] = useState(0);
  const [tunnelVision, setTunnelVision] = useState(false);
  const [adaptiveBionic, setAdaptiveBionic] = useState(false);

  // New: Manual bionic toggle
  const [bionicEnabled, setBionicEnabled] = useState(false);

  // New: UI trigger states
  const [pulsingHorizonLine, setPulsingHorizonLine] = useState(false);
  const [hideMetrics, setHideMetrics] = useState(false);
  const [radialSpotlight, setRadialSpotlight] = useState(false);

  // Stats history for live graphs
  const [statsHistory, setStatsHistory] = useState<Array<{ wpm: number; accuracy: number; backspaces: number; time: number }>>([]);

  // Rhythmic sound interval for overstimulation
  const rhythmicIntervalRef = useRef<number>(0);

  const startTimeRef = useRef(0);
  const lastMousePos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const movementCount = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastTypingTime = useRef(0);
  const textBlockRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const innerFrameRef = useRef<HTMLDivElement>(null);

  const p2BionicIndices = useMemo(() => getBionicIndices(PARAGRAPHS[1]), []);

  const isCurrentCompleted = completedParagraphs.has(currentParagraph);
  const showCircumferenceCheckpoint = isCurrentCompleted && !checkpointClicked.has(currentParagraph);

  const [scrollOffset, setScrollOffset] = useState(0);

  // Mobile detection and responsive sizing
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      if (mobile) {
        // Mobile: scale circle to 90% of viewport width, max 450px
        const mobileDiameter = Math.min(window.innerWidth * 0.9, 450);
        setCircleDiameter(mobileDiameter);
        setTextWidth(mobileDiameter * 0.7); // 70% of circle diameter
        setFontSize(20); // Smaller font for mobile
      } else {
        // Desktop: use original dimensions
        setCircleDiameter(CIRCLE_DIAMETER);
        setTextWidth(TEXT_WIDTH);
        setFontSize(FONT_SIZE);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cursor-centered scroll
  useEffect(() => {
    if (calibrationMode !== 'typing') return;
    if (cursorRef.current && innerFrameRef.current) {
      const frameRect = innerFrameRef.current.getBoundingClientRect();
      const cursorRect = cursorRef.current.getBoundingClientRect();
      const cursorVisibleY = cursorRect.top - frameRect.top;
      const centerTarget = INNER_FRAME_HEIGHT / 2;
      const delta = cursorVisibleY - centerTarget;
      if (Math.abs(delta) > 4) {
        setScrollOffset(prev => Math.max(0, prev + delta));
      }
    }
  }, [typedTexts, currentParagraph, calibrationMode]);

  // Orbiting checkpoint animation
  useEffect(() => {
    if (!showCircumferenceCheckpoint || calibrationMode !== 'typing') {
      cancelAnimationFrame(orbitAnimRef.current);
      return;
    }
    const startAngle = checkpointAngles.get(currentParagraph) ?? 0;
    orbitStartAngleRef.current = startAngle;
    let startTime: number | null = null;
    const ORBIT_SPEED = 0.4;

    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;
      const angle = orbitStartAngleRef.current + elapsed * ORBIT_SPEED;
      setOrbitAngle(angle);
      orbitAnimRef.current = requestAnimationFrame(animate);
    };
    orbitAnimRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(orbitAnimRef.current);
  }, [showCircumferenceCheckpoint, currentParagraph, checkpointAngles, calibrationMode]);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => { audioContextRef.current?.close(); };
  }, []);

  // Mouse movement tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 5) {
        movementCount.current++;
        if (movementCount.current % 10 === 0) {
          setStats(s => {
            const targetRand = s.wpm > 30 ? 12 : 35;
            const newRand = s.randomness + (targetRand - s.randomness) * 0.1;
            return { ...s, randomness: Math.round(newRand) };
          });
        }
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Intentional pause detection
  useEffect(() => {
    if (calibrationMode !== 'typing') return;
    const interval = setInterval(() => {
      const timeSinceLastType = Date.now() - lastTypingTimeForPause.current;
      const typed = typedTexts[currentParagraph];
      if (typed.length > 0 && !completedParagraphs.has(currentParagraph) && timeSinceLastType > PAUSE_THRESHOLD) {
        setIsPaused(true);
      } else {
        setIsPaused(false);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [calibrationMode, typedTexts, currentParagraph, completedParagraphs]);

  // Neural pattern detection (runs every 1.5s, only during typing)
  useEffect(() => {
    if (calibrationMode !== 'typing' || phase !== 'typing') return;
    const interval = setInterval(() => {
      const typed = typedTexts[currentParagraph];
      
      // Need at least some typing activity to detect patterns
      if (typed.length < 5) {
        setNeuralState('baseline');
        return;
      }

      // If user is paused AND hasn't typed much, stay baseline
      if (isPaused && typed.length < 20) {
        setNeuralState('baseline');
        return;
      }

      const { wpm, accuracy, backspaces, randomness } = stats;

      // Pattern 1 — Overstimulated: user makes many mistakes (accuracy drops + backspaces)
      if (accuracy < 85 && backspaces >= 3) {
        setNeuralState('overstimulated');
        return;
      }

      // Pattern 3 — Depleted: user is slow but accurate (no mistakes, very slow WPM)
      if (wpm > 0 && wpm < 30 && accuracy > 85) {
        setNeuralState('depleted');
        return;
      }

      // Anxious: slow + medium accuracy + lots of corrections
      if (wpm < 30 && accuracy >= 50 && accuracy < 85 && backspaces >= 8) {
        setNeuralState('anxious');
        return;
      }

      setNeuralState('baseline');
    }, 1500);
    return () => clearInterval(interval);
  }, [calibrationMode, phase, isPaused, stats, typedTexts, currentParagraph]);

  // Hover neural state detection (runs every 2s, only during hover)
  useEffect(() => {
    if (calibrationMode !== 'hover') return;
    const interval = setInterval(() => {
      const { pathDeviation, microJitter, movementSmoothness, stabilityScore } = hoverMetrics;
      // Only detect once there's meaningful data (non-zero deviation or jitter)
      if (pathDeviation === 0 && microJitter === 0) {
        setNeuralState('baseline');
        return;
      }

      // Tremor: high micro-jitter, poor smoothness
      if (microJitter > 45 && movementSmoothness < 50) {
        setNeuralState('tremor');
        return;
      }

      // Erratic: high path deviation, low stability
      if (pathDeviation > 60 && stabilityScore < 40) {
        setNeuralState('erratic');
        return;
      }

      // Steady: low deviation, high smoothness, good stability
      if (pathDeviation < 35 && movementSmoothness > 70 && stabilityScore > 65) {
        setNeuralState('steady');
        return;
      }

      setNeuralState('baseline');
    }, 2000);
    return () => clearInterval(interval);
  }, [calibrationMode, hoverMetrics]);

  // Adaptive UI responses based on neural state
  useEffect(() => {
    if (isPaused || calibrationMode !== 'typing') {
      setContrastReduction(0);
      setTunnelVision(false);
      setAdaptiveBionic(false);
      clearInterval(rhythmicIntervalRef.current);
      return;
    }

    switch (neuralState) {
      case 'overstimulated':
        setContrastReduction(10);
        setTunnelVision(false);
        setAdaptiveBionic(false);
        // Start rhythmic calming sound
        if (soundOn && audioContextRef.current) {
          clearInterval(rhythmicIntervalRef.current);
          rhythmicIntervalRef.current = window.setInterval(() => {
            if (audioContextRef.current) playRhythmicTick(audioContextRef.current);
          }, 1200);
        }
        break;
      case 'depleted':
        setContrastReduction(0);
        setTunnelVision(false);
        setAdaptiveBionic(true);
        clearInterval(rhythmicIntervalRef.current);
        break;
      case 'anxious':
        setContrastReduction(0);
        setTunnelVision(true);
        setAdaptiveBionic(false);
        clearInterval(rhythmicIntervalRef.current);
        break;
      default:
        setContrastReduction(0);
        setTunnelVision(false);
        setAdaptiveBionic(false);
        clearInterval(rhythmicIntervalRef.current);
        break;
    }
    return () => clearInterval(rhythmicIntervalRef.current);
  }, [neuralState, isPaused, soundOn, calibrationMode]);

  // New: UI Trigger Detection (runs every 2s during typing)
  useEffect(() => {
    if (calibrationMode !== 'typing' || phase !== 'typing') return;
    
    const interval = setInterval(() => {
      const { wpm, accuracy, backspaces } = stats;
      const typed = typedTexts[currentParagraph];
      if (typed.length < 10) {
        setPulsingHorizonLine(false);
        setRadialSpotlight(false);
        setHideMetrics(false);
        return;
      }

      // Derive UI triggers directly from neural state for consistency
      // Pattern 1 (Overstimulated): horizon line + breathing glow
      setPulsingHorizonLine(accuracy < 85 && backspaces >= 3);

      // Pattern 3 (Anxious): radial spotlight + hide metrics
      const isAnxious = wpm < 30 && accuracy >= 50 && accuracy < 85 && backspaces >= 8;
      setRadialSpotlight(isAnxious);
      setHideMetrics(isAnxious);
    }, 2000);

    return () => clearInterval(interval);
  }, [calibrationMode, phase, stats, typedTexts, currentParagraph]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'typing' || calibrationMode !== 'typing') return;
      if (e.key === " ") e.preventDefault();
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (completedParagraphs.has(currentParagraph)) return;

      const tText = PARAGRAPHS[currentParagraph];
      const cTyped = typedTexts[currentParagraph];

      lastTypingTimeForPause.current = Date.now();

      if (e.key === "Backspace") {
        totalBackspacesRef.current++;
        setStats(s => ({ ...s, backspaces: s.backspaces + 1 }));
        setTypedTexts(prev => {
          const next = [...prev];
          next[currentParagraph] = cTyped.slice(0, -1);
          return next;
        });
        // Update corrected accuracy: backspaces count as partial errors
        const totalActions = totalKeystrokesRef.current + totalBackspacesRef.current;
        if (totalActions > 0) {
          // Weighted: backspaces are 0.5 error weight, actual errors are 1.0
          const weightedErrors = totalErrorsRef.current + totalBackspacesRef.current * 0.3;
          const correctedAcc = Math.max(0, Math.round(((totalActions - weightedErrors) / totalActions) * 100));
          setStats(s => ({ ...s, accuracy: correctedAcc }));
        }
        if (soundOn && audioContextRef.current) playTypingSound(soundStyle, audioContextRef.current);
        return;
      }

      if (e.key.length === 1) {
        setIsTypingActive(true);
        lastTypingTime.current = Date.now();
        setTimeout(() => {
          if (Date.now() - lastTypingTime.current > 2000) setIsTypingActive(false);
        }, 2100);

        if (cTyped.length === 0) startTimeRef.current = Date.now();

        if (cTyped.length < tText.length) {
          totalKeystrokesRef.current++;
          const isError = e.key !== tText[cTyped.length];
          if (isError) totalErrorsRef.current++;

          const newTyped = cTyped + e.key;
          setTypedTexts(prev => {
            const next = [...prev];
            next[currentParagraph] = newTyped;
            return next;
          });

          // Corrected accuracy
          const totalActions = totalKeystrokesRef.current + totalBackspacesRef.current;
          const weightedErrors = totalErrorsRef.current + totalBackspacesRef.current * 0.3;
          const acc = Math.max(0, Math.round(((totalActions - weightedErrors) / totalActions) * 100));
          setStats(s => ({ ...s, accuracy: acc }));

          if (soundOn && audioContextRef.current) playTypingSound(soundStyle, audioContextRef.current);

          if (newTyped.length === tText.length) {
            const duration = (Date.now() - startTimeRef.current) / 1000;
            const finalWpm = Math.round((newTyped.length / 5) / (duration / 60));
            setTaskStats(prev => {
              const next = [...prev];
              next[currentParagraph] = { wpm: finalWpm, accuracy: acc, backspaces: stats.backspaces, time: duration };
              return next;
            });
            setCompletedParagraphs(prev => new Set(prev).add(currentParagraph));
            setCheckpointAngles(prev => {
              const next = new Map(prev);
              next.set(currentParagraph, generateCheckpointAngle());
              return next;
            });
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, currentParagraph, typedTexts, completedParagraphs, soundOn, soundStyle, stats.backspaces, calibrationMode]);

  // WPM interval + stats history recording
  useEffect(() => {
    const interval = setInterval(() => {
      if (phase !== 'typing' || calibrationMode !== 'typing') return;
      const cTyped = typedTexts[currentParagraph];
      if (cTyped.length > 0 && cTyped !== PARAGRAPHS[currentParagraph]) {
        const mins = (Date.now() - startTimeRef.current) / 60000;
        if (mins > 0) {
          const newWpm = Math.max(0, Math.round((cTyped.length / 5) / mins));
          setStats(s => ({ ...s, wpm: newWpm }));
          // Record stats history for live graphs (keep last 60 data points)
          setStatsHistory(prev => {
            const point = { wpm: newWpm, accuracy: stats.accuracy, backspaces: stats.backspaces, time: mins * 60 };
            const next = [...prev, point];
            return next.length > 60 ? next.slice(-60) : next;
          });
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, currentParagraph, typedTexts, calibrationMode, stats.accuracy, stats.backspaces]);

  const handleCheckpointClick = (paragraphIndex: number) => {
    setCheckpointClicked(prev => new Set(prev).add(paragraphIndex));
    if (paragraphIndex < PARAGRAPHS.length - 1) {
      setCurrentParagraph(paragraphIndex + 1);
      setStats(s => ({ ...s, wpm: 0, accuracy: 100, backspaces: 0 }));
      setScrollOffset(0);
      totalKeystrokesRef.current = 0;
      totalBackspacesRef.current = 0;
      totalErrorsRef.current = 0;
    } else {
      setPhase('summary');
    }
  };

  const handleHoverMetricsUpdate = useCallback((metrics: { pathDeviation: number; microJitter: number; movementSmoothness: number; stabilityScore: number }) => {
    setHoverMetrics(metrics);
  }, []);

  const handleHoverComplete = useCallback(() => {
    setHoverCompleted(true);
  }, []);

  const renderParagraphText = (paragraphIndex: number) => {
    const text = PARAGRAPHS[paragraphIndex];
    const typed = typedTexts[paragraphIndex];
    const isBionic = paragraphIndex === 1;
    // Adaptive bionic: also activate bionic on current paragraph during depleted state
    const useBionic = isBionic || (adaptiveBionic && paragraphIndex === currentParagraph) || bionicEnabled;
    const bionicIndices = useBionic ? getBionicIndices(text) : undefined;
    const isActive = currentParagraph === paragraphIndex && phase === 'typing';
    const isCompleted = completedParagraphs.has(paragraphIndex);

    return (
      <div
        ref={isActive ? textBlockRef : undefined}
        className="relative font-sans tracking-wide text-left whitespace-pre-wrap"
        style={{ fontSize: fontSize, lineHeight: LINE_HEIGHT_VAL }}
      >
        {text.split('').map((char, i) => {
          const isTyped = i < typed.length;
          const isCorrect = isTyped && typed[i] === char;
          const isError = isTyped && typed[i] !== char;
          const isCursor = isActive && !isCompleted && i === typed.length;
          const bionicBold = useBionic && bionicIndices?.has(i);

          let colorClass = "";
          let fontWeight = "";

          if (isCorrect) {
            colorClass = "text-white";
            fontWeight = bionicBold ? "font-bold" : "";
          } else if (isError) {
            colorClass = "text-red-500 bg-red-500/20";
          } else {
            if (bionicBold) {
              colorClass = "text-white/60";
              fontWeight = "font-bold";
            } else {
              colorClass = "text-white/20";
            }
          }

          return (
            <span key={i} className={clsx("relative transition-colors duration-100", colorClass, fontWeight)}>
              {char}
              {isCursor && (
                <span
                  ref={cursorRef}
                  className="absolute left-0 top-[10%] w-[2px] h-[80%] bg-white animate-pulse shadow-[0_0_8px_white]"
                />
              )}
            </span>
          );
        })}
      </div>
    );
  };

  const isKinesthesiaActive = stats.randomness < 20 && typedTexts[currentParagraph]?.length > 0;
  const isChronoceptionActive = currentParagraph === 1;

  const handleRestart = () => {
    setPhase('typing');
    setCurrentParagraph(0);
    setTypedTexts(PARAGRAPHS.map(() => ""));
    setCompletedParagraphs(new Set());
    setCheckpointClicked(new Set());
    setCheckpointAngles(new Map());
    setStats({ wpm: 0, accuracy: 100, backspaces: 0, randomness: 24 });
    setTaskStats(PARAGRAPHS.map(() => ({ wpm: 0, accuracy: 100, backspaces: 0, time: 0 })));
    setNeuralState('baseline');
    setIsPaused(false);
    totalKeystrokesRef.current = 0;
    totalBackspacesRef.current = 0;
    totalErrorsRef.current = 0;
    setContrastReduction(0);
    setTunnelVision(false);
    setAdaptiveBionic(false);
    setHoverCompleted(false);
    setHoverMetrics({ pathDeviation: 0, microJitter: 0, movementSmoothness: 100, stabilityScore: 100 });
    setStatsHistory([]);
  };

  const orbitX = CIRCLE_RADIUS + Math.cos(orbitAngle) * (CIRCLE_RADIUS - 6);
  const orbitY = CIRCLE_RADIUS + Math.sin(orbitAngle) * (CIRCLE_RADIUS - 6);

  // Peripheral element opacity for tunnel vision
  const peripheralOpacity = tunnelVision ? 0.2 : 1;

  // Show loading screen initially
  if (isLoading) {
    return <LoadingState onComplete={() => setIsLoading(false)} />;
  }

  return (
    <div
      className="relative w-screen h-screen bg-[#121212] text-white overflow-hidden selection:bg-white/20"
      style={{
        filter: contrastReduction > 0 ? `contrast(${1 - contrastReduction / 100})` : undefined,
        transition: 'filter 1s ease',
      }}
    >
      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-50">
        <LoadingScreen />
      </div>

      {/* Tunnel Vision overlay */}
      <AnimatePresence>
        {tunnelVision && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 z-[5] pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 400px 350px at 50% 50%, transparent 40%, rgba(18,18,18,0.85) 100%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Radial Spotlight overlay */}
      <AnimatePresence>
        {radialSpotlight && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0 }}
            className="absolute inset-0 z-[6] pointer-events-none"
            style={{
              background: 'radial-gradient(circle 350px at 50% 50%, transparent 20%, #121212 90%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Pulsing Horizon Line */}
      <AnimatePresence>
        {pulsingHorizonLine && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute top-1/2 left-0 w-full z-[4] pointer-events-none"
            style={{
              transform: 'translateY(-50%)',
              height: '2px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(16, 185, 129, 0.5) 50%, transparent 100%)',
              boxShadow: '0 0 20px 5px rgba(16, 185, 129, 0.2)'
            }}
          >
            {/* Breathing animation: 4s inflate, 4s deflate */}
            <motion.div 
              className="w-full h-full bg-emerald-400/40"
              animate={{ 
                scaleY: [1, 2.5, 1],
                opacity: [0.4, 0.7, 0.4]
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Left: Header + Live Graphs */}
      {phase === 'typing' && (
        <motion.div
          className="absolute top-10 left-10 z-20 w-[280px]"
          animate={{ opacity: peripheralOpacity }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-[28px] uppercase tracking-[2.7px] text-white/90 mb-6" style={{ fontWeight: 600 }}>
            Calibrate
          </h1>

          {/* Mode Switcher */}
          <div className="flex gap-2 mt-5">
            <button
              onClick={() => setCalibrationMode('typing')}
              className={clsx(
                "px-3 py-1.5 text-[12px] uppercase tracking-[0.2em] border transition-all duration-300",
                calibrationMode === 'typing'
                  ? "border-white/40 bg-white/10 text-white"
                  : "border-white/10 text-white/30 hover:border-white/25 hover:text-white/50"
              )}
            >
              Typing
            </button>
            <button
              onClick={() => setCalibrationMode('hover')}
              className={clsx(
                "px-3 py-1.5 text-[12px] uppercase tracking-[0.2em] border transition-all duration-300",
                calibrationMode === 'hover'
                  ? "border-white/40 bg-white/10 text-white"
                  : "border-white/10 text-white/30 hover:border-white/25 hover:text-white/50"
              )}
            >
              Hover
            </button>
          </div>

          {/* Live Graphs */}
          {calibrationMode === 'typing' && (
            <div className="mt-6">
              <LiveGraphs data={statsHistory} />
            </div>
          )}
        </motion.div>
      )}

      {/* Breathing Radial Glow — Pattern 1 (Overstimulated) & Pattern 3 (Depleted/slow) */}
      <AnimatePresence>
        {(neuralState === 'overstimulated' || neuralState === 'depleted') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0 }}
            className="absolute inset-0 z-[3] pointer-events-none flex items-center justify-center"
          >
            <motion.div
              className="rounded-full"
              style={{
                width: CIRCLE_DIAMETER + 120,
                height: CIRCLE_DIAMETER + 120,
                background: neuralState === 'overstimulated'
                  ? 'radial-gradient(circle, rgba(251,191,36,0.12) 0%, rgba(251,191,36,0.05) 40%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(96,165,250,0.12) 0%, rgba(96,165,250,0.05) 40%, transparent 70%)',
              }}
              animate={{
                scale: [1, 1.35, 1],
                opacity: [0.65, 1, 0.65],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: 'easeInOut',
                times: [0, 0.5, 1],
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center: Circular frame */}
      {phase === 'typing' ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="relative" style={{ width: circleDiameter, height: circleDiameter }}>
            <div className="absolute inset-0 rounded-full" />

            <AnimatePresence mode="wait">
              {calibrationMode === 'typing' ? (
                <motion.div
                  key="typing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0"
                >
                  {/* Inner masked frame */}
                  <div
                    ref={innerFrameRef}
                    className="absolute left-1/2 -translate-x-1/2 overflow-hidden"
                    style={{
                      width: textWidth,
                      height: INNER_FRAME_HEIGHT,
                      top: INNER_FRAME_TOP,
                    }}
                  >
                    {/* Sentence Focus Glow - subtle radial spotlight */}
                    {!isCurrentCompleted && typedTexts[currentParagraph].length > 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: 'radial-gradient(ellipse 180px 120px at center 50%, rgba(255,255,255,0.03) 0%, transparent 70%)',
                          filter: 'blur(20px)',
                        }}
                      />
                    )}

                    <div
                      className="w-full"
                      style={{
                        transform: `translateY(-${scrollOffset}px)`,
                        transition: 'transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                      }}
                    >
                      <div className="mb-4 flex items-center gap-2">
                        <div className="text-[9px] uppercase tracking-[0.25em] text-white/25 font-mono">
                          {currentParagraph === 1 ? 'Bionic Protocol' : `Sequence ${currentParagraph + 1}`}
                        </div>
                        {isCurrentCompleted && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                          />
                        )}
                      </div>

                      {renderParagraphText(currentParagraph)}

                      {isCurrentCompleted && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2, duration: 0.5 }}
                          className="mt-8 text-center"
                        >
                          <span className="text-[9px] uppercase tracking-[0.3em] text-emerald-400/60 font-mono">
                            Sequence complete — find the checkpoint
                          </span>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* Circumference checkpoint */}
                  <AnimatePresence>
                    {showCircumferenceCheckpoint && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
                        className={clsx("absolute z-30 group", neuralState === 'overstimulated' && "scale-125")}
                        style={{
                          left: orbitX - (neuralState === 'overstimulated' ? 20 : 16),
                          top: orbitY - (neuralState === 'overstimulated' ? 20 : 16),
                          width: neuralState === 'overstimulated' ? 40 : 32,
                          height: neuralState === 'overstimulated' ? 40 : 32,
                        }}
                        onClick={() => handleCheckpointClick(currentParagraph)}
                      >
                        <div className="absolute inset-0 rounded-full" />
                        <div className="absolute inset-[4px] rounded-full border border-emerald-400/30 animate-ping" />
                        <div className="absolute inset-[6px] rounded-full bg-emerald-400/10 group-hover:bg-emerald-400/20 transition-colors duration-300" />
                        <div className="absolute inset-[10px] rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.8),0_0_40px_rgba(52,211,153,0.3)] group-hover:shadow-[0_0_24px_rgba(52,211,153,1),0_0_48px_rgba(52,211,153,0.5)] transition-shadow duration-300" />
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.8, duration: 0.4 }}
                          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap"
                        >
                          <span className="text-[7px] uppercase tracking-[0.2em] text-emerald-400/60 font-mono">
                            Click
                          </span>
                        </motion.div>
                      </motion.button>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div
                  key="hover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 overflow-hidden rounded-full"
                >
                  <HoverCalibration
                    width={circleDiameter}
                    height={circleDiameter}
                    onMetricsUpdate={handleHoverMetricsUpdate}
                    onComplete={handleHoverComplete}
                    onCursorPathStatus={setCursorOnPath}
                    soundEnabled={soundOn}
                    audioContext={audioContextRef.current}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        /* Summary Screen */
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
          <div className="max-w-[800px] w-full px-8">
            <div className="text-center mb-16">
              <h1 className="text-[18px] uppercase tracking-[0.3em] text-white mb-4" style={{ fontFamily: "'Neue Montreal', sans-serif", fontWeight: 500 }}>Calibration Complete</h1>
              <p className="text-[13px] text-white/50">Your typing patterns have been analyzed across {PARAGRAPHS.length} sequences</p>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-8">
              {PARAGRAPHS.map((_, i) => (
                <div key={i} className="border border-white/10 p-6">
                  <div className="text-[9px] uppercase tracking-[0.25em] text-white/40 font-mono mb-8">
                    {i === 1 ? 'Bionic Reading' : `Sequence ${i + 1}`}
                  </div>
                  <div className="space-y-5">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] text-white/60 uppercase tracking-wider">WPM</span>
                      <span className="text-[28px] text-white" style={{ fontWeight: 300 }}>{taskStats[i].wpm}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] text-white/60 uppercase tracking-wider">Accuracy</span>
                      <span className="text-[28px] text-white" style={{ fontWeight: 300 }}>{taskStats[i].accuracy}%</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] text-white/60 uppercase tracking-wider">Time</span>
                      <span className="text-[28px] text-white" style={{ fontWeight: 300 }}>{taskStats[i].time.toFixed(1)}s</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-6 mb-14">
              <div className="border border-white/10 p-6 flex flex-col justify-between">
                <div className="text-[9px] uppercase tracking-[0.25em] text-white/40 font-mono mb-6">
                  Final Neural State
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center">
                    <div className={clsx(
                      "w-6 h-6 rounded-full animate-pulse",
                      neuralState === 'baseline' ? 'bg-emerald-400/50' : 
                      neuralState === 'overstimulated' ? 'bg-amber-400/50' :
                      neuralState === 'depleted' ? 'bg-blue-400/50' :
                      neuralState === 'anxious' ? 'bg-purple-400/50' :
                      'bg-white/50'
                    )} />
                  </div>
                  <div>
                    <div className="text-[20px] text-white capitalize tracking-wide">{neuralState}</div>
                    <div className="text-[10px] text-white/50 mt-1">Cognitive load optimized</div>
                  </div>
                </div>
              </div>

              <div className="border border-white/10 p-6 flex flex-col justify-between">
                <div className="text-[9px] uppercase tracking-[0.25em] text-white/40 font-mono mb-6">
                  Kinesthesia Achievement
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] text-white/60 uppercase tracking-wider">Stability Rating</span>
                    <span className="text-[20px] text-white" style={{ fontWeight: 300 }}>
                      {Math.max(0, 100 - stats.randomness)}%
                    </span>
                  </div>
                  <ProgressBar value={Math.max(0, 100 - stats.randomness)} />
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] text-white/60 uppercase tracking-wider">Motor Efficiency</span>
                    <span className="text-[20px] text-white" style={{ fontWeight: 300 }}>
                      {hoverMetrics.movementSmoothness > 0 ? hoverMetrics.movementSmoothness : Math.min(100, Math.round(stats.wpm * 0.8 + stats.accuracy * 0.4))}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center mt-16">
              <button
                onClick={handleRestart}
                className="px-8 py-3 border border-white/20 text-[10px] uppercase tracking-[0.25em] font-mono text-white/60 hover:text-white hover:border-white/40 transition-all duration-300"
              >
                Restart Calibration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Right: Telemetry */}
      {phase === 'typing' && !hideMetrics && (
        <motion.div
          className="absolute top-10 right-10 flex flex-col gap-6 w-56 z-20"
          animate={{ opacity: peripheralOpacity }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex flex-col gap-4 text-[9px] uppercase tracking-[0.15em] text-white/60">
            <div className="flex justify-between items-end border-b border-white/10 pb-3">
              <span className="text-white/90 text-[15px] tracking-[0.275px] uppercase" style={{ fontFamily: "'Neue Montreal', sans-serif", fontWeight: 500 }}>System Telemetry</span>
            </div>

            <AnimatePresence mode="wait">
              {calibrationMode === 'typing' ? (
                <motion.div
                  key="typing-metrics"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col gap-4 mt-1"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-end">
                      <span className="text-[12px] text-white/60 tracking-[1.35px]" style={{ fontFamily: "'Neue Montreal', sans-serif" }}>WPM</span>
                      <span className="text-white text-[13px] font-medium tracking-[1.35px]">{stats.wpm.toString().padStart(3, '0')}</span>
                    </div>
                    <ProgressBar value={Math.min(100, (stats.wpm / 120) * 100)} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-end">
                      <span className="text-[12px] text-white/60 tracking-[1.35px]" style={{ fontFamily: "'Neue Montreal', sans-serif" }}>Accuracy</span>
                      <span className="text-white text-[13px] font-medium tracking-[1.35px]">{stats.accuracy}%</span>
                    </div>
                    <ProgressBar value={stats.accuracy} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-end">
                      <span className="text-[12px] text-white/60 tracking-[1.35px]" style={{ fontFamily: "'Neue Montreal', sans-serif" }}>Backspace Freq.</span>
                      <span className="text-white text-[13px] font-medium tracking-[1.35px]">{stats.backspaces.toString().padStart(2, '0')}</span>
                    </div>
                    <ProgressBar value={Math.min(100, (stats.backspaces / 20) * 100)} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-end">
                      <span className="text-[12px] text-white/60 tracking-[1.35px]" style={{ fontFamily: "'Neue Montreal', sans-serif" }}>Hover Randomness</span>
                      <span className="text-white text-[13px] font-medium tracking-[1.35px]">{stats.randomness}%</span>
                    </div>
                    <ProgressBar value={stats.randomness} />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="hover-metrics"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col gap-4 mt-1"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-end">
                      <span className="text-[12px] text-white/60 tracking-[1.35px]" style={{ fontFamily: "'Neue Montreal', sans-serif" }}>Path Deviation</span>
                      <span className="text-white text-[13px] font-medium tracking-[1.35px]">{hoverMetrics.pathDeviation}%</span>
                    </div>
                    <ProgressBar value={hoverMetrics.pathDeviation} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-end">
                      <span className="text-[12px] text-white/60 tracking-[1.35px]" style={{ fontFamily: "'Neue Montreal', sans-serif" }}>Micro-Jitter</span>
                      <span className="text-white text-[13px] font-medium tracking-[1.35px]">{hoverMetrics.microJitter}%</span>
                    </div>
                    <ProgressBar value={hoverMetrics.microJitter} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-end">
                      <span className="text-[12px] text-white/60 tracking-[1.35px]" style={{ fontFamily: "'Neue Montreal', sans-serif" }}>Smoothness</span>
                      <span className="text-white text-[13px] font-medium tracking-[1.35px]">{hoverMetrics.movementSmoothness}%</span>
                    </div>
                    <ProgressBar value={hoverMetrics.movementSmoothness} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-end">
                      <span className="text-[12px] text-white/60 tracking-[1.35px]" style={{ fontFamily: "'Neue Montreal', sans-serif" }}>Stability Score</span>
                      <span className="text-white text-[13px] font-medium tracking-[1.35px]">{hoverMetrics.stabilityScore}%</span>
                    </div>
                    <ProgressBar value={hoverMetrics.stabilityScore} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Bottom Right: Neural State Panel */}
      {phase === 'typing' && (
        <motion.div
          className="absolute bottom-10 right-10 z-20 max-w-[320px]"
          animate={{ opacity: peripheralOpacity }}
          transition={{ duration: 0.8 }}
        >
          <NeuralStatePanel state={neuralState} isPaused={isPaused} opacity={peripheralOpacity} stats={stats} />
        </motion.div>
      )}

      {/* Bottom Left: Controls & Audio Feedback */}
      <motion.div
        className="absolute bottom-10 left-10 z-20 max-w-[320px]"
        animate={{ opacity: peripheralOpacity }}
        transition={{ duration: 0.8 }}
      >
        <div className="flex flex-col gap-6">
          {/* Bionic Reading Toggle */}
          {phase === 'typing' && calibrationMode === 'typing' && (
            <button
              onClick={() => setBionicEnabled(!bionicEnabled)}
              className="flex items-start gap-3 text-white/40 hover:text-white transition-all duration-300 group"
            >
              <div className={clsx("p-2.5 border rounded-full transition-all duration-500", bionicEnabled ? "border-emerald-400 bg-emerald-400/10 text-emerald-400" : "border-white/10")}>
                <div className={clsx("w-4 h-4 rounded-sm border-2 transition-colors", bionicEnabled ? "border-emerald-400" : "border-white/40 group-hover:border-white/80")} />
              </div>
              <div className="flex flex-col items-start text-left">
                <span className="uppercase tracking-[1.8px] text-[12px] text-white/60">Bionic Reader</span>
                <span className="text-[10px] text-white/30 mt-0.5">
                  {bionicEnabled ? "Fast reading active" : "Enable fast reading"}
                </span>
              </div>
            </button>
          )}

          {/* Audio Feedback */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setSoundOn(!soundOn);
                if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
              }}
              className="flex items-start gap-3 text-white/40 hover:text-white transition-all duration-300 group"
            >
              <div className={clsx("p-2.5 border rounded-full transition-all duration-500", soundOn ? "border-white/40 bg-white/5" : "border-white/10")}>
                {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </div>
              <div className="flex flex-col items-start text-left">
                <span className="uppercase tracking-[1.8px] text-[12px] text-white/60">Audio Feedback</span>
                <span className="text-[10px] text-white/30 mt-0.5">
                  {soundOn ? "Typing sounds enabled" : "Enable keyboard sounds"}
                </span>
              </div>
            </button>

            {soundOn && (
              <div className="ml-[52px] flex flex-col gap-2">
                <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-mono mb-1">Sound Style</div>
                {SOUND_STYLES.map((style) => (
                  <button
                    key={style}
                    onClick={() => {
                      setSoundStyle(style);
                      if (audioContextRef.current) playTypingSound(style, audioContextRef.current);
                    }}
                    className={clsx(
                      "text-left text-[10px] px-3 py-1.5 border rounded transition-all duration-200",
                      soundStyle === style
                        ? "border-white/40 bg-white/10 text-white"
                        : "border-white/10 text-white/40 hover:border-white/30 hover:text-white/60"
                    )}
                  >
                    {style}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Custom Cursor */}
      <div
        className="fixed top-0 left-0 pointer-events-none z-50 mix-blend-difference"
        style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}
      >
        <div className="w-1.5 h-1.5 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="w-6 h-6 border border-white/20 rounded-full absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 transition-transform duration-300 scale-100" />
      </div>
    </div>
  );
}