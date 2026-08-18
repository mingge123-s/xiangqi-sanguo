import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Side } from '../game/types';

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
  const accent = side === 'red' ? '#9b1c1c' : '#cbb892';

  return (
    <AnimatePresence>
      {side && (
        <motion.div
          key={side}
          className="pointer-events-none absolute inset-0 z-[36] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <div className="skill-center-mask">
            <motion.div
              initial={{ scale: 0.82, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.04, opacity: 0 }}
              className="skill-center-text text-center"
              style={{ color: accent, fontSize: 28, letterSpacing: '0.35em', fontWeight: 700 }}
            >
              {label}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
