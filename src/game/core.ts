import {
  type Move,
  type Piece,
  type PieceType,
  type Pos,
  type Side,
  CHAR,
  COLS,
  COVER_CHAR,
  PIECE_VALUES,
  ROWS,
} from './types';

// Re-export a board type alias locally — types.ts uses (Piece|null)[][]
export type Board = (Piece | null)[][];

export { PIECE_VALUES, CHAR, ROWS, COLS };

let _id = 1;
function nextId(side: Side, type: PieceType): string {
  _id += 1;
  return `${side}-${type}-${_id}`;
}

export function resetIdCounter(n = 1): void {
  _id = n;
}

export function opposite(side: Side): Side {
  return side === 'red' ? 'black' : 'red';
}

export function posEq(a: Pos, b: Pos): boolean {
  return a.r === b.r && a.c === b.c;
}

export function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}

export function inPalace(r: number, c: number, side: Side): boolean {
  if (c < 3 || c > 5) return false;
  return side === 'red' ? r >= 7 && r <= 9 : r >= 0 && r <= 2;
}

export function crossedRiver(r: number, side: Side): boolean {
  return side === 'red' ? r <= 4 : r >= 5;
}

export function onOwnHalf(r: number, side: Side): boolean {
  return side === 'red' ? r >= 5 : r <= 4;
}

export function elephantOwnSide(r: number, side: Side): boolean {
  return onOwnHalf(r, side);
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((p) => (p ? { ...p } : null)));
}

export function clonePiece(p: Piece): Piece {
  return { ...p };
}

function put(
  board: Board,
  r: number,
  c: number,
  type: PieceType,
  side: Side,
  opts?: { revealed?: boolean; coverType?: PieceType },
): void {
  board[r][c] = {
    type,
    side,
    id: nextId(side, type),
    revealed: opts?.revealed ?? true,
    coverType: opts?.coverType ?? type,
  };
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const BACK_RANK: PieceType[] = ['R', 'N', 'B', 'A', 'K', 'A', 'B', 'N', 'R'];
const NON_KING_POOL: PieceType[] = ['R', 'N', 'B', 'A', 'A', 'B', 'N', 'R', 'C', 'C', 'P', 'P', 'P', 'P', 'P'];

function sideStartSquares(side: Side): { r: number; c: number; cover: PieceType }[] {
  const backR = side === 'red' ? 9 : 0;
  const cannonR = side === 'red' ? 7 : 2;
  const pawnR = side === 'red' ? 6 : 3;
  const out: { r: number; c: number; cover: PieceType }[] = [];
  for (let c = 0; c < 9; c++) {
    if (BACK_RANK[c] !== 'K') out.push({ r: backR, c, cover: BACK_RANK[c] });
  }
  out.push({ r: cannonR, c: 1, cover: 'C' }, { r: cannonR, c: 7, cover: 'C' });
  for (const c of [0, 2, 4, 6, 8]) out.push({ r: pawnR, c, cover: 'P' });
  return out;
}

export function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<Piece | null>(COLS).fill(null));
}

/** Standard xiangqi layout, every piece face-up. Used by rule unit tests. */
export function createStandardBoard(): Board {
  resetIdCounter(1);
  const b = emptyBoard();
  for (let c = 0; c < 9; c++) {
    put(b, 0, c, BACK_RANK[c], 'black', { revealed: true, coverType: BACK_RANK[c] });
    put(b, 9, c, BACK_RANK[c], 'red', { revealed: true, coverType: BACK_RANK[c] });
  }
  put(b, 2, 1, 'C', 'black');
  put(b, 2, 7, 'C', 'black');
  put(b, 7, 1, 'C', 'red');
  put(b, 7, 7, 'C', 'red');
  for (const c of [0, 2, 4, 6, 8]) {
    put(b, 3, c, 'P', 'black');
    put(b, 6, c, 'P', 'red');
  }
  return b;
}

/** 揭棋 deal: kings face-up, the other 15+15 shuffled face-down onto starting squares. */
export function createJieqiBoard(): Board {
  resetIdCounter(1);
  const b = emptyBoard();
  put(b, 9, 4, 'K', 'red', { revealed: true, coverType: 'K' });
  put(b, 0, 4, 'K', 'black', { revealed: true, coverType: 'K' });
  for (const side of ['red', 'black'] as Side[]) {
    const squares = sideStartSquares(side);
    const pool = shuffleInPlace(NON_KING_POOL.slice());
    for (let i = 0; i < squares.length; i++) {
      const sq = squares[i];
      put(b, sq.r, sq.c, pool[i], side, { revealed: false, coverType: sq.cover });
    }
  }
  return b;
}

