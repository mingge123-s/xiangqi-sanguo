import { motion } from 'framer-motion';
import { CHAR, COVER_CHAR } from '../game/types';
import type { Piece as PieceT, PieceType } from '../game/types';

/** Vermilion / pine-soot ink on cream 水墨 tokens. */
function inkColor(side: PieceT['side']) {
  return side === 'red' ? '#b8332a' : '#2a2520';
}

function SoftInkRing({
  inset,
  width,
  color,
  soft = false,
}: {
  inset: number;
  width: number;
  color: string;
  soft?: boolean;
}) {
  const bleed = Math.max(0.6, width * 0.55);
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute rounded-full"
      style={{
        inset,
        boxShadow: soft
          ? `inset 0 0 0 ${width}px ${color}, inset 0 0 ${bleed}px ${width * 0.35}px ${color}55`
          : `inset 0 0 0 ${width}px ${color}, inset 0 0 ${bleed * 0.7}px ${width * 0.25}px ${color}40`,
        opacity: soft ? 0.78 : 0.9,
        filter: 'blur(0.2px)',
      }}
    />
  );
}

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
  const ink = inkColor(piece.side);
  const hit = size;
  const font = Math.max(10, size * 0.46);
  const outerW = Math.max(1.4, size * 0.055);
  const innerW = Math.max(1.0, size * 0.038);
  const ringInset = Math.max(1.6, size * 0.055);
  const innerInset = Math.max(3.2, size * 0.11);
  const dark = !piece.revealed;
  const showPeek = dark && peeked;
  const hint = dark && coverHint ? COVER_CHAR[coverHint] : null;

  const thickness =
    'inset 0.5px 0.5px 1.2px rgba(255,252,245,0.85), inset -0.6px -0.9px 1.6px rgba(70,55,35,0.14), 0.6px 1.4px 3px rgba(35,28,18,0.2)';

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
          boxShadow: selected
            ? `${thickness}, 0 0 0 2px #c9a227`
            : locked
              ? `${thickness}, 0 0 0 2.5px #6b8f71, 0 0 10px rgba(90,130,95,0.45)`
              : undefined,
        }}
      >
        {/* Outer soft ink ring — face-up gets a very soft inner companion */}
        <SoftInkRing inset={ringInset} width={outerW} color={ink} soft={dark} />
        {!dark && <SoftInkRing inset={innerInset} width={innerW} color={ink} />}
        {!dark && (
          <span
            className="relative font-bold leading-none"
            style={{
              color: ink,
              fontSize: font,
              textShadow: '0 0 0.6px currentColor',
            }}
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
