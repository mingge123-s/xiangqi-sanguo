import {
  allPieces,
  applyMove,
  cloneBoard,
  createInitialBoard,
  createJieqiBoard,
  crossedRiver,
  describeMove,
  emptySquares,
  getAllLegalMoves,
  getLegalMoves,
  findKing,
  getPiece,
  inCheck,
  inPalace,
  isAdjacent,
  isGameOver,
  onOwnHalf,
  elephantOwnSide,
  opposite,
  pickRandom,
  pieceLabel,
  posEq,
  squareName,
  trueGroup,
} from './core';
import { dealGenerals, findOwnedSkill, isSkillReady, sideHasSkill } from './generals';
import type {
  GameState,
  GeneralRuntime,
  Piece,
  Pos,
  Side,
  SkillPayload,
  SkillRuntime,
} from './types';
import { CHAR, QI_MAX, QI_START } from './types';

function cloneGenerals(gs: GeneralRuntime[]): GeneralRuntime[] {
  return gs.map((g) => ({
    ...g,
    skills: g.skills.map((sk) => ({
      ...sk,
      recharge: { ...sk.recharge },
    })),
  }));
}

function cloneState(s: GameState): GameState {
  return {
    ...s,
    board: cloneBoard(s.board),
    redGenerals: cloneGenerals(s.redGenerals),
    blackGenerals: cloneGenerals(s.blackGenerals),
    lastMove: s.lastMove
      ? { from: { ...s.lastMove.from }, to: { ...s.lastMove.to }, piece: { ...s.lastMove.piece } }
      : null,
    pending: {
      awaitOverFive: s.pending.awaitOverFive,
      awaitGuanxing: s.pending.awaitGuanxing,
      awaitKongcheng: s.pending.awaitKongcheng,
      wushengGuard: s.pending.wushengGuard ? { ...s.pending.wushengGuard } : undefined,
      fanjianMark: s.pending.fanjianMark ? { ...s.pending.fanjianMark } : undefined,
      zhangFeiPieceId: s.pending.zhangFeiPieceId,
      kongcheng: s.pending.kongcheng ? { ...s.pending.kongcheng } : undefined,
      danjing: s.pending.danjing ? { ...s.pending.danjing } : undefined,
      bridgeDown: s.pending.bridgeDown ? { ...s.pending.bridgeDown } : undefined,
      awaitYingshi: s.pending.awaitYingshi,
      yingshiMark: s.pending.yingshiMark ? { ...s.pending.yingshiMark } : undefined,
      yingshiReload: s.pending.yingshiReload ? { ...s.pending.yingshiReload } : undefined,
      guicaiLock: s.pending.guicaiLock ? { ...s.pending.guicaiLock } : undefined,
      wushuang: s.pending.wushuang ? { ...s.pending.wushuang } : undefined,
      lijianMark: s.pending.lijianMark ? { ...s.pending.lijianMark } : undefined,
      ganglieDice: s.pending.ganglieDice
        ? {
            ...s.pending.ganglieDice,
            capturerPos: { ...s.pending.ganglieDice.capturerPos },
          }
        : undefined,
    },
    captured: {
      red: s.captured.red.map((p) => ({ ...p })),
      black: s.captured.black.map((p) => ({ ...p })),
    },
    log: s.log.map((x) => ({ ...x })),
    skillBroadcast: s.skillBroadcast ? { ...s.skillBroadcast } : null,
    crossedRiverIds: s.crossedRiverIds.slice(),
    noReviveIds: s.noReviveIds.slice(),
    riverCrossCount: {
      red: s.riverCrossCount?.red ?? 0,
      black: s.riverCrossCount?.black ?? 0,
    },
    peekedIds: {
      red: (s.peekedIds?.red ?? []).slice(),
      black: (s.peekedIds?.black ?? []).slice(),
    },
    qi: { red: s.qi?.red ?? 0, black: s.qi?.black ?? 0 },
    movesLeft: s.movesLeft ?? 0,
    capturedThisTurn: !!s.capturedThisTurn,
  };
}

export function emptyPeeked(): { red: string[]; black: string[] } {
  return { red: [], black: [] };
}

export function peekedOf(s: GameState, side: Side): string[] {
  return s.peekedIds?.[side] ?? [];
}

function setPeekedFor(s: GameState, side: Side, ids: string[]): void {
  s.peekedIds = {
    red: s.peekedIds?.red ?? [],
    black: s.peekedIds?.black ?? [],
    [side]: ids.slice(),
  };
}

function addPeekId(s: GameState, side: Side, id: string): boolean {
  const cur = peekedOf(s, side);
  if (cur.includes(id)) return false;
  setPeekedFor(s, side, [...cur, id]);
  return true;
}

function pushLog(s: GameState, msg: string, side?: Side): void {
  s.log = [...s.log, { text: msg, side: side ?? s.side }].slice(-40);
}

function sideGens(s: GameState, side: Side): GeneralRuntime[] {
  return side === 'red' ? s.redGenerals : s.blackGenerals;
}

function setSideGens(s: GameState, side: Side, gens: GeneralRuntime[]): void {
  if (side === 'red') s.redGenerals = gens;
  else s.blackGenerals = gens;
}

function addQi(s: GameState, side: Side, n: number): void {
  s.qi = { ...s.qi, [side]: Math.min(QI_MAX, Math.max(0, (s.qi[side] ?? 0) + n)) };
}
function spendQi(s: GameState, side: Side, n: number): boolean {
  if ((s.qi[side] ?? 0) < n) return false;
  s.qi = { ...s.qi, [side]: s.qi[side] - n };
  return true;
}

function mapSkill(
  s: GameState,
  side: Side,
  skillId: string,
  fn: (sk: SkillRuntime) => SkillRuntime,
): void {
  const gens = sideGens(s, side).map((g) => ({
    ...g,
    skills: g.skills.map((sk) => (sk.id === skillId ? fn(sk) : sk)),
  }));
  setSideGens(s, side, gens);
}

function charge(s: GameState, side: Side, trigger: string, amount = 1): void {
  const gens = sideGens(s, side).map((g) => ({
    ...g,
    skills: g.skills.map((sk) => {
      if (sk.recharge.trigger !== trigger) return sk;
      if (sk.uses >= sk.maxUses) return sk;
      const progress = Math.min(sk.recharge.need, sk.recharge.progress + amount);
      return { ...sk, recharge: { ...sk.recharge, progress } };
    }),
  }));
  setSideGens(s, side, gens);
}

function fillSkill(s: GameState, side: Side, skillId: string): void {
  mapSkill(s, side, skillId, (sk) => ({
    ...sk,
    recharge: { ...sk.recharge, progress: sk.recharge.need },
  }));
}

function bumpSkill(s: GameState, side: Side, skillId: string, n: number): void {
  mapSkill(s, side, skillId, (sk) => ({
    ...sk,
    recharge: {
      ...sk.recharge,
      progress: Math.min(sk.recharge.need, sk.recharge.progress + n),
    },
  }));
}

function countAdjacentPairs(board: GameState['board'], side: Side): number {
  const pcs = allPieces(board, side);
  let n = 0;
  for (let i = 0; i < pcs.length; i++) {
    for (let j = i + 1; j < pcs.length; j++) {
      if (isAdjacent(pcs[i].pos, pcs[j].pos)) n++;
    }
  }
  return n;
}

function applyCapturePassives(
  s: GameState,
  mover: Side,
  captured: Piece,
  moverPiece?: Piece | null,
): void {
  if (sideHasSkill(sideGens(s, mover), 'zhangfei-pojun')) {
    addQi(s, mover, 1);
  }
  // moverPiece is the pre-move snapshot from makeMove (before applyMove reveals).
  // 火攻: +2 only for an already-revealed 炮 (明炮棋); dark-on-cannon-seat flip captures do not count.
  const mingPao =
    !!moverPiece && moverPiece.revealed && moverPiece.type === 'C';
  if (mingPao && sideHasSkill(sideGens(s, mover), 'zhouyu-huogong')) {
    addQi(s, mover, 2);
  }
  if (
    !captured.revealed &&
    (captured.type === 'R' || captured.type === 'C' || captured.type === 'N') &&
    sideHasSkill(sideGens(s, mover), 'caocao-jianxiong')
  ) {
    addQi(s, mover, 3);
  }
  if (sideHasSkill(sideGens(s, captured.side), 'huatuo-shenyi')) {
    addQi(s, captured.side, 1);
  }
  if (
    s.crossedRiverIds.includes(captured.id) &&
    sideHasSkill(sideGens(s, captured.side), 'sunshangxiang-xiaoji')
  ) {
    addQi(s, captured.side, 2);
  }
}

