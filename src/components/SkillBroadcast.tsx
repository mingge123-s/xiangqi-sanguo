import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { SkillBroadcast as SB } from '../game/types';
import { FACTION_COLOR } from '../game/types';

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
          className="ink-splash pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 1.05, opacity: 0 }}
            className="text-center"
          >
            <div className="text-sm tracking-[0.6em]" style={{ color: FACTION_COLOR[data.faction] }}>
              {data.name}
            </div>
            <div className="mt-2 text-4xl font-bold tracking-[0.35em] text-paper drop-shadow">
              {data.skill}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
