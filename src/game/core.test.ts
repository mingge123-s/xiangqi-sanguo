import {
  applyMove,
  createStandardBoard,
  describeMove,
  emptyBoard,
  getLegalMoves,
  groupName,
  groupOfType,
  inCheck,
  isGameOver,
  publicGroup,
  trueGroup,
  type Board,
} from './core';
import type { Piece, PieceType, Side } from './types';

let passed = 0;
let failed = 0;

function assert(cond: unknown, msg: string): void {
  if (!cond) {
    failed += 1;
    console.error('FAIL', msg);
    throw new Error(msg);
  }
  passed += 1;
  console.log('ok ', msg);
}

function P(type: PieceType, side: Side, id: string): Piece {
  return { type, side, id, revealed: true, coverType: type };
}

function set(b: Board, r: number, c: number, type: PieceType, side: Side, id?: string): void {
  b[r][c] = P(type, side, id ?? `${side}-${type}-${r}-${c}`);
}

// 1. Initial legal pawn move
{
  const b = createStandardBoard();
  const moves = getLegalMoves(b, { r: 6, c: 0 }, 'red');
  assert(moves.some((m) => m.r === 5 && m.c === 0), 'initial red pawn (6,0) can advance to (5,0)');
  assert(moves.length === 1, 'un-crossed pawn has exactly one move');
}

// 2. Horse blocked by 马腿
{
  const b = createStandardBoard();
  // occupy 马腿 at (8,1)
  set(b, 8, 1, 'P', 'red', 'blocker');
  const moves = getLegalMoves(b, { r: 9, c: 1 }, 'red');
  assert(!moves.some((m) => m.r === 7 && m.c === 0), 'horse blocked: cannot (7,0)');
  assert(!moves.some((m) => m.r === 7 && m.c === 2), 'horse blocked: cannot (7,2)');
}

// horse unblocked can jump
{
  const b = createStandardBoard();
  const moves = getLegalMoves(b, { r: 9, c: 1 }, 'red');
  assert(moves.some((m) => m.r === 7 && m.c === 0), 'horse unblocked can go (7,0)');
  assert(moves.some((m) => m.r === 7 && m.c === 2), 'horse unblocked can go (7,2)');
}

// 3. Cannon capture over exactly one piece
{
  const b = emptyBoard();
  set(b, 9, 4, 'K', 'red');
  set(b, 0, 3, 'K', 'black');
  set(b, 7, 1, 'C', 'red');
  set(b, 5, 1, 'P', 'red', 'screen');
  set(b, 2, 1, 'N', 'black', 'victim');
  const moves = getLegalMoves(b, { r: 7, c: 1 }, 'red');
  assert(moves.some((m) => m.r === 2 && m.c === 1), 'cannon captures over one screen');
  // two screens — cannot
  set(b, 4, 1, 'P', 'black', 'screen2');
  const moves2 = getLegalMoves(b, { r: 7, c: 1 }, 'red');
  assert(!moves2.some((m) => m.r === 2 && m.c === 1), 'cannon cannot capture over two screens');
  // no screen — cannot capture
  const b3 = emptyBoard();
  set(b3, 9, 4, 'K', 'red');
  set(b3, 0, 3, 'K', 'black');
  set(b3, 7, 1, 'C', 'red');
  set(b3, 2, 1, 'N', 'black');
  const moves3 = getLegalMoves(b3, { r: 7, c: 1 }, 'red');
  assert(!moves3.some((m) => m.r === 2 && m.c === 1), 'cannon cannot capture with empty path');
  assert(moves3.some((m) => m.r === 6 && m.c === 1), 'cannon can slide to empty square');
}

