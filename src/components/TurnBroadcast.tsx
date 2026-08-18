import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Side } from '../game/types';

/** Compact turn splash for a skill-slot (never covers the board). */
export function TurnBroadcast({
  side,
  onDone,
}: {
  side: Side | null;
  onDone: () => void;
}) {
  useEffect(() => {
    if (!side) return;
    const t = window.setTimeout(onDone, 850);
    return () => window.clearTimeout(t);
  }, [side, onDone]);

  const label = side === 'red' ? '红方回合' : '黑方回合';
  const accent = side === 'red' ? '#9b1c1c' : '#1a1410';

  return (
    <AnimatePresence>
      {side && (
        <motion.div
          key={side}
          className="skill-slot-splash"
          initial={{ opacity: 0, y: side === 'red' ? 6 : -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <div className="skill-center-mask skill-center-mask-compact">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.02, opacity: 0 }}
              className="skill-center-text"
              style={{ color: accent, fontSize: 16, letterSpacing: '0.28em', fontWeight: 700 }}
            >
              {label}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