/** Game start uses 揭棋. */
export function createInitialBoard(): Board {
  return createJieqiBoard();
}

/** Test helper: flip every piece face-up without changing identities or seats. */
export function revealAll(board: Board): Board {
  return board.map((row) => row.map((p) => (p ? { ...p, revealed: true } : null)));
}

export function findKing(board: Board, side: Side): Pos | null {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (p && p.type === 'K' && p.side === side) return { r, c };
    }
  }
  return null;
}

export function getPiece(board: Board, pos: Pos): Piece | null {
  if (!inBounds(pos.r, pos.c)) return null;
  return board[pos.r][pos.c];
}

function emptyBetweenOrtho(board: Board, a: Pos, b: Pos): boolean {
  if (a.r !== b.r && a.c !== b.c) return false;
  if (a.r === b.r) {
    const [c1, c2] = a.c < b.c ? [a.c, b.c] : [b.c, a.c];
    for (let c = c1 + 1; c < c2; c++) if (board[a.r][c]) return false;
    return true;
  }
  const [r1, r2] = a.r < b.r ? [a.r, b.r] : [b.r, a.r];
  for (let r = r1 + 1; r < r2; r++) if (board[r][a.c]) return false;
  return true;
}

function countBetweenOrtho(board: Board, a: Pos, b: Pos): number {
  if (a.r !== b.r && a.c !== b.c) return -1;
  let n = 0;
  if (a.r === b.r) {
    const [c1, c2] = a.c < b.c ? [a.c, b.c] : [b.c, a.c];
    for (let c = c1 + 1; c < c2; c++) if (board[a.r][c]) n++;
    return n;
  }
  const [r1, r2] = a.r < b.r ? [a.r, b.r] : [b.r, a.r];
  for (let r = r1 + 1; r < r2; r++) if (board[r][a.c]) n++;
  return n;
}

function addIf(out: Pos[], board: Board, side: Side, r: number, c: number, captureOnly = false, moveOnly = false): void {
  if (!inBounds(r, c)) return;
  const t = board[r][c];
  if (!t) {
    if (!captureOnly) out.push({ r, c });
    return;
  }
  if (t.side !== side && !moveOnly) out.push({ r, c });
}

/** Pseudo-legal destinations (ignore self-check). */
export function generatePseudoMoves(
  board: Board,
  from: Pos,
  extras?: { ignoreHorseLeg?: boolean },
): Pos[] {
  const p = getPiece(board, from);
  if (!p) return [];
  const { side } = p;
  const type: PieceType = p.revealed ? p.type : (p.coverType ?? p.type);
  const { r, c } = from;
  const out: Pos[] = [];

  if (type === 'K') {
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (inPalace(nr, nc, side)) addIf(out, board, side, nr, nc);
    }
    return out;
  }

  if (type === 'A') {
    for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
      const nr = r + dr;
      const nc = c + dc;
      // Dark 仕 keep palace lock; revealed 仕 may leave palace / cross river.
      if (p.revealed || inPalace(nr, nc, side)) addIf(out, board, side, nr, nc);
    }
    return out;
  }

  if (type === 'B') {
    for (const [dr, dc] of [[-2, -2], [-2, 2], [2, -2], [2, 2]]) {
      const nr = r + dr;
      const nc = c + dc;
      const er = r + dr / 2;
      const ec = c + dc / 2;
      if (!inBounds(nr, nc)) continue;
      // Dark 相 keep own-half lock; revealed 象 may cross the river.
      if (!p.revealed && !elephantOwnSide(nr, side)) continue;
      if (board[er][ec]) continue; // 塞象眼
      addIf(out, board, side, nr, nc);
    }
    return out;
  }

  if (type === 'N') {
    const hops: [number, number, number, number][] = [
      [-2, -1, -1, 0],
      [-2, 1, -1, 0],
      [2, -1, 1, 0],
      [2, 1, 1, 0],
      [-1, -2, 0, -1],
      [1, -2, 0, -1],
      [-1, 2, 0, 1],
      [1, 2, 0, 1],
    ];
    for (const [dr, dc, br, bc] of hops) {
      const lr = r + br;
      const lc = c + bc;
      if (!inBounds(lr, lc) || (board[lr][lc] && !extras?.ignoreHorseLeg)) continue;
      addIf(out, board, side, r + dr, c + dc);
    }
    return out;
  }

  if (type === 'R') {
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc)) {
        const t = board[nr][nc];
        if (!t) out.push({ r: nr, c: nc });
        else {
          if (t.side !== side) out.push({ r: nr, c: nc });
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
    return out;
  }

  if (type === 'C') {
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      let nr = r + dr;
      let nc = c + dc;
      let jumped = false;
      while (inBounds(nr, nc)) {
        const t = board[nr][nc];
        if (!jumped) {
          if (!t) out.push({ r: nr, c: nc });
          else jumped = true;
        } else {
          if (t) {
            if (t.side !== side) out.push({ r: nr, c: nc });
            break;
          }
        }
        nr += dr;
        nc += dc;
      }
    }
    return out;
  }

  // Pawn
  const fwd = side === 'red' ? -1 : 1;
  addIf(out, board, side, r + fwd, c);
  if (crossedRiver(r, side)) {
    addIf(out, board, side, r, c - 1);
    addIf(out, board, side, r, c + 1);
  }
  return out;
}