function wushengProtectedId(s: GameState): string | undefined {
  const g = s.pending.wushengGuard;
  if (!g) return undefined;
  const found = allPieces(s.board).find((x) => x.piece.id === g.pieceId);
  if (found && !crossedRiver(found.pos.r, g.owner)) return g.pieceId;
  return undefined;
}

function maybeClearWushengGuard(s: GameState): void {
  const g = s.pending.wushengGuard;
  if (!g) return;
  const found = allPieces(s.board).find((x) => x.piece.id === g.pieceId);
  if (!found || crossedRiver(found.pos.r, g.owner)) {
    s.pending = { ...s.pending, wushengGuard: undefined };
  }
}

function protectedIds(s: GameState): string[] {
  const ids: string[] = [];
  if (s.pending.kongcheng?.pieceId) ids.push(s.pending.kongcheng.pieceId);
  const w = wushengProtectedId(s);
  if (w && !ids.includes(w)) ids.push(w);
  const wu = s.pending.wushuang;
  if (wu && wu.turnsLeft > 0) {
    const kingPos = findKing(s.board, wu.owner);
    if (kingPos) {
      const king = getPiece(s.board, kingPos);
      if (king && !ids.includes(king.id)) ids.push(king.id);
    }
  }
  return ids;
}

export function legalOptions(s: GameState, side: Side) {
  const ids = protectedIds(s);
  const protectedPieceId = ids[0];
  const protectedPieceIds = ids.length > 1 ? ids : undefined;
  const noCapturePieceId =
    s.pending.danjing && s.pending.danjing.untilSide === side
      ? s.pending.danjing.pieceId
      : undefined;
  const blockRiverCross = !!(
    s.pending.bridgeDown && s.pending.bridgeDown.owner !== side
  );
  const onlyPieceId =
    s.pending.guicaiLock && s.pending.guicaiLock.untilSide === side
      ? s.pending.guicaiLock.pieceId
      : undefined;
  const wu = s.pending.wushuang;
  const mustNotCheck =
    wu && wu.turnsLeft > 0 && wu.owner !== side ? wu.owner : undefined;
  return {
    protectedPieceId,
    protectedPieceIds,
    noCapturePieceId,
    blockRiverCross,
    onlyPieceId,
    mustNotCheck,
  };
}

function pendingBlocksPlay(s: GameState): boolean {
  return !!(
    s.pending.awaitOverFive ||
    s.pending.awaitGuanxing ||
    s.pending.awaitKongcheng ||
    s.pending.awaitYingshi ||
    s.pending.ganglieDice
  );
}

export function listLegalMoves(s: GameState, side?: Side) {
  if (pendingBlocksPlay(s)) return [];
  if ((s.movesLeft ?? 0) <= 0) return [];
  const sd = side ?? s.side;
  const moves = getAllLegalMoves(s.board, sd, legalOptions(s, sd));
  const zfId = s.pending.zhangFeiPieceId;
  if (!zfId) return moves;
  return moves.filter((m) => getPiece(s.board, m.from)?.id === zfId);
}

export function listLegalFrom(s: GameState, from: Pos): Pos[] {
  if (pendingBlocksPlay(s)) return [];
  if ((s.movesLeft ?? 0) <= 0) return [];
  const p = getPiece(s.board, from);
  if (!p || p.side !== s.side) return [];
  if (s.pending.zhangFeiPieceId && p.id !== s.pending.zhangFeiPieceId) {
    return [];
  }
  if (
    s.pending.guicaiLock &&
    s.pending.guicaiLock.untilSide === s.side &&
    p.id !== s.pending.guicaiLock.pieceId
  ) {
    return [];
  }
  const opt = legalOptions(s, s.side);
  const noCapture = !!(opt.noCapturePieceId && p.id === opt.noCapturePieceId);
  return getLegalMoves(s.board, from, s.side, {
    noCapture,
    protectedPieceId: opt.protectedPieceId,
    protectedPieceIds: opt.protectedPieceIds,
    blockRiverCross: opt.blockRiverCross,
    mustNotCheck: opt.mustNotCheck,
  });
}

export function canReadyOverFive(s: GameState): boolean {
  if (s.phase !== 'playing' || s.winner) return false;
  if (s.skillUsedThisTurn) return false;
  const owned = findOwnedSkill(sideGens(s, s.side), 'guanyu-wuguan');
  if (!owned || !isSkillReady(owned.skill, s.qi[s.side] ?? 0)) return false;
  return allPieces(s.board, s.side).some((x) => x.piece.type === 'N' && x.piece.revealed);
}

export function overFiveDests(s: GameState, from: Pos): Pos[] {
  const p = getPiece(s.board, from);
  if (!p || p.side !== s.side || p.type !== 'N' || !p.revealed) return [];
  const opt = legalOptions(s, s.side);
  const noCapture = !!(opt.noCapturePieceId && p.id === opt.noCapturePieceId);
  return getLegalMoves(s.board, from, s.side, {
    ignoreHorseLeg: true,
    noCapture,
    protectedPieceId: opt.protectedPieceId,
    protectedPieceIds: opt.protectedPieceIds,
    blockRiverCross: opt.blockRiverCross,
    mustNotCheck: opt.mustNotCheck,
  });
}

export function skipOverFive(s0: GameState): GameState {
  const s = cloneState(s0);
  if (!s.pending.awaitOverFive) return s0;
  s.pending = { ...s.pending, awaitOverFive: undefined };
  return s;
}

export function skipKongcheng(s0: GameState): GameState {
  const s = cloneState(s0);
  if (!s.pending.awaitKongcheng) return s0;
  s.pending = { ...s.pending, awaitKongcheng: undefined };
  endTurn(s);
  return s;
}

/** Reveal a dark piece to the current side only. Does not consume the skill or close the window. */
function asCaptured(p: Piece): Piece {
  return { ...p, revealed: true };
}

export function peekDark(s0: GameState, pos: Pos): GameState {
  const s = cloneState(s0);
  const p = getPiece(s.board, pos);
  if (!p || p.revealed) return s0;
  if (!addPeekId(s, s.side, p.id)) return s0;
  return s;
}

/** True if `to` is a kongcheng-protected enemy and `from` could otherwise capture it. */
export function isKongchengCaptureAttempt(s: GameState, from: Pos, to: Pos): boolean {
  const target = getPiece(s.board, to);
  if (!target || !s.pending.kongcheng || target.id !== s.pending.kongcheng.pieceId) return false;
  if (target.side === s.side) return false;
  const p = getPiece(s.board, from);
  if (!p || p.side !== s.side) return false;
  const opt = legalOptions(s, s.side);
  const noCapture = !!(opt.noCapturePieceId && p.id === opt.noCapturePieceId);
  if (noCapture) return false;
  // Ignore only 空城 protection; keep 武圣 and other guards.
  const otherProtected = protectedIds(s).filter((id) => id !== s.pending.kongcheng!.pieceId);
  const dests = getLegalMoves(s.board, from, s.side, {
    noCapture,
    protectedPieceIds: otherProtected.length ? otherProtected : undefined,
    blockRiverCross: opt.blockRiverCross,
    mustNotCheck: opt.mustNotCheck,
  });
  return dests.some((d) => posEq(d, to));
}

