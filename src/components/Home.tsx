import { ArrowRight, BookOpen } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'framer-motion';

const SHOWCASE = [
  { id: 'zhouyu', name: '周瑜', title: '江东儒将' },
  { id: 'zhuge', name: '诸葛亮', title: '卧龙运筹' },
  { id: 'guanyu', name: '关羽', title: '武圣临阵' },
];

export function Home({ onStart }: { onStart: () => void }) {
  const reducedMotion = useReducedMotion();
  return (
    <main className="home-screen">
      <div className="home-mountain home-mountain-top" aria-hidden />
      <div className="home-heading">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="home-kicker"
        >
          揭棋 · 三国将星
        </motion.div>
        <motion.h1
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="home-title"
        >
          象棋三国
        </motion.h1>
        <motion.p
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="home-subtitle"
        >
          揭棋开局，暗子伏兵，将星照河山
        </motion.p>
      </div>

      <motion.div
        className="home-generals"
        aria-hidden="true"
        initial={reducedMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.16 }}
      >
        {SHOWCASE.map((general, index) => (
          <div className={`home-general${index === 1 ? ' home-general-lead' : ''}`} key={general.id}>
            <div className="home-general-portrait">
              <img src={`${import.meta.env.BASE_URL}generals/${general.id}.webp`} alt="" width="112" height="112" />
            </div>
            <strong>{general.name}</strong>
            <span>{general.title}</span>
          </div>
        ))}
      </motion.div>

      <section className="home-command" aria-label="开始游戏">
        <p className="home-command-note">十三将星入局，一子亦可翻盘</p>
        <motion.button type="button" whileTap={reducedMotion ? undefined : { scale: 0.98 }} onClick={onStart} className="home-start">
          <span className="home-start-seal" aria-hidden>战</span>
          <span>开始对局</span>
          <ArrowRight size={21} weight="light" aria-hidden />
        </motion.button>
        <a className="home-wiki" href={`${import.meta.env.BASE_URL}wiki.html`}>
          <BookOpen size={20} weight="light" aria-hidden />
          查看武将图鉴
        </a>
      </section>

      <section className="home-rules" aria-labelledby="home-rule-title">
        <h2 id="home-rule-title">入局须知</h2>
        <p><span>一</span>开局仅将帅明置，其余暗子依原位走法翻开。</p>
        <p><span>二</span>你执红先行，每方携三名将星，各有独门技能。</p>
        <p><span>三</span>无合法走法且技能无法解围时判负；飞将照面视为将军。</p>
      </section>
      <div className="home-mountain home-mountain-bottom" aria-hidden />
    </main>
  );
}