// 4. Flying general illegal
{
  const b = emptyBoard();
  set(b, 9, 4, 'K', 'red');
  set(b, 0, 4, 'K', 'black');
  set(b, 6, 4, 'P', 'red');
  const sideways = getLegalMoves(b, { r: 6, c: 4 }, 'red');
  assert(!sideways.some((m) => m.c !== 4), 'pawn cannot step aside and expose flying general');
  const forward = getLegalMoves(b, { r: 6, c: 4 }, 'red');
  assert(forward.some((m) => m.r === 5 && m.c === 4), 'pawn can still advance and keep blocking');
  const { board: exposed } = applyMove(b, { r: 6, c: 4 }, { r: 6, c: 3 });
  assert(inCheck(exposed, 'red'), 'exposing flying general puts red in check');
}

// 5. Checkmate on a constructed position
{
  const b = emptyBoard();
  set(b, 0, 4, 'K', 'black');
  set(b, 9, 8, 'K', 'red'); // not on file 4
  set(b, 0, 0, 'R', 'red', 'r1');
  set(b, 1, 8, 'R', 'red', 'r2');
  assert(inCheck(b, 'black'), 'black is in check from rook on rank 0');
  const over = isGameOver(b, 'black');
  assert(over.over, 'position is game-over');
  assert(over.winner === 'red', 'red wins by checkmate');
}

// extra: king stays in palace
{
  const b = emptyBoard();
  set(b, 9, 4, 'K', 'red');
  set(b, 0, 4, 'K', 'black');
  set(b, 5, 4, 'P', 'red', 'block');
  const km = getLegalMoves(b, { r: 9, c: 4 }, 'red');
  assert(km.every((m) => m.c >= 3 && m.c <= 5 && m.r >= 7), 'king stays in palace');
}

// describeMove: beginner-friendly logs
{
  const darkRookHorse: Piece = { type: 'N', side: 'red', id: 'd1', revealed: false, coverType: 'R' };
  const line = describeMove({
    side: 'red',
    from: { r: 9, c: 0 },
    to: { r: 9, c: 5 },
    piece: darkRookHorse,
    flipped: true,
  });
  assert(line === '红方的暗子（按车走）往右走了5格，翻开是馬', 'dark rook-square slide flips to horse');
}

{
  const rook: Piece = { type: 'R', side: 'red', id: 'r1', revealed: true, coverType: 'R' };
  const line = describeMove({ side: 'red', from: { r: 9, c: 0 }, to: { r: 9, c: 5 }, piece: rook });
  assert(line === '红方的車往右走了5格', 'revealed rook slides right 5');
}

{
  const pawn: Piece = { type: 'P', side: 'red', id: 'p1', revealed: true, coverType: 'P' };
  const line = describeMove({ side: 'red', from: { r: 6, c: 0 }, to: { r: 5, c: 0 }, piece: pawn });
  assert(line === '红方的兵往前走了1格', 'revealed pawn steps forward');
}

{
  const horse: Piece = { type: 'N', side: 'red', id: 'n1', revealed: true, coverType: 'N' };
  const line = describeMove({ side: 'red', from: { r: 9, c: 1 }, to: { r: 7, c: 2 }, piece: horse });
  assert(line === '红方的馬往右前跳了一日', 'revealed horse jumps 右前');
}

{
  const elephant: Piece = { type: 'B', side: 'red', id: 'b1', revealed: true, coverType: 'B' };
  const line = describeMove({ side: 'red', from: { r: 9, c: 2 }, to: { r: 7, c: 4 }, piece: elephant });
  assert(line === '红方的相往右前飞了一田', 'revealed elephant flies 右前');
}

{
  const advisor: Piece = { type: 'A', side: 'red', id: 'a1', revealed: true, coverType: 'A' };
  const line = describeMove({ side: 'red', from: { r: 9, c: 3 }, to: { r: 8, c: 4 }, piece: advisor });
  assert(line === '红方的仕往右前斜了1格', 'revealed advisor diagonal');
}

