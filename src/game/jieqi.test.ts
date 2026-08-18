import {
  applyMove,
  createJieqiBoard,
  emptyBoard,
  generatePseudoMoves,
  getLegalMoves,
  type Board,
} from './core';
import { startMatch } from './engine';
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

function P(type: PieceType, side: Side, id: string, extra?: Partial<Piece>): Piece {
  return { type, side, id, revealed: true, coverType: type, ...extra };
}

function set(b: Board, r: number, c: number, type: PieceType, side: Side, extra?: Partial<Piece>): void {
  b[r][c] = P(type, side, extra?.id ?? `${side}-${type}-${r}-${c}`, extra);
}

function countPieces(b: Board): { revealed: number; dark: number; kings: number } {
  let revealed = 0;
  let dark = 0;
  let kings = 0;
  for (const row of b) {
    for (const p of row) {
      if (!p) continue;
      if (p.type === 'K') kings += 1;
      if (p.revealed) revealed += 1;
      else dark += 1;
    }
  }
  return { revealed, dark, kings };
}

{
  const b = createJieqiBoard();
  const { revealed, dark, kings } = countPieces(b);
  assert(kings === 2, 'start has two kings');
  assert(revealed === 2, 'start: only two kings revealed');
  assert(dark === 30, '15+15 dark pieces');
  assert(b[9][4]?.type === 'K' && b[9][4]?.side === 'red' && b[9][4]?.revealed && b[9][4]?.coverType === 'K', 'red 帅 face-up on (9,4)');
  assert(b[0][4]?.type === 'K' && b[0][4]?.side === 'black' && b[0][4]?.revealed && b[0][4]?.coverType === 'K', 'black 将 face-up on (0,4)');
}

{
  const b = createJieqiBoard();
  const p = b[6][0]!;
  assert(!!p && !p.revealed && p.coverType === 'P', 'dark piece sits on red pawn square');
  const moves = getLegalMoves(b, { r: 6, c: 0 }, 'red');
  assert(moves.length === 1 && moves[0].r === 5 && moves[0].c === 0, 'dark on pawn square can only step forward');
}

{
  const b = createJieqiBoard();
  const p = b[9][0]!;
  assert(!!p && !p.revealed && p.coverType === 'R', 'dark piece sits on red rook square');
  const moves = getLegalMoves(b, { r: 9, c: 0 }, 'red');
  assert(moves.some((m) => m.r === 8 && m.c === 0), 'dark on rook square can slide to (8,0)');
  assert(moves.some((m) => m.r === 7 && m.c === 0), 'dark on rook square can slide to (7,0)');
}

{
  const b = emptyBoard();
  set(b, 9, 4, 'K', 'red');
  set(b, 0, 3, 'K', 'black');
  set(b, 6, 4, 'R', 'red', { revealed: false, coverType: 'P', id: 'dark-r' });
  const before = generatePseudoMoves(b, { r: 6, c: 4 });
  assert(before.length === 1 && before[0].r === 5 && before[0].c === 4, 'dark 车 on pawn square steps forward only');
  const { board: nb } = applyMove(b, { r: 6, c: 4 }, { r: 5, c: 4 });
  const flipped = nb[5][4]!;
  assert(flipped.revealed === true && flipped.type === 'R', 'after move, piece.revealed === true');
  const after = generatePseudoMoves(nb, { r: 5, c: 4 });
  assert(after.some((m) => m.r === 5 && m.c === 0), 'further moves use true type (车 slides)');
}

{
  const b = emptyBoard();
  set(b, 9, 4, 'K', 'red');
  set(b, 0, 3, 'K', 'black');
  set(b, 5, 2, 'B', 'red', { revealed: true, coverType: 'B', id: 'rb' });
  const moves = generatePseudoMoves(b, { r: 5, c: 2 });
  assert(moves.some((m) => m.r === 3 && m.c === 4), 'revealed 象 can land across river if 象眼 empty');
  set(b, 4, 3, 'P', 'red', { id: 'eye' });
  const blocked = generatePseudoMoves(b, { r: 5, c: 2 });
  assert(!blocked.some((m) => m.r === 3 && m.c === 4), '塞象眼 still blocks revealed 象');
}

{
  const b = createJieqiBoard();
  JSON.stringify(b);
  const s = startMatch();
  JSON.stringify(s);
  assert(true, 'JSON serialize still works');
}

{
  const b = emptyBoard();
  set(b, 9, 4, 'K', 'red');
  set(b, 0, 4, 'K', 'black');
  set(b, 8, 4, 'A', 'red', { revealed: true, coverType: 'A', id: 'ra' });
  const dests = generatePseudoMoves(b, { r: 8, c: 4 });
  assert(dests.some((m) => m.r === 7 && m.c === 3), 'revealed 仕 can step out of palace');
}

{
  const b = emptyBoard();
  set(b, 9, 4, 'K', 'red');
  set(b, 0, 4, 'K', 'black');
  set(b, 8, 3, 'A', 'red', { revealed: false, coverType: 'A', id: 'da' });
  const dests = generatePseudoMoves(b, { r: 8, c: 3 });
  assert(dests.every((m) => m.c >= 3 && m.c <= 5 && m.r >= 7), 'dark 仕 cannot leave palace');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