/** True if `to` is the 无双-protected king and `from` could otherwise capture it. */
export function isWushuangCaptureAttempt(s: GameState, from: Pos, to: Pos): boolean {
  const wu = s.pending.wushuang;
  if (!wu || wu.turnsLeft <= 0) return false;
  const target = getPiece(s.board, to);
  if (!target || target.type !== 'K' || target.side !== wu.owner) return false;
  if (target.side === s.side) return false;
  const p = getPiece(s.board, from);
  if (!p || p.side !== s.side) return false;
  const opt = legalOptions(s, s.side);
  const noCapture = !!(opt.noCapturePieceId && p.id === opt.noCapturePieceId);
  if (noCapture) return false;
  const otherProtected = protectedIds(s).filter((id) => id !== target.id);
  const dests = getLegalMoves(s.board, from, s.side, {
    noCapture,
    protectedPieceIds: otherProtected.length ? otherProtected : undefined,
    blockRiverCross: opt.blockRiverCross,
    // Ignore 无双 check-ban so we can detect the capture attempt itself.
  });
  return dests.some((d) => posEq(d, to));
}

function finishIfOver(s: GameState, sideToMove: Side): void {
  const { over, winner } = isGameOver(s.board, sideToMove, legalOptions(s, sideToMove));
  if (over) {
    s.winner = winner;
    s.phase = 'result';
    if (winner) {
      pushLog(s, winner === 'red' ? '红方胜' : '黑方胜', winner);
    }
  }
}

const GANGLIE_PIP: Record<number, string> = {
  1: '一',
  2: '二',
  3: '三',
  4: '四',
  5: '五',
  6: '六',
};

/** Test-only: force next 刚烈 d6 roll (1–6). Pass undefined to clear. */
let ganglieRollOverride: number | undefined;
export function __testSetGanglieRoll(n: number | undefined): void {
  ganglieRollOverride = n;
}

/** Test-only: force next 反间 random dest. Pass undefined to clear. */
let fanjianDestOverride: Pos | undefined;
export function __testSetFanjianDest(pos: Pos | undefined): void {
  fanjianDestOverride = pos ? { r: pos.r, c: pos.c } : undefined;
}

function pickFanjianDest(dests: Pos[]): Pos | undefined {
  if (fanjianDestOverride) {
    const forced = fanjianDestOverride;
    fanjianDestOverride = undefined;
    const hit = dests.find((d) => posEq(d, forced));
    return hit ?? pickRandom(dests);
  }
  return pickRandom(dests);
}

function rollGanglieDie(): number {
  if (ganglieRollOverride != null) {
    const n = Math.max(1, Math.min(6, Math.floor(ganglieRollOverride)));
    ganglieRollOverride = undefined;
    return n;
  }
  return 1 + Math.floor(Math.random() * 6);
}

function isJiangshuaiCapturer(cap: Piece): boolean {
  return trueGroup(cap) === 'jiangshuai' || cap.type === 'K';
}

/**
 * 刚烈：对方吃掉夏侯惇方棋子后。揭示（若仍隐藏）；非将帅且战气≥5 则立刻耗 5 并挂起 d6。
 * @returns true if `pending.ganglieDice` was set (caller must defer endTurn).
 */
function applyXiahou(
  s: GameState,
  victimSide: Side,
  capturerPos: Pos,
  opts?: { resumeTurn?: boolean; roll?: number },
): boolean {
  const gens = sideGens(s, victimSide);
  const xh = gens.find((g) => g.id === 'xiahoudun');
  if (!xh) return false;
  if (xh.hidden) {
    setSideGens(
      s,
      victimSide,
      gens.map((g) => (g.id === 'xiahoudun' ? { ...g, hidden: false } : g)),
    );
    pushLog(s, `${victimSide === 'red' ? '红' : '黑'}方 夏侯惇 亮相！`, victimSide);
  }
  const cap = getPiece(s.board, capturerPos);
  if (!cap || isJiangshuaiCapturer(cap)) {
    ganglieRollOverride = undefined;
    return false;
  }
  const ganglie = findOwnedSkill(sideGens(s, victimSide), 'xiahoudun-ganglie')?.skill;
  const cost = ganglie?.qiCost ?? 5;
  if ((s.qi[victimSide] ?? 0) < cost) {
    ganglieRollOverride = undefined;
    return false;
  }
  spendQi(s, victimSide, cost);

  const roll = opts?.roll ?? rollGanglieDie();
  s.pending = {
    ...s.pending,
    ganglieDice: {
      victimSide,
      capturerPos: { ...capturerPos },
      capturerId: cap.id,
      roll,
      resumeTurn: opts?.resumeTurn !== false,
    },
  };
  s.skillBroadcast = { name: '夏侯惇', skill: '刚烈', faction: 'wei' };
  return true;
}

/** Resolve pending 刚烈 d6: odd destroys capturer; even restores 2 战气. Then resume turn if needed. */
export function resolveGanglie(s0: GameState): GameState {
  const dice = s0.pending.ganglieDice;
  if (!dice) return s0;
  const s = cloneState(s0);
  const { victimSide, capturerPos, capturerId, roll, resumeTurn } = dice;
  s.pending = { ...s.pending, ganglieDice: undefined };

  const odd = roll % 2 === 1;
  const cap = getPiece(s.board, capturerPos);
  if (odd) {
    if (cap && cap.id === capturerId) {
      s.board = cloneBoard(s.board);
      s.board[capturerPos.r][capturerPos.c] = null;
      s.captured[cap.side] = [...s.captured[cap.side], asCaptured(cap)];
      pushLog(s, `刚烈！${pieceLabel(cap)} 同归于尽`, victimSide);
      charge(s, cap.side, 'ownLoss', 1);
      maybeTriggerYingshi(s, { capturedId: cap.id });
    }
  } else {
    addQi(s, victimSide, 2);
    const pip = GANGLIE_PIP[roll] ?? String(roll);
    pushLog(s, `刚烈判定：${pip}点，恢复2点战气`, victimSide);
  }

  finishIfOver(s, s.side);
  if (s.winner || !resumeTurn) return s;

  const opp = opposite(s.side);
  const oppOver = isGameOver(s.board, opp, legalOptions(s, opp));
  const kingsGone = !findKing(s.board, 'red') || !findKing(s.board, 'black');
  if (kingsGone || oppOver.over) {
    endTurn(s);
    return s;
  }
  if (maybeAwaitKongcheng(s)) return s;
  endTurn(s);
  return s;
}

function afterBoardMutation(s: GameState, mover: Side, events: {
  captured?: Piece | null;
  movedPiece?: Piece | null;
  from?: Pos;
  to?: Pos;
  pawnAdvance1?: boolean;
  riverCrossNew?: boolean;
  prevAdjacentEnemy?: number;
}): void {
  if (events.movedPiece) {
    charge(s, mover, 'ownMove', 1);
    const mp = events.movedPiece;
    if ((mp.revealed && mp.type === 'N') || (!mp.revealed && mp.coverType === 'N')) {
      charge(s, mover, 'knightMove', 1);
    }
  }
  if (events.pawnAdvance1) {
    charge(s, mover, 'pawnAdvance', 1);
  }
  if (events.captured) {
    charge(s, mover, 'ownCapture', 1);
    charge(s, events.captured.side, 'oppCaptureYou', 1);
    charge(s, events.captured.side, 'ownLoss', 1);
    applyCapturePassives(s, mover, events.captured, events.movedPiece);
  }
  if (events.riverCrossNew) {
    charge(s, mover, 'riverCross', 1);
    const next = (s.riverCrossCount?.[mover] ?? 0) + 1;
    s.riverCrossCount = { ...s.riverCrossCount, [mover]: next };
    const defender = opposite(mover);
    if (sideHasSkill(sideGens(s, defender), 'ganning-jinfan')) {
      addQi(s, defender, 1);
      pushLog(s, '锦帆：对方过河，战气+1', defender);
    }
  }
  const nowAdj = countAdjacentPairs(s.board, mover);
  const prev = events.prevAdjacentEnemy ?? 0;
  if (nowAdj > prev) {
    charge(s, opposite(mover), 'enemyAdjacent', 1);
  }
}

