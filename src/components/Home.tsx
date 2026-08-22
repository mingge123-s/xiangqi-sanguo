import { motion } from 'framer-motion';

export function Home({ onStart }: { onStart: () => void }) {
  return (
    <main className="home-screen">
      <div className="home-mountain home-mountain-top" aria-hidden />
      <div className="home-heading">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="home-kicker"
        >
          揭棋 · 三国将星
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="home-title"
        >
          象棋三国
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="home-subtitle"
        >
          揭棋开局，暗子伏兵，将星照河山
        </motion.p>
      </div>

      <section className="home-command" aria-label="开始游戏">
        <motion.button whileTap={{ scale: 0.97 }} onClick={onStart} className="home-start">
          <span className="home-start-seal" aria-hidden>战</span>
          <span>开始对局</span>
        </motion.button>
        <a className="home-wiki" href={`${import.meta.env.BASE_URL}wiki.html`}>
          查看武将图鉴
        </a>
      </section>

      <section className="home-rules" aria-labelledby="home-rule-title">
        <h2 id="home-rule-title">入局须知</h2>
        <p><span>一</span>开局仅将帅明置，其余暗子依原位走法翻开。</p>
        <p><span>二</span>你执红先行，每方携三名将星，各有独门技能。</p>
        <p><span>三</span>将死或无子可动即负，飞将照面视为将军。</p>
      </section>
      <div className="home-mountain home-mountain-bottom" aria-hidden />
    </main>
  );
}
