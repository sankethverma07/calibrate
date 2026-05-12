import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';

export type NeuralState = 'baseline' | 'overstimulated' | 'depleted' | 'anxious' | 'paused' | 'tremor' | 'steady' | 'erratic';

interface NeuralStatePanelProps {
  state: NeuralState;
  isPaused: boolean;
  opacity?: number;
  stats?: { wpm: number; accuracy: number; backspaces: number; randomness: number };
}

const STATE_INFO: Record<NeuralState, { label: string; description: string; color: string; dotColor: string; detectionContext: string }> = {
  baseline: {
    label: 'Baseline',
    description: 'Neural patterns within normal parameters.\nCalibration proceeding nominally.',
    color: 'text-white/40',
    dotColor: 'bg-white/30',
    detectionContext: 'All metrics within expected range. No adaptive protocols required.',
  },
  overstimulated: {
    label: 'Kinesthetic Dysregulation',
    description: 'Motor impulses exceeding control threshold.\nStabilization protocol engaged.',
    color: 'text-amber-400/80',
    dotColor: 'bg-amber-400',
    detectionContext: 'Accuracy < 85% · Backspaces ≥ 3\nBreathing glow activated — 8s cycle to regulate motor rhythm.',
  },
  depleted: {
    label: 'Kinesthetic Drift',
    description: 'Cognitive fatigue detected.\nVisual anchor protocol activated.',
    color: 'text-blue-400/80',
    dotColor: 'bg-blue-400',
    detectionContext: 'WPM < 30 · Accuracy > 85%\nBreathing glow + bionic reading toggle to regulate pacing.',
  },
  anxious: {
    label: 'Kinesthetic Hesitation',
    description: 'Overcorrection loop detected.\nTunnel vision protocol engaged.',
    color: 'text-purple-400/80',
    dotColor: 'bg-purple-400',
    detectionContext: 'WPM < 30 · Accuracy 50–85% · Backspaces ≥ 8\nRadial spotlight — metrics hidden to reduce pressure.',
  },
  paused: {
    label: 'Intentional Pause',
    description: 'Deliberate pause detected.\nPattern analysis suspended.',
    color: 'text-white/30',
    dotColor: 'bg-white/20',
    detectionContext: 'No keystroke activity for >2.5s. Awaiting user input.',
  },
  tremor: {
    label: 'Motor Tremor Detected',
    description: 'Rapid micro-corrections in cursor trajectory.\nFine motor instability observed.',
    color: 'text-rose-400/80',
    dotColor: 'bg-rose-400',
    detectionContext: 'Cursor micro-jitter exceeding threshold. Fine motor control degraded.',
  },
  steady: {
    label: 'Stable Motor Control',
    description: 'Cursor trajectory smooth and controlled.\nKinesthetic precision confirmed.',
    color: 'text-emerald-400/80',
    dotColor: 'bg-emerald-400',
    detectionContext: 'Path deviation minimal. Movement smoothness within optimal range.',
  },
  erratic: {
    label: 'Erratic Trajectory',
    description: 'Cursor movement lacks consistent direction.\nMotor coordination under stress.',
    color: 'text-orange-400/80',
    dotColor: 'bg-orange-400',
    detectionContext: 'High path deviation. Cursor directional consistency below threshold.',
  },
};

const GLOW_MAP: Record<string, string> = {
  'bg-amber-400': 'shadow-[0_0_8px_rgba(251,191,36,0.6)]',
  'bg-blue-400': 'shadow-[0_0_8px_rgba(96,165,250,0.6)]',
  'bg-purple-400': 'shadow-[0_0_8px_rgba(192,132,252,0.6)]',
  'bg-rose-400': 'shadow-[0_0_8px_rgba(251,113,133,0.6)]',
  'bg-emerald-400': 'shadow-[0_0_8px_rgba(52,211,153,0.6)]',
  'bg-orange-400': 'shadow-[0_0_8px_rgba(251,146,60,0.6)]',
};

const PING_MAP: Record<string, string> = {
  'bg-amber-400': 'bg-amber-400',
  'bg-blue-400': 'bg-blue-400',
  'bg-purple-400': 'bg-purple-400',
  'bg-rose-400': 'bg-rose-400',
  'bg-emerald-400': 'bg-emerald-400',
  'bg-orange-400': 'bg-orange-400',
};

export default function NeuralStatePanel({ state, isPaused, opacity = 1, stats }: NeuralStatePanelProps) {
  const displayState = isPaused ? 'paused' : state;
  const info = STATE_INFO[displayState];
  const isActive = displayState !== 'baseline' && displayState !== 'paused';
  const glowClass = GLOW_MAP[info.dotColor] || '';
  const pingClass = PING_MAP[info.dotColor] || '';

  return (
    <motion.div
      className="flex flex-col gap-2"
      animate={{ opacity }}
      transition={{ duration: 0.6 }}
    >
      <div className="border-b border-white/10 pb-2 mb-1">
        <span className="text-white/90 text-[16px] tracking-[0.275px] uppercase">
          Neural State
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={displayState}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-1.5"
        >
          {/* State indicator */}
          <div className="flex items-center gap-2">
            <div className={clsx(
              "w-1.5 h-1.5 rounded-full transition-all duration-500 relative",
              info.dotColor,
              glowClass,
            )}>
              {isActive && (
                <div className={clsx(
                  "absolute inset-0 rounded-full animate-ping opacity-50",
                  pingClass,
                )} />
              )}
            </div>
            <span className="text-[9px] uppercase tracking-[0.2em] text-white/50">
              State Detected
            </span>
          </div>

          {/* State label */}
          <div className={clsx("text-[12px] tracking-[0.5px]", info.color)}>
            {info.label}
          </div>

          {/* Description */}
          <div className="text-[9px] text-white/30 leading-relaxed whitespace-pre-line mt-0.5">
            {info.description}
          </div>

          {/* Detection Context */}
          <div className="mt-2 pt-2 border-t border-white/5">
            <div className="text-[8px] uppercase tracking-[0.2em] text-white/25 mb-1.5">
              Detection Context
            </div>
            <div className="text-[9px] text-white/20 leading-relaxed whitespace-pre-line">
              {info.detectionContext}
            </div>
          </div>

          {/* Live metric snapshot when active */}
          {stats && isActive && (
            <div className="mt-2 pt-2 border-t border-white/5">
              <div className="text-[8px] uppercase tracking-[0.2em] text-white/25 mb-1.5">
                Current Readings
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div className="flex justify-between">
                  <span className="text-[8px] text-white/25">WPM</span>
                  <span className={clsx("text-[8px]", 
                    displayState === 'overstimulated' && stats.wpm > 40 ? 'text-amber-400/60' :
                    (displayState === 'depleted' || displayState === 'anxious') && stats.wpm < 40 ? 'text-purple-400/60' :
                    'text-white/35'
                  )}>{stats.wpm}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[8px] text-white/25">ACC</span>
                  <span className={clsx("text-[8px]",
                    stats.accuracy < 85 ? 'text-amber-400/60' : 'text-white/35'
                  )}>{stats.accuracy}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[8px] text-white/25">BSP</span>
                  <span className={clsx("text-[8px]",
                    stats.backspaces >= 3 ? 'text-purple-400/60' : 'text-white/35'
                  )}>{stats.backspaces}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[8px] text-white/25">RND</span>
                  <span className="text-[8px] text-white/35">{stats.randomness}%</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
