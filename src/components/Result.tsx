import { motion } from 'framer-motion';
import type { Side } from '../game/types';

export function Result({ winner, onAgain }: { winner: Side; onAgain: () => void }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-8 px-6">
      <motion.div
        initial={{ scale: 0.86, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center"
      >
        <div className="text-xs tracking-[0.5em] text-aged">对局终</div>
        <div className="mt-4 text-6xl font-bold tracking-[0.25em] text-ink">
          {winner === 'red' ? '红胜' : '黑胜'}
        </div>
        <div className="mt-3 text-sm text-ink-soft/80">
          {winner === 'red' ? '河山尽入君手' : '将星黯淡，再整旗鼓'}
        </div>
      </motion.div>
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={onAgain}
        className="rounded-full border border-aged/55 bg-paper/40 px-12 py-3 text-lg tracking-[0.4em] text-ink"
      >
        再来一局
      </motion.button>
    </div>
  );
}
