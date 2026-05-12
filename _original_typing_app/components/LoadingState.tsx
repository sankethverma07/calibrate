import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface LoadingStateProps {
  onComplete: () => void;
}

// Animation timeline phases
type Phase = 'dormant' | 'aligning' | 'catalyst' | 'expanded' | 'fadeout';

// Timing constants (ms)
const DORMANT_DURATION = 1200;
const ALIGN_DURATION = 1000;
const CATALYST_DURATION = 1200;
const EXPANDED_HOLD = 800;
const FADEOUT_DURATION = 900;

const INITIAL_CIRCLE_SIZE = 200;
const FINAL_CIRCLE_SIZE = 660;

// Diagonal line: ~10 o'clock to ~4 o'clock = -60° from horizontal
const INITIAL_LINE_ROTATION = -60;
const FINAL_LINE_ROTATION = 0;

export default function LoadingState({ onComplete }: LoadingStateProps) {
  const [phase, setPhase] = useState<Phase>('dormant');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Phase sequencer
    timerRef.current = setTimeout(() => {
      setPhase('aligning');
      timerRef.current = setTimeout(() => {
        setPhase('catalyst');
        timerRef.current = setTimeout(() => {
          setPhase('expanded');
          timerRef.current = setTimeout(() => {
            setPhase('fadeout');
            timerRef.current = setTimeout(() => {
              onComplete();
            }, FADEOUT_DURATION);
          }, EXPANDED_HOLD);
        }, CATALYST_DURATION);
      }, ALIGN_DURATION);
    }, DORMANT_DURATION);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onComplete]);

  const isDormant = phase === 'dormant';
  const isAligning = phase === 'aligning';
  const isCatalyst = phase === 'catalyst' || phase === 'expanded' || phase === 'fadeout';
  const isExpanded = phase === 'expanded' || phase === 'fadeout';
  const isFadeout = phase === 'fadeout';

  // Circle size
  const circleSize = isCatalyst ? FINAL_CIRCLE_SIZE : INITIAL_CIRCLE_SIZE;
  const circleBorderWidth = isCatalyst ? 1.5 : isAligning ? 1.2 : 1;

  // Line rotation
  const lineRotation = isDormant ? INITIAL_LINE_ROTATION : FINAL_LINE_ROTATION;

  // Line extends to screen width when catalyzed
  const lineWidth = isCatalyst ? '100vw' : `${INITIAL_CIRCLE_SIZE - 20}px`;

  // Border glow
  const circleBorderColor = isCatalyst
    ? 'rgba(52, 211, 153, 0.5)'
    : 'rgba(255, 255, 255, 0.15)';
  const circleBoxShadow = isCatalyst
    ? '0 0 40px 8px rgba(52, 211, 153, 0.15), inset 0 0 30px 4px rgba(52, 211, 153, 0.05)'
    : 'none';

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: isFadeout ? 0 : 1 }}
      transition={{ duration: FADEOUT_DURATION / 1000, ease: 'easeInOut' }}
      className="fixed inset-0 z-[100] bg-[#0a0a0a] flex items-center justify-center overflow-hidden"
    >
      {/* Background grid — fades in during catalyst */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: isCatalyst ? 0.04 : 0 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Subtle radial gradient behind circle during expansion */}
      <motion.div
        className="absolute pointer-events-none"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{
          opacity: isCatalyst ? 0.15 : 0,
          scale: isCatalyst ? 1.5 : 0.5,
        }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        style={{
          width: FINAL_CIRCLE_SIZE,
          height: FINAL_CIRCLE_SIZE,
          background: 'radial-gradient(circle, rgba(52,211,153,0.12) 0%, transparent 70%)',
        }}
      />

      {/* ===== Central Circle ===== */}
      <motion.div
        className="relative flex items-center justify-center"
        animate={{
          width: circleSize,
          height: circleSize,
        }}
        transition={{
          duration: isCatalyst ? 1 : 0,
          ease: [0.22, 1, 0.36, 1], // custom ease-out
        }}
        style={{ zIndex: 10 }}
      >
        {/* Circle border */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            borderColor: circleBorderColor,
            borderWidth: circleBorderWidth,
            boxShadow: circleBoxShadow,
          }}
          transition={{ duration: isCatalyst ? 0.8 : 0.3, ease: 'easeOut' }}
          style={{
            borderStyle: 'solid',
          }}
        />

        {/* "Calibrate Control" text — visible only in dormant/aligning */}
        <AnimatePresence>
          {!isCatalyst && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute z-20 text-center"
            >
              <span
                className="text-[10px] uppercase tracking-[0.35em] text-white/35 font-mono"
                style={{ letterSpacing: '0.35em' }}
              >
                Calibrate Control
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== Diagonal / Horizon Line ===== */}
        <motion.div
          className="absolute flex items-center justify-center"
          animate={{
            rotate: lineRotation,
          }}
          transition={{
            duration: isAligning ? ALIGN_DURATION / 1000 : 0,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{
            width: '100%',
            height: 0,
            zIndex: 15,
          }}
        >
          <motion.div
            className="relative"
            animate={{
              width: lineWidth,
            }}
            transition={{
              duration: isCatalyst ? 0.8 : 0,
              ease: [0.22, 1, 0.36, 1],
              delay: isCatalyst ? 0.1 : 0,
            }}
            style={{ height: '2px' }}
          >
            {/* Line base */}
            <motion.div
              className="absolute inset-0"
              animate={{
                background: isCatalyst
                  ? 'linear-gradient(90deg, transparent 0%, rgba(52,211,153,0.6) 15%, rgba(52,211,153,0.9) 50%, rgba(52,211,153,0.6) 85%, transparent 100%)'
                  : 'linear-gradient(90deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.12) 100%)',
                boxShadow: isCatalyst
                  ? '0 0 20px 4px rgba(52,211,153,0.3), 0 0 60px 8px rgba(52,211,153,0.1)'
                  : 'none',
              }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />

            {/* Ignition flash — brief bright pulse when line locks horizontal */}
            <AnimatePresence>
              {(isAligning || isCatalyst) && phase !== 'expanded' && phase !== 'fadeout' && (
                <motion.div
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{
                    duration: 0.6,
                    times: [0, 0.3, 1],
                    delay: isAligning ? ALIGN_DURATION / 1000 - 0.2 : 0,
                  }}
                  style={{
                    background: 'linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.9) 50%, transparent 90%)',
                    boxShadow: '0 0 30px 10px rgba(255,255,255,0.4)',
                    height: '2px',
                  }}
                />
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* ===== Extended Horizon Line (screen-width, behind the circle) ===== */}
      <AnimatePresence>
        {isCatalyst && (
          <motion.div
            className="absolute left-0 top-1/2 w-full pointer-events-none"
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            style={{
              height: '2px',
              transform: 'translateY(-50%)',
              background: 'linear-gradient(90deg, transparent 0%, rgba(52,211,153,0.5) 20%, rgba(52,211,153,0.8) 50%, rgba(52,211,153,0.5) 80%, transparent 100%)',
              boxShadow: '0 0 20px 5px rgba(52,211,153,0.2)',
              zIndex: 5,
            }}
          >
            {/* Breathing sub-layer matching tool's 8s cycle */}
            <motion.div
              className="w-full h-full"
              animate={{
                opacity: [0.4, 0.8, 0.4],
                scaleY: [1, 2, 1],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                background: 'linear-gradient(90deg, transparent 5%, rgba(52,211,153,0.4) 50%, transparent 95%)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Status text during expanded phase ===== */}
      <AnimatePresence>
        {isExpanded && !isFadeout && (
          <motion.div
            className="absolute z-30 flex flex-col items-center gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ bottom: 'calc(50% - 380px)' }}
          >
            <span className="text-[9px] uppercase tracking-[0.3em] text-emerald-400/70 font-mono">
              System Ready
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Scan lines during catalyst ===== */}
      <AnimatePresence>
        {isCatalyst && (
          <>
            <motion.div
              className="absolute left-0 top-1/2 pointer-events-none"
              initial={{ opacity: 0, x: '-100%' }}
              animate={{ opacity: [0, 0.6, 0], x: '100vw' }}
              transition={{ duration: 1.5, ease: 'linear', delay: 0.3 }}
              style={{
                width: '120px',
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
                zIndex: 20,
              }}
            />
          </>
        )}
      </AnimatePresence>

      {/* ===== Corner accents — fade in during catalyst ===== */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isCatalyst ? 0.15 : 0 }}
        transition={{ duration: 0.8, delay: isCatalyst ? 0.4 : 0 }}
        className="absolute top-8 left-8 w-12 h-12 border-t border-l border-white/20"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isCatalyst ? 0.15 : 0 }}
        transition={{ duration: 0.8, delay: isCatalyst ? 0.5 : 0 }}
        className="absolute top-8 right-8 w-12 h-12 border-t border-r border-white/20"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isCatalyst ? 0.15 : 0 }}
        transition={{ duration: 0.8, delay: isCatalyst ? 0.6 : 0 }}
        className="absolute bottom-8 left-8 w-12 h-12 border-b border-l border-white/20"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isCatalyst ? 0.15 : 0 }}
        transition={{ duration: 0.8, delay: isCatalyst ? 0.7 : 0 }}
        className="absolute bottom-8 right-8 w-12 h-12 border-b border-r border-white/20"
      />
    </motion.div>
  );
}