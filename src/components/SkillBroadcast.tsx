import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Piece, Side, SkillBroadcast as SB } from '../game/types';
import type { PieceStatusTone } from './pieceStatus';
import { PieceView } from './Piece';
import { SkillPromptPiece } from './SkillPromptPiece';
import tasselUrl from '../assets/command-tassel.webp';
import targetStreakUrl from '../assets/skill-target-streak.webp';

/** Expanded horizontal command scroll for a resolved skill. */
export function SkillBroadcast({
  data,
  lines,
  targetPiece,
  targetMark,
  targetTone,
  sourceSide,
  onDone,
}: {
  data: SB | null;
  lines: string[];
  targetPiece?: Piece;
  targetMark?: string;
  targetTone?: PieceStatusTone;
  sourceSide: Side;
  onDone: () => void;
}) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!data) return;
    const t = window.setTimeout(onDone, 1750);
    return () => window.clearTimeout(t);
  }, [data, onDone]);

  return (
    <AnimatePresence>
      {data && (
        <motion.div
          key={`${data.name}-${data.skill}`}
          className="skill-broadcast-slot"
          role="status"
          aria-live="assertive"
          aria-label={`${data.name}发动${data.skill}。${lines.join('，')}`}
          initial={reduceMotion ? false : { opacity: 0, scaleX: 0.35 }}
          animate={{ opacity: 1, scaleX: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scaleX: 0.72 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        >
          <div className="skill-broadcast-scroll" aria-hidden>
            <motion.div
              className="skill-broadcast-title"
              initial={reduceMotion ? false : { opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: reduceMotion ? 0 : 0.12, duration: 0.24 }}
            >
              <strong>{data.skill}</strong>
              <SkillPromptPiece
                side={sourceSide}
                label={sourceSide === 'red' ? '帅' : '敌'}
                compact
              />
            </motion.div>
            <motion.div
              className="skill-broadcast-copy"
              initial={reduceMotion ? false : { opacity: 0, filter: 'blur(5px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              transition={{ delay: reduceMotion ? 0 : 0.18, duration: 0.3 }}
            >
              {lines.slice(0, 2).map((line) => <span key={line}>{line}</span>)}
            </motion.div>
            <motion.div
              className="skill-broadcast-target"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.66, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: reduceMotion ? 0 : 0.2, type: 'spring', stiffness: 320, damping: 22 }}
            >
              <img src={targetStreakUrl} className="skill-broadcast-target-streak" alt="" />
              <span className="skill-broadcast-target-piece">
                {targetPiece ? (
                  <PieceView
                    piece={targetPiece}
                    selected={false}
                    size={38}
                    statusMark={targetMark}
                    statusTone={targetTone}
                    tabIndex={-1}
                    onPointer={() => undefined}
                  />
                ) : (
                  <span className="skill-broadcast-fallback-seal">{data.skill.slice(0, 1)}</span>
                )}
              </span>
              <img src={tasselUrl} className="skill-broadcast-tassel" alt="" />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
