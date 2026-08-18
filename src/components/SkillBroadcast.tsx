import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { SkillBroadcast as SB } from '../game/types';
import { FACTION_COLOR } from '../game/types';

/** Brief skill-name splash near the status band — never dims or covers the board. */
export function SkillBroadcast({
  data,
  onDone,
}: {
  data: SB | null;
  onDone: () => void;
}) {
  useEffect(() => {
    if (!data) return;
    const t = window.setTimeout(onDone, 700);
    return () => window.clearTimeout(t);
  }, [data, onDone]);

  return (
    <AnimatePresence>
      {data && (
        <motion.div
          key={`${data.name}-${data.skill}`}
          className="pointer-events-none absolute inset-x-0 top-[9%] z-40 flex justify-center px-4"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22 }}
        >
          <div className="skill-center-mask skill-center-mask-compact">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.02, opacity: 0 }}
              className="text-center"
            >
              <div className="text-[11px] tracking-[0.5em]" style={{ color: FACTION_COLOR[data.faction] }}>
                {data.name}
              </div>
              <div
                className="skill-center-text mt-0.5"
                style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.28em' }}
              >
                {data.skill}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
