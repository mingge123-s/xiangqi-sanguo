import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Pos } from '../game/types';

const PIP_CN: Record<number, string> = {
  1: '一',
  2: '二',
  3: '三',
  4: '四',
  5: '五',
  6: '六',
};

/** Pip coordinates on a 3×3 face grid. */
const FACE_PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [
    [0, 0],
    [2, 2],
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  4: [
    [0, 0],
    [0, 2],
    [2, 0],
    [2, 2],
  ],
  5: [
    [0, 0],
    [0, 2],
    [1, 1],
    [2, 0],
    [2, 2],
  ],
  6: [
    [0, 0],
    [0, 1],
    [0, 2],
    [2, 0],
    [2, 1],
    [2, 2],
  ],
};

const SETTLE: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: -90, y: 0 },
  3: { x: 0, y: -90 },
  4: { x: 0, y: 90 },
  5: { x: 90, y: 0 },
  6: { x: 0, y: 180 },
};

function Face({ n, size }: { n: number; size: number }) {
  const pips = FACE_PIPS[n] ?? [];
  const pip = Math.max(3, size * 0.16);
  const gap = size * 0.22;
  const origin = size / 2 - gap - pip / 2;
  return (
    <div className="ganglie-die-face" style={{ width: size, height: size }}>
      {pips.map(([r, c], i) => (
        <span
          key={i}
          className="ganglie-die-pip"
          style={{
            width: pip,
            height: pip,
            left: origin + c * gap,
            top: origin + r * gap,
          }}
        />
      ))}
    </div>
  );
}

export function GanglieDice({
  roll,
  landLeft,
  landTop,
  size,
  onSettled,
}: {
  roll: number;
  landLeft: number;
  landTop: number;
  size: number;
  onSettled: () => void;
}) {
  const [phase, setPhase] = useState<'fly' | 'settle' | 'done'>('fly');
  const odd = roll % 2 === 1;
  const caption = odd ? `${PIP_CN[roll]} · 刚烈` : `${PIP_CN[roll]} · 未触发`;
  const half = size / 2;
  const settle = SETTLE[roll] ?? SETTLE[1];

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase('settle'), 920);
    const t2 = window.setTimeout(() => {
      setPhase('done');
      onSettled();
    }, 1600);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [onSettled, roll]);

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-visible" aria-hidden>
      <motion.div
        className="absolute"
        style={{ left: landLeft, top: landTop, width: 0, height: 0 }}
        initial={{ x: -size * 1.6, y: -size * 3.4, opacity: 0, scale: 0.5 }}
        animate={{
          x: 0,
          y: 0,
          opacity: phase === 'done' && !odd ? 0 : 1,
          scale: 1,
        }}
        transition={{
          type: 'spring',
          stiffness: 130,
          damping: 15,
          mass: 0.85,
          opacity: { duration: 0.3 },
        }}
      >
        <div
          className="ganglie-die-scene"
          style={{
            width: size,
            height: size,
            marginLeft: -half,
            marginTop: -half,
            perspective: size * 7,
          }}
        >
          <motion.div
            className="ganglie-die-cube"
            style={{ width: size, height: size }}
            initial={{ rotateX: -55, rotateY: 40, rotateZ: -25 }}
            animate={
              phase === 'fly'
                ? {
                    rotateX: [-55, 180, 360, 480],
                    rotateY: [40, -120, 200, 320],
                    rotateZ: [-25, 60, -30, 8],
                  }
                : {
                    rotateX: settle.x,
                    rotateY: settle.y,
                    rotateZ: 0,
                  }
            }
            transition={
              phase === 'fly'
                ? { duration: 0.92, ease: [0.2, 0.75, 0.25, 1] }
                : { duration: 0.32, ease: 'easeOut' }
            }
          >
            <div className="ganglie-die-face-wrap" style={{ transform: `translateZ(${half}px)` }}>
              <Face n={1} size={size} />
            </div>
            <div
              className="ganglie-die-face-wrap"
              style={{ transform: `rotateY(180deg) translateZ(${half}px)` }}
            >
              <Face n={6} size={size} />
            </div>
            <div
              className="ganglie-die-face-wrap"
              style={{ transform: `rotateY(90deg) translateZ(${half}px)` }}
            >
              <Face n={3} size={size} />
            </div>
            <div
              className="ganglie-die-face-wrap"
              style={{ transform: `rotateY(-90deg) translateZ(${half}px)` }}
            >
              <Face n={4} size={size} />
            </div>
            <div
              className="ganglie-die-face-wrap"
              style={{ transform: `rotateX(90deg) translateZ(${half}px)` }}
            >
              <Face n={2} size={size} />
            </div>
            <div
              className="ganglie-die-face-wrap"
              style={{ transform: `rotateX(-90deg) translateZ(${half}px)` }}
            >
              <Face n={5} size={size} />
            </div>
          </motion.div>
        </div>

        <AnimatePresence>
          {phase !== 'fly' && (
            <motion.div
              className="ganglie-die-caption"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ width: size * 2.4, marginLeft: -size * 1.2, marginTop: size * 0.58 }}
            >
              {caption}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export type GanglieDicePending = {
  roll: number;
  capturerPos: Pos;
};