export function kingsFace(board: Board): boolean {
  const rk = findKing(board, 'red');
  const bk = findKing(board, 'black');
  if (!rk || !bk) return false;
  if (rk.c !== bk.c) return false;
  return emptyBetweenOrtho(board, rk, bk);
}

/** Does any piece of `attacker` attack `target` (including flying general)? */
export function isAttacked(board: Board, target: Pos, attacker: Side): boolean {
  const victim = getPiece(board, target);
  // Flying general: kings on same file, empty between
  if (victim && victim.type === 'K') {
    if (kingsFace(board)) return true;
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (!p || p.side !== attacker) continue;
      const moves = generatePseudoMoves(board, { r, c });
      if (moves.some((m) => m.r === target.r && m.c === target.c)) return true;
    }
  }
  return false;
}

export function inCheck(board: Board, side: Side): boolean {
  const k = findKing(board, side);
  if (!k) return true;
  return isAttacked(board, k, opposite(side));
}

export function applyMove(board: Board, from: Pos, to: Pos): { board: Board; captured: Piece | null } {
  const next = cloneBoard(board);
  const piece = next[from.r][from.c];
  if (!piece) return { board: next, captured: null };
  const cap = next[to.r][to.c];
  const moved = piece.revealed ? piece : { ...piece, revealed: true };
  next[to.r][to.c] = moved;
  next[from.r][from.c] = null;
  return { board: next, captured: cap ? { ...cap } : null };
}

export interface LegalMoveOptions {
  ignoreHorseLeg?: boolean;
  frozen?: boolean;
  protectedPieceId?: string;
  protectedPieceIds?: string[];
  noCapture?: boolean;
  blockRiverCross?: boolean;
}

export interface AllLegalOptions {
  frozen?: Pos;
  protectedPieceId?: string;
  protectedPieceIds?: string[];
  noCapturePieceId?: string;
  blockRiverCross?: boolean;
  onlyPieceId?: string;
}

export function getLegalMoves(
  board: Board,
  from: Pos,
  side: Side,
  options?: LegalMoveOptions,
): Pos[] {
  const p = getPiece(board, from);
  if (!p || p.side !== side) return [];
  if (options?.frozen) return [];
  const raw = generatePseudoMoves(board, from, { ignoreHorseLeg: options?.ignoreHorseLeg });
  const legal: Pos[] = [];
  for (const to of raw) {
    if (options?.blockRiverCross && !crossedRiver(from.r, side) && crossedRiver(to.r, side)) continue;
    const target = board[to.r][to.c];
    if (options?.noCapture && target && target.side !== side) continue;
    if (target && options?.protectedPieceId && target.id === options.protectedPieceId) continue;
    if (target && options?.protectedPieceIds?.includes(target.id)) continue;
    const { board: nb } = applyMove(board, from, to);
    if (!inCheck(nb, side)) legal.push(to);
  }
  return legal;
}

export function getAllLegalMoves(
  board: Board,
  side: Side,
  options?: AllLegalOptions,
): Move[] {
  const moves: Move[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (!p || p.side !== side) continue;
      if (options?.onlyPieceId && p.id !== options.onlyPieceId) continue;
      const frozen = options?.frozen && options.frozen.r === r && options.frozen.c === c;
      const noCapture = !!(options?.noCapturePieceId && p.id === options.noCapturePieceId);
      const dests = getLegalMoves(board, { r, c }, side, {
        frozen,
        noCapture,
        protectedPieceId: options?.protectedPieceId,
        protectedPieceIds: options?.protectedPieceIds,
        blockRiverCross: options?.blockRiverCross,
      });
      for (const to of dests) moves.push({ from: { r, c }, to });
    }
  }
  return moves;
}

export function isGameOver(
  board: Board,
  sideToMove: Side,
  options?: AllLegalOptions,
): { over: boolean; winner: Side | null } {
  if (!findKing(board, 'red')) return { over: true, winner: 'black' };
  if (!findKing(board, 'black')) return { over: true, winner: 'red' };
  const moves = getAllLegalMoves(board, sideToMove, options);
  if (moves.length === 0) {
    return { over: true, winner: opposite(sideToMove) };
  }
  return { over: false, winner: null };
}