function maybeRiverCross(s: GameState, piece: Piece, to: Pos): boolean {
  if (!crossedRiver(to.r, piece.side)) return false;
  if (s.crossedRiverIds.includes(piece.id)) return false;
  s.crossedRiverIds = [...s.crossedRiverIds, piece.id];
  return true;
}

/** 己方回合开始：战气 +1（上限 QI_MAX）、走棋次数 +1。 */
function applyTurnStartEconomy(s: GameState): void {
  addQi(s, s.side, 1);
  s.movesLeft = (s.movesLeft ?? 0) + 1;
}

function applyStartOfTurnPassives(s: GameState): void {
  if (!inCheck(s.board, s.side)) return;
  if (sideHasSkill(sideGens(s, s.side), 'zhaoyun-longdan')) {
    addQi(s, s.side, 2);
  }
}


function hasUnrevealedEnemy(s: GameState, owner: Side): boolean {
  return allPieces(s.board, opposite(owner)).some((x) => !x.piece.revealed);
}

export function pickYingshiTarget(s: GameState, owner: Side): { pos: Pos; piece: Piece } | null {
  const enemies = allPieces(s.board, opposite(owner)).filter((x) => !x.piece.revealed);
  if (enemies.length === 0) return null;
  return pickRandom(enemies) ?? null;
}

function applyYingshiMark(s: GameState, owner: Side, piece: Piece): void {
  addPeekId(s, owner, piece.id);
  s.pending = {
    ...s.pending,
    yingshiMark: { owner, pieceId: piece.id },
    awaitYingshi: undefined,
  };
}

function applyBlackYingshi(s: GameState): void {
  if (!sideHasSkill(sideGens(s, 'black'), 'simayi-yingshi')) return;
  const t = pickYingshiTarget(s, 'black');
  if (!t) return;
  applyYingshiMark(s, 'black', t.piece);
  s.skillBroadcast = { name: '司马懿', skill: '鹰视', faction: 'wei' };
  pushLog(s, '鹰视，标记偷看一枚敌子', 'black');
}

function maybeOpenYingshiWindow(s: GameState, owner: Side): boolean {
  if (!sideHasSkill(sideGens(s, owner), 'simayi-yingshi')) return false;
  if (!hasUnrevealedEnemy(s, owner)) return false;
  s.pending = { ...s.pending, awaitYingshi: true };
  if (owner === s.side && !s.skillBroadcast) {
    s.skillBroadcast = { name: '司马懿', skill: '鹰视', faction: 'wei' };
  }
  return true;
}

function maybeOpenYingshiReload(s: GameState): void {
  if (s.winner || s.phase !== 'playing') return;
  const flag = s.pending.yingshiReload?.[s.side];
  if (!flag) return;
  const reload = { ...s.pending.yingshiReload, [s.side]: false };
  s.pending = { ...s.pending, yingshiReload: reload };
  maybeOpenYingshiWindow(s, s.side);
}

function maybeOpenOverFive(s: GameState): void {
  if (s.winner || s.pending.awaitYingshi || s.pending.awaitGuanxing) return;
  if (canReadyOverFive(s)) {
    // Window opens quietly; broadcast only after the jump resolves (not an 主动技 splash-before-target).
    s.pending = { ...s.pending, awaitOverFive: true };
  }
}

function maybeTriggerYingshi(s: GameState, opts: { flippedId?: string; capturedId?: string }): void {
  const mark = s.pending.yingshiMark;
  if (!mark) return;
  const hit =
    (opts.flippedId && opts.flippedId === mark.pieceId) ||
    (opts.capturedId && opts.capturedId === mark.pieceId);
  if (!hit) return;
  const reload = { ...(s.pending.yingshiReload ?? {}), [mark.owner]: true };
  s.pending = { ...s.pending, yingshiMark: undefined, yingshiReload: reload };
}

/** Test-only: force next 离间 random loss by piece id. Pass undefined to clear. */
let lijianLossOverride: string | undefined;
export function __testSetLijianLoss(pieceId: string | undefined): void {
  lijianLossOverride = pieceId;
}

function applyLijianPenalty(s: GameState, victim: Side): void {
  const candidates = allPieces(s.board, victim).filter((x) => x.piece.type !== 'K');
  if (candidates.length === 0) return;
  let pick = candidates[0];
  if (lijianLossOverride) {
    const forced = candidates.find((x) => x.piece.id === lijianLossOverride);
    lijianLossOverride = undefined;
    pick = forced ?? pickRandom(candidates)!;
  } else {
    pick = pickRandom(candidates)!;
  }
  s.board = cloneBoard(s.board);
  s.board[pick.pos.r][pick.pos.c] = null;
  s.captured[victim] = [...s.captured[victim], asCaptured(pick.piece)];
  charge(s, victim, 'ownLoss', 1);
  pushLog(s, `离间：随机失去${pieceLabel(pick.piece)}`, victim);
  maybeTriggerYingshi(s, { capturedId: pick.piece.id });
}

function settleLijianMark(s: GameState, endingSide: Side): void {
  const mark = s.pending.lijianMark;
  if (!mark || mark.untilSide !== endingSide) return;
  // Penalty only if victim moved a *different* piece. Walking the mark or
  // ending the turn without moving is fine.
  const movedOther =
    s.movedThisTurn && !!s.lastMove && s.lastMove.piece.id !== mark.pieceId;
  if (movedOther) {
    applyLijianPenalty(s, endingSide);
  }
  s.pending = { ...s.pending, lijianMark: undefined };
}

/** Test-only: force end of the current turn (e.g. pass without moving). */
export function __testEndTurn(s0: GameState): GameState {
  const s = cloneState(s0);
  endTurn(s);
  return s;
}

function endTurn(s: GameState): void {
  const endingSide = s.side;
  if (s.pending.bridgeDown && s.pending.bridgeDown.owner !== endingSide) {
    const left = s.pending.bridgeDown.enemyTurnsLeft - 1;
    s.pending =
      left <= 0
        ? { ...s.pending, bridgeDown: undefined }
        : { ...s.pending, bridgeDown: { ...s.pending.bridgeDown, enemyTurnsLeft: left } };
  }
  if (s.pending.fanjianMark && s.pending.fanjianMark.untilSide === endingSide) {
    s.pending = { ...s.pending, fanjianMark: undefined };
  }
  if (s.pending.danjing && s.pending.danjing.untilSide === endingSide) {
    s.pending = { ...s.pending, danjing: undefined };
  }
  if (s.pending.guicaiLock && s.pending.guicaiLock.untilSide === endingSide) {
    s.pending = { ...s.pending, guicaiLock: undefined };
  }
  settleLijianMark(s, endingSide);
  if (s.pending.wushuang && s.pending.wushuang.owner !== endingSide) {
    const left = s.pending.wushuang.turnsLeft - 1;
    s.pending =
      left <= 0
        ? { ...s.pending, wushuang: undefined }
        : { ...s.pending, wushuang: { ...s.pending.wushuang, turnsLeft: left } };
  }
  if (s.capturedThisTurn && sideHasSkill(sideGens(s, endingSide), 'diaochan-biyue')) {
    addQi(s, endingSide, 1);
    pushLog(s, '闭月：本回合有吃子，战气+1', endingSide);
  }

  s.pending = { ...s.pending, zhangFeiPieceId: undefined, awaitOverFive: undefined };
  s.skillUsedThisTurn = false;
  s.movedThisTurn = false;
  s.capturedThisTurn = false;
  s.movesLeft = 0;
  s.plyCount += 1;
  charge(s, 'red', 'anyPly', 1);
  charge(s, 'black', 'anyPly', 1);
  s.side = opposite(s.side);
  charge(s, s.side, 'ownTurn', 1);
  if (s.pending.kongcheng && s.pending.kongcheng.untilSide === s.side) {
    s.pending = { ...s.pending, kongcheng: undefined };
  }
  s.turnCount += 1;
  applyTurnStartEconomy(s);
  applyStartOfTurnPassives(s);

  finishIfOver(s, s.side);
  maybeOpenYingshiReload(s);
  maybeOpenOverFive(s);
}

