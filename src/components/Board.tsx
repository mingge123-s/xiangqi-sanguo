import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BattleAlert, type BattleAlertData } from './BattleAlert';
import { PieceView } from './Piece';
import { GanglieDice } from './GanglieDice';
import { CapturedRail } from './CapturedRail';
import type { LastMove, Piece, PieceType, Pos } from '../game/types';
import { posEq } from '../game/core';
import { pieceStatusEffect } from './pieceStatus';
import targetStreakUrl from '../assets/skill-target-streak.webp';

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
  battleAlert,
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
  zhangfeiMarkId,
  wushuangMarkId,
  accentPieceId,
  ganglieDice,
  onGanglieSettled,
  topSlot,
  bottomSlot,
}: {
  board: (Piece | null)[][];
  selected: Pos | Pos[] | null;
  legal: Pos[];
  lastMove: LastMove | null;
  battleAlert?: BattleAlertData | null;
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
  /** 咆哮指定子 id → 棋面「咆」印 */
  zhangfeiMarkId?: string;
  /** 无双受护将帅 id → 棋面「双」印 */
  wushuangMarkId?: string;
  /** Brief resolved-skill accent shown only during the command broadcast. */
  accentPieceId?: string;
  ganglieDice?: { roll: number; capturerPos: Pos } | null;
  onGanglieSettled?: () => void;
  /** Announce strip flush to the wood board's top edge. */
  topSlot?: ReactNode;
  /** Announce strip flush to the wood board's bottom edge. */
  bottomSlot?: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
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
  const enemyLastMove = lastMove?.piece.side === 'black' ? lastMove : null;
  const enemyMovePath = enemyLastMove ? (() => {
    const fromX = rail + pad + enemyLastMove.from.c * cell;
    const fromY = pad + enemyLastMove.from.r * cellY;
    const toX = rail + pad + enemyLastMove.to.c * cell;
    const toY = pad + enemyLastMove.to.r * cellY;
    const dx = toX - fromX;
    const dy = toY - fromY;
    return {
      fromX,
      fromY,
      dx,
      dy,
      length: Math.hypot(dx, dy),
      angle: Math.atan2(dy, dx) * 180 / Math.PI,
    };
  })() : undefined;
  const diceKey = ganglieDice
    ? `${ganglieDice.capturerPos.r},${ganglieDice.capturerPos.c}:${ganglieDice.roll}`
    : '';
  const accentPos = accentPieceId
    ? board.flatMap((row, r) => row.map((piece, c) => piece?.id === accentPieceId ? { r, c } : null))
        .find((pos): pos is Pos => pos != null)
    : undefined;
  const accentPath = accentPos ? (() => {
    const fromX = rail + pad + 4 * cell;
    const fromY = pad + 9 * cellY;
    const toX = rail + pad + accentPos.c * cell;
    const toY = pad + accentPos.r * cellY;
    const dx = toX - fromX;
    const dy = toY - fromY;
    return {
      fromX,
      fromY,
      // The raster's glowing brush head extends beyond its painted center; trim the
      // geometric path slightly so the visible endpoint lands on the target ring.
      length: Math.max(pieceSize * 1.35, Math.hypot(dx, dy) * 0.957),
      angle: Math.atan2(dy, dx) * 180 / Math.PI,
      height: Math.max(30, pieceSize * 1.08),
    };
  })() : undefined;
  const statusSources = {
    yingshiMarkId,
    fanjianMarkId,
    lijianMarkId,
    guicaiMarkId,
    qingnangMarkId,
    danjingMarkId,
    kongchengMarkId,
    wushengMarkId,
    zhangfeiMarkId,
    wushuangMarkId,
  };

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
            {enemyMovePath && (
              <div key={`enemy-move-${lastKey}`} className="enemy-move-trace-layer" aria-hidden>
                <motion.span
                  className="enemy-move-trail"
                  style={{
                    left: enemyMovePath.fromX,
                    top: enemyMovePath.fromY,
                    width: enemyMovePath.length,
                    rotate: enemyMovePath.angle,
                  }}
                  initial={reduceMotion ? false : { opacity: 0, scaleX: 0.04 }}
                  animate={{ opacity: [0, 0.9, 0.22], scaleX: 1 }}
                  transition={{ duration: 0.72, times: [0, 0.34, 1], ease: 'easeOut' }}
                />
                {!reduceMotion && (
                  <motion.span
                    className="enemy-move-tracer"
                    style={{ left: enemyMovePath.fromX, top: enemyMovePath.fromY }}
                    initial={{ x: 0, y: 0, opacity: 0, scale: 0.45 }}
                    animate={{
                      x: enemyMovePath.dx,
                      y: enemyMovePath.dy,
                      opacity: [0, 1, 1, 0],
                      scale: [0.45, 1.2, 0.7],
                    }}
                    transition={{ duration: 0.68, times: [0, 0.2, 0.78, 1], ease: 'easeOut' }}
                  />
                )}
              </div>
            )}
            {accentPath && (
              <motion.img
                src={targetStreakUrl}
                className="skill-target-path"
                style={{
                  left: accentPath.fromX,
                  top: accentPath.fromY - accentPath.height / 2,
                  width: accentPath.length,
                  height: accentPath.height,
                  rotate: accentPath.angle,
                  zIndex: 1,
                }}
                initial={reduceMotion ? false : { opacity: 0, scaleX: 0.08 }}
                animate={{ opacity: 0.72, scaleX: 1 }}
                transition={{ duration: 0.46, ease: 'easeOut' }}
                aria-hidden
              />
            )}
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
                  const isEnemyLastFrom = !!(enemyLastMove && posEq(enemyLastMove.from, pos));
                  const isEnemyLastTo = !!(enemyLastMove && posEq(enemyLastMove.to, pos));
                  const isAlertKing = !!(
                    battleAlert &&
                    piece?.type === 'K' &&
                    piece.side === battleAlert.victim
                  );
                  const isFatalLanding = !!(
                    battleAlert?.kind === 'mate' &&
                    lastMove &&
                    posEq(lastMove.to, pos)
                  );
                  const enemyMoveOffset =
                    !reduceMotion &&
                    isEnemyLastTo &&
                    piece?.id === enemyLastMove?.piece.id
                      ? {
                          x: (enemyLastMove.from.c - enemyLastMove.to.c) * cell,
                          y: (enemyLastMove.from.r - enemyLastMove.to.r) * cellY,
                        }
                      : undefined;
                  const showKillBloom = !!(killBloom && posEq(killBloom, pos));
                  const statusEffect = piece ? pieceStatusEffect(piece.id, statusSources) : undefined;
                  const isBroadcastTarget = !!(piece && accentPieceId === piece.id);
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
                      {isEnemyLastFrom && (
                        <span
                          className="enemy-last-origin pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                          style={{ width: pieceSize * 0.76, height: pieceSize * 0.76, zIndex: 2 }}
                          aria-hidden
                        />
                      )}
                      {isEnemyLastTo && (
                        <span
                          className="enemy-last-destination pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                          style={{ width: pieceSize + 13, height: pieceSize + 13, zIndex: 4 }}
                          aria-hidden
                        >
                          <span className="enemy-last-seal">动</span>
                        </span>
                      )}
                      {isAlertKing && (
                        <span
                          className="combat-alert-king-ring pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                          style={{ width: pieceSize + 18, height: pieceSize + 18, zIndex: 5 }}
                          aria-hidden
                        />
                      )}
                      {isFatalLanding && (
                        <span
                          className="combat-alert-fatal-ring pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                          style={{ width: pieceSize + 14, height: pieceSize + 14, zIndex: 5 }}
                          aria-hidden
                        />
                      )}
                      {isHi && (
                        <div
                          className="skill-target-ring pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                          style={{ width: pieceSize + 6, height: pieceSize + 6, zIndex: 1 }}
                        />
                      )}
                      {isBroadcastTarget && (
                        <span
                          className="skill-broadcast-accent-ring pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                          style={{ width: pieceSize + 15, height: pieceSize + 15, zIndex: 3 }}
                          aria-hidden
                        />
                      )}
                      {piece && lockedPieceId === piece.id && !statusEffect && (
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
                          key={piece.id}
                          piece={piece}
                          selected={isSel}
                          size={pieceSize}
                          peeked={!!(showPeek && peekedIds?.includes(piece.id))}
                          peekMark={yingshiMarkId === piece.id ? '鹰' : '观'}
                          statusMark={statusEffect?.mark}
                          statusLabel={statusEffect?.label}
                          statusTone={statusEffect?.tone}
                          locked={lockedPieceId === piece.id && !statusEffect}
                          moveOffset={enemyMoveOffset}
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
            <AnimatePresence mode="wait">
              {battleAlert && <BattleAlert key={battleAlert.id} alert={battleAlert} />}
            </AnimatePresence>
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
