import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { PieceView } from './Piece';
import { GanglieDice } from './GanglieDice';
import type { Piece, PieceType, Pos } from '../game/types';
import { posEq } from '../game/core';

const ROWS = 10;
const COLS = 9;
/** Visible disc ≤ this fraction of the smaller cell so neighbors never overlap. */
const PIECE_RATIO = 0.82;
const EDGE_SLACK = 2;

function BoardArt({
  w,
  h,
  pad,
  cell,
}: {
  w: number;
  h: number;
  pad: number;
  cell: number;
}) {
  const x = (c: number) => pad + c * cell;
  const y = (r: number) => pad + r * cell;
  const ink = '#3a2e20';
  const gridW = Math.max(0.7, cell * 0.032);
  const palaceW = Math.max(0.9, cell * 0.04);
  const font = Math.min(cell * 0.34, 15);

  const ranks: string[] = [];
  for (let r = 0; r < ROWS; r++) ranks.push(`M ${x(0)} ${y(r)} L ${x(8)} ${y(r)}`);
  const files: string[] = [];
  for (let c = 0; c < COLS; c++) {
    if (c === 0 || c === 8) {
      files.push(`M ${x(c)} ${y(0)} L ${x(c)} ${y(9)}`);
    } else {
      files.push(`M ${x(c)} ${y(0)} L ${x(c)} ${y(4)}`);
      files.push(`M ${x(c)} ${y(5)} L ${x(c)} ${y(9)}`);
    }
  }
  const palaces = [
    `M ${x(3)} ${y(0)} L ${x(5)} ${y(2)}`,
    `M ${x(5)} ${y(0)} L ${x(3)} ${y(2)}`,
    `M ${x(3)} ${y(7)} L ${x(5)} ${y(9)}`,
    `M ${x(5)} ${y(7)} L ${x(3)} ${y(9)}`,
  ];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="board-wood block">
      <defs>
        <linearGradient id="woodFill" x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stopColor="#e4d2ae" />
          <stop offset="48%" stopColor="#d6c194" />
          <stop offset="100%" stopColor="#cbb892" />
        </linearGradient>
        <linearGradient id="riverFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a8b892" stopOpacity="0.38" />
          <stop offset="50%" stopColor="#8aa878" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#a8b892" stopOpacity="0.38" />
        </linearGradient>
        <filter id="woodGrain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="3" seed="4" result="n" />
          <feColorMatrix
            in="n"
            type="matrix"
            values="0 0 0 0 0.42  0 0 0 0 0.32  0 0 0 0 0.16  0 0 0 0.07 0"
          />
        </filter>
      </defs>
      <rect width={w} height={h} fill="url(#woodFill)" />
      <rect width={w} height={h} filter="url(#woodGrain)" />
      <rect x={x(0)} y={y(4)} width={x(8) - x(0)} height={cell} fill="url(#riverFill)" />
      <rect x="1.4" y="1.4" width={w - 2.8} height={h - 2.8} fill="none" stroke="#2a1c10" strokeWidth="2.2" />
      <rect x="4.2" y="4.2" width={w - 8.4} height={h - 8.4} fill="none" stroke="#5a4530" strokeWidth="1" />
      {ranks.map((d, i) => (
        <path key={`r${i}`} d={d} stroke={ink} strokeWidth={gridW} fill="none" />
      ))}
      {files.map((d, i) => (
        <path key={`f${i}`} d={d} stroke={ink} strokeWidth={gridW} fill="none" />
      ))}
      {palaces.map((d, i) => (
        <path key={`p${i}`} d={d} stroke={ink} strokeWidth={palaceW} fill="none" />
      ))}
      <text
        x={x(2)}
        y={(y(4) + y(5)) / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={font}
        fill="#5c4a32"
        fontFamily="serif"
      >
        楚 河
      </text>
      <text
        x={x(6)}
        y={(y(4) + y(5)) / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={font}
        fill="#5c4a32"
        fontFamily="serif"
      >
        汉 界
      </text>
    </svg>
  );
}

export function Board({
  board,
  selected,
  legal,
  lastMove,
  highlights,
  disabled,
  onCell,
  peekedIds,
  showPeek,
  showCoverHint,
  yingshiMarkId,
  lockedPieceId,
  ganglieDice,
  onGanglieSettled,
}: {
  board: (Piece | null)[][];
  selected: Pos | Pos[] | null;
  legal: Pos[];
  lastMove: { from: Pos; to: Pos } | null;
  highlights: Pos[];
  disabled: boolean;
  onCell: (pos: Pos) => void;
  peekedIds?: string[];
  showPeek?: boolean;
  showCoverHint?: boolean;
  yingshiMarkId?: string;
  lockedPieceId?: string;
  ganglieDice?: { roll: number; capturerPos: Pos } | null;
  onGanglieSettled?: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [killBloom, setKillBloom] = useState<Pos | null>(null);
  const settledRef = useRef(false);

  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const measure = () => {
      setBox({ w: el.clientWidth, h: el.clientHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const availW = Math.max(0, box.w - 12);
  const availH = Math.max(0, box.h);
  // pad = pieceR + 2 = 0.41*cell + 2  →  W = 8.82*cell + 4,  H = 9.82*cell + 4
  const cell = Math.max(
    8,
    Math.min(
      availW > 4 ? (availW - 4) / 8.82 : 24,
      availH > 4 ? (availH - 4) / 9.82 : 24,
    ),
  );
  const pieceSize = PIECE_RATIO * cell;
  const pad = pieceSize / 2 + EDGE_SLACK;
  const boardW = pad * 2 + 8 * cell;
  const boardH = pad * 2 + 9 * cell;
  const ready = box.w > 0 && box.h > 0;
  const hit = Math.min(cell * 0.94, pieceSize + 10);
  const lastTint = pieceSize * 1.06;
  const bloomSize = pieceSize * 1.7;
  const legalDot = Math.max(4, cell * 0.16);
  const dieSize = Math.max(22, Math.min(pieceSize * 0.92, 36));
  const lastKey = lastMove
    ? `${lastMove.from.r},${lastMove.from.c}->${lastMove.to.r},${lastMove.to.c}`
    : '';
  const diceKey = ganglieDice
    ? `${ganglieDice.capturerPos.r},${ganglieDice.capturerPos.c}:${ganglieDice.roll}`
    : '';

  const handleGanglieSettled = useCallback(() => {
    if (settledRef.current) return;
    settledRef.current = true;
    if (ganglieDice && ganglieDice.roll % 2 === 1) {
      setKillBloom({ ...ganglieDice.capturerPos });
      window.setTimeout(() => setKillBloom(null), 800);
    }
    onGanglieSettled?.();
  }, [ganglieDice, onGanglieSettled]);

  useLayoutEffect(() => {
    settledRef.current = false;
  }, [diceKey]);

  return (
    <div
      ref={hostRef}
      className={`absolute inset-0 ${disabled ? 'pointer-events-none opacity-90' : ''}`}
    >
      {ready && (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: boardW, height: boardH }}
        >
          <BoardArt w={boardW} h={boardH} pad={pad} cell={cell} />
          <div className="absolute inset-0">
            {Array.from({ length: ROWS }, (_, r) =>
              Array.from({ length: COLS }, (_, c) => {
                const piece = board[r][c];
                const pos = { r, c };
                const selectedList = !selected ? [] : Array.isArray(selected) ? selected : [selected];
                const isSel = selectedList.some((p) => posEq(p, pos));
                const isLegal = legal.some((p) => posEq(p, pos));
                const isHi = highlights.some((p) => posEq(p, pos));
                const isLastFrom = !!(lastMove && posEq(lastMove.from, pos));
                const isLastTo = !!(lastMove && posEq(lastMove.to, pos));
                const isLast = isLastFrom || isLastTo;
                const showKillBloom = !!(killBloom && posEq(killBloom, pos));
                return (
                  <div
                    key={`${r}-${c}`}
                    className="absolute"
                    style={{
                      top: pad + r * cell,
                      left: pad + c * cell,
                      width: 0,
                      height: 0,
                    }}
                  >
                    <button
                      type="button"
                      aria-label={`${r},${c}`}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                      style={{ width: hit, height: hit }}
                      onClick={() => onCell(pos)}
                    />
                    {(isLastTo || showKillBloom) && (
                      <div
                        key={showKillBloom ? `kill-${r}-${c}` : lastKey}
                        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                        style={{ width: bloomSize, height: bloomSize, zIndex: 0 }}
                        aria-hidden
                      >
                        <div className="ink-landing-bloom" />
                      </div>
                    )}
                    {isLast && (
                      <div
                        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-stone-700/10"
                        style={{ width: lastTint, height: lastTint, zIndex: 1 }}
                      />
                    )}
                    {isHi && (
                      <div
                        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-amber-300/85"
                        style={{ width: pieceSize + 6, height: pieceSize + 6, zIndex: 1 }}
                      />
                    )}
                    {piece && lockedPieceId === piece.id && (
                      <div
                        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-[2.5px] ring-[#6b8f71]/95"
                        style={{ width: pieceSize + 10, height: pieceSize + 10, zIndex: 1 }}
                      />
                    )}
                    {isLegal && !piece && (
                      <div
                        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3d2a14]/70"
                        style={{ width: legalDot, height: legalDot, zIndex: 1 }}
                      />
                    )}
                    {isLegal && piece && (
                      <div
                        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-red-800/70"
                        style={{ width: pieceSize + 4, height: pieceSize + 4, zIndex: 1 }}
                      />
                    )}
                    {piece && (
                      <PieceView
                        piece={piece}
                        selected={isSel}
                        size={pieceSize}
                        peeked={!!(showPeek && peekedIds?.includes(piece.id))}
                        peekMark={yingshiMarkId === piece.id ? '鹰' : '观'}
                        locked={lockedPieceId === piece.id}
                        coverHint={
                          showCoverHint && !piece.revealed && piece.side === 'black'
                            ? (piece.coverType as PieceType)
                            : undefined
                        }
                        onPointer={() => onCell(pos)}
                      />
                    )}
                  </div>
                );
              }),
            )}
          </div>
          {ganglieDice && (
            <GanglieDice
              key={diceKey}
              roll={ganglieDice.roll}
              landLeft={pad + ganglieDice.capturerPos.c * cell}
              landTop={pad + ganglieDice.capturerPos.r * cell}
              size={dieSize}
              onSettled={handleGanglieSettled}
            />
          )}
        </div>
      )}
    </div>
  );
}
