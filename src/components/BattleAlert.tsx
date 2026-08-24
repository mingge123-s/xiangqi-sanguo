import { motion, useReducedMotion } from 'framer-motion';
import type { Side } from '../game/types';

export interface BattleAlertData {
  id: string;
  kind: 'check' | 'mate';
  victim: Side;
  winner?: Side;
}

export function BattleAlert({ alert }: { alert: BattleAlertData }) {
  const reduceMotion = useReducedMotion();
  const playerThreatened = alert.victim === 'red';
  const isMate = alert.kind === 'mate';
  const title = isMate ? '绝杀' : playerThreatened ? '被将军' : '将军';
  const kicker = isMate ? '一击定局' : playerThreatened ? '敌锋压境' : '将锋已至';
  const subtitle = isMate
    ? alert.winner === 'red'
      ? '敌方将帅无路可走 · 红方胜'
      : '我方将帅陷落 · 红方败'
    : playerThreatened
      ? '将帅受制 · 请立即解围'
      : '敌方将帅已受制';

  return (
    <motion.div
      className={`battle-alert battle-alert-${alert.kind} battle-alert-victim-${alert.victim}`}
      role="status"
      aria-live="assertive"
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        x: reduceMotion ? 0 : [0, -4, 3, -2, 0],
      }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0.01 : 0.42, ease: 'easeOut' }}
    >
      <motion.span
        className="battle-alert-shockwave"
        initial={reduceMotion ? false : { opacity: 0.8, scale: 0.35 }}
        animate={{ opacity: 0, scale: isMate ? 1.7 : 1.35 }}
        transition={{ duration: isMate ? 1.05 : 0.72, ease: 'easeOut' }}
        aria-hidden
      />
      <motion.div
        className="battle-alert-scroll"
        initial={reduceMotion ? false : { opacity: 0, scaleX: 0.32 }}
        animate={{ opacity: 1, scaleX: 1 }}
        exit={{ opacity: 0, scaleX: 1.05 }}
        transition={{ duration: isMate ? 0.52 : 0.38, ease: [0.2, 0.78, 0.16, 1] }}
      >
        <span className="battle-alert-kicker">{kicker}</span>
        <motion.strong
          initial={reduceMotion ? false : { opacity: 0, scale: 1.48, rotate: -4 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ delay: 0.12, duration: 0.38, ease: 'easeOut' }}
        >
          {title}
        </motion.strong>
        <span className="battle-alert-subtitle">{subtitle}</span>
        <span className="battle-alert-seal" aria-hidden>{isMate ? '终' : '危'}</span>
      </motion.div>
    </motion.div>
  );
}