export function createHomeState(): GameState {
  return {
    board: createInitialBoard(),
    side: 'red',
    redGenerals: [],
    blackGenerals: [],
    lastMove: null,
    pending: {},
    captured: { red: [], black: [] },
    log: [],
    winner: null,
    phase: 'home',
    skillBroadcast: null,
    turnCount: 0,
    skillUsedThisTurn: false,
    movedThisTurn: false,
    movesLeft: 0,
    crossedRiverIds: [],
    plyCount: 0,
    moveSerial: 0,
    noReviveIds: [],
    riverCrossCount: { red: 0, black: 0 },
    peekedIds: emptyPeeked(),
    qi: { red: QI_START, black: QI_START },
    capturedThisTurn: false,
  };
}

function revealZhuge(s: GameState, owner: Side): void {
  const gens = sideGens(s, owner);
  if (!gens.some((g) => g.id === 'zhuge')) return;
  setSideGens(
    s,
    owner,
    gens.map((g) => (g.id === 'zhuge' ? { ...g, hidden: false } : g)),
  );
}

function consumeGuanxingFor(s: GameState, owner: Side): void {
  const gens = sideGens(s, owner);
  setSideGens(
    s,
    owner,
    gens.map((g) =>
      g.id === 'zhuge'
        ? {
            ...g,
            hidden: false,
            skills: g.skills.map((sk) =>
              sk.id === 'zhuge-guanxing'
                ? { ...sk, uses: sk.uses + 1, recharge: { ...sk.recharge, progress: 0 } }
                : sk,
            ),
          }
        : g,
    ),
  );
  s.skillBroadcast = { name: '诸葛亮', skill: '观星', faction: 'shu' };
}

function pickDarkIds(s: GameState, n: number): string[] {
  const pool = allPieces(s.board).filter((x) => !x.piece.revealed);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n).map((x) => x.piece.id);
}

function applyBlackGuanxing(s: GameState): void {
  if (!sideHasSkill(sideGens(s, 'black'), 'zhuge-guanxing')) return;
  const ids = pickDarkIds(s, 5);
  setPeekedFor(s, 'black', ids);
  consumeGuanxingFor(s, 'black');
  pushLog(s, '观星，窥见五枚暗子', 'black');
}

export function startMatch(): GameState {
  const s = createHomeState();
  s.phase = 'playing';
  s.side = 'red';
  const dealt = dealGenerals();
  s.redGenerals = dealt.red;
  s.blackGenerals = dealt.black;
  s.board = createJieqiBoard();
  s.log = [{ text: '对局开始 · 红先', side: 'red' }];
  if (sideHasSkill(s.redGenerals, 'zhuge-guanxing')) {
    revealZhuge(s, 'red');
    s.pending = { ...s.pending, awaitGuanxing: true };
    s.skillBroadcast = { name: '诸葛亮', skill: '观星', faction: 'shu' };
  }
  if (sideHasSkill(s.blackGenerals, 'zhuge-guanxing')) {
    applyBlackGuanxing(s);
  }
  applyBlackYingshi(s);
  if (!s.pending.awaitGuanxing && sideHasSkill(s.redGenerals, 'simayi-yingshi')) {
    maybeOpenYingshiWindow(s, 'red');
  }
  applyTurnStartEconomy(s);
  applyStartOfTurnPassives(s);
  if (!s.pending.awaitGuanxing && !s.pending.awaitYingshi) {
    maybeOpenOverFive(s);
  }
  return s;
}

function consumeSkill(s: GameState, g: GeneralRuntime, skill: SkillRuntime): void {
  const side = s.side;
  if (skill.qiCost != null && skill.qiCost > 0) {
    spendQi(s, side, skill.qiCost);
  }
  const gens = sideGens(s, side).map((x) =>
    x.id === g.id
      ? {
          ...x,
          hidden: false,
          skills: x.skills.map((sk) =>
            sk.id === skill.id
              ? { ...sk, uses: sk.uses + 1, recharge: { ...sk.recharge, progress: 0 } }
              : sk,
          ),
        }
      : x,
  );
  setSideGens(s, side, gens);
  if (skill.engineKind !== 'start' && skill.id !== 'guanyu-wuguan') {
    s.skillUsedThisTurn = true;
  }
  // Broadcast after the skill is resolved (主动技: after click/target). Never for passives here.
  s.skillBroadcast = { name: g.name, skill: skill.name, faction: g.faction };
  pushLog(s, `${side === 'red' ? '红' : '黑'}方 ${g.name} 发动【${skill.name}】`);
}

export function canUseSkill(s: GameState, skillId: string): boolean {
  if (s.phase !== 'playing' || s.winner) return false;
  if (s.pending.ganglieDice) return false;
  if (s.pending.awaitGuanxing) {
    return skillId === 'zhuge-guanxing' && !!findOwnedSkill(sideGens(s, s.side), skillId);
  }
  if (s.pending.awaitYingshi) {
    return skillId === 'simayi-yingshi' && !!findOwnedSkill(sideGens(s, s.side), skillId);
  }
  if (s.pending.awaitOverFive) {
    if (skillId !== 'guanyu-wuguan') return false;
    const owned = findOwnedSkill(sideGens(s, s.side), skillId);
    return !!(owned && isSkillReady(owned.skill, s.qi[s.side] ?? 0));
  }
  if (s.pending.awaitKongcheng) {
    if (skillId !== 'zhuge-kongcheng') return false;
    const owned = findOwnedSkill(sideGens(s, s.side), skillId);
    return !!(owned && isSkillReady(owned.skill, s.qi[s.side] ?? 0));
  }
  if (
    skillId === 'guanyu-wuguan' ||
    skillId === 'zhuge-guanxing' ||
    skillId === 'zhuge-kongcheng' ||
    skillId === 'simayi-yingshi'
  ) {
    return false;
  }
  if (s.skillUsedThisTurn) return false;
  if (skillId === 'zhaoyun-longhun' && (s.movedThisTurn || (s.movesLeft ?? 0) <= 0)) return false;
  if (skillId === 'caocao-guixin' && enemiesInOwnPalace(s, s.side).length === 0) return false;
  if (skillId === 'sunshangxiang-lianyin' && lianyinTargets(s, s.side).length === 0) return false;
  if (
    skillId === 'diaochan-lijian' &&
    !allPieces(s.board, opposite(s.side)).some((x) => !x.piece.revealed)
  ) {
    return false;
  }
  const owned = findOwnedSkill(sideGens(s, s.side), skillId);
  if (!owned) return false;
  return isSkillReady(owned.skill, s.qi[s.side] ?? 0);
}

