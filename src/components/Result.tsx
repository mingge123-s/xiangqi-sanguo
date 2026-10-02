import { motion } from 'framer-motion';
import type { GameState, Side } from '../game/types';
import { resultDescription } from '../game/resultDescription';

export function Result({ winner, reason, onAgain, onBack }: { winner: Side; reason?: GameState['resultReason']; onAgain: () => void; onBack: () => void }) {
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
          {resultDescription(reason).title} · {resultDescription(reason).detail}
        </div>
      </motion.div>
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={onAgain}
        className="result-again"
      >
        再来一局
      </motion.button>
      <button type="button" className="result-back" onClick={onBack}>返回棋盘查看</button>
    </main>
  );
}
