import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { PieceView } from './Piece';
import { GanglieDice } from './GanglieDice';
import { CapturedRail } from './CapturedRail';
import type { Piece, PieceType, Pos } from '../game/types';
import { posEq } from '../game/core';

const ROWS = 10;
const COLS = 9;
/** Visible disc ≤ this fraction of the smaller cell so neighbors never overlap. */
const PIECE_RATIO = 0.82;
const EDGE_SLACK = 2;
/** Vertical reserve per announce slot — must match .skill-slot height in styles.css. */
const SLOT_RESERVE = 44;

function BoardArt({
  w,
  h,
  pad,
  cellX,
  cellY,
  rail,
}: {
  w: number;
  h: number;
  pad: number;
  cellX: number;
  cellY: number;
  rail: number;
}) {
  const x = (c: number) => rail + pad + c * cellX;
  const y = (r: number) => pad + r * cellY;
  const ink = '#3a2e20';
  const gridW = Math.max(0.7, cellX * 0.032);
  const palaceW = Math.max(0.9, cellX * 0.04);
  const font = Math.min(cellX * 0.34, 15);

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
      <rect x="0" y="0" width={rail} height={h} fill="#6c4c2f" opacity="0.9" />
      <rect x={w - rail} y="0" width={rail} height={h} fill="#6c4c2f" opacity="0.9" />
      <rect x={rail} y="0" width="2" height={h} fill="#2b1b10" opacity="0.48" />
      <rect x={w - rail - 2} y="0" width="2" height={h} fill="#2b1b10" opacity="0.48" />
      <rect x={x(0)} y={y(4)} width={x(8) - x(0)} height={cellY} fill="url(#riverFill)" />
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
  capturedRed,
  capturedBlack,
  disabled,
  onCell,
  peekedIds,
  showPeek,
  showCoverHint,
  yingshiMarkId,
  lockedPieceId,
  fanjianMarkId,
  lijianMarkId,
  guicaiMarkId,
  qingnangMarkId,
  danjingMarkId,
  kongchengMarkId,
  wushengMarkId,
  ganglieDice,
  onGanglieSettled,
  topSlot,
  bottomSlot,
}: {
  board: (Piece | null)[][];
  selected: Pos | Pos[] | null;
  legal: Pos[];
  lastMove: { from: Pos; to: Pos } | null;
  highlights: Pos[];
  capturedRed?: Piece[];
  capturedBlack?: Piece[];
  disabled: boolean;
  onCell: (pos: Pos) => void;
  peekedIds?: string[];
  showPeek?: boolean;
  showCoverHint?: boolean;
  yingshiMarkId?: string;
  lockedPieceId?: string;
  /** 反间标记子 id → 棋面「反」印 */
  fanjianMarkId?: string;
  /** 离间标记子 id → 棋面「离」印 */
  lijianMarkId?: string;
  /** 鬼才锁定子 id → 棋面「鬼」印 */
  guicaiMarkId?: string;
  /** 青囊刚挪动子 id → 棋面「青」印 */
  qingnangMarkId?: string;
  /** 啖睛标记子 id → 棋面「啖」印 */
  danjingMarkId?: string;
  /** 空城受护子 id → 棋面「空」印 */
  kongchengMarkId?: string;
  /** 武圣受护子 id → 棋面「武」印 */
  wushengMarkId?: string;
  ganglieDice?: { roll: number; capturerPos: Pos } | null;
  onGanglieSettled?: () => void;
  /** Announce strip flush to the wood board's top edge. */
  topSlot?: ReactNode;
  /** Announce strip flush to the wood board's bottom edge. */
  bottomSlot?: ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [killBloom, setKillBloom] = useState<Pos | null>(null);
  const settledRef = useRef(false);
  const hasTopSlot = topSlot != null;
  const hasBottomSlot = bottomSlot != null;

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

  const availW = Math.max(0, box.w - 6);
  const slotPad =
    (hasTopSlot ? SLOT_RESERVE : 0) + (hasBottomSlot ? SLOT_RESERVE : 0);
  const availH = Math.max(0, box.h - slotPad);
  // Side prisoner rails add one cell in total. Board and grid remain centered and stable.
  const cell = Math.max(
    8,
    Math.min(
      availW > 4 ? (availW - 4) / 9.82 : 24,
      availH > 4 ? (availH - 4) / 10.18 : 24,
    ),
  );
  const cellY = cell * 1.04;
  const pieceSize = PIECE_RATIO * cell;
  const pad = pieceSize / 2 + EDGE_SLACK;
  const rail = Math.max(14, cell * 0.5);
  const boardW = rail * 2 + pad * 2 + 8 * cell;
  const boardH = pad * 2 + 9 * cellY;
  const ready = box.w > 0 && box.h > 0;
  const hit = Math.min(cell * 0.94, pieceSize + 10);
  const lastTint = pieceSize * 1.06;
  const bloomSize = pieceSize * 1.7;
  const legalTarget = Math.max(19, pieceSize * 0.74);
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
    <div ref={hostRef} className="absolute inset-0">
      {ready && (
        <div
          className="board-stack"
          style={{ width: boardW }}
        >
          {hasTopSlot && topSlot}
          <div
            className={`relative shrink-0 ${disabled ? 'pointer-events-none opacity-90' : ''}`}
            style={{ width: boardW, height: boardH }}
          >
            <BoardArt w={boardW} h={boardH} pad={pad} cellX={cell} cellY={cellY} rail={rail} />
            <div className="board-captured board-captured-left" style={{ width: rail }}>
              <span className="board-captured-label" aria-hidden>我方俘子</span>
              <CapturedRail pieces={capturedRed ?? []} align="top" />
            </div>
            <div className="board-captured board-captured-right" style={{ width: rail }}>
              <span className="board-captured-label" aria-hidden>敌方俘子</span>
              <CapturedRail pieces={capturedBlack ?? []} align="bottom" />
            </div>
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
                        top: pad + r * cellY,
                        left: rail + pad + c * cell,
                        width: 0,
                        height: 0,
                      }}
                    >
                      <button
                        type="button"
                        aria-label={piece ? `${piece.revealed ? '明棋' : '暗棋'}，第${r + 1}行第${c + 1}列` : `第${r + 1}行第${c + 1}列`}
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
                          className="skill-target-ring pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
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
                        <span
                          className="legal-target pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                          style={{ width: legalTarget, height: legalTarget, zIndex: 1 }}
                          aria-hidden
                        >
                          <span />
                        </span>
                      )}
                      {isLegal && piece && (
                        <div
                          className="capture-target-ring pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
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
                          statusMark={
                            guicaiMarkId === piece.id
                              ? '鬼'
                              : fanjianMarkId === piece.id
                                ? '反'
                                : lijianMarkId === piece.id
                                  ? '离'
                                  : qingnangMarkId === piece.id
                                    ? '青'
                                    : danjingMarkId === piece.id
                                      ? '啖'
                                      : kongchengMarkId === piece.id
                                        ? '空'
                                        : wushengMarkId === piece.id
                                          ? '武'
                                          : undefined
                          }
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
                landLeft={rail + pad + ganglieDice.capturerPos.c * cell}
                landTop={pad + ganglieDice.capturerPos.r * cellY}
                size={dieSize}
                onSettled={handleGanglieSettled}
              />
            )}
          </div>
          {hasBottomSlot && bottomSlot}
        </div>
      )}
    </div>
  );
}
