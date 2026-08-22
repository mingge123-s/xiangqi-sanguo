import { motion } from 'framer-motion';
import type { Side } from '../game/types';

export function Result({ winner, onAgain }: { winner: Side; onAgain: () => void }) {
  return (
    <main className="result-screen">
      <motion.div
        initial={{ scale: 0.86, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="result-copy"
      >
        <div className="result-kicker">对局终</div>
        <div className="result-title">
          {winner === 'red' ? '红胜' : '黑胜'}
        </div>
        <div className="result-subtitle">
          {winner === 'red' ? '河山尽入君手' : '将星黯淡，再整旗鼓'}
        </div>
      </motion.div>
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={onAgain}
        className="result-again"
      >
        再来一局
      </motion.button>
    </main>
  );
}
