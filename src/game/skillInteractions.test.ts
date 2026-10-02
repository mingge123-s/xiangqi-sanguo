import assert from 'node:assert/strict';
import { createHomeState, useSkill, makeMove, resolveGanglieChoice, resolveGanglie,
  __testSetGanglieRoll, __testEndTurn, listLegalMoves, validSkillTargets, sideInCheck,
  findSkillRescue, settlePosition, canUseSkill } from './engine';
import { emptyBoard, allPieces, crossedRiver } from './core';
import { applyAITurn, chooseAISkill } from './ai';
import { GENERALS, defToRuntime } from './generals';
import type { Piece, PieceType, Side } from './types';
const p = (type: PieceType, side: Side, id: string, dark = false): Piece =>
  ({ type, side, id, coverType: type, revealed: !dark });
const gen = (id: string) => defToRuntime(GENERALS.find(g => g.id === id)!);
function base() {
  const s = createHomeState(); s.phase = 'playing'; s.movesLeft = 1;
  s.qi = { red: 20, black: 20 }; s.board = emptyBoard();
  s.board[9][4] = p('K', 'red', 'rk'); s.board[0][3] = p('K', 'black', 'bk');
  return s;
}
{
  const s = base(); s.side = 'black'; s.blackGenerals = [gen('guanyu')];
  s.redGenerals = [gen('xiahoudun')];
  s.board[2][0] = p('R', 'black', 'br', true); s.board[7][0] = p('R', 'red', 'rr', true);
  s.peekedIds.black = ['br', 'rr'];
  const n = applyAITurn(s);
  assert(n.pending.awaitGanglie); assert.equal(n.winner, null); assert.equal(n.phase, 'playing');
  assert.equal(n.moveSerial, s.moveSerial, 'AI stops before moving while player chooses');
  const declined = resolveGanglieChoice(n, false);
  assert.equal(declined.winner, null); assert.equal(declined.side, 'black');
  assert(listLegalMoves(declined).length > 0);
}
{
  const s = base(); s.redGenerals = [gen('zhangfei')];
  s.board[6][0] = p('P', 'red', 'blocked', true); s.board[5][0] = p('P', 'red', 'blocker');
  assert(!validSkillTargets(s, 'zhangfei-paoxiao').positions.some(pos => pos.r === 6 && pos.c === 0));
  assert.equal(useSkill(s, 'zhangfei-paoxiao', { kind: 'pos', pos: { r: 6, c: 0 } }), s);
  assert.equal(s.qi.red, 20, 'invalid target costs nothing');
}
{
  // 咆哮 first capture pauses for 刚烈; AI must not mistake the second move for a loss.
  const s = base(); s.side = 'black'; s.redGenerals = [gen('xiahoudun')];
  s.blackGenerals = [gen('zhangfei')]; s.skillUsedThisTurn = true;
  s.movesLeft = 2; s.pending.zhangFeiPieceId = 'br';
  s.board[2][0] = p('R', 'black', 'br'); s.board[7][0] = p('R', 'red', 'rr');
  const n = applyAITurn(s);
  assert(n.pending.awaitGanglie); assert.equal(n.winner, null);
  __testSetGanglieRoll(3);
  const done = resolveGanglie(resolveGanglieChoice(n, true));
  assert.equal(done.winner, null); assert.equal(done.side, 'red');
  assert.equal(done.pending.zhangFeiPieceId, undefined, 'destroyed extra-move piece ends bonus action');
}
{
  const s = base(); s.side = 'black'; s.blackGenerals = [gen('guanyu')];
  s.board[2][0] = p('R', 'black', 'own', true);
  s.board[7][0] = p('N', 'red', 'a', true); s.board[7][0]!.coverType = 'R';
  s.board[7][2] = p('R', 'red', 'b', true);
  const swapped = structuredClone(s);
  swapped.board[7][0]!.type = 'R'; swapped.board[7][2]!.type = 'N';
  const random = Math.random;
  try {
    Math.random = () => 0;
    assert.deepEqual(chooseAISkill(s), chooseAISkill(swapped), 'hidden identities cannot change the AI choice');
    s.peekedIds.black = ['own', 'a', 'b'];
    assert.deepEqual(chooseAISkill(s)?.payload, { kind: 'twoPos', a: { r: 2, c: 0 }, b: { r: 7, c: 2 } }, 'known matching identity remains usable');
  } finally { Math.random = random; }
}
{
  const s = base(); s.redGenerals = [gen('sunshangxiang')]; s.blackGenerals = [gen('ganning')];
  s.qi.black = 0; s.board[6][0] = p('P', 'red', 'rp');
  const after = useSkill(s, 'sunshangxiang-lianyin', { kind: 'pos', pos: { r: 6, c: 0 } });
  const moved = allPieces(after.board).find(x => x.piece.id === 'rp')!;
  assert(crossedRiver(moved.pos.r, 'red')); assert(after.crossedRiverIds.includes('rp'));
  assert.equal(after.qi.black, 1, 'teleport crossing triggers 锦帆');
  const capture = base(); capture.side = 'black'; capture.redGenerals = [gen('sunshangxiang')];
  capture.qi.red = 0; capture.crossedRiverIds = after.crossedRiverIds;
  capture.board[3][0] = p('P', 'red', 'rp'); capture.board[2][0] = p('R', 'black', 'br');
  assert.equal(makeMove(capture, { r: 2, c: 0 }, { r: 3, c: 0 }).qi.red, 3, '枭姬 +2 and turn-start +1');
}
{
  const s = base(); s.side = 'black'; s.redGenerals = [gen('lvbu'), gen('zhaoyun')];
  s.qi.red = 0; s.pending.wushuang = { owner: 'red', turnsLeft: 3 };
  s.board[8][4] = p('R', 'black', 'br');
  const n = __testEndTurn(s);
  assert(!sideInCheck(n)); assert.equal(n.qi.red, 1, '无双 prevents 龙胆 check income');
}
function matePosition() {
  const s = base(); s.side = 'black';
  s.board[8][0] = p('R', 'black', 'br1'); s.board[7][3] = p('R', 'black', 'br2');
  s.board[8][5] = p('P', 'black', 'bp'); return s;
}
{
  const s = matePosition(); s.redGenerals = [gen('lvbu')];
  const n = makeMove(s, { r: 8, c: 0 }, { r: 8, c: 4 });
  assert.equal(n.winner, null); assert.equal(listLegalMoves(n).length, 0);
  assert.equal(findSkillRescue(n)?.id, 'lvbu-wushuang');
  const saved = useSkill(n, 'lvbu-wushuang', { kind: 'none' });
  assert(listLegalMoves(saved).length > 0); assert.equal(saved.winner, null);
  const noSkill = makeMove(matePosition(), { r: 8, c: 0 }, { r: 8, c: 4 });
  assert.equal(noSkill.winner, 'black'); assert.equal(noSkill.resultReason, 'checkmate');
}
{
  const s = base(); s.board[9][4] = null;
  const n = settlePosition(s); assert.equal(n.resultReason, 'king-captured');
  const t = base(); t.board[9][4] = null; t.board[9][8] = p('K', 'red', 'rk');
  assert.equal(settlePosition(t).resultReason, 'stalemate');
}
{
  const s = base(); s.redGenerals = ['lvbu', 'guanyu', 'zhaoyun', 'zhangfei', 'huatuo', 'simayi'].map(gen);
  for (const id of ['lvbu-chitu', 'guanyu-wusheng', 'guanyu-yijue', 'zhaoyun-longhun', 'zhangfei-paoxiao', 'huatuo-qingnang', 'simayi-guicai']) {
    assert(!canUseSkill(s, id), `${id} stays unavailable without a valid target`);
  }
}
{
  // Swap, return, and cross again: each crossing grants 锦帆 once, with no duplicates.
  const s = base(); s.redGenerals = [gen('zhaoyun')]; s.blackGenerals = [gen('ganning')];
  s.board[6][0] = p('R', 'red', 'a'); s.board[3][0] = p('R', 'red', 'b'); s.qi.black = 0;
  const n = useSkill(s, 'zhaoyun-longhun', { kind: 'twoPos', a: {r:6,c:0}, b: {r:3,c:0} });
  assert(n.crossedRiverIds.includes('a')); assert.equal(n.qi.black, 2, '锦帆 +1 and turn-start +1');
  const t = base(); t.board[5][0] = p('R', 'red', 'a'); t.blackGenerals = [gen('ganning')];
  t.crossedRiverIds = ['a']; t.qi.black = 0;
  const again = makeMove(t, {r:5,c:0}, {r:4,c:0});
  assert.equal(again.qi.black, 2); assert.equal(again.crossedRiverIds.filter(id => id === 'a').length, 1);
}
{
  const s = base(); s.blackGenerals = [gen('xiahoudun')];
  s.board[8][4] = p('A', 'black', 'victim');
  __testSetGanglieRoll(1);
  const dice = makeMove(s, {r:9,c:4}, {r:8,c:4});
  assert.equal(dice.winner, null);
  const n = resolveGanglie(dice);
  assert.equal(n.resultReason, 'king-destroyed'); assert.equal(n.winner, 'black');
}
console.log('skill interaction regressions passed');