{
  const cannon: Piece = { type: 'C', side: 'red', id: 'c1', revealed: true, coverType: 'C' };
  const dark: Piece = { type: 'P', side: 'black', id: 'x1', revealed: false, coverType: 'P' };
  const line = describeMove({
    side: 'red',
    from: { r: 7, c: 1 },
    to: { r: 4, c: 1 },
    piece: cannon,
    captured: dark,
  });
  assert(line === '红方的炮往前走了3格，吃掉了对方的暗子', 'cannon captures dark');
}

{
  const horse: Piece = { type: 'N', side: 'red', id: 'n2', revealed: true, coverType: 'N' };
  const pawn: Piece = { type: 'P', side: 'black', id: 'bp', revealed: true, coverType: 'P' };
  const line = describeMove({
    side: 'red',
    from: { r: 5, c: 4 },
    to: { r: 3, c: 5 },
    piece: horse,
    captured: pawn,
  });
  assert(line === '红方的馬往右前跳了一日，吃掉了对方的卒', 'horse captures pawn');
}

{
  const rook: Piece = { type: 'R', side: 'black', id: 'br', revealed: true, coverType: 'R' };
  const line = describeMove({ side: 'black', from: { r: 0, c: 8 }, to: { r: 0, c: 3 }, piece: rook });
  assert(line === '黑方的車往右走了5格', 'black right is decreasing file');
}

// piece groups (rules-only)
{
  assert(groupOfType('K') === 'jiangshuai' && groupName('jiangshuai') === '将帅棋', '帅/将 → 将帅棋');
  const redKing: Piece = { type: 'K', side: 'red', id: 'rk', revealed: true, coverType: 'K' };
  const blackKing: Piece = { type: 'K', side: 'black', id: 'bk', revealed: true, coverType: 'K' };
  assert(trueGroup(redKing) === 'jiangshuai' && publicGroup(redKing) === 'jiangshuai', '帅 true/public 将帅棋');
  assert(trueGroup(blackKing) === 'jiangshuai' && publicGroup(blackKing) === 'jiangshuai', '将 true/public 将帅棋');
}

{
  assert(groupOfType('R') === 'chepao' && groupOfType('C') === 'chepao', '车、炮 group id is chepao');
  assert(groupName('chepao') === '车炮棋', '车、炮 → 车炮棋');
}

{
  assert(groupOfType('N') === 'maxiangshi', '马 is 马象士, not 车炮');
  assert(groupOfType('B') === 'maxiangshi' && groupOfType('A') === 'maxiangshi', '象、士 group id is maxiangshi');
  assert(groupName('maxiangshi') === '马象士', '马、象、士 → 马象士');
}

{
  assert(groupOfType('P') === 'bingzu' && groupName('bingzu') === '兵卒棋', '兵、卒 → 兵卒棋');
  const redPawn: Piece = { type: 'P', side: 'red', id: 'rp', revealed: true, coverType: 'P' };
  const blackPawn: Piece = { type: 'P', side: 'black', id: 'bp', revealed: true, coverType: 'P' };
  assert(trueGroup(redPawn) === 'bingzu' && trueGroup(blackPawn) === 'bingzu', '兵、卒 trueGroup 兵卒棋');
}

{
  const dark: Piece = { type: 'R', side: 'red', id: 'dark-r-p', revealed: false, coverType: 'P' };
  assert(trueGroup(dark) === 'chepao' && groupName(trueGroup(dark)) === '车炮棋', 'dark R/P trueGroup is 车炮棋');
  assert(publicGroup(dark) === 'bingzu' && groupName(publicGroup(dark)) === '兵卒棋', 'dark R/P publicGroup is 兵卒棋');
}

{
  const shown: Piece = { type: 'R', side: 'red', id: 'shown-r-p', revealed: true, coverType: 'P' };
  assert(trueGroup(shown) === 'chepao' && publicGroup(shown) === 'chepao', 'revealed R/P both 车炮棋');
  assert(groupName(trueGroup(shown)) === '车炮棋' && groupName(publicGroup(shown)) === '车炮棋', 'revealed same piece names 车炮棋');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
