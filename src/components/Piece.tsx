import { motion } from 'framer-motion';
import { CHAR, COVER_CHAR } from '../game/types';
import type { Piece as PieceT, PieceType } from '../game/types';

export function PieceView({
  piece,
  selected,
  size,
  dimmed,
  peeked,
  coverHint,
  peekMark,
  locked,
  onPointer,
}: {
  piece: PieceT;
  selected: boolean;
  size: number;
  dimmed?: boolean;
  peeked?: boolean;
  coverHint?: PieceType;
  peekMark?: string;
  locked?: boolean;
  onPointer: () => void;
}) {
  const red = piece.side === 'red';
  const ink = red ? '#9b1c1c' : '#1a1410';
  const hit = size;
  const font = Math.max(10, size * 0.46);
  const outerW = Math.max(1.6, size * 0.06);
  const innerW = Math.max(1.25, size * 0.05);
  const innerInset = Math.max(2.2, size * 0.075);
  const dark = !piece.revealed;
  const showPeek = dark && peeked;
  const hint = dark && coverHint ? COVER_CHAR[coverHint] : null;

  return (
    <motion.button
      type="button"
      onClick={onPointer}
      onContextMenu={(e) => {
        e.preventDefault();
        onPointer();
      }}
      animate={{
        y: selected ? -3 : 0,
        scale: selected ? 1.04 : 1,
        opacity: dimmed ? 0.45 : 1,
      }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-transparent p-0"
      style={{ width: hit, height: hit, zIndex: selected ? 5 : 2 }}
    >
      <span
        className="wood-token relative flex items-center justify-center rounded-full"
        style={{
          width: size,
          height: size,
          border: `${outerW}px solid ${ink}`,
          boxShadow: selected
            ? 'inset 0 1px 2px rgba(255,240,210,0.5), inset 0 -2px 3px rgba(60,30,10,0.28), 0 0 0 2px #c9a227, 0 3px 6px rgba(0,0,0,0.35)'
            : locked
              ? 'inset 0 1px 2px rgba(255,240,210,0.45), inset 0 -2px 3px rgba(60,30,10,0.28), 0 0 0 2.5px #6b8f71, 0 0 10px rgba(90,130,95,0.45)'
              : undefined,
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute rounded-full"
          style={{
            inset: innerInset,
            border: `${innerW}px solid ${ink}`,
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-[18%] rounded-full"
          style={{
            background: 'radial-gradient(circle at 32% 28%, rgba(255,244,220,0.4), transparent 58%)',
          }}
        />
        {!dark && (
          <span
            className="relative font-bold leading-none"
            style={{ color: ink, fontSize: font }}
          >
            {CHAR[piece.side][piece.type]}
          </span>
        )}
        {showPeek && (
          <span
            className="relative font-bold leading-none"
            style={{ color: ink, fontSize: font, opacity: 0.42 }}
          >
            {CHAR[piece.side][piece.type]}
          </span>
        )}
        {showPeek && (
          <span
            className="pointer-events-none absolute"
            style={{
              top: size * 0.08,
              right: size * 0.1,
              fontSize: Math.max(7, size * 0.22),
              color: '#6b4c8a',
              lineHeight: 1,
            }}
          >
            {peekMark ?? '观'}
          </span>
        )}
        {hint && !showPeek && (
          <span
            className="pointer-events-none absolute"
            style={{
              bottom: size * 0.1,
              fontSize: Math.max(7, size * 0.22),
              color: ink,
              opacity: 0.55,
              lineHeight: 1,
            }}
          >
            {hint}
          </span>
        )}
      </span>
    </motion.button>
  );
}
