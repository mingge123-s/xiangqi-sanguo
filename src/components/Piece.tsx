import { motion } from 'framer-motion';
import { CHAR, COVER_CHAR } from '../game/types';
import type { Piece as PieceT, PieceType } from '../game/types';

/** Vermilion / pine-soot ink on cream 水墨 tokens. */
function inkColor(side: PieceT['side']) {
  return side === 'red' ? '#b8332a' : '#2a2520';
}

/** Soft brush-like ring via radial wash (slightly uneven opacity at the edge). */
function SoftInkRing({
  size,
  insetPx,
  strokePx,
  color,
  soft = false,
}: {
  size: number;
  insetPx: number;
  strokePx: number;
  color: string;
  soft?: boolean;
}) {
  const dim = Math.max(0, size - insetPx * 2);
  const mid = dim / 2;
  const outer = mid;
  const inner = Math.max(0, mid - strokePx);
  const fade = Math.max(0.8, strokePx * 0.55);
  const a = soft ? 0.72 : 0.88;
  const aEdge = soft ? 0.28 : 0.38;

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute rounded-full"
      style={{
        width: dim,
        height: dim,
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        background: `
          radial-gradient(circle,
            transparent ${Math.max(0, inner - fade)}px,
            ${color}${soft ? '38' : '55'} ${inner}px,
            ${color}${Math.round(a * 255)
              .toString(16)
              .padStart(2, '0')} ${(inner + outer) / 2}px,
            ${color}${Math.round(aEdge * 255)
              .toString(16)
              .padStart(2, '0')} ${outer - 0.35}px,
            transparent ${outer + fade * 0.35}px
          )
        `,
        filter: 'blur(0.35px)',
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
  statusMark,
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
  /** 棋面状态印（鬼/反/离/青/啖/空/武等），明棋暗棋均显示 */
  statusMark?: string;
  locked?: boolean;
  onPointer: () => void;
}) {
  const ink = inkColor(piece.side);
  const hit = size;
  const font = Math.max(10, size * 0.46);
  const outerW = Math.max(1.5, size * 0.058);
  const innerW = Math.max(1.05, size * 0.04);
  const ringInset = Math.max(1.4, size * 0.048);
  const innerInset = Math.max(3.4, size * 0.115);
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
        <SoftInkRing size={size} insetPx={ringInset} strokePx={outerW} color={ink} soft={dark} />
        {!dark && (
          <SoftInkRing size={size} insetPx={innerInset} strokePx={innerW} color={ink} />
        )}
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
        {showPeek && !statusMark && (
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
        {statusMark && (
          <span
            className="pointer-events-none absolute font-bold"
            style={{
              top: size * 0.06,
              right: size * 0.08,
              fontSize: Math.max(8, size * 0.26),
              color: '#2a2520',
              lineHeight: 1,
              textShadow: '0 0 0.5px rgba(244,234,214,0.9)',
              fontFamily: 'serif',
            }}
            aria-label={`状态印：${statusMark}`}
          >
            {statusMark}
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
