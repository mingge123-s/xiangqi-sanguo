import { motion } from 'framer-motion';

export function Home({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-between px-6 py-10">
      <div className="mt-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[13px] tracking-[0.35em] text-paper-dim"
        >
          揭棋 · 三国将星
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mt-4 text-5xl font-bold tracking-[0.2em] text-paper"
        >
          象棋三国
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-4 text-sm tracking-widest text-paper-dim"
        >
          揭棋开局，暗子伏兵，将星照河山
        </motion.p>
      </div>

      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={onStart}
        className="rounded-full border border-paper-dim/40 bg-paper/10 px-12 py-3 text-lg tracking-[0.4em] text-paper shadow-[0_0_24px_rgba(232,220,196,0.08)]"
      >
        开始对局
      </motion.button>

      <div className="mb-4 max-w-[320px] space-y-2 text-center text-[12px] leading-6 text-paper-dim/90">
        <p>揭棋：开局仅将/帅明置，其余暗子按原位走法翻开。每方 3 名将星。</p>
        <p>红方先手，你执红，对阵黑方 AI。</p>
        <p>将死或无子可动即负。飞将面对面视为将军。</p>
      </div>
    </div>
  );
}