export function validSkillTargets(s: GameState, skillId: string): {
  mode: 'none' | 'ownPiece' | 'ownPawn' | 'twoOwn' | 'emptyAfterOwn' | 'enemy' | 'lvbu' | 'diaochan' | 'captured' | 'crossed' | 'dark';
  positions: Pos[];
} {
  const empty = { mode: 'none' as const, positions: [] as Pos[] };
  if (!canUseSkill(s, skillId)) return empty;
  const side = s.side;
  if (
    skillId === 'caocao-guixin' ||
    skillId === 'ganning-chaiqiao' ||
    skillId === 'huatuo-qingnang' ||
    skillId === 'lvbu-wushuang'
  ) {
    return { mode: 'none', positions: [] };
  }
  if (skillId === 'lvbu-chitu') {
    const positions = allPieces(s.board, side)
      .filter((x) => x.piece.type === 'P' && x.piece.revealed)
      .map((x) => x.pos);
    return { mode: 'ownPawn', positions };
  }
  if (skillId === 'zhangfei-paoxiao') {
    const positions = allPieces(s.board, side)
      .filter((x) => !x.piece.revealed)
      .map((x) => x.pos);
    return { mode: 'ownPiece', positions };
  }
  if (skillId === 'guanyu-wuguan') {
    const positions = allPieces(s.board, side)
      .filter((x) => x.piece.type === 'N' && x.piece.revealed)
      .map((x) => x.pos);
    return { mode: 'ownPiece', positions };
  }
  if (skillId === 'guanyu-wusheng') {
    const positions = allPieces(s.board, side)
      .filter((x) => x.piece.type !== 'K' && x.piece.revealed && !crossedRiver(x.pos.r, side))
      .map((x) => x.pos);
    return { mode: 'ownPiece', positions };
  }
  if (skillId === 'zhaoyun-longhun') {
    const positions = allPieces(s.board, side)
      .filter((x) => x.piece.type !== 'K')
      .map((x) => x.pos);
    return { mode: 'twoOwn', positions };
  }
  if (skillId === 'simayi-guicai') {
    const view = { ...s, side: opposite(side) };
    const positions = allPieces(s.board, opposite(side))
      .filter((x) => x.piece.type !== 'K' && listLegalFrom(view, x.pos).length > 0)
      .map((x) => x.pos);
    return { mode: 'enemy', positions };
  }
  if (skillId === 'simayi-yingshi') {
    const positions = allPieces(s.board, opposite(side))
      .filter((x) => !x.piece.revealed)
      .map((x) => x.pos);
    return { mode: 'dark', positions };
  }
  if (skillId === 'diaochan-lijian') {
    const positions = allPieces(s.board, opposite(side))
      .filter((x) => !x.piece.revealed)
      .map((x) => x.pos);
    return { mode: 'dark', positions };
  }
  if (skillId === 'zhouyu-fanjian' || skillId === 'xiahoudun-danjing') {
    return { mode: 'enemy', positions: allPieces(s.board, opposite(side)).map((x) => x.pos) };
  }
  if (skillId === 'sunshangxiang-lianyin') {
    return { mode: 'ownPiece', positions: lianyinTargets(s, side) };
  }
  if (skillId === 'zhuge-guanxing') {
    const positions = allPieces(s.board)
      .filter((x) => !x.piece.revealed)
      .map((x) => x.pos);
    return { mode: 'dark', positions };
  }
  if (skillId === 'zhuge-kongcheng') {
    return { mode: 'ownPiece', positions: allPieces(s.board, side).map((x) => x.pos) };
  }
  return empty;
}

export function simaYiLegalDests(s: GameState, from: Pos): Pos[] {
  const p = getPiece(s.board, from);
  if (!p || p.side !== s.side) return [];
  return emptySquares(s.board, (r, c) => {
    if (p.type === 'K') return inPalace(r, c, p.side);
    return true;
  });
}

/** 青囊落子：士须九宫；暗象不过河。 */
function pieceCanTeleportSit(p: Piece, pos: Pos): boolean {
  if (p.type === 'K') return false;
  if (p.type === 'A') return inPalace(pos.r, pos.c, p.side);
  if (p.type === 'B') return p.revealed || elephantOwnSide(pos.r, p.side);
  return true;
}

function lianyinTargets(s: GameState, side: Side): Pos[] {
  return allPieces(s.board, side)
    .filter((x) => x.piece.revealed && x.piece.type !== 'K')
    .map((x) => x.pos);
}

function qingnangPairs(s: GameState, side: Side): { from: Pos; to: Pos; piece: Piece }[] {
  const mine = allPieces(s.board, side).filter((x) => x.piece.type !== 'K');
  const spots = emptySquares(s.board, (r) => onOwnHalf(r, side));
  const pairs: { from: Pos; to: Pos; piece: Piece }[] = [];
  for (const m of mine) {
    for (const dest of spots) {
      if (pieceCanTeleportSit(m.piece, dest)) {
        pairs.push({ from: m.pos, to: dest, piece: m.piece });
      }
    }
  }
  return pairs;
}

function enemiesInOwnPalace(s: GameState, side: Side): { pos: Pos; piece: Piece }[] {
  return allPieces(s.board, opposite(side)).filter((x) => inPalace(x.pos.r, x.pos.c, side));
}