export function pieceValueAt(p: Piece, r: number, peekedIds?: string[]): number {
  const known = !!p.revealed || !!(peekedIds && peekedIds.includes(p.id));
  if (!known) {
    const ct = p.coverType ?? p.type;
    let v = (PIECE_VALUES[ct] ?? 10) * 0.6;
    if (ct === 'P' && crossedRiver(r, p.side)) v = 18;
    return v;
  }
  if (p.type === 'P' && crossedRiver(r, p.side)) return 30;
  return PIECE_VALUES[p.type];
}

export function evaluateBoard(board: Board, perspective: Side, peekedIds?: string[]): number {
  let score = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (!p) continue;
      let v = pieceValueAt(p, r, peekedIds);
      const known = !!p.revealed || !!(peekedIds && peekedIds.includes(p.id));
      const evalType = known ? p.type : (p.coverType ?? p.type);
      if (evalType === 'P') {
        v += p.side === 'red' ? (6 - r) : (r - 3);
      }
      if (evalType === 'R' || evalType === 'C') {
        let empty = 0;
        for (let rr = 0; rr < ROWS; rr++) if (!board[rr][c] || rr === r) empty++;
        v += empty >= 8 ? 3 : 0;
      }
      score += p.side === perspective ? v : -v;
    }
  }
  if (inCheck(board, opposite(perspective))) score += 8;
  if (inCheck(board, perspective)) score -= 8;
  return score;
}

export function chebyshev(a: Pos, b: Pos): number {
  return Math.max(Math.abs(a.r - b.r), Math.abs(a.c - b.c));
}

export function isAdjacent(a: Pos, b: Pos): boolean {
  const dr = Math.abs(a.r - b.r);
  const dc = Math.abs(a.c - b.c);
  return dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0);
}

export function allPieces(board: Board, side?: Side): { pos: Pos; piece: Piece }[] {
  const out: { pos: Pos; piece: Piece }[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (p && (side === undefined || p.side === side)) out.push({ pos: { r, c }, piece: p });
    }
  }
  return out;
}

export function emptySquares(board: Board, pred?: (r: number, c: number) => boolean): Pos[] {
  const out: Pos[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!board[r][c] && (!pred || pred(r, c))) out.push({ r, c });
    }
  }
  return out;
}

export function pickRandom<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

export function squareName(pos: Pos): string {
  return `(${pos.r},${pos.c})`;
}

export function pieceLabel(p: Piece): string {
  if (!p.revealed) return '？';
  return CHAR[p.side][p.type];
}

export function describeMove(opts: {
  side: Side;
  from: Pos;
  to: Pos;
  piece: Piece;
  flipped?: boolean;
  captured?: Piece | null;
}): string {
  const { side, from, to, piece, flipped, captured } = opts;
  const dr = to.r - from.r;
  const dc = to.c - from.c;
  const adr = Math.abs(dr);
  const adc = Math.abs(dc);

  let horiz = '';
  let vert = '';
  if (side === 'red') {
    if (dr < 0) vert = '前';
    else if (dr > 0) vert = '后';
    if (dc < 0) horiz = '左';
    else if (dc > 0) horiz = '右';
  } else {
    if (dr > 0) vert = '前';
    else if (dr < 0) vert = '后';
    if (dc > 0) horiz = '左';
    else if (dc < 0) horiz = '右';
  }
  const dir = `往${horiz}${vert}`;

  let action: string;
  if ((adr === 2 && adc === 1) || (adr === 1 && adc === 2)) {
    action = '跳了一日';
  } else if (adr === 2 && adc === 2) {
    action = '飞了一田';
  } else if (adr === 1 && adc === 1) {
    action = '斜了1格';
  } else if (adr === 0 || adc === 0) {
    action = `走了${adr + adc}格`;
  } else {
    action = '走了';
  }

  const wasRevealed = !!piece.revealed;
  let subject: string;
  let flipNote = '';
  if (!wasRevealed) {
    const cover = COVER_CHAR[piece.coverType ?? piece.type];
    subject = `暗子（按${cover}走）`;
    if (flipped) {
      flipNote = `，翻开是${CHAR[piece.side][piece.type]}`;
    }
  } else {
    subject = CHAR[piece.side][piece.type];
  }

  let eat = '';
  if (captured) {
    eat = captured.revealed
      ? `，吃掉了对方的${CHAR[captured.side][captured.type]}`
      : '，吃掉了对方的暗子';
  }

  const who = side === 'red' ? '红' : '黑';
  return `${who}方的${subject}${dir}${action}${flipNote}${eat}`;
}