export function useSkill(s0: GameState, skillId: string, payload: SkillPayload): GameState {
  const s = cloneState(s0);
  if (!canUseSkill(s, skillId)) return s0;
  const owned = findOwnedSkill(sideGens(s, s.side), skillId);
  if (!owned) return s0;
  const { general: g, skill } = owned;
  const side = s.side;
  if (skill.qiCost != null && skill.qiCost > 0 && (s.qi[side] ?? 0) < skill.qiCost) return s0;

  if (skillId === 'guanyu-wuguan') {
    if (payload.kind !== 'fromTo') return s0;
    if (!s.pending.awaitOverFive) return s0;
    const p = getPiece(s.board, payload.from);
    if (!p || p.side !== side || p.type !== 'N' || !p.revealed) return s0;
    const dests = overFiveDests(s, payload.from);
    if (!dests.some((d) => posEq(d, payload.to))) return s0;
    consumeSkill(s, g, skill);
    const prevAdj = countAdjacentPairs(s.board, p.side);
    const { board: nb, captured } = applyMove(s.board, payload.from, payload.to);
    s.board = nb;
    if (captured) {
      s.captured[captured.side] = [...s.captured[captured.side], asCaptured(captured)];
    }
    const river = maybeRiverCross(s, p, payload.to);
    s.lastMove = { from: { ...payload.from }, to: { ...payload.to }, piece: { ...p } };
    s.moveSerial += 1;
    pushLog(
      s,
      `过五关：${describeMove({
        side,
        from: payload.from,
        to: payload.to,
        piece: p,
        flipped: !p.revealed,
        captured,
      })}`,
    );
    afterBoardMutation(s, side, {
      captured,
      movedPiece: p,
      from: payload.from,
      to: payload.to,
      riverCrossNew: river,
      prevAdjacentEnemy: prevAdj,
    });
    if (captured) applyXiahou(s, captured.side, payload.to, { resumeTurn: false });
    maybeTriggerYingshi(s, {
      flippedId: !p.revealed ? p.id : undefined,
      capturedId: captured?.id,
    });
    maybeClearWushengGuard(s);
    s.pending = { ...s.pending, awaitOverFive: undefined };
    s.movedThisTurn = true;
    finishIfOver(s, s.side);
    return s;
  }

  if (skillId === 'guanyu-wusheng') {
    if (payload.kind !== 'pos') return s0;
    const p = getPiece(s.board, payload.pos);
    if (!p || p.side !== side || p.type === 'K' || !p.revealed) return s0;
    if (crossedRiver(payload.pos.r, side)) return s0;
    consumeSkill(s, g, skill);
    s.pending = { ...s.pending, wushengGuard: { pieceId: p.id, owner: side } };
    pushLog(s, `武圣：${pieceLabel(p)} 在己方半场受护`);
    return s;
  }

  if (skillId === 'zhangfei-paoxiao') {
    if (payload.kind !== 'pos') return s0;
    const p = getPiece(s.board, payload.pos);
    if (!p || p.side !== side) return s0;
    if (p.revealed) return s0;
    consumeSkill(s, g, skill);
    s.pending = { ...s.pending, zhangFeiPieceId: p.id };
    s.movesLeft = (s.movesLeft ?? 0) + 1;
    return s;
  }

  if (skillId === 'zhaoyun-longhun') {
    if (payload.kind !== 'twoPos') return s0;
    if (s.movedThisTurn || (s.movesLeft ?? 0) <= 0) return s0;
    const a = getPiece(s.board, payload.a);
    const b = getPiece(s.board, payload.b);
    if (!a || !b || a.side !== side || b.side !== side) return s0;
    if (posEq(payload.a, payload.b)) return s0;
    if (a.type === 'K' || b.type === 'K') return s0;
    const nb = cloneBoard(s.board);
    nb[payload.a.r][payload.a.c] = b;
    nb[payload.b.r][payload.b.c] = a;
    if (inCheck(nb, side)) return s0;
    consumeSkill(s, g, skill);
    s.board = nb;
    s.movedThisTurn = true;
    s.movesLeft = (s.movesLeft ?? 0) - 1;
    s.pending = { ...s.pending, zhangFeiPieceId: undefined };
    pushLog(s, `龙魂：${pieceLabel(a)} 与 ${pieceLabel(b)} 换位`);
    maybeClearWushengGuard(s);
    finishIfOver(s, s.side);
    if (s.winner) return s;
    if (s.movesLeft > 0) return s;
    const opp = opposite(s.side);
    const oppOver = isGameOver(s.board, opp, legalOptions(s, opp));
    const kingsGone = !findKing(s.board, 'red') || !findKing(s.board, 'black');
    if (kingsGone || oppOver.over) {
      endTurn(s);
      return s;
    }
    if (maybeAwaitKongcheng(s)) return s;
    endTurn(s);
    return s;
  }

  if (skillId === 'caocao-guixin') {
    const converts = enemiesInOwnPalace(s, side);
    if (converts.length === 0) {
      return s0;
    }
    consumeSkill(s, g, skill);
    const nb = cloneBoard(s.board);
    for (const hit of converts) {
      nb[hit.pos.r][hit.pos.c] = { ...hit.piece, side };
    }
    s.board = nb;
    pushLog(s, `归心：收编己方九宫内 ${converts.length} 枚敌子`);
    maybeClearWushengGuard(s);
    finishIfOver(s, s.side);
    return s;
  }

  if (skillId === 'simayi-guicai') {
    if (payload.kind !== 'pos') return s0;
    const p = getPiece(s.board, payload.pos);
    if (!p || p.side === side || p.type === 'K') return s0;
    const view = { ...s, side: opposite(side) };
    if (listLegalFrom(view, payload.pos).length === 0) return s0;
    consumeSkill(s, g, skill);
    s.pending = {
      ...s.pending,
      guicaiLock: { pieceId: p.id, untilSide: opposite(side) },
    };
    pushLog(s, `鬼才：对方下回合只能走${pieceLabel(p)}`);
    return s;
  }

  if (skillId === 'simayi-yingshi') {
    if (payload.kind !== 'pos') return s0;
    if (!s.pending.awaitYingshi) return s0;
    const p = getPiece(s.board, payload.pos);
    if (!p || p.side === side || p.revealed) return s0;
    applyYingshiMark(s, side, p);
    setSideGens(
      s,
      side,
      sideGens(s, side).map((x) => (x.id === g.id ? { ...x, hidden: false } : x)),
    );
    s.skillBroadcast = { name: g.name, skill: skill.name, faction: g.faction };
    pushLog(s, `鹰视：标记偷看一枚敌子`);
    maybeOpenOverFive(s);
    return s;
  }

  if (skillId === 'huatuo-qingnang') {
    const pairs = qingnangPairs(s, side);
    if (pairs.length === 0) {
      pushLog(s, '青囊：无可传送的棋子或落点，落空');
      return s0;
    }
    const pick = pickRandom(pairs)!;
    consumeSkill(s, g, skill);
    const prevAdj = countAdjacentPairs(s.board, pick.piece.side);
    const nb = cloneBoard(s.board);
    nb[pick.to.r][pick.to.c] = pick.piece;
    nb[pick.from.r][pick.from.c] = null;
    s.board = nb;
    pushLog(s, `青囊：${pieceLabel(pick.piece)} 移至 ${squareName(pick.to)}`);
    afterBoardMutation(s, side, {
      movedPiece: pick.piece,
      from: pick.from,
      to: pick.to,
      prevAdjacentEnemy: prevAdj,
    });
    maybeClearWushengGuard(s);
    finishIfOver(s, s.side);
    return s;
  }

  if (skillId === 'zhouyu-fanjian') {
    if (payload.kind !== 'pos') return s0;
    const p = getPiece(s.board, payload.pos);
    if (!p || p.side === side) return s0;
    consumeSkill(s, g, skill);
    s.pending = {
      ...s.pending,
      fanjianMark: { pieceId: p.id, untilSide: opposite(side) },
    };
    pushLog(s, `反间：标记 ${pieceLabel(p)}`);
    return s;
  }

  if (skillId === 'sunshangxiang-lianyin') {
    if (payload.kind !== 'pos') return s0;
    const p = getPiece(s.board, payload.pos);
    if (!p || p.side !== side || !p.revealed || p.type === 'K') return s0;
    const spots = emptySquares(
      s.board,
      (r, c) => !onOwnHalf(r, p.side) && pieceCanTeleportSit(p, { r, c }),
    );
    if (spots.length === 0) return s0;
    consumeSkill(s, g, skill);
    const dest = pickRandom(spots)!;
    const prevAdj = countAdjacentPairs(s.board, p.side);
    const nb = cloneBoard(s.board);
    nb[dest.r][dest.c] = p;
    nb[payload.pos.r][payload.pos.c] = null;
    s.board = nb;
    pushLog(s, `联姻：${pieceLabel(p)} 移至 ${squareName(dest)}`);
    afterBoardMutation(s, side, {
      movedPiece: p,
      from: payload.pos,
      to: dest,
      prevAdjacentEnemy: prevAdj,
    });
    maybeClearWushengGuard(s);
    finishIfOver(s, s.side);
    return s;
  }

  if (skillId === 'ganning-chaiqiao') {
    consumeSkill(s, g, skill);
    s.pending = { ...s.pending, bridgeDown: { owner: side, enemyTurnsLeft: 2 } };
    return s;
  }

  if (skillId === 'lvbu-chitu') {
    if (payload.kind !== 'pos') return s0;
    const p = getPiece(s.board, payload.pos);
    if (!p || p.side !== side || p.type !== 'P' || !p.revealed) return s0;
    consumeSkill(s, g, skill);
    const nb = cloneBoard(s.board);
    nb[payload.pos.r][payload.pos.c] = { ...p, type: 'N', coverType: 'N', revealed: true };
    s.board = nb;
    pushLog(s, `赤兔：${pieceLabel(p)} 化为马于 ${squareName(payload.pos)}`);
    return s;
  }

  if (skillId === 'lvbu-wushuang') {
    consumeSkill(s, g, skill);
    s.pending = { ...s.pending, wushuang: { owner: side, turnsLeft: 3 } };
    pushLog(s, '无双：之后3个敌方回合内将帅不可被吃、不可被将军');
    return s;
  }

  if (skillId === 'diaochan-lijian') {
    if (payload.kind !== 'pos') return s0;
    const p = getPiece(s.board, payload.pos);
    if (!p || p.side === side || p.revealed) return s0;
    consumeSkill(s, g, skill);
    s.pending = {
      ...s.pending,
      lijianMark: { pieceId: p.id, untilSide: opposite(side) },
    };
    pushLog(s, `离间：标记对方${pieceLabel(p)}；若其下回合行走其他棋子则随机失去一枚非将帅棋`);
    return s;
  }

  if (skillId === 'zhuge-guanxing') {
    if (payload.kind !== 'posList') return s0;
    if (!s.pending.awaitGuanxing) return s0;
    if (payload.positions.length !== 5) return s0;
    const ids: string[] = [];
    for (const pos of payload.positions) {
      const p = getPiece(s.board, pos);
      if (!p || p.revealed) return s0;
      if (ids.includes(p.id)) return s0;
      ids.push(p.id);
    }
    consumeSkill(s, g, skill);
    setPeekedFor(s, side, ids);
    s.pending = { ...s.pending, awaitGuanxing: undefined };
    pushLog(s, '观星，窥见五枚暗子');
    if (sideHasSkill(sideGens(s, side), 'simayi-yingshi')) {
      maybeOpenYingshiWindow(s, side);
    }
    maybeOpenOverFive(s);
    return s;
  }

  if (skillId === 'zhuge-kongcheng') {
    if (payload.kind !== 'pos') return s0;
    if (!s.pending.awaitKongcheng) return s0;
    const p = getPiece(s.board, payload.pos);
    if (!p || p.side !== side) return s0;
    consumeSkill(s, g, skill);
    s.pending = {
      ...s.pending,
      kongcheng: { pieceId: p.id, untilSide: side },
      awaitKongcheng: undefined,
    };
    pushLog(s, `空城：${pieceLabel(p)} 受到庇护，直至己方下回合`);
    endTurn(s);
    return s;
  }

  if (skillId === 'xiahoudun-danjing') {
    if (payload.kind !== 'pos') return s0;
    const p = getPiece(s.board, payload.pos);
    if (!p || p.side === side) return s0;
    consumeSkill(s, g, skill);
    s.pending = { ...s.pending, danjing: { pieceId: p.id, untilSide: opposite(side) } };
    pushLog(s, `啖睛：${pieceLabel(p)} 下一回合无法吃子`);
    return s;
  }

  return s0;
}

function maybeAwaitKongcheng(s: GameState): boolean {
  if (s.winner || s.phase !== 'playing') return false;
  const owned = findOwnedSkill(sideGens(s, s.side), 'zhuge-kongcheng');
  if (!owned || !isSkillReady(owned.skill, s.qi[s.side] ?? 0)) return false;
  // Open the end-of-turn window quietly; broadcast after the player picks a piece.
  s.pending = { ...s.pending, awaitKongcheng: true, zhangFeiPieceId: undefined };
  return true;
}

export function makeMove(s0: GameState, from: Pos, to: Pos): GameState {
  const s = cloneState(s0);
  if (s.phase !== 'playing' || s.winner) return s0;
  if (pendingBlocksPlay(s)) return s0;
  if ((s.movesLeft ?? 0) <= 0) return s0;
  const dests = listLegalFrom(s, from);
  if (!dests.some((d) => posEq(d, to))) return s0;
  const piece = getPiece(s.board, from)!;
  let dest = to;
  const mark = s.pending.fanjianMark;
  if (mark && mark.untilSide === s.side && piece.id === mark.pieceId) {
    const picked = pickFanjianDest(dests);
    if (picked) dest = picked;
    pushLog(s, '反间：随机落点');
  }
  const prevAdjMover = countAdjacentPairs(s.board, piece.side);
  const { board: nb, captured } = applyMove(s.board, from, dest);
  s.board = nb;
  if (captured) {
    s.captured[captured.side] = [...s.captured[captured.side], asCaptured(captured)];
    s.capturedThisTurn = true;
  }
  s.movedThisTurn = true;
  s.movesLeft = (s.movesLeft ?? 0) - 1;
  const fwd = piece.side === 'red' ? -1 : 1;
  const pawnAdvance1 = piece.type === 'P' && dest.r - from.r === fwd && dest.c === from.c;
  const river = maybeRiverCross(s, piece, dest);
  s.lastMove = { from: { ...from }, to: { ...dest }, piece: { ...piece } };
  s.moveSerial += 1;
  pushLog(
    s,
    describeMove({
      side: piece.side,
      from,
      to: dest,
      piece,
      flipped: !piece.revealed,
      captured,
    }),
  );

  afterBoardMutation(s, s.side, {
    captured,
    movedPiece: piece,
    from,
    to: dest,
    pawnAdvance1,
    riverCrossNew: river,
    prevAdjacentEnemy: prevAdjMover,
  });

  if (captured) {
    applyXiahou(s, captured.side, dest, { resumeTurn: s.movesLeft === 0 });
  }

  maybeTriggerYingshi(s, {
    flippedId: !piece.revealed ? piece.id : undefined,
    capturedId: captured?.id,
  });

  maybeClearWushengGuard(s);

  if (s.pending.ganglieDice) {
    finishIfOver(s, s.side);
    return s;
  }

  if (s.movesLeft > 0) {
    finishIfOver(s, s.side);
    if (s.winner) return s;
    return s;
  }

  const opp = opposite(s.side);
  const oppOver = isGameOver(s.board, opp, legalOptions(s, opp));
  const kingsGone = !findKing(s.board, 'red') || !findKing(s.board, 'black');
  if (kingsGone || oppOver.over) {
    endTurn(s);
    return s;
  }
  if (maybeAwaitKongcheng(s)) return s;
  endTurn(s);
  return s;
}

export function announceOwnedSkill(s0: GameState, skillId: string): GameState {
  const s = cloneState(s0);
  const owned = findOwnedSkill(sideGens(s, s.side), skillId);
  if (!owned) return s0;
  s.skillBroadcast = {
    name: owned.general.name,
    skill: owned.skill.name,
    faction: owned.general.faction,
  };
  return s;
}

export function clearBroadcast(s0: GameState): GameState {
  if (!s0.skillBroadcast) return s0;
  return { ...s0, skillBroadcast: null };
}

export function sideInCheck(s: GameState): boolean {
  return inCheck(s.board, s.side);
}

export function capturedOf(s: GameState, side: Side): Piece[] {
  return s.captured[side];
}

/** Live match-state blurb for a skill detail card (owner perspective). */
export function skillLiveState(s: GameState, skillId: string, viewer: Side = 'red'): string | null {
  const trueLabel = (p: Piece) => CHAR[p.side][p.type];
  const fmt = (p: Piece, pos: Pos) => `${trueLabel(p)} ${squareName(pos)}`;

  if (skillId === 'zhuge-guanxing') {
    const ids = peekedOf(s, viewer);
    if (!ids.length) return '尚未窥见暗子';
    const lines: string[] = [];
    for (const id of ids) {
      const hit = allPieces(s.board).find((x) => x.piece.id === id);
      if (hit) lines.push(fmt(hit.piece, hit.pos));
    }
    return lines.length ? `已窥见：${lines.join('、')}` : '窥见之子已不在棋盘';
  }
  if (skillId === 'simayi-yingshi') {
    const mark = s.pending.yingshiMark;
    if (!mark || mark.owner !== viewer) return '当前无标记';
    const hit = allPieces(s.board).find((x) => x.piece.id === mark.pieceId);
    if (!hit) return '标记之子已不在棋盘';
    return `标记中：${fmt(hit.piece, hit.pos)}`;
  }
  if (skillId === 'zhuge-kongcheng') {
    const kc = s.pending.kongcheng;
    if (!kc) return '当前无庇护';
    const hit = allPieces(s.board).find((x) => x.piece.id === kc.pieceId);
    if (!hit) return '庇护之子已不在棋盘';
    return `庇护中：${fmt(hit.piece, hit.pos)}`;
  }
  if (skillId === 'simayi-guicai') {
    const lock = s.pending.guicaiLock;
    if (!lock) return '当前无锁定';
    const hit = allPieces(s.board).find((x) => x.piece.id === lock.pieceId);
    if (!hit) return '锁定之子已不在棋盘';
    return `锁定中：${fmt(hit.piece, hit.pos)}（对方下回合）`;
  }
  if (skillId === 'guanyu-wusheng') {
    const owned = findOwnedSkill(sideGens(s, viewer), 'guanyu-wusheng');
    if (!owned) return null;
    if (owned.skill.uses >= owned.skill.maxUses && !s.pending.wushengGuard) {
      return '本局已发动';
    }
    const g = s.pending.wushengGuard;
    if (!g || g.owner !== viewer) return '尚未发动';
    const hit = allPieces(s.board).find((x) => x.piece.id === g.pieceId);
    if (!hit) return '受护之子已不在棋盘';
    return `受护中：${fmt(hit.piece, hit.pos)}`;
  }
  if (skillId === 'lvbu-wushuang') {
    const owned = findOwnedSkill(sideGens(s, viewer), 'lvbu-wushuang');
    if (!owned) return null;
    const wu = s.pending.wushuang;
    if (wu && wu.owner === viewer && wu.turnsLeft > 0) {
      return `无双剩余 ${wu.turnsLeft} 敌方回合`;
    }
    if (owned.skill.uses >= owned.skill.maxUses) return '本局已发动';
    return '尚未发动';
  }
  if (skillId === 'diaochan-lijian') {
    const mark = s.pending.lijianMark;
    if (!mark) return null;
    const hit = allPieces(s.board).find((x) => x.piece.id === mark.pieceId);
    if (!hit) return '标记之子已不在棋盘';
    if (mark.untilSide === opposite(viewer)) {
      return `离间已发动：已标记${fmt(hit.piece, hit.pos)}；对方行走其他棋子将随机失去一枚非将帅棋`;
    }
    if (mark.untilSide === viewer) {
      return `离间中：已标记${fmt(hit.piece, hit.pos)}；行走其他棋子将随机失去一枚非将帅棋`;
    }
    return null;
  }
  return null;
}

export { fillSkill, bumpSkill };
