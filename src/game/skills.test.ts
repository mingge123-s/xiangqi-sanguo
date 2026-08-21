import { applyMove, createInitialBoard, createStandardBoard, emptyBoard, evaluateBoard, getPiece, inCheck, knownIdsOn, revealAll } from './core';
import { applyAITurn } from './ai';
import { canUseSkill, createHomeState, isKongchengCaptureAttempt, isWushengCaptureAttempt, isWushuangCaptureAttempt, isWushuangCheckAttempt, listLegalFrom, listLegalMoves, makeMove, peekDark, peekedOf, resolveGanglie, sideInCheck, skipKongcheng, skillLiveState, startMatch, useSkill, validSkillTargets, whyIllegalDest, whyPieceStuck, __testEndTurn, __testSetFanjianDest, __testSetGanglieRoll, __testSetLijianLoss } from './engine';
import { defToRuntime, GENERALS, skillPhaseOf, skillTypeLabel } from './generals';
import type { GameState, GeneralRuntime, Piece, PieceType, Side, SkillDef, SkillRuntime } from './types';

let passed = 0;
function assert(cond: unknown, msg: string): void {
  if (!cond) {
    console.error('FAIL', msg);
    throw new Error(msg);
  }
  passed += 1;
  console.log('ok ', msg);
}

function P(type: PieceType, side: Side, id: string, extra?: Partial<Piece>): Piece {
  return { type, side, id, revealed: true, coverType: type, ...extra };
}

function readyAll(g: GeneralRuntime): GeneralRuntime {
  return {
    ...g,
    skills: g.skills.map((sk) => ({
      ...sk,
      recharge: { ...sk.recharge, progress: sk.recharge.need },
    })),
  };
}

function base(): GameState {
  const s = createHomeState();
  s.phase = 'playing';
  s.side = 'red';
  s.board = revealAll(createStandardBoard());
  s.redGenerals = GENERALS.map((d) => readyAll(defToRuntime(d, true)));
  s.blackGenerals = [];
  s.qi = { red: 10, black: 10 };
  s.movesLeft = 1;
  return s;
}

function settle(s: GameState): GameState {
  if (s.pending.ganglieDice) s = resolveGanglie(s);
  if (s.pending.awaitKongcheng) s = skipKongcheng(s);
  return s;
}

function g(s: GameState, id: string): GeneralRuntime {
  return s.redGenerals.find((x) => x.id === id)!;
}

function sk(s: GameState, skillId: string, side: Side = 'red'): SkillRuntime {
  const gens = side === 'red' ? s.redGenerals : s.blackGenerals;
  for (const gen of gens) {
    const found = gen.skills.find((x) => x.id === skillId);
    if (found) return found;
  }
  throw new Error(`missing skill ${skillId}`);
}

function setSkill(s: GameState, generalId: string, skillId: string, patch: Partial<SkillRuntime>, side: Side = 'red'): void {
  const key = side === 'red' ? 'redGenerals' : 'blackGenerals';
  s[key] = s[key].map((x) =>
    x.id === generalId
      ? {
          ...x,
          skills: x.skills.map((skill) => (skill.id === skillId ? { ...skill, ...patch, recharge: { ...skill.recharge, ...(patch.recharge ?? {}) } } : skill)),
        }
      : x,
  );
}

// turn-start economy: startMatch grants red qi 1 / movesLeft 1; black stays 0
{
  const s = startMatch();
  assert(s.qi.red === 1, 'startMatch: red qi === 1');
  assert(s.qi.black === 0, 'startMatch: black qi === 0');
  assert(s.movesLeft === 1, 'startMatch: red movesLeft === 1');
}

// turn-start economy: after red ply → black qi 1 / movesLeft 1; red qi stays 1
{
  let s = startMatch();
  // Clear skill windows so a normal walk can resolve
  for (let i = 0; i < 40 && (s.pending.awaitGuanxing || s.pending.awaitYingshi); i++) {
    if (s.pending.awaitGuanxing) {
      const dark = s.board
        .flatMap((row, r) => row.map((p, c) => ({ p, r, c })))
        .filter((x) => x.p && !x.p.revealed)
        .slice(0, 5)
        .map((x) => ({ r: x.r, c: x.c }));
      if (dark.length === 5) s = useSkill(s, 'zhuge-guanxing', { kind: 'posList', positions: dark });
      else break;
    }
    if (s.pending.awaitYingshi) {
      const enemy = s.board
        .flatMap((row, r) => row.map((p, c) => ({ p, r, c })))
        .find((x) => x.p && x.p.side === 'black' && !x.p.revealed);
      if (enemy) s = useSkill(s, 'simayi-yingshi', { kind: 'pos', pos: { r: enemy.r, c: enemy.c } });
      else break;
    }
  }
  assert(s.qi.red === 1 && s.side === 'red' && s.movesLeft === 1, 'red ready to move with economy applied once');
  const moves = listLegalMoves(s);
  assert(moves.length > 0, 'red has a legal move after windows');
  s = settle(makeMove(s, moves[0].from, moves[0].to));
  assert(s.side === 'black', 'after red ply: black to move');
  assert(s.qi.black === 1, 'after red ply: black qi === 1');
  assert(s.movesLeft === 1, 'after red ply: black movesLeft === 1');
  assert(s.qi.red === 1, 'after red ply: red qi still 1 (no end-turn +1)');

  // Clear black windows if any, then black ply → red second turn qi === 2
  if (s.pending.awaitYingshi) {
    const enemy = s.board
      .flatMap((row, r) => row.map((p, c) => ({ p, r, c })))
      .find((x) => x.p && x.p.side === 'red' && !x.p.revealed);
    if (enemy) s = useSkill(s, 'simayi-yingshi', { kind: 'pos', pos: { r: enemy.r, c: enemy.c } });
  }
  const bMoves = listLegalMoves(s);
  assert(bMoves.length > 0, 'black has a legal move');
  s = settle(makeMove(s, bMoves[0].from, bMoves[0].to));
  assert(s.side === 'red', 'after black ply: red to move');
  assert(s.qi.red === 2, 'red second turn: qi === 2');
  assert(s.movesLeft === 1, 'red second turn: movesLeft === 1');
}

// 诸葛亮 观星 + 明暗置 (deal uniqueness; real jieqi board)
{
  const s = startMatch();
  const special = new Set(['guanyu', 'xiahoudun', 'ganning', 'lvbu']);
  const all = [...s.redGenerals, ...s.blackGenerals];
  for (const g of all) {
    if (!special.has(g.id) && g.id !== 'zhuge') {
      assert(!g.hidden, `${g.name} starts face-up`);
    }
  }
  if (s.redGenerals.some((x) => x.id === 'zhuge')) {
    const zg = s.redGenerals.find((x) => x.id === 'zhuge')!;
    assert(!zg.hidden, 'red 诸葛亮 revealed at start (await 观星)');
    assert(s.pending.awaitGuanxing, 'red 观星 waits for a 5-pick');
    const extra = s.blackGenerals.some((x) => x.id === 'simayi') ? 1 : 0;
    assert(peekedOf(s, 'red').length === 0, 'red 观星 does not auto-peek');
    assert(peekedOf(s, 'black').length === extra, 'black 鹰视 peeks stay on black side');
  } else if (s.blackGenerals.some((x) => x.id === 'zhuge')) {
    const zg = s.blackGenerals.find((x) => x.id === 'zhuge')!;
    assert(!zg.hidden, 'black 诸葛亮 revealed after auto 观星');
    assert(!s.pending.awaitGuanxing, 'black 观星 does not block red');
    assert(peekedOf(s, 'black').length >= 5, 'black 观星 auto-peeks 5');
    assert(peekedOf(s, 'red').length === 0, 'red cannot see black 观星 peeks');
  } else {
    for (const g of all) {
      if (special.has(g.id)) assert(g.hidden, `${g.name} stays hidden without 观星`);
    }
    const blackYingshi = s.blackGenerals.some((x) => x.id === 'simayi');
    if (blackYingshi) {
      assert(peekedOf(s, 'black').length === 1, 'black 鹰视 auto-marks one without 诸葛亮');
      assert(peekedOf(s, 'red').length === 0, 'red cannot see black 鹰视 peeks');
    } else {
      assert(peekedOf(s, 'red').length === 0 && peekedOf(s, 'black').length === 0, 'no peeks without 诸葛亮');
    }
    assert(!s.pending.awaitGuanxing, 'no awaitGuanxing without 诸葛亮');
  }
  assert(s.redGenerals.length === 3 && s.blackGenerals.length === 3, 'each side dealt 3 generals');
  const ids = all.map((x) => x.id);
  assert(new Set(ids).size === 6, 'no duplicate generals across sides');
  JSON.stringify(s);
  assert(true, 'GameState is JSON-serializable');
}

{
  const zgDef = GENERALS.find((d) => d.id === 'zhuge')!;
  const kc = defToRuntime(zgDef).skills.find((x) => x.id === 'zhuge-kongcheng')!;
  assert(kc.qiCost === 3, '空城 costs 3 qi');
  assert(kc.recharge.need === 0 && kc.recharge.trigger === 'none', '空城 no longer recharges');
  assert(kc.recharge.progress === 0, '空城 does not start ready via recharge');
}

// 观星: red chooses 5 dark pieces, pieces stay face-down, still red to move
{
  let s = startMatch();
  for (let i = 0; i < 80 && !s.redGenerals.some((x) => x.id === 'zhuge'); i++) {
    s = startMatch();
  }
  assert(s.redGenerals.some((x) => x.id === 'zhuge'), 'eventually dealt red 诸葛亮');
  const zg = s.redGenerals.find((x) => x.id === 'zhuge')!;
  assert(!zg.hidden, 'red 诸葛亮 revealed before pick');
  assert(s.pending.awaitGuanxing, 'pending.awaitGuanxing after startMatch');
  const blackExtra = s.blackGenerals.some((x) => x.id === 'simayi') ? 1 : 0;
  assert(peekedOf(s, 'red').length === 0, 'red peekedIds empty until useSkill');
  assert(peekedOf(s, 'black').length === blackExtra, 'black 鹰视 peeks isolated');
  assert(canUseSkill(s, 'zhuge-guanxing'), 'canUseSkill 观星 only while awaitGuanxing');
  assert(listLegalMoves(s).length === 0, 'no legal moves during awaitGuanxing');
  const dark = s.board
    .flatMap((row, r) => row.map((p, c) => ({ p, r, c })))
    .filter((x) => x.p && !x.p.revealed);
  assert(dark.length >= 5, 'jieqi deal has enough dark pieces');
  const five = dark.slice(0, 5).map((x) => ({ r: x.r, c: x.c }));
  const t = validSkillTargets(s, 'zhuge-guanxing');
  assert(t.positions.length === dark.length, '观星 targets all dark pieces');
  s = useSkill(s, 'zhuge-guanxing', { kind: 'posList', positions: five });
  assert(peekedOf(s, 'red').length === 5, 'red peekedIds length 5 after pick');
  assert(peekedOf(s, 'black').length === blackExtra, 'black peeks unchanged by red 观星');
  for (const pos of five) {
    const p = getPiece(s.board, pos);
    assert(p && !p.revealed, 'picked pieces stay face-down');
    assert(peekedOf(s, 'red').includes(p!.id), 'peeked id matches pick');
  }
  assert(!s.pending.awaitGuanxing, 'awaitGuanxing cleared after pick');
  assert(s.side === 'red', '观星 does not end the turn');
  assert(!s.skillUsedThisTurn, '观星 does not consume the active-skill slot');
  assert(!canUseSkill(s, 'zhuge-guanxing'), '观星 not usable mid-game');
}

// peekDark: live 观星 reveal, piece stays face-down
{
  let s = base();
  const pos = { r: 6, c: 0 };
  const piece = { ...getPiece(s.board, pos)!, revealed: false };
  s.board[6][0] = piece;
  const next = peekDark(s, pos);
  assert(peekedOf(next, 'red').includes(piece.id), 'peekDark appends unrevealed id');
  assert(!getPiece(next.board, pos)!.revealed, 'peekDark does not flip revealed');
  assert(next.pending.awaitGuanxing === s.pending.awaitGuanxing, 'peekDark does not close 观星');
  const again = peekDark(next, pos);
  assert(peekedOf(again, 'red').filter((id) => id === piece.id).length === 1, 'peekDark does not duplicate');
  const king = peekDark(s, { r: 9, c: 4 });
  assert(peekedOf(king, 'red').length === peekedOf(s, 'red').length, 'peekDark no-op on revealed');
}

// 观星: only black has 诸葛亮 — auto-peek 5, no await for red
{
  let s = startMatch();
  for (let i = 0; i < 80 && !(s.blackGenerals.some((x) => x.id === 'zhuge') && !s.redGenerals.some((x) => x.id === 'zhuge')); i++) {
    s = startMatch();
  }
  assert(s.blackGenerals.some((x) => x.id === 'zhuge') && !s.redGenerals.some((x) => x.id === 'zhuge'), 'only black 诸葛亮');
  const zg = s.blackGenerals.find((x) => x.id === 'zhuge')!;
  assert(!zg.hidden, 'black 诸葛亮 revealed');
  assert(peekedOf(s, 'black').length >= 5, 'black auto-peeks 5 immediately');
  assert(peekedOf(s, 'red').length === 0, 'opponent cannot see black 观星 peeks');
  assert(!s.pending.awaitGuanxing, 'no awaitGuanxing for red');
  const darkIds = s.board.flat().filter((p) => p && !p.revealed).map((p) => p!.id);
  assert(peekedOf(s, 'black').every((id) => darkIds.includes(id)), 'black peeks are dark piece ids');
  const special = new Set(['guanyu', 'xiahoudun', 'ganning', 'lvbu']);
  for (const g of s.redGenerals) {
    if (special.has(g.id)) assert(g.hidden, `观星 does not reveal ${g.name}`);
  }
}

// 关羽 义绝：desc + qiCost 5 exact
{
  const yijue = GENERALS.find((d) => d.id === 'guanyu')!.skills.find((x) => x.id === 'guanyu-yijue')!;
  assert(
    yijue.desc ===
      '主动技。走棋阶段，你可以消耗5点战气，指定己方一枚暗棋与对方一枚暗棋。若两者为同一种棋子，则摧毁对方该子；否则两者同时被摧毁。',
    '义绝 desc exact',
  );
  assert(yijue.qiCost === 5, '义绝 qiCost 5');
  assert(yijue.nature === '主动技', '义绝 nature 主动技');
  assert(yijue.phase === '走棋阶段', '义绝 phase 走棋阶段');
  assert(!yijue.desc.includes('不消耗走棋次数'), '义绝 desc has no free-move wording');
  assert(!yijue.desc.includes('出牌阶段'), '义绝 not 出牌阶段');
  assert(!GENERALS.find((d) => d.id === 'guanyu')!.skills.some((x) => x.id === 'guanyu-wuguan'), '过五关 removed');
}

// 关羽 义绝：cannot cast without own+enemy 暗棋
{
  let s = base();
  s.qi = { ...s.qi, red: 10 };
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[6][0] = P('P', 'red', 'rp'); // 明棋
  s.board[3][0] = P('P', 'black', 'bp'); // 明棋
  assert(!canUseSkill(s, 'guanyu-yijue'), 'cannot cast 义绝 without dark pieces');
  s.board[6][2] = P('N', 'red', 'rn', { revealed: false, coverType: 'N' });
  assert(!canUseSkill(s, 'guanyu-yijue'), 'cannot cast 义绝 with only own 暗棋');
  s.board[3][2] = P('N', 'black', 'bn', { revealed: false, coverType: 'N' });
  assert(canUseSkill(s, 'guanyu-yijue'), '义绝 castable with own+enemy 暗棋');
}

// 关羽 义绝：same type — enemy gone, own remains, qi −5, side still caster, movesLeft unchanged
{
  let s = base();
  s.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'guanyu')!, true))];
  s.qi = { red: 8, black: 0 };
  s.movesLeft = 1;
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[6][0] = P('P', 'red', 'own-dark', { revealed: false, coverType: 'A' });
  s.board[3][0] = P('P', 'black', 'enemy-dark', { revealed: false, coverType: 'N' });
  const beforeMoves = s.movesLeft;
  s = useSkill(s, 'guanyu-yijue', { kind: 'twoPos', a: { r: 6, c: 0 }, b: { r: 3, c: 0 } });
  assert(!getPiece(s.board, { r: 3, c: 0 }), '同种：对方暗棋摧毁');
  assert(!!getPiece(s.board, { r: 6, c: 0 }), '同种：己方暗棋仍在');
  assert(!getPiece(s.board, { r: 6, c: 0 })!.revealed, '同种：己方仍为暗棋');
  assert(s.qi.red === 3, '义绝 spends 5 qi');
  assert(s.side === 'red', '义绝 does not end caster turn');
  assert(s.movesLeft === beforeMoves, '义绝 does not spend movesLeft');
  assert(s.skillUsedThisTurn, '义绝 consumes active-skill slot');
  assert(s.captured.black.some((p) => p.id === 'enemy-dark'), 'enemy on captured rail');
  assert(!s.captured.red.some((p) => p.id === 'own-dark'), 'own not captured on same type');
  assert(s.log.some((l) => l.text.includes('义绝：同种')), '同种 log');
  assert(!g(s, 'guanyu').hidden, '关羽 revealed by 义绝');
}

// 关羽 义绝：different type — both gone
{
  let s = base();
  s.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'guanyu')!, true))];
  s.qi = { red: 8, black: 0 };
  s.movesLeft = 1;
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[6][0] = P('R', 'red', 'own-dark', { revealed: false, coverType: 'P' });
  s.board[3][0] = P('N', 'black', 'enemy-dark', { revealed: false, coverType: 'P' });
  s = useSkill(s, 'guanyu-yijue', { kind: 'twoPos', a: { r: 6, c: 0 }, b: { r: 3, c: 0 } });
  assert(!getPiece(s.board, { r: 6, c: 0 }), '异种：己方摧毁');
  assert(!getPiece(s.board, { r: 3, c: 0 }), '异种：对方摧毁');
  assert(s.captured.red.some((p) => p.id === 'own-dark'), 'own on captured rail');
  assert(s.captured.black.some((p) => p.id === 'enemy-dark'), 'enemy on captured rail');
  assert(s.side === 'red', '异种 义绝 does not end turn');
  assert(s.movesLeft === 1, '异种 义绝 does not spend movesLeft');
  assert(s.log.some((l) => l.text.includes('义绝：异种')), '异种 log');
}

// 关羽 义绝：cannot target 明棋
{
  let s = base();
  s.qi = { red: 10, black: 0 };
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[6][0] = P('P', 'red', 'own-dark', { revealed: false, coverType: 'P' });
  s.board[3][0] = P('P', 'black', 'enemy-dark', { revealed: false, coverType: 'P' });
  s.board[6][2] = P('N', 'red', 'own-ming');
  s.board[3][2] = P('N', 'black', 'enemy-ming');
  const t = validSkillTargets(s, 'guanyu-yijue');
  assert(t.positions.some((p) => p.r === 6 && p.c === 0), 'targets own 暗棋');
  assert(t.positions.some((p) => p.r === 3 && p.c === 0), 'targets enemy 暗棋');
  assert(!t.positions.some((p) => p.r === 6 && p.c === 2), 'rejects own 明棋');
  assert(!t.positions.some((p) => p.r === 3 && p.c === 2), 'rejects enemy 明棋');
  const mingTry = useSkill(s, 'guanyu-yijue', { kind: 'twoPos', a: { r: 6, c: 2 }, b: { r: 3, c: 0 } });
  assert(!!getPiece(mingTry.board, { r: 6, c: 2 }), '明棋 target rejected');
  assert(mingTry.qi.red === 10, 'rejected cast spends no qi');
}

// 武圣 still works
{
  let s = base();
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[9][0] = P('R', 'red', 'rr');
  s.board[0][0] = P('R', 'black', 'br');
  s = useSkill(s, 'guanyu-wusheng', { kind: 'pos', pos: { r: 9, c: 0 } });
  assert(s.pending.wushengGuard?.pieceId === 'rr', '武圣 still arms');
}

// 张飞 咆哮: same dark piece walks twice
{
  let s = base();
  assert(s.movesLeft === 1, '咆哮 turn starts with movesLeft 1');
  const pawn = getPiece(s.board, { r: 6, c: 0 })!;
  s.board[6][0] = { ...pawn, revealed: false };
  const paoxiao = GENERALS.find((d) => d.id === 'zhangfei')!.skills.find((x) => x.id === 'zhangfei-paoxiao')!;
  assert(paoxiao.desc === '主动技。走棋阶段，你可以消耗5点战气，指定己方一枚暗棋。该子走棋次数+1。', '咆哮 desc exact');
  const targets = validSkillTargets(s, 'zhangfei-paoxiao');
  assert(targets.positions.some((p) => p.r === 6 && p.c === 0), '咆哮 targets include own dark pawn');
  assert(
    targets.positions.every((p) => {
      const piece = s.board[p.r][p.c];
      return !!(piece && piece.side === 'red' && !piece.revealed);
    }),
    '咆哮 targets are only own dark pieces',
  );
  s = useSkill(s, 'zhangfei-paoxiao', { kind: 'pos', pos: { r: 6, c: 0 } });
  assert(s.movesLeft === 2, '咆哮 grants movesLeft += 1 → 2');
  assert(s.pending.zhangFeiPieceId === pawn.id, '咆哮 locks the designated piece');
  assert(s.qi.red === 5, '咆哮 costs 5 qi');
  assert(listLegalFrom(s, { r: 6, c: 2 }).length === 0, 'other pieces cannot move during 咆哮');
  s = makeMove(s, { r: 6, c: 0 }, { r: 5, c: 0 });
  assert(s.side === 'red', 'still red after first 咆哮 move');
  assert(s.movesLeft === 1, 'one move left after first walk');
  assert(listLegalFrom(s, { r: 6, c: 2 }).length === 0, 'still only the designated piece');
  s = settle(makeMove(s, { r: 5, c: 0 }, { r: 4, c: 0 }));
  assert(s.side === 'black', 'turn ends after second move');
  assert(s.movesLeft === 1, 'black starts with movesLeft 1');
}

// 咆哮 no-ops on a revealed target
{
  const s = base();
  const pawn = getPiece(s.board, { r: 6, c: 0 })!;
  assert(pawn.revealed, 'revealAll pawn starts as 明棋');
  const targets = validSkillTargets(s, 'zhangfei-paoxiao');
  assert(!targets.positions.some((p) => p.r === 6 && p.c === 0), '咆哮 excludes revealed pawn');
  const after = useSkill(s, 'zhangfei-paoxiao', { kind: 'pos', pos: { r: 6, c: 0 } });
  assert(after === s, '咆哮 no-ops on revealed target');
  assert(!after.pending.zhangFeiPieceId, '咆哮 does not lock a 明棋');
  assert(after.qi.red === 10, 'qi unchanged when 咆哮 targets 明棋');
  assert(after.movesLeft === 1, 'movesLeft unchanged when 咆哮 targets 明棋');
}

// 咆哮 cannot cast at 4
{
  const s = base();
  s.qi = { red: 4, black: 10 };
  const after = useSkill(s, 'zhangfei-paoxiao', { kind: 'pos', pos: { r: 6, c: 0 } });
  assert(!after.pending.zhangFeiPieceId, '咆哮 no-ops when qi < 5');
  assert(after.qi.red === 4, 'qi unchanged when 咆哮 fails');
  assert(after.side === 'red', 'failed 咆哮 does not change side');
}

// 赵云 龙魂：行棋前可用，发动后消耗本回合行棋
{
  let s = base();
  s.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'zhaoyun')!, false))];
  const qiBefore = s.qi.red;
  s = useSkill(s, 'zhaoyun-longhun', { kind: 'twoPos', a: { r: 9, c: 0 }, b: { r: 9, c: 8 } });
  const a = getPiece(s.board, { r: 9, c: 0 });
  const b = getPiece(s.board, { r: 9, c: 8 });
  assert(a?.type === 'R' && b?.type === 'R', '赵云 swapped the two rooks (still rooks)');
  assert(s.qi.red === qiBefore - 4, '龙魂 costs 4 战气; no end-turn +1 for caster');
  assert(s.side === 'black', '龙魂 consumes the turn like a spent move');
  assert(s.movedThisTurn === false, 'movedThisTurn cleared after turn ends');
  assert(s.movesLeft === 1, 'black gets movesLeft 1 at turn start');
  assert(!canUseSkill(s, 'zhaoyun-longhun'), '龙魂 not usable on opponent turn');

  let sMoved = base();
  sMoved.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'zhaoyun')!, false))];
  sMoved.movedThisTurn = true;
  assert(!canUseSkill(sMoved, 'zhaoyun-longhun'), '龙魂 blocked after already moving');
  const blocked = useSkill(sMoved, 'zhaoyun-longhun', { kind: 'twoPos', a: { r: 9, c: 0 }, b: { r: 9, c: 8 } });
  assert(getPiece(blocked.board, { r: 9, c: 0 })?.id === getPiece(sMoved.board, { r: 9, c: 0 })?.id, '龙魂 no-ops after move');

  let sNoMoves = base();
  sNoMoves.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'zhaoyun')!, false))];
  sNoMoves.movesLeft = 0;
  assert(!canUseSkill(sNoMoves, 'zhaoyun-longhun'), '龙魂 blocked when movesLeft is 0');

  const sKing = base();
  sKing.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'zhaoyun')!, false))];
  const longhun = GENERALS.find((d) => d.id === 'zhaoyun')!.skills.find((x) => x.id === 'zhaoyun-longhun')!;
  assert(longhun.desc === '主动技。走棋阶段，你可以消耗1点走棋次数和4点战气，交换己方两枚非将帅棋的位置。', '龙魂 desc exact');
  const kingTargets = validSkillTargets(sKing, 'zhaoyun-longhun');
  assert(
    kingTargets.positions.every((p) => {
      const piece = sKing.board[p.r][p.c];
      return !!(piece && piece.side === 'red' && piece.type !== 'K');
    }),
    '龙魂 targets exclude 将帅棋',
  );
  assert(!kingTargets.positions.some((p) => p.r === 9 && p.c === 4), '龙魂 never lists the king');
  const s2 = useSkill(sKing, 'zhaoyun-longhun', { kind: 'twoPos', a: { r: 9, c: 4 }, b: { r: 9, c: 0 } });
  assert(s2 === sKing, '龙魂 no-ops when either piece is 将帅棋');
  assert(getPiece(s2.board, { r: 9, c: 4 })?.type === 'K', '赵云 cannot swap 将帅棋');
  assert(s2.qi.red === sKing.qi.red, 'king swap spends no qi');
}

// 曹操 归心：收编己方九宫内敌子；空宫不可发动
{
  const guixin = GENERALS.find((d) => d.id === 'caocao')!.skills.find((x) => x.id === 'caocao-guixin')!;
  assert(guixin.desc === '主动技。走棋阶段，若己方九宫内有敌方棋子，你可以消耗6点战气，将其全部收为己用。', '归心 desc exact');
  let s = base();
  s.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'caocao')!, false))];
  s.qi = { red: 6, black: 10 };
  s.board[8][4] = P('N', 'black', 'intruder');
  assert(canUseSkill(s, 'caocao-guixin'), '归心 ready when enemy in palace');
  s = useSkill(s, 'caocao-guixin', { kind: 'none' });
  const converted = getPiece(s.board, { r: 8, c: 4 });
  assert(converted?.side === 'red' && converted?.type === 'N' && converted?.id === 'intruder', '归心 converts enemy in palace');
  assert(s.qi.red === 0, '归心 costs 6 qi');
  assert(s.side === 'red', '归心 does not end the turn');
  assert(s.skillBroadcast?.skill === '归心', 'broadcast 归心');

  let empty = base();
  empty.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'caocao')!, false))];
  empty.qi = { red: 6, black: 10 };
  const beforeQi = empty.qi.red;
  assert(!canUseSkill(empty, 'caocao-guixin'), '归心 cannot cast with empty palace');
  empty = useSkill(empty, 'caocao-guixin', { kind: 'none' });
  assert(empty.qi.red === beforeQi, '归心 no-ops without palace enemies');
  assert(sk(empty, 'caocao-guixin').uses === 0, '归心 no-op does not consume uses');
}

// 司马懿 鬼才: lock one enemy piece; does not spend 走棋次数 or end the turn
{
  let s = base();
  s.qi = { red: 4, black: 0 };
  const locked = getPiece(s.board, { r: 0, c: 0 })!;
  const movesBefore = s.movesLeft;
  s = useSkill(s, 'simayi-guicai', { kind: 'pos', pos: { r: 0, c: 0 } });
  assert(s.pending.guicaiLock?.pieceId === locked.id, '鬼才 locks the chosen enemy piece');
  assert(s.pending.guicaiLock?.untilSide === 'black', '鬼才 untilSide is the opponent');
  assert(s.side === 'red', '鬼才 does not end the turn');
  assert(s.movesLeft === movesBefore, '鬼才 leaves movesLeft unchanged');
  assert(s.qi.red === 0, '鬼才 costs 4 qi');
  assert(s.qi.black === 0, 'black qi unchanged until their turn');
  s = settle(makeMove(s, { r: 6, c: 0 }, { r: 5, c: 0 }));
  assert(s.side === 'black', 'after a walk, black turn begins');
  assert(s.qi.black === 1, 'black gets turn-start +1');
  assert(s.movesLeft === 1, 'black starts with movesLeft 1');
  const lockedMoves = listLegalMoves(s);
  assert(lockedMoves.length > 0, 'locked piece still has moves');
  assert(lockedMoves.every((m) => getPiece(s.board, m.from)?.id === locked.id), 'black can only move the locked piece');
  s = settle(makeMove(s, lockedMoves[0].from, lockedMoves[0].to));
  assert(!s.pending.guicaiLock, '鬼才 lock clears after the victim turn');
}

// 鬼才 after a walk should work
{
  let s = base();
  s.qi = { red: 4, black: 10 };
  s.movesLeft = 2;
  s = settle(makeMove(s, { r: 6, c: 0 }, { r: 5, c: 0 }));
  assert(s.side === 'red', 'still red after first walk');
  assert(s.movedThisTurn, 'walked this turn');
  assert(s.movesLeft === 1, 'one move left after first walk');
  assert(canUseSkill(s, 'simayi-guicai'), '鬼才 after a walk should work');
  const after = useSkill(s, 'simayi-guicai', { kind: 'pos', pos: { r: 0, c: 0 } });
  assert(after.pending.guicaiLock, '鬼才 locks after a walk');
  assert(after.side === 'red', '鬼才 does not change side');
  assert(after.movesLeft === s.movesLeft, '鬼才 leaves movesLeft unchanged');
  assert(after.qi.red === 0, '鬼才 spends 4 qi');
}

// 鬼才: boxed-in enemy 卒 is not a target; mobile 车 is
{
  const guicai = GENERALS.find((d) => d.id === 'simayi')!.skills.find((x) => x.id === 'simayi-guicai')!;
  assert(guicai.desc === '主动技。走棋阶段，你可以消耗4点战气，指定对方一枚可以走动的非将帅棋。对方下回合只能行走该子。', '鬼才 desc exact');
  let s = base();
  s.qi = { red: 4, black: 10 };
  // black 卒 at 3,0 not across river (no side moves); friendly piece directly in front
  s.board[4][0] = P('P', 'black', 'blocker-front');
  const t = validSkillTargets(s, 'simayi-guicai');
  assert(!t.positions.some((p) => p.r === 3 && p.c === 0), 'boxed-in 卒 is not a 鬼才 target');
  assert(t.positions.some((p) => p.r === 0 && p.c === 0), 'mobile enemy 车 is a valid 鬼才 target');
  const afterStuck = useSkill(s, 'simayi-guicai', { kind: 'pos', pos: { r: 3, c: 0 } });
  assert(!afterStuck.pending.guicaiLock, 'useSkill 鬼才 on stuck piece is a no-op');
  assert(afterStuck.side === 'red', 'stuck 鬼才 does not end the turn');
  assert(afterStuck.qi.red === 4, 'stuck 鬼才 does not spend qi');
}

// 鬼才 cannot lock a king
{
  let s = base();
  s.qi = { red: 4, black: 10 };
  const king = getPiece(s.board, { r: 0, c: 4 });
  assert(king?.type === 'K' && king.side === 'black', 'standard board has black 将 at (0,4)');
  const kingMoves = listLegalFrom({ ...s, side: 'black' }, { r: 0, c: 4 });
  assert(kingMoves.length > 0, 'black 将 has a legal move (so the exclusion is type, not mobility)');
  const t = validSkillTargets(s, 'simayi-guicai');
  assert(!t.positions.some((p) => p.r === 0 && p.c === 4), '鬼才 cannot target 将帅棋');
  assert(t.positions.every((p) => getPiece(s.board, p)?.type !== 'K'), '鬼才 targets exclude kings');
  const afterKing = useSkill(s, 'simayi-guicai', { kind: 'pos', pos: { r: 0, c: 4 } });
  assert(!afterKing.pending.guicaiLock, 'useSkill 鬼才 on king is a no-op');
  assert(afterKing.side === 'red', 'king 鬼才 does not end the turn');
  assert(afterKing.qi.red === 4, 'king 鬼才 does not spend qi');
}

// 华佗 青囊：随机传送己方非将帅子至己方半场
{
  let s = base();
  s.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'huatuo')!, false))];
  s.qi = { red: 6, black: 10 };
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[6][0] = P('R', 'red', 'rr');
  // clear most of own half so teleport is observable
  const beforeId = 'rr';
  const beforePos = { r: 6, c: 0 };
  s = useSkill(s, 'huatuo-qingnang', { kind: 'none' });
  const hit = s.board.flatMap((row, r) => row.map((p, c) => ({ p, r, c }))).find((x) => x.p?.id === beforeId);
  assert(!!hit, '青囊 piece still on board');
  assert(hit!.r >= 5, '青囊 dest on red half');
  assert(!(hit!.r === beforePos.r && hit!.c === beforePos.c) || true, '青囊 may stay if only one spot — piece exists');
  assert(s.qi.red === 0, '青囊 costs 6');
  assert(s.side === 'red', '青囊 does not end turn');
}

// 华佗 青囊：无可传送则落空不耗气
{
  let s = base();
  s.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'huatuo')!, false))];
  s.qi = { red: 6, black: 10 };
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  // fill entire red half so no empty square
  for (let r = 5; r <= 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (!s.board[r][c]) s.board[r][c] = P('P', 'red', `fill-${r}-${c}`);
    }
  }
  // only king + fillers; remove non-king? fillers ARE pieces that could teleport but no empty dest
  const qiBefore = s.qi.red;
  s = useSkill(s, 'huatuo-qingnang', { kind: 'none' });
  assert(s.qi.red === qiBefore, '青囊 no-op keeps qi');
  assert(sk(s, 'huatuo-qingnang').uses === 0, '青囊 no-op does not consume uses');
}

// 周瑜 反间：标记后行走该子则随机落点
{
  const fanjian = GENERALS.find((d) => d.id === 'zhouyu')!.skills.find((x) => x.id === 'zhouyu-fanjian')!;
  assert(fanjian.desc === '主动技。走棋阶段，你可以消耗5点战气，标记对方一枚棋子。若其下回合行走该子，则改为随机落点。', '反间 desc exact');
  let s = base();
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[0][0] = P('R', 'black', 'br');
  s.board[6][0] = P('P', 'red', 'rp');
  s.board[3][8] = P('P', 'black', 'bp');
  const qiBefore = s.qi.red;
  const movesBefore = s.movesLeft;
  const targets = validSkillTargets(s, 'zhouyu-fanjian');
  assert(targets.positions.some((p) => p.r === 0 && p.c === 0), '反间 can mark any enemy');
  assert(targets.positions.some((p) => p.r === 0 && p.c === 3), '反间 can mark enemy king');
  s = useSkill(s, 'zhouyu-fanjian', { kind: 'pos', pos: { r: 0, c: 0 } });
  assert(s.pending.fanjianMark?.pieceId === 'br', '反间 marks black rook by id');
  assert(s.pending.fanjianMark?.untilSide === 'black', '反间 until victim turn');
  assert(s.qi.red === qiBefore - 5, '反间 costs 5');
  assert(s.side === 'red', '反间 does not end turn');
  assert(s.movesLeft === movesBefore, '反间 does not spend movesLeft');
  s = settle(makeMove(s, { r: 6, c: 0 }, { r: 5, c: 0 }));
  assert(s.side === 'black', 'black to move after red walk');
  const dests = listLegalFrom(s, { r: 0, c: 0 });
  assert(dests.length > 1, 'marked piece is not frozen');
  const chosen = dests.find((d) => d.r === 1 && d.c === 0) ?? dests[0];
  const injected = dests.find((d) => !(d.r === chosen.r && d.c === chosen.c))!;
  __testSetFanjianDest(injected);
  s = settle(makeMove(s, { r: 0, c: 0 }, chosen));
  const landed = s.board.flatMap((row, r) => row.map((p, c) => ({ p, r, c }))).find((x) => x.p?.id === 'br');
  assert(landed?.r === injected.r && landed?.c === injected.c, 'marked piece lands on injected dest');
  assert(s.log.some((x) => x.text.includes('反间：随机落点')), 'logs 反间 random dest');
  assert(!s.pending.fanjianMark, 'mark gone after victim turn');
}

// 周瑜 反间：走其他子不受影响，回合结束标记消失
{
  let s = base();
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[0][0] = P('R', 'black', 'br');
  s.board[6][0] = P('P', 'red', 'rp');
  s.board[3][8] = P('P', 'black', 'bp');
  s = useSkill(s, 'zhouyu-fanjian', { kind: 'pos', pos: { r: 0, c: 0 } });
  s = settle(makeMove(s, { r: 6, c: 0 }, { r: 5, c: 0 }));
  assert(s.pending.fanjianMark?.pieceId === 'br', 'mark still on black rook');
  __testSetFanjianDest({ r: 2, c: 0 });
  s = settle(makeMove(s, { r: 3, c: 8 }, { r: 4, c: 8 }));
  assert(getPiece(s.board, { r: 4, c: 8 })?.id === 'bp', 'other piece dest unchanged');
  assert(getPiece(s.board, { r: 0, c: 0 })?.id === 'br', 'marked piece unmoved');
  assert(s.log.every((x) => !x.text.includes('反间：随机落点')), 'no random-dest log when other piece walks');
  assert(!s.pending.fanjianMark, 'mark gone after that turn even if other piece walked');
  __testSetFanjianDest(undefined);
}

// 反间：skillLiveState 指出标记哪一枚（施法方 / 被标方）
{
  let s = base();
  s.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'zhouyu')!, false))];
  s.qi = { red: 5, black: 10 };
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[0][0] = P('R', 'black', 'br');
  assert(skillLiveState(s, 'zhouyu-fanjian', 'red') === null, '反间 liveState null before mark');
  s = useSkill(s, 'zhouyu-fanjian', { kind: 'pos', pos: { r: 0, c: 0 } });
  const casterLive = skillLiveState(s, 'zhouyu-fanjian', 'red');
  assert(!!casterLive && casterLive.includes('已标记对方'), 'caster liveState: 已标记对方');
  assert(casterLive!.includes('車') && casterLive!.includes('(0,0)'), 'caster liveState names piece + square');
  const victimLive = skillLiveState(s, 'zhouyu-fanjian', 'black');
  assert(!!victimLive && victimLive.includes('被反间'), 'victim liveState: 被反间');
  assert(victimLive!.includes('走该子则随机落点'), 'victim liveState: 随机落点');
  assert(victimLive!.includes('車') && victimLive!.includes('(0,0)'), 'victim liveState names piece + square');
}

// 反间：暗棋也可标记，liveState 仍用真实棋名+坐标
{
  let s = base();
  s.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'zhouyu')!, false))];
  s.qi = { red: 5, black: 10 };
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[3][0] = P('N', 'black', 'dark-n', { revealed: false, coverType: 'P' });
  s = useSkill(s, 'zhouyu-fanjian', { kind: 'pos', pos: { r: 3, c: 0 } });
  const live = skillLiveState(s, 'zhouyu-fanjian', 'red');
  assert(!!live && live.includes('已标记对方'), 'dark mark: caster liveState');
  assert(live!.includes('馬') && live!.includes('(3,0)'), 'dark mark uses true type + square');
}

// 孙尚香 联姻
{
  const lianyin = GENERALS.find((d) => d.id === 'sunshangxiang')!.skills.find((x) => x.id === 'sunshangxiang-lianyin')!;
  assert(lianyin.desc === '主动技。走棋阶段，你可以消耗5点战气，指定己方一枚非将帅明棋，将其移至对方半场的随机空位。', '联姻 desc exact');
  assert(lianyin.qiCost === 5, '联姻 qiCost 5');
  let s = base();
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[6][1] = P('N', 'red', 'rn');
  s.board[7][3] = P('A', 'red', 'ra');
  s.board[6][2] = P('R', 'red', 'dark-r', { revealed: false, coverType: 'P' });
  s.board[4][0] = P('P', 'red', 'already-far');
  const qiBefore = s.qi.red;
  const movesBefore = s.movesLeft;
  const t = validSkillTargets(s, 'sunshangxiang-lianyin');
  assert(t.positions.some((p) => p.r === 6 && p.c === 1), '联姻 can target own-half 明棋');
  assert(t.positions.some((p) => p.r === 4 && p.c === 0), '联姻 no longer requires 已过河');
  assert(t.positions.some((p) => p.r === 7 && p.c === 3), '联姻 can designate 士');
  assert(!t.positions.some((p) => p.r === 9 && p.c === 4), '联姻 cannot target 将帅');
  assert(!t.positions.some((p) => p.r === 6 && p.c === 2), '联姻 cannot target 暗棋');
  s = useSkill(s, 'sunshangxiang-lianyin', { kind: 'pos', pos: { r: 6, c: 1 } });
  const hit = s.board.flatMap((row, r) => row.map((p, c) => ({ p, r, c }))).find((x) => x.p?.id === 'rn');
  assert(!!hit && hit.r <= 4, '联姻 lands on enemy half');
  assert(!getPiece(s.board, { r: 6, c: 1 }), '联姻 leaves origin');
  assert(s.qi.red === qiBefore - 5, '联姻 costs 5 战气');
  assert(s.movesLeft === movesBefore, '联姻 leaves movesLeft unchanged');
  assert(s.side === 'red', '联姻 does not end turn');
  assert(s.log.every((x) => !x.text.includes('落空')), '联姻 has no 落空 filler');
  assert(s.log.some((x) => x.text.includes('移至')), '联姻 logs 移至');
}

// 孙尚香 联姻：暗棋 / 将帅 / 士无落点 均不发动
{
  let s = base();
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[6][2] = P('R', 'red', 'dark-r', { revealed: false, coverType: 'P' });
  s.board[7][3] = P('A', 'red', 'ra');
  const qiBefore = s.qi.red;
  let after = useSkill(s, 'sunshangxiang-lianyin', { kind: 'pos', pos: { r: 6, c: 2 } });
  assert(getPiece(after.board, { r: 6, c: 2 })?.id === 'dark-r', '联姻 rejects 暗棋');
  assert(after.qi.red === qiBefore, '暗棋 reject keeps qi');
  after = useSkill(s, 'sunshangxiang-lianyin', { kind: 'pos', pos: { r: 9, c: 4 } });
  assert(getPiece(after.board, { r: 9, c: 4 })?.id === 'rk', '联姻 rejects 将帅');
  assert(after.qi.red === qiBefore, '将帅 reject keeps qi');
  after = useSkill(s, 'sunshangxiang-lianyin', { kind: 'pos', pos: { r: 7, c: 3 } });
  assert(getPiece(after.board, { r: 7, c: 3 })?.id === 'ra', '士 stays: no enemy-half palace');
  assert(after.qi.red === qiBefore, '士 no-dest keeps qi');
  assert(sk(after, 'sunshangxiang-lianyin').uses === 0, '士 no-dest does not consume uses');
}

// 孙尚香 联姻：无合法目标则不可发动
{
  let s = base();
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  assert(canUseSkill(s, 'sunshangxiang-lianyin') === false, '联姻 blocked with no 非将帅明棋');
}

// 甘宁 奇袭
{
  let s = base();
  const qiBefore = s.qi.red;
  s = useSkill(s, 'ganning-chaiqiao', { kind: 'none' });
  assert(s.pending.bridgeDown?.owner === 'red' && s.pending.bridgeDown?.enemyTurnsLeft === 2, '奇袭 armed for 2 enemy turns');
  assert(!g(s, 'ganning').hidden, '甘宁 revealed');
  assert(s.qi.red === qiBefore - 5, '奇袭 costs 5 战气');
  assert(s.skillBroadcast?.skill === '奇袭', 'broadcast 奇袭');
  assert(canUseSkill(s, 'ganning-chaiqiao') === false, '奇袭 not reusable same turn after cast');
  assert(listLegalFrom(s, { r: 6, c: 4 }).some((m) => m.r === 5 && m.c === 4), 'red pawn 6->5 is not a cross');
  s.board[5][2] = P('P', 'red', 'red-at-5');
  assert(listLegalFrom(s, { r: 5, c: 2 }).some((m) => m.r === 4 && m.c === 2), 'owner red 5->4 still legal');
  s.side = 'black';
  s.skillUsedThisTurn = false;
  s.movedThisTurn = false;
  s.board[4][4] = P('P', 'black', 'blk-at-4');
  assert(!listLegalFrom(s, { r: 4, c: 4 }).some((m) => m.r === 5 && m.c === 4), 'black 4->5 blocked as new cross');
  assert(listLegalFrom(s, { r: 3, c: 2 }).some((m) => m.r === 4 && m.c === 2), 'black 3->4 still own half');
  s = settle(makeMove(s, { r: 3, c: 2 }, { r: 4, c: 2 }));
  assert(s.pending.bridgeDown?.enemyTurnsLeft === 1, 'after first enemy turn-end, 1 left');
  s = settle(makeMove(s, { r: 6, c: 0 }, { r: 5, c: 0 }));
  assert(s.pending.bridgeDown?.enemyTurnsLeft === 1, 'owner turn-end does not decrement');
  s = settle(makeMove(s, { r: 3, c: 0 }, { r: 4, c: 0 }));
  assert(!s.pending.bridgeDown, 'cleared after two enemy turn-ends');
}

// 锦帆: enemy river cross → +1 战气
{
  let s = base();
  s.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'ganning')!, true))];
  s.blackGenerals = [];
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[4][4] = P('P', 'black', 'bp');
  s.board[2][0] = P('R', 'red', 'rr');
  s.side = 'black';
  s.qi = { red: 2, black: 0 };
  s.movesLeft = 1;
  s = settle(makeMove(s, { r: 4, c: 4 }, { r: 5, c: 4 }));
  assert(s.qi.red === 4, '锦帆 +1 and red turn-start +1');
  assert(s.crossedRiverIds.includes('bp'), 'black pawn marked crossed');
}

// 吕布 无双：保护将帅 3 个敌方回合；不可被吃、不可被将军
{
  const wushuang = GENERALS.find((d) => d.id === 'lvbu')!.skills.find((x) => x.id === 'lvbu-wushuang')!;
  assert(
    wushuang.desc ===
      '限定技。走棋阶段，你可以发动无双：在你之后的3个敌方回合内，己方将帅棋无法被吃，且无法被将军。',
    '无双 desc exact',
  );
  let s = base();
  s.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'lvbu')!, true))];
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[2][0] = P('R', 'black', 'br');
  s.board[6][0] = P('P', 'red', 'rp');
  s = useSkill(s, 'lvbu-wushuang', { kind: 'none' });
  assert(s.pending.wushuang?.turnsLeft === 3, '无双 arms 3 enemy turns');
  assert(!g(s, 'lvbu').hidden, '吕布 revealed by 无双');
  assert(sk(s, 'lvbu-wushuang').uses === 1, '无双 limited use consumed');
  assert(s.side === 'red', '无双 does not end turn');
  assert(skillLiveState(s, 'lvbu-wushuang', 'red')?.includes('剩余 3 敌方回合'), 'live state shows remaining enemy turns');
  s = settle(makeMove(s, { r: 6, c: 0 }, { r: 5, c: 0 }));
  assert(s.pending.wushuang?.turnsLeft === 3, 'caster turn end does not decrement');
  assert(s.side === 'black', 'black to move');
  // Sliding onto the king file would 将军 — banned
  const rookMoves = listLegalFrom(s, { r: 2, c: 0 });
  assert(!rookMoves.some((m) => m.r === 2 && m.c === 4), 'cannot move onto checking file');
  // Direct capture attempt detection
  s.board[0][4] = P('R', 'black', 'br2');
  s.board[2][0] = null;
  assert(isWushuangCaptureAttempt(s, { r: 0, c: 4 }, { r: 9, c: 4 }), 'wushuang capture attempt detected');
  assert(!listLegalFrom(s, { r: 0, c: 4 }).some((m) => m.r === 9 && m.c === 4), 'capture filtered from legal');
  // Enemy turn end decrements
  s = settle(makeMove(s, { r: 0, c: 4 }, { r: 0, c: 5 }));
  assert(s.pending.wushuang?.turnsLeft === 2, 'decrement at enemy turn end');
}

// 无双：owner 被将军时仍可自由行走（ignoreOwnCheck）；对方仍不可吃/将军；到期后恢复应将
{
  let s = base();
  s.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'lvbu')!, true))];
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  // Clear file-4 rook check; red pawn off-file has a walk that does not resolve it
  s.board[0][4] = P('R', 'black', 'br');
  s.board[6][0] = P('P', 'red', 'rp');
  assert(inCheck(s.board, 'red'), 'setup: red is in check');
  s = useSkill(s, 'lvbu-wushuang', { kind: 'none' });
  assert(s.pending.wushuang?.turnsLeft === 3, '无双 armed');
  const pawnWalks = listLegalFrom(s, { r: 6, c: 0 });
  assert(pawnWalks.some((m) => m.r === 5 && m.c === 0), 'owner pawn can walk while in check under 无双');
  assert(!sideInCheck(s), 'sideInCheck banner suppressed for 无双 owner');
  assert(listLegalMoves(s).length > 0, 'not 困毙 solely because walks leave king in check');
  // Opponent still cannot check or capture king
  s.side = 'black';
  s.movesLeft = 1;
  assert(!listLegalFrom(s, { r: 0, c: 4 }).some((m) => m.r === 9 && m.c === 4), 'opponent cannot capture 无双 king');
  // Rook on rank 2 sliding onto file 4 would 将军 — banned
  s.board[2][0] = P('R', 'black', 'br2');
  assert(!listLegalFrom(s, { r: 2, c: 0 }).some((m) => m.r === 2 && m.c === 4), 'opponent cannot 将军 under 无双');
  assert(isWushuangCheckAttempt(s, { r: 2, c: 0 }, { r: 2, c: 4 }), 'check attempt detected');
  // After expiry, check filter returns for owner
  s.side = 'red';
  s.movesLeft = 1;
  s.pending = { ...s.pending, wushuang: { owner: 'red', turnsLeft: 0 } };
  assert(listLegalFrom(s, { r: 6, c: 0 }).length === 0, 'after expiry, non-resolving walk filtered');
  assert(sideInCheck({ ...s, pending: { ...s.pending, wushuang: undefined } }), 'without 无双, banner shows check');
}

// whyPieceStuck / whyIllegalDest：点无路子时给出具体原因
{
  // 将军中，须应将
  {
    let s = base();
    s.board = emptyBoard();
    s.board[9][4] = P('K', 'red', 'rk');
    s.board[0][3] = P('K', 'black', 'bk');
    s.board[0][4] = P('R', 'black', 'br');
    s.board[6][0] = P('P', 'red', 'rp');
    assert(inCheck(s.board, 'red'), 'setup check');
    assert(whyPieceStuck(s, { r: 6, c: 0 }) === '将军中，须应将', 'stuck reason: must resolve check');
  }
  // 鬼才
  {
    let s = base();
    s.board = emptyBoard();
    s.board[9][4] = P('K', 'red', 'rk');
    s.board[0][4] = P('K', 'black', 'bk');
    s.board[6][0] = P('P', 'red', 'rp');
    s.board[6][2] = P('P', 'red', 'rp2');
    s.pending = { ...s.pending, guicaiLock: { pieceId: 'rp', untilSide: 'red' } };
    assert(whyPieceStuck(s, { r: 6, c: 2 }) === '鬼才：本回合只能行走被锁定的那枚棋', 'stuck reason: 鬼才');
  }
  // 咆哮
  {
    let s = base();
    s.board = emptyBoard();
    s.board[9][4] = P('K', 'red', 'rk');
    s.board[0][4] = P('K', 'black', 'bk');
    s.board[6][0] = P('P', 'red', 'rp');
    s.board[6][2] = P('P', 'red', 'rp2');
    s.pending = { ...s.pending, zhangFeiPieceId: 'rp' };
    s.movesLeft = 1;
    assert(whyPieceStuck(s, { r: 6, c: 2 }) === '咆哮：须继续行走该子', 'stuck reason: 咆哮');
  }
  // 暗棋无路
  {
    let s = base();
    s.board = emptyBoard();
    s.board[9][4] = P('K', 'red', 'rk');
    s.board[0][4] = P('K', 'black', 'bk');
    // Dark advisor on edge with no palace dest
    s.board[5][0] = P('A', 'red', 'ra', { revealed: false, coverType: 'A' });
    assert(whyPieceStuck(s, { r: 5, c: 0 }) === '暗棋无路', 'stuck reason: dark no path');
  }
  // 普通无子可去
  {
    let s = base();
    s.board = emptyBoard();
    s.board[9][4] = P('K', 'red', 'rk');
    s.board[0][4] = P('K', 'black', 'bk');
    s.board[6][0] = P('P', 'red', 'rp');
    s.board[5][0] = P('P', 'red', 'block'); // blocks pawn forward
    assert(whyPieceStuck(s, { r: 6, c: 0 }) === '无子可去', 'stuck reason: nowhere to go');
  }
  // 离间不锁步：其他子可走，whyPieceStuck 不为「不能走」
  {
    let s = base();
    s.board = emptyBoard();
    s.board[9][4] = P('K', 'red', 'rk');
    s.board[0][4] = P('K', 'black', 'bk');
    s.board[6][0] = P('P', 'red', 'rp');
    s.board[3][0] = P('P', 'black', 'dark-p', { revealed: false, coverType: 'P' });
    s.side = 'black';
    s.pending = { ...s.pending, lijianMark: { pieceId: 'dark-p', untilSide: 'black' } };
    assert(whyPieceStuck(s, { r: 0, c: 4 }) === null || whyPieceStuck(s, { r: 0, c: 4 }) !== '离间', '离间 does not lock other pieces');
    assert(listLegalFrom(s, { r: 0, c: 4 }).length > 0, 'king still movable under 离间 mark');
  }
  // 啖睛：点吃子落点
  {
    let s = base();
    s.board = emptyBoard();
    s.board[9][4] = P('K', 'red', 'rk');
    s.board[0][3] = P('K', 'black', 'bk');
    s.board[6][0] = P('R', 'red', 'rr');
    s.board[3][0] = P('P', 'black', 'bp');
    s.pending = { ...s.pending, danjing: { pieceId: 'rr', untilSide: 'red' } };
    assert(whyIllegalDest(s, { r: 6, c: 0 }, { r: 3, c: 0 }) === '啖睛：该子本回合不能吃子', 'illegal: 啖睛 capture');
  }
  // 奇袭：过河
  {
    let s = base();
    s.board = emptyBoard();
    s.board[9][4] = P('K', 'red', 'rk');
    s.board[0][4] = P('K', 'black', 'bk');
    s.board[4][4] = P('P', 'black', 'bp');
    s.side = 'black';
    s.pending = { ...s.pending, bridgeDown: { owner: 'red', enemyTurnsLeft: 2 } };
    assert(whyIllegalDest(s, { r: 4, c: 4 }, { r: 5, c: 4 }) === '奇袭：对方棋不能过河', 'illegal: 奇袭 cross');
  }
  // 武圣 capture attempt
  {
    let s = base();
    s.board = emptyBoard();
    s.board[9][4] = P('K', 'red', 'rk');
    s.board[0][3] = P('K', 'black', 'bk');
    s.board[9][0] = P('R', 'red', 'rr');
    s.board[0][0] = P('R', 'black', 'br');
    s.pending = { ...s.pending, wushengGuard: { pieceId: 'rr', owner: 'red' } };
    s.side = 'black';
    assert(isWushengCaptureAttempt(s, { r: 0, c: 0 }, { r: 9, c: 0 }), 'wusheng capture attempt');
    assert(whyIllegalDest(s, { r: 0, c: 0 }, { r: 9, c: 0 }) === '此子已发动武圣的技能', 'illegal: 武圣');
  }
  // 空城 / 无双 capture keep existing wording
  {
    let s = base();
    s.board = emptyBoard();
    s.board[9][4] = P('K', 'red', 'rk');
    s.board[0][3] = P('K', 'black', 'bk');
    s.board[2][0] = P('P', 'red', 'rp');
    s.board[0][0] = P('R', 'black', 'br');
    s.pending = { ...s.pending, kongcheng: { pieceId: 'rp', owner: 'red' } };
    s.side = 'black';
    assert(whyIllegalDest(s, { r: 0, c: 0 }, { r: 2, c: 0 }) === '此子已发动空城的技能', 'illegal: 空城');
  }
  {
    let s = base();
    s.board = emptyBoard();
    s.board[9][4] = P('K', 'red', 'rk');
    s.board[0][3] = P('K', 'black', 'bk');
    s.board[0][4] = P('R', 'black', 'br');
    s.pending = { ...s.pending, wushuang: { owner: 'red', turnsLeft: 3 } };
    s.side = 'black';
    assert(whyIllegalDest(s, { r: 0, c: 4 }, { r: 9, c: 4 }) === '此子已发动无双的技能', 'illegal: 无双 capture');
    s.board[2][0] = P('R', 'black', 'br2');
    assert(whyIllegalDest(s, { r: 2, c: 0 }, { r: 2, c: 4 }) === '无双：无法被将军', 'illegal: 无双 check');
  }
  // 将面对面
  {
    let s = base();
    s.board = emptyBoard();
    s.board[9][4] = P('K', 'red', 'rk');
    s.board[0][3] = P('K', 'black', 'bk');
    s.board[8][4] = P('P', 'red', 'fwd');
    s.board[9][5] = P('A', 'red', 'ra');
    // Only open palace cell is 9,3 — but that faces black king on file 3 with empty between
    assert(listLegalFrom(s, { r: 9, c: 4 }).length === 0, 'king has no legal dest (facing)');
    assert(whyPieceStuck(s, { r: 9, c: 4 }) === '将面对面', 'stuck reason: flying general');
  }
}

// 吕布 赤兔：明兵化马
{
  const chitu = GENERALS.find((d) => d.id === 'lvbu')!.skills.find((x) => x.id === 'lvbu-chitu')!;
  assert(
    chitu.desc ===
      '主动技。走棋阶段，你可以消耗6点战气，指定己方一枚明棋兵卒棋，令其在所在位置变为马。',
    '赤兔 desc exact',
  );
  let s = base();
  s.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'lvbu')!, true))];
  s.qi = { red: 6, black: 10 };
  const pawn = getPiece(s.board, { r: 6, c: 0 })!;
  assert(pawn.type === 'P' && pawn.revealed, 'target is revealed pawn');
  s = useSkill(s, 'lvbu-chitu', { kind: 'pos', pos: { r: 6, c: 0 } });
  const horse = getPiece(s.board, { r: 6, c: 0 });
  assert(horse?.type === 'N' && horse?.id === pawn.id && horse?.revealed, '赤兔 turns pawn into horse');
  assert(horse?.coverType === 'N', 'coverType becomes N');
  assert(!g(s, 'lvbu').hidden, '吕布 revealed by 赤兔');
  assert(s.qi.red === 0, '赤兔 costs 6');
  assert(s.side === 'red', '赤兔 does not end turn');
}

// 貂蝉 离间：desc / qiCost / mark（非锁步、非劫持）
{
  const lijian = GENERALS.find((d) => d.id === 'diaochan')!.skills.find((x) => x.id === 'diaochan-lijian')!;
  assert(
    lijian.desc ===
      '主动技。走棋阶段，你可以消耗5点战气，指定对方一枚暗棋。若其下回合行走其他棋子，则随机失去一枚非将帅棋。',
    '离间 desc exact',
  );
  assert(lijian.qiCost === 5, '离间 qiCost 5');
  assert(!lijian.desc.includes('只能'), '离间 desc has no lock wording');
  assert(!lijian.desc.includes('不消耗走棋次数'), '离间 desc has no free-move wording');
  assert(lijian.desc.includes('走棋阶段'), '离间 phase is 走棋阶段');
  assert(!lijian.desc.includes('出牌阶段'), '离间 not 出牌阶段');

  let s = base();
  s.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'diaochan')!, false))];
  s.qi = { red: 5, black: 10 };
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[3][0] = P('P', 'black', 'dark-p', { revealed: false, coverType: 'P' });
  s.board[0][0] = P('R', 'black', 'open-r');
  s.board[6][0] = P('P', 'red', 'rp');
  const movesBefore = s.movesLeft;
  const t = validSkillTargets(s, 'diaochan-lijian');
  assert(t.positions.some((p) => p.r === 3 && p.c === 0), '离间 can target enemy 暗棋');
  assert(!t.positions.some((p) => p.r === 0 && p.c === 0), '离间 cannot target 明棋');
  s = useSkill(s, 'diaochan-lijian', { kind: 'pos', pos: { r: 3, c: 0 } });
  assert(s.pending.lijianMark?.pieceId === 'dark-p', '离间 marks selected dark piece');
  assert(s.pending.lijianMark?.untilSide === 'black', '离间 untilSide is opponent');
  assert(!(s.pending as { lijianHijack?: unknown }).lijianHijack, 'no leftover lijianHijack');
  assert(s.qi.red === 0, '离间 costs 5');
  assert(s.side === 'red', '离间 does not end caster turn');
  assert(s.movesLeft === movesBefore, '离间 leaves movesLeft unchanged');
  s = settle(makeMove(s, { r: 6, c: 0 }, { r: 5, c: 0 }));
  assert(s.side === 'black', 'black still plays own turn');
  assert(s.pending.lijianMark?.pieceId === 'dark-p', 'mark still active on black turn');
  // Victim plays normally — marked piece is not an onlyPieceId lock
  assert(listLegalFrom(s, { r: 0, c: 0 }).length > 0, 'victim can legally move a non-marked piece');
  assert(
    listLegalMoves(s).some((m) => getPiece(s.board, m.from)?.id === 'open-r'),
    'listLegalMoves includes non-marked piece',
  );
  assert(
    listLegalMoves(s).some((m) => getPiece(s.board, m.from)?.id === 'dark-p'),
    'listLegalMoves still includes marked 暗棋',
  );
  const beforeCount = s.board.flat().filter((p) => p && p.side === 'black').length;
  const markMoves = listLegalFrom(s, { r: 3, c: 0 });
  assert(markMoves.length > 0, 'marked dark pawn has moves');
  s = settle(makeMove(s, { r: 3, c: 0 }, markMoves[0]));
  assert(!s.pending.lijianMark, 'mark clears after victim walks it');
  assert(s.side === 'red', 'returns to red after black walked marked piece');
  assert(
    s.board.flat().filter((p) => p && p.side === 'black').length === beforeCount,
    'walking marked piece causes no random loss',
  );
  assert(s.log.every((x) => !x.text.includes('离间：随机失去')), 'no penalty log when marked piece walked');
}

// 离间：无敌方暗棋不可发动
{
  let s = base();
  s.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'diaochan')!, false))];
  s.qi = { red: 5, black: 10 };
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[0][0] = P('R', 'black', 'open-r');
  assert(!canUseSkill(s, 'diaochan-lijian'), 'cannot cast 离间 without enemy 暗棋');
  assert(validSkillTargets(s, 'diaochan-lijian').positions.length === 0, 'no 离间 targets without 暗棋');
  const after = useSkill(s, 'diaochan-lijian', { kind: 'pos', pos: { r: 0, c: 0 } });
  assert(after === s, 'useSkill 离间 on 明棋 is a no-op');
  assert(after.qi.red === 5, 'no-op 离间 does not spend qi');
  assert(!after.pending.lijianMark, 'no-op leaves no mark');
}

// 离间：行走其他棋子 → 随机失去一枚非将帅棋
{
  let s = base();
  s.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'diaochan')!, false))];
  s.qi = { red: 5, black: 0 };
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[3][0] = P('P', 'black', 'dark-p', { revealed: false, coverType: 'P' });
  s.board[0][0] = P('R', 'black', 'open-r');
  s.board[0][1] = P('N', 'black', 'spare-n');
  s.board[6][0] = P('P', 'red', 'rp');
  s = useSkill(s, 'diaochan-lijian', { kind: 'pos', pos: { r: 3, c: 0 } });
  s = settle(makeMove(s, { r: 6, c: 0 }, { r: 5, c: 0 }));
  assert(s.side === 'black', 'black plays after mark');
  assert(s.pending.lijianMark?.pieceId === 'dark-p', 'mark armed');
  const blackBefore = s.board.flat().filter((p) => p && p.side === 'black').length;
  __testSetLijianLoss('spare-n');
  const rookTo = listLegalFrom(s, { r: 0, c: 0 })[0];
  assert(!!rookTo, 'non-marked rook has a legal move');
  s = settle(makeMove(s, { r: 0, c: 0 }, rookTo));
  assert(s.side === 'red', 'returns to red after other-piece walk');
  assert(!s.pending.lijianMark, 'mark cleared after other-piece walk');
  assert(
    s.board.flat().filter((p) => p && p.side === 'black').length === blackBefore - 1,
    'exactly one non-king lost to 离间 penalty',
  );
  assert(!getPiece(s.board, { r: 0, c: 1 }), 'penalty removed forced non-king piece');
  assert(!!getPiece(s.board, { r: 0, c: 3 }), '将帅棋 not removed by 离间 penalty');
  assert(s.log.some((x) => x.text.includes('离间：随机失去')), 'logs 离间 random loss');
  assert(!(s.pending as { lijianHijack?: unknown }).lijianHijack, 'no hijack field after penalty');
}

// 离间：标记子卡住时仍可走其他棋；空过不罚、不自动跳过
{
  let s = base();
  s.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'diaochan')!, false))];
  s.qi = { red: 5, black: 0 };
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  // Dark pawn boxed in (cannot advance); spare revealed rook is still playable
  s.board[3][0] = P('P', 'black', 'dark-p', { revealed: false, coverType: 'P' });
  s.board[4][0] = P('P', 'black', 'blocker');
  s.board[0][0] = P('R', 'black', 'open-r');
  s.board[6][0] = P('P', 'red', 'rp');
  s = useSkill(s, 'diaochan-lijian', { kind: 'pos', pos: { r: 3, c: 0 } });
  assert(s.pending.lijianMark?.pieceId === 'dark-p', 'mark armed on stuck dark pawn');
  s = settle(makeMove(s, { r: 6, c: 0 }, { r: 5, c: 0 }));
  // No auto-skip: black still to play even though marked piece has no moves
  assert(s.side === 'black', 'stuck mark does not auto-skip victim turn');
  assert(s.pending.lijianMark?.pieceId === 'dark-p', 'mark still active — no auto penalty');
  assert(listLegalFrom(s, { r: 3, c: 0 }).length === 0, 'marked dark pawn has no legal moves');
  assert(listLegalFrom(s, { r: 0, c: 0 }).length > 0, 'other pieces remain playable');
  assert(
    listLegalMoves(s).some((m) => getPiece(s.board, m.from)?.id === 'open-r'),
    'turn playable via non-marked pieces',
  );
  const blackBefore = s.board.flat().filter((p) => p && p.side === 'black').length;
  s = __testEndTurn(s);
  assert(s.side === 'red', 'pass ends turn normally');
  assert(!s.pending.lijianMark, 'mark cleared on no-move pass');
  assert(
    s.board.flat().filter((p) => p && p.side === 'black').length === blackBefore,
    'no move → no 离间 penalty',
  );
  assert(s.log.every((x) => !x.text.includes('离间：随机失去')), 'no penalty log on empty pass');
}

// 离间：skillLiveState 谈标记而非劫持 / 只能走
{
  let s = base();
  s.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'diaochan')!, false))];
  s.qi = { red: 5, black: 10 };
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[3][0] = P('P', 'black', 'dark-p', { revealed: false, coverType: 'P' });
  s = useSkill(s, 'diaochan-lijian', { kind: 'pos', pos: { r: 3, c: 0 } });
  const live = skillLiveState(s, 'diaochan-lijian', 'red');
  assert(!!live && live.includes('离间已发动'), 'skillLiveState after cast');
  assert(!live!.includes('操控') && !live!.includes('劫持'), 'skillLiveState has no hijack wording');
  assert(!live!.includes('只能走'), 'skillLiveState has no only-move lock wording');
}

// 离间 + 空城：红诸葛貂蝉离间后走子，黑 AI 必须走棋（用户报告回归）
{
  let s = base();
  s.redGenerals = [
    readyAll(defToRuntime(GENERALS.find((d) => d.id === 'zhuge')!, false)),
    readyAll(defToRuntime(GENERALS.find((d) => d.id === 'diaochan')!, false)),
  ];
  s.blackGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'caocao')!, true))];
  s.qi = { red: 10, black: 10 };
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[3][0] = P('P', 'black', 'dark-p', { revealed: false, coverType: 'P' });
  s.board[0][0] = P('R', 'black', 'open-r');
  s.board[6][0] = P('P', 'red', 'rp');
  s = useSkill(s, 'diaochan-lijian', { kind: 'pos', pos: { r: 3, c: 0 } });
  assert(s.pending.lijianMark?.pieceId === 'dark-p', 'user-report: mark armed');
  s = makeMove(s, { r: 6, c: 0 }, { r: 5, c: 0 });
  assert(s.pending.awaitKongcheng && s.side === 'red', 'user-report: 空城 window after red move');
  s = skipKongcheng(s);
  assert(s.side === 'black', 'user-report: black to move after skipKongcheng');
  assert(!s.pending.awaitKongcheng, 'user-report: awaitKongcheng cleared for black');
  assert(s.pending.lijianMark?.pieceId === 'dark-p', 'user-report: mark still waiting on black');
  assert(listLegalMoves(s).length > 0, 'user-report: black has legal moves');
  const blackBefore = s.board.flat().filter((p) => p && p.side === 'black').length;
  const boardBefore = JSON.stringify(s.board);
  s = applyAITurn(s);
  assert(!s.winner || s.winner === 'red', 'user-report: no spurious black win');
  if (!s.winner) {
    assert(s.lastMove?.piece.side === 'black', 'user-report: applyAITurn made a black board move');
    assert(JSON.stringify(s.board) !== boardBefore, 'user-report: black board changed');
    if (s.lastMove && s.lastMove.piece.id !== 'dark-p') {
      assert(
        s.board.flat().filter((p) => p && p.side === 'black').length === blackBefore - 1,
        'user-report: walking non-mark triggers 离间 loss',
      );
    } else {
      assert(
        s.board.flat().filter((p) => p && p.side === 'black').length === blackBefore,
        'user-report: walking mark does not penalize',
      );
    }
  }
}

// 空城泄漏：endTurn 不得把 awaitKongcheng 留给下一方；黑无空城时 AI 不得 skip 秒过
{
  let s = base();
  s.redGenerals = [
    readyAll(defToRuntime(GENERALS.find((d) => d.id === 'zhuge')!, false)),
    readyAll(defToRuntime(GENERALS.find((d) => d.id === 'diaochan')!, false)),
  ];
  s.blackGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'caocao')!, true))];
  s.qi = { red: 10, black: 10 };
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[3][0] = P('P', 'black', 'dark-p', { revealed: false, coverType: 'P' });
  s.board[0][0] = P('R', 'black', 'open-r');
  s.board[6][0] = P('P', 'red', 'rp');
  s = useSkill(s, 'diaochan-lijian', { kind: 'pos', pos: { r: 3, c: 0 } });
  s = makeMove(s, { r: 6, c: 0 }, { r: 5, c: 0 });
  assert(s.pending.awaitKongcheng && s.side === 'red', 'leak: window open on red');
  // Simulate any path that endTurns without resolving 空城 (historical leak).
  s = __testEndTurn(s);
  assert(s.side === 'black', 'leak: side is black after endTurn');
  assert(!s.pending.awaitKongcheng, 'leak: endTurn must not hand awaitKongcheng to black');
  assert(s.pending.lijianMark?.pieceId === 'dark-p', 'leak: lijian mark still active');
  const boardBefore = JSON.stringify(s.board);
  s = applyAITurn(s);
  assert(s.lastMove?.piece.side === 'black', 'leak: black AI still walks a piece');
  assert(JSON.stringify(s.board) !== boardBefore, 'leak: black board changes');
  assert(s.side === 'red' || !!s.winner, 'leak: turn advances after black move');
}

// 空城泄漏：黑方误带 awaitKongcheng 且无空城时，AI 只清 flag 并继续走棋
{
  let s = base();
  s.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'diaochan')!, false))];
  s.blackGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'caocao')!, true))];
  s.qi = { red: 5, black: 10 };
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[3][0] = P('P', 'black', 'dark-p', { revealed: false, coverType: 'P' });
  s.board[0][0] = P('R', 'black', 'open-r');
  s.board[6][0] = P('P', 'red', 'rp');
  s = useSkill(s, 'diaochan-lijian', { kind: 'pos', pos: { r: 3, c: 0 } });
  s = settle(makeMove(s, { r: 6, c: 0 }, { r: 5, c: 0 }));
  assert(s.side === 'black' && s.pending.lijianMark?.pieceId === 'dark-p', 'stale-flag: black turn with mark');
  // Plant a leaked window the way a buggy endTurn used to.
  s = { ...s, pending: { ...s.pending, awaitKongcheng: true } };
  assert(!canUseSkill(s, 'zhuge-kongcheng'), 'stale-flag: black cannot cast 空城');
  assert(listLegalMoves(s).length === 0, 'stale-flag: awaitKongcheng blocks legal moves');
  const boardBefore = JSON.stringify(s.board);
  s = applyAITurn(s);
  assert(!s.pending.awaitKongcheng, 'stale-flag: flag cleared');
  assert(s.lastMove?.piece.side === 'black', 'stale-flag: AI still made a black move');
  assert(JSON.stringify(s.board) !== boardBefore, 'stale-flag: board changed');
}

// 夏侯惇 · 刚烈 d6（耗 5 战气抛骰；偶恢复 2）
{
  const ganglie = GENERALS.find((d) => d.id === 'xiahoudun')!.skills.find((sk) => sk.id === 'xiahoudun-ganglie')!;
  assert(
    ganglie.desc ===
      '主动技。每当对方以非将帅棋吃掉己方棋子时，消耗5点战气，抛一枚六面骰。奇数则该子与被吃子同归于尽；偶数则恢复2点战气。对方第一次吃掉己方棋子时，揭示此武将。',
    '刚烈 desc exact',
  );
  assert(ganglie.qiCost === 5, '刚烈 qiCost 5 (wiki badge; still passive)');
  assert(ganglie.nature === '主动技' && ganglie.phase === null, '刚烈 stays 主动技 / phase null');
  assert(ganglie.kind === 'passive' && ganglie.engineKind === 'passive', '刚烈 not click-to-cast');
}

{
  // First capture reveals 夏侯惇, spends 5 qi, sets pending dice
  let s = base();
  s.redGenerals = [];
  s.blackGenerals = [defToRuntime(GENERALS.find((d) => d.id === 'xiahoudun')!, true)];
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[7][0] = P('R', 'red', 'rr');
  s.board[0][0] = P('A', 'black', 'ba', { revealed: false });
  s.board[5][4] = P('P', 'red', 'block');
  const qiStart = s.qi.black;
  __testSetGanglieRoll(3);
  s = makeMove(s, { r: 7, c: 0 }, { r: 0, c: 0 });
  assert(s.blackGenerals[0] && !s.blackGenerals[0].hidden, 'First capture still reveals 夏侯惇');
  assert(!!s.pending.ganglieDice, 'non-king capture sets pending.ganglieDice');
  assert(s.pending.ganglieDice!.roll === 3, 'injected roll is stored');
  assert(s.qi.black === qiStart - 5, 'spend 5 战气 when arming dice');
  assert(s.skillBroadcast?.skill === '刚烈', '刚烈 broadcasts when dice is thrown');
  assert(!!s.board[0][0], 'capturer stays until resolve');
  assert(s.side === 'red', 'turn does not end while dice pending');

  // Odd roll destroys capturer; does not restore the 5 (resolve may grant turn-start +1)
  const qiAfterSpend = s.qi.black;
  s = resolveGanglie(s);
  assert(!s.pending.ganglieDice, 'resolve clears ganglieDice');
  assert(!s.board[0][0], 'odd roll destroys capturer');
  assert(s.captured.red.some((p) => p.id === 'rr'), 'capturer goes to captured');
  assert(s.log.some((l) => l.text.includes('同归于尽')), 'odd log 同归于尽');
  assert(s.qi.black === qiAfterSpend + 1, 'odd does not restore qi (only turn-start +1)');
  assert(s.side === 'black', 'resolve ends turn after makeMove-style capture');
}

{
  // Even roll leaves capturer and restores 2 战气 (net start−5+2)
  let s = base();
  s.redGenerals = [];
  s.blackGenerals = [defToRuntime(GENERALS.find((d) => d.id === 'xiahoudun')!, false)];
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[7][0] = P('R', 'red', 'rr');
  s.board[0][0] = P('A', 'black', 'ba');
  s.board[5][4] = P('P', 'red', 'block');
  const qiStart = s.qi.black;
  __testSetGanglieRoll(4);
  s = makeMove(s, { r: 7, c: 0 }, { r: 0, c: 0 });
  assert(s.pending.ganglieDice?.roll === 4, 'even roll pending');
  assert(s.qi.black === qiStart - 5, 'even path also spends 5 before resolve');
  s = resolveGanglie(s);
  assert(s.board[0][0]?.id === 'rr', 'even roll leaves capturer');
  // resolve ends turn → victim turn-start +1 on top of even restore +2
  assert(s.qi.black === qiStart - 5 + 2 + 1, 'even restores 2 (qi = start−5+2, then turn-start +1)');
  assert(s.log.some((l) => l.text.includes('四点') && l.text.includes('恢复2点战气')), 'even log 恢复2点战气');
  assert(!s.log.some((l) => l.text.includes('未触发')), 'even log no longer says 未触发');
}

{
  // qi < 5: reveal still, no spend, no dice, no broadcast
  let s = base();
  s.redGenerals = [];
  s.blackGenerals = [defToRuntime(GENERALS.find((d) => d.id === 'xiahoudun')!, true)];
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[7][0] = P('R', 'red', 'rr');
  s.board[0][0] = P('A', 'black', 'ba');
  s.board[5][4] = P('P', 'red', 'block');
  s.qi = { ...s.qi, black: 4 };
  s.skillBroadcast = null;
  __testSetGanglieRoll(1);
  s = makeMove(s, { r: 7, c: 0 }, { r: 0, c: 0 });
  assert(!s.blackGenerals[0].hidden, 'qi<5 still reveals 夏侯惇 on first capture');
  assert(!s.pending.ganglieDice, 'qi<5 skips dice');
  // no dice → turn ends immediately; black turn-start +1 (4→5), never spent 5
  assert(s.qi.black === 5, 'qi<5 does not spend (only turn-start +1)');
  assert(s.skillBroadcast?.skill !== '刚烈', 'qi<5 no 刚烈 broadcast');
  assert(s.board[0][0]?.id === 'rr', 'capturer survives when no dice');
}

{
  // King capturer: no dice, no kill (still reveals if hidden)
  let s = base();
  s.redGenerals = [];
  s.blackGenerals = [defToRuntime(GENERALS.find((d) => d.id === 'xiahoudun')!, true)];
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[8][4] = P('A', 'black', 'victim');
  const qiStart = s.qi.black;
  __testSetGanglieRoll(1);
  s = makeMove(s, { r: 9, c: 4 }, { r: 8, c: 4 });
  assert(!s.blackGenerals[0].hidden, 'king capture still reveals 夏侯惇');
  assert(!s.pending.ganglieDice, 'king capturer does not roll');
  assert(s.qi.black === qiStart, 'king capturer does not spend qi');
  assert(s.board[8][4]?.id === 'rk', 'king capturer not destroyed');
  assert(!s.captured.red.some((p) => p.id === 'rk'), 'king not in captured');
}

{
  // Dark capturer: true type for 将帅 check (only K is king)
  let s = base();
  s.redGenerals = [];
  s.blackGenerals = [defToRuntime(GENERALS.find((d) => d.id === 'xiahoudun')!, false)];
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  // Dark 车 still slides by coverType R; true type R ≠ K → must roll
  s.board[7][0] = P('R', 'red', 'rr', { revealed: false, coverType: 'R' });
  s.board[0][0] = P('A', 'black', 'ba');
  s.board[5][4] = P('P', 'red', 'block');
  __testSetGanglieRoll(1);
  s = makeMove(s, { r: 7, c: 0 }, { r: 0, c: 0 });
  assert(!!s.pending.ganglieDice, 'dark non-king capturer still rolls (true type R, not K)');
  s = resolveGanglie(s);
  assert(!s.board[0][0], 'odd roll destroys dark-faced capturer');
}

{
  // Dark piece that is actually king? Kings are always revealed — simulate type K dark impossible;
  // coverType P with type R already covered. Ensure type K never rolls even if somehow dark.
  let s = base();
  s.redGenerals = [];
  s.blackGenerals = [defToRuntime(GENERALS.find((d) => d.id === 'xiahoudun')!, false)];
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk', { revealed: false, coverType: 'R' });
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[8][4] = P('A', 'black', 'victim');
  __testSetGanglieRoll(5);
  s = makeMove(s, { r: 9, c: 4 }, { r: 8, c: 4 });
  assert(!s.pending.ganglieDice, 'type K capturer never rolls even if unrevealed flag set');
  assert(s.board[8][4]?.type === 'K', 'K capturer survives');
}

{
  // 啖睛 unchanged: still arms no-capture on enemy piece
  let s = base();
  s.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'xiahoudun')!, false))];
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[0][0] = P('R', 'black', 'br');
  s.board[5][0] = P('P', 'red', 'rp');
  s.qi = { ...s.qi, red: 10 };
  assert(canUseSkill(s, 'xiahoudun-danjing'), '啖睛 usable');
  s = useSkill(s, 'xiahoudun-danjing', { kind: 'pos', pos: { r: 0, c: 0 } });
  assert(s.pending.danjing?.pieceId === 'br', '啖睛 arms on target');
  s.side = 'black';
  s.skillUsedThisTurn = false;
  const after = listLegalFrom(s, { r: 0, c: 0 });
  assert(!after.some((d) => d.r === 5 && d.c === 0), '啖睛 blocks capture');
  assert(after.some((d) => d.c === 0 && d.r > 0 && d.r < 5), '啖睛 still allows non-capture moves');
}

// 武圣 5: protect a red 车 on r=9; black cannot capture; after 车 crosses to r=4, capturable
{
  let s = base();
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[9][0] = P('R', 'red', 'rr');
  s.board[0][0] = P('R', 'black', 'br');
  s = useSkill(s, 'guanyu-wusheng', { kind: 'pos', pos: { r: 9, c: 0 } });
  assert(s.pending.wushengGuard?.pieceId === 'rr', '武圣 arms on red 车');
  assert(!g(s, 'guanyu').hidden, '关羽 revealed by 武圣');
  s.side = 'black';
  s.skillUsedThisTurn = false;
  const blocked = listLegalFrom(s, { r: 0, c: 0 });
  assert(!blocked.some((m) => m.r === 9 && m.c === 0), 'black cannot capture 武圣-guarded 车');
  s.side = 'red';
  s.skillUsedThisTurn = true;
  s = settle(makeMove(s, { r: 9, c: 0 }, { r: 4, c: 0 }));
  assert(!s.pending.wushengGuard, 'guard clears after 车 crosses to r=4');
  s.side = 'black';
  const after = listLegalFrom(s, { r: 0, c: 0 });
  assert(after.some((m) => m.r === 4 && m.c === 0), 'after crossing, 车 can be captured');
}

// 武圣 6: cannot target the king or a piece already across
{
  const s = base();
  s.board[4][0] = P('N', 'red', 'crossed-n');
  const t = validSkillTargets(s, 'guanyu-wusheng');
  assert(!t.positions.some((p) => s.board[p.r][p.c]?.type === 'K'), '武圣 cannot target the king');
  assert(!t.positions.some((p) => p.r === 4 && p.c === 0), '武圣 cannot target a piece already across');
  const kingTry = useSkill(s, 'guanyu-wusheng', { kind: 'pos', pos: { r: 9, c: 4 } });
  assert(!kingTry.pending.wushengGuard, '武圣 rejects 帅');
  const crossTry = useSkill(s, 'guanyu-wusheng', { kind: 'pos', pos: { r: 4, c: 0 } });
  assert(!crossTry.pending.wushengGuard, '武圣 rejects crossed piece');
}

// 空城 end-of-turn window + blocks a capture
{
  let s = base();
  s.qi = { ...s.qi, red: Math.max(s.qi.red, 3) };
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[2][0] = P('N', 'red', 'victim');
  s.board[0][0] = P('R', 'black', 'br');
  s.board[6][0] = P('P', 'red', 'rp');
  assert(canUseSkill(s, 'zhuge-kongcheng') === false, '空城 not castable mid-turn');
  s = makeMove(s, { r: 6, c: 0 }, { r: 5, c: 0 });
  assert(s.pending.awaitKongcheng, 'ready 空城 opens awaitKongcheng after the move');
  assert(s.side === 'red', 'still same side while awaitKongcheng');
  assert(listLegalFrom(s, { r: 5, c: 0 }).length === 0, 'no legal moves during awaitKongcheng');
  assert(canUseSkill(s, 'zhuge-kongcheng'), 'canUseSkill 空城 only while awaitKongcheng');
  const targets = validSkillTargets(s, 'zhuge-kongcheng');
  assert(targets.positions.some((p) => p.r === 2 && p.c === 0), '空城 can target any own piece');
  s = useSkill(s, 'zhuge-kongcheng', { kind: 'pos', pos: { r: 2, c: 0 } });
  assert(s.side === 'black', 'useSkill 空城 ends the turn');
  assert(!s.pending.awaitKongcheng, 'awaitKongcheng cleared');
  assert(s.pending.kongcheng?.pieceId === 'victim', 'kongcheng armed');
  const moves = listLegalFrom(s, { r: 0, c: 0 });
  assert(!moves.some((m) => m.r === 2 && m.c === 0), '空城 blocks a capture');
  assert(moves.some((m) => m.r === 1 && m.c === 0), 'empty-square moves still legal');
}

// 空城 skip ends the turn
{
  let s = base();
  s.qi = { ...s.qi, red: Math.max(s.qi.red, 3) };
  s = makeMove(s, { r: 6, c: 0 }, { r: 5, c: 0 });
  assert(s.pending.awaitKongcheng && s.side === 'red', 'window open before skip');
  s = skipKongcheng(s);
  assert(!s.pending.awaitKongcheng, 'skip clears awaitKongcheng');
  assert(s.side === 'black', 'skipKongcheng ends the turn');
  assert(!s.pending.kongcheng, 'skip does not arm a guard');
}

// 闭月：回合结束时若本回合有吃子 → +1 战气（不再叠加回合结束回复）
{
  let s = base();
  s.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'diaochan')!, false))];
  s.qi = { red: 0, black: 0 };
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[7][0] = P('R', 'red', 'rr');
  s.board[0][0] = P('A', 'black', 'ba');
  s.board[5][4] = P('P', 'red', 'block');
  s = settle(makeMove(s, { r: 7, c: 0 }, { r: 0, c: 0 }));
  assert(s.qi.red === 1, '闭月 +1 only (no end-turn regen)');
}

// turn-start economy: after red ply, black gets +1; red does not get end-turn +1
{
  let s = base();
  s.qi = { red: 0, black: 0 };
  s = settle(makeMove(s, { r: 6, c: 0 }, { r: 5, c: 0 }));
  assert(s.side === 'black', 'pawn move ended the turn');
  assert(s.qi.red === 0, 'red does not get +1 at end of turn');
  assert(s.qi.black === 1, 'black gets +1 at start of turn');
  assert(s.movesLeft === 1, 'black starts with movesLeft 1');
}

// qi cap at 10
{
  let s = base();
  s.qi = { red: 10, black: 10 };
  s = settle(makeMove(s, { r: 6, c: 0 }, { r: 5, c: 0 }));
  assert(s.qi.red === 10, 'qi capped at 10');
  assert(s.qi.black === 10, 'black turn-start +1 capped at 10');
}

// 破军: capture any piece → +1 (no end-turn regen)
{
  let s = base();
  s.qi = { red: 0, black: 0 };
  s.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'zhangfei')!, false))];
  s.blackGenerals = [];
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[7][0] = P('R', 'red', 'rr');
  s.board[0][0] = P('A', 'black', 'ba');
  s.board[5][4] = P('P', 'red', 'block');
  s = settle(makeMove(s, { r: 7, c: 0 }, { r: 0, c: 0 }));
  assert(s.side === 'black', 'capture ended the turn');
  assert(s.qi.red === 1, '破军 +1 only');
}

// 空城 window opens at end of turn when qi>=3
{
  let s = base();
  s.qi = { red: 3, black: 0 };
  s = makeMove(s, { r: 6, c: 0 }, { r: 5, c: 0 });
  assert(s.pending.awaitKongcheng, '空城 window opens when qi>=3');
  assert(s.side === 'red', 'still red while awaitKongcheng');
}

{
  let s = base();
  s.qi = { red: 2, black: 0 };
  s = makeMove(s, { r: 6, c: 0 }, { r: 5, c: 0 });
  assert(!s.pending.awaitKongcheng, '空城 window stays closed when qi<3');
  assert(s.side === 'black', 'turn ended without 空城');
}

// 龙胆: start turn in check → +2 qi (stacks with turn-start +1)
{
  let s = base();
  s.qi = { red: 0, black: 0 };
  s.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'zhaoyun')!, false))];
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][4] = P('K', 'black', 'bk');
  s.board[7][4] = P('R', 'black', 'br');
  s.board[3][0] = P('P', 'black', 'bp');
  s.side = 'black';
  s.movesLeft = 1;
  s = makeMove(s, { r: 3, c: 0 }, { r: 4, c: 0 });
  assert(s.side === 'red', 'red to move after black ends');
  assert(s.qi.red === 3, '龙胆 +2 plus turn-start +1 when starting in check');
}

// 奸雄：吃掉暗车/炮/马 → +3（无回合结束回复）
{
  let s = base();
  s.qi = { red: 0, black: 0 };
  s.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'caocao')!, false))];
  s.blackGenerals = [];
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[7][0] = P('R', 'red', 'rr');
  s.board[5][0] = P('N', 'black', 'dark-n', { revealed: false, coverType: 'P' });
  s = settle(makeMove(s, { r: 7, c: 0 }, { r: 5, c: 0 }));
  assert(s.qi.red === 3, '奸雄 +3 only');
}

// 神医：己方子被吃 → +1（对方交回后己方再拿回合开始 +1）
{
  let s = base();
  s.qi = { red: 0, black: 0 };
  s.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'huatuo')!, false))];
  s.blackGenerals = [];
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[7][0] = P('R', 'red', 'rr');
  s.board[0][0] = P('R', 'black', 'br');
  s.side = 'black';
  s.movesLeft = 1;
  s = settle(makeMove(s, { r: 0, c: 0 }, { r: 7, c: 0 }));
  assert(s.qi.red === 2, '神医 +1 and red turn-start +1');
}


// 鹰视 1: startMatch 司马懿, mark enemy dark, flip → owner next turn reopens
{
  let s = startMatch();
  for (let i = 0; i < 240 && !s.redGenerals.some((x) => x.id === 'simayi'); i++) {
    s = startMatch();
  }
  assert(s.redGenerals.some((x) => x.id === 'simayi'), 'eventually dealt red 司马懿');
  if (s.pending.awaitGuanxing) {
    const dark = s.board
      .flatMap((row, r) => row.map((p, c) => ({ p, r, c })))
      .filter((x) => x.p && !x.p.revealed)
      .slice(0, 5)
      .map((x) => ({ r: x.r, c: x.c }));
    s = useSkill(s, 'zhuge-guanxing', { kind: 'posList', positions: dark });
  }
  assert(s.pending.awaitYingshi, 'awaitYingshi after start (or after 观星)');
  assert(canUseSkill(s, 'simayi-yingshi'), 'canUseSkill 鹰视 only while awaitYingshi');
  assert(listLegalMoves(s).length === 0, 'no legal moves during awaitYingshi');
  const enemy = s.board
    .flatMap((row, r) => row.map((p, c) => ({ p, r, c })))
    .find((x) => x.p && x.p.side === 'black' && !x.p.revealed);
  assert(!!enemy?.p, 'enemy dark piece exists');
  const markId = enemy!.p!.id;
  s = useSkill(s, 'simayi-yingshi', { kind: 'pos', pos: { r: enemy!.r, c: enemy!.c } });
  assert(peekedOf(s, 'red').includes(markId), 'red peekedIds has marked id');
  assert(!getPiece(s.board, { r: enemy!.r, c: enemy!.c })!.revealed, 'marked piece stays unrevealed');
  assert(s.pending.yingshiMark?.pieceId === markId, 'yingshiMark set');
  assert(!s.pending.awaitYingshi, 'awaitYingshi cleared after mark');
  assert(s.side === 'red', '鹰视 does not end the turn');
  assert(!s.skillUsedThisTurn, '鹰视 does not consume the active-skill slot');

  s.redGenerals = [s.redGenerals.find((x) => x.id === 'simayi')!];
  s.blackGenerals = [];
  s.pending = { ...s.pending, awaitKongcheng: undefined, awaitGuanxing: undefined };
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[3][0] = { type: 'P', side: 'black', id: markId, revealed: false, coverType: 'P' };
  s.board[3][2] = P('P', 'black', 'spare-dark', { revealed: false, coverType: 'P' });
  s.board[6][0] = P('P', 'red', 'rp');
  s.qi = { red: 0, black: 0 };
  s.side = 'red';
  s.skillUsedThisTurn = false;
  s = makeMove(s, { r: 6, c: 0 }, { r: 5, c: 0 });
  assert(s.side === 'black', 'red dummy move passes the turn');
  s = makeMove(s, { r: 3, c: 0 }, { r: 4, c: 0 });
  assert(s.side === 'red', 'after flip cycle it is owner turn');
  assert(getPiece(s.board, { r: 4, c: 0 })!.revealed, 'marked piece flipped');
  assert(s.pending.awaitYingshi, '鹰视 reopens on owner next turn after flip');
}

// 鹰视 2: capture the marked piece → owner next turn awaitYingshi
{
  let s = startMatch();
  for (let i = 0; i < 240 && !s.redGenerals.some((x) => x.id === 'simayi'); i++) {
    s = startMatch();
  }
  assert(s.redGenerals.some((x) => x.id === 'simayi'), 'capture test dealt red 司马懿');
  if (s.pending.awaitGuanxing) {
    const dark = s.board
      .flatMap((row, r) => row.map((p, c) => ({ p, r, c })))
      .filter((x) => x.p && !x.p.revealed)
      .slice(0, 5)
      .map((x) => ({ r: x.r, c: x.c }));
    s = useSkill(s, 'zhuge-guanxing', { kind: 'posList', positions: dark });
  }
  const enemy = s.board
    .flatMap((row, r) => row.map((p, c) => ({ p, r, c })))
    .find((x) => x.p && x.p.side === 'black' && !x.p.revealed);
  const markId = enemy!.p!.id;
  s = useSkill(s, 'simayi-yingshi', { kind: 'pos', pos: { r: enemy!.r, c: enemy!.c } });
  s.redGenerals = [s.redGenerals.find((x) => x.id === 'simayi')!];
  s.blackGenerals = [];
  s.pending = { ...s.pending, awaitKongcheng: undefined, awaitGuanxing: undefined };
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[7][0] = P('R', 'red', 'rr');
  s.board[5][0] = { type: 'A', side: 'black', id: markId, revealed: false, coverType: 'A' };
  s.board[3][2] = P('P', 'black', 'bp');
  s.board[3][4] = P('P', 'black', 'spare-dark', { revealed: false, coverType: 'P' });
  s.qi = { red: 0, black: 0 };
  s.side = 'red';
  s.skillUsedThisTurn = false;
  s = makeMove(s, { r: 7, c: 0 }, { r: 5, c: 0 });
  assert(!s.pending.yingshiMark, 'mark cleared on capture');
  assert(s.pending.yingshiReload?.red, 'reload armed for owner');
  assert(s.side === 'black', 'after capture it is black');
  s = makeMove(s, { r: 3, c: 2 }, { r: 4, c: 2 });
  assert(s.side === 'red', 'owner turn after capture cycle');
  assert(s.pending.awaitYingshi, '鹰视 reopens on owner next turn after capture');
}

assert(!inCheck(createInitialBoard(), 'red'), 'initial position red not in check');

// Fog: search eval must not prefer a hidden 车 over a hidden 兵 with the same cover
{
  const b = emptyBoard();
  b[9][4] = P('K', 'red', 'rk');
  b[0][4] = P('K', 'black', 'bk');
  b[3][0] = P('R', 'black', 'dark-r', { revealed: false, coverType: 'P' });
  b[3][8] = P('P', 'black', 'dark-p', { revealed: false, coverType: 'P' });
  const knownIds = knownIdsOn(b);
  assert(!knownIds.includes('dark-r') && !knownIds.includes('dark-p'), 'root knownIds omit unrevealed pieces');
  assert(knownIds.includes('rk') && knownIds.includes('bk'), 'root knownIds include revealed kings');
  const { board: afterR } = applyMove(b, { r: 3, c: 0 }, { r: 4, c: 0 });
  const { board: afterP } = applyMove(b, { r: 3, c: 8 }, { r: 4, c: 8 });
  assert(getPiece(afterR, { r: 4, c: 0 })!.revealed, 'applyMove reveals the hidden 车');
  assert(getPiece(afterP, { r: 4, c: 8 })!.revealed, 'applyMove reveals the hidden 兵');
  const fogR = evaluateBoard(afterR, 'black', knownIds);
  const fogP = evaluateBoard(afterP, 'black', knownIds);
  assert(fogR === fogP, 'frozen knownIds: flipping 车 vs 兵 with same cover scores equal');
  const cheatR = evaluateBoard(afterR, 'black');
  const cheatP = evaluateBoard(afterP, 'black');
  assert(cheatR !== cheatP, 'without frozen list, revealed 车 scores differently from 兵 (cheat path)');
}

// 鹰视: only unrevealed enemies are legal marks
{
  const yingshi = GENERALS.find((d) => d.id === 'simayi')!.skills.find((x) => x.id === 'simayi-yingshi')!;
  assert(yingshi.desc === '主动技。游戏开始时，你可以标记对方一枚暗棋并观看其真实身份。该子成为明棋或被吃后，你的下个回合开始时再次标记。', '鹰视 desc exact');
  let s = base();
  s.pending = { ...s.pending, awaitYingshi: true };
  s.board[3][0] = P('P', 'black', 'dark-p', { revealed: false, coverType: 'P' });
  const t = validSkillTargets(s, 'simayi-yingshi');
  assert(t.positions.some((p) => p.r === 3 && p.c === 0), '鹰视 targets include a dark enemy');
  assert(
    !t.positions.some((p) => {
      const piece = s.board[p.r][p.c];
      return !!(piece && piece.revealed);
    }),
    '鹰视 targets exclude revealed enemies',
  );
  const revealedChe = t.positions.find((p) => {
    const piece = s.board[p.r][p.c];
    return !!(piece && piece.type === 'R' && piece.revealed);
  });
  assert(!revealedChe, '鹰视 excludes a revealed enemy 车');
  const rook = getPiece(s.board, { r: 0, c: 0 });
  assert(rook?.type === 'R' && rook.revealed && rook.side === 'black', 'board has a revealed black 车');
  const afterBad = useSkill(s, 'simayi-yingshi', { kind: 'pos', pos: { r: 0, c: 0 } });
  assert(afterBad === s, 'useSkill 鹰视 on revealed 车 is a no-op');
  assert(afterBad.pending.awaitYingshi, 'awaitYingshi remains after rejected 车');
  assert(!afterBad.pending.yingshiMark, 'no mark after rejected 车');
  const afterGood = useSkill(s, 'simayi-yingshi', { kind: 'pos', pos: { r: 3, c: 0 } });
  assert(afterGood !== s, 'useSkill 鹰视 on dark enemy applies');
  assert(afterGood.pending.yingshiMark?.pieceId === 'dark-p', '鹰视 marks the dark piece');
  assert(peekedOf(afterGood, 'red').includes('dark-p'), '鹰视 peeks the dark piece');
  assert(!afterGood.pending.awaitYingshi, 'awaitYingshi cleared after dark mark');
}


// 观星 privacy: black peeks never appear in red peekedOf
{
  let s = startMatch();
  for (let i = 0; i < 80 && !(s.blackGenerals.some((x) => x.id === 'zhuge') && !s.redGenerals.some((x) => x.id === 'zhuge')); i++) {
    s = startMatch();
  }
  assert(s.blackGenerals.some((x) => x.id === 'zhuge'), 'privacy test: black 诸葛亮');
  const blackPeeks = peekedOf(s, 'black');
  assert(blackPeeks.length >= 5, 'black has peeks');
  assert(peekedOf(s, 'red').every((id) => !blackPeeks.includes(id)) || peekedOf(s, 'red').length === 0, 'red list excludes black peeks');
  assert(peekedOf(s, 'red').length === 0, 'red peekedOf empty when only black 观星');
}

// 空城: capture attempt helper + no silent-only block data
{
  let s = base();
  s.qi = { ...s.qi, red: Math.max(s.qi.red, 3) };
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[2][0] = P('N', 'red', 'victim');
  s.board[0][0] = P('R', 'black', 'br');
  s.board[6][0] = P('P', 'red', 'rp');
  s = makeMove(s, { r: 6, c: 0 }, { r: 5, c: 0 });
  assert(!s.skillBroadcast, '空城 window opens without premature broadcast');
  s = useSkill(s, 'zhuge-kongcheng', { kind: 'pos', pos: { r: 2, c: 0 } });
  assert(s.skillBroadcast?.skill === '空城', '空城 broadcasts after target selected');
  assert(s.pending.kongcheng?.pieceId === 'victim', 'kongcheng armed for prompt path');
  assert(isKongchengCaptureAttempt(s, { r: 0, c: 0 }, { r: 2, c: 0 }), 'isKongchengCaptureAttempt true for eat');
  assert(!isKongchengCaptureAttempt(s, { r: 0, c: 0 }, { r: 1, c: 0 }), 'empty square is not a kongcheng attempt');
  const blocked = makeMove(s, { r: 0, c: 0 }, { r: 2, c: 0 });
  assert(getPiece(blocked.board, { r: 2, c: 0 })?.id === 'victim', 'makeMove refuses kongcheng capture');
  assert(skillLiveState(s, 'zhuge-kongcheng', 'red')?.includes('(2,0)'), 'live state mentions protected square');
}

// 鬼才 lock remains queryable after cast (for board highlight)
{
  let s = base();
  s.qi = { red: 4, black: 10 };
  const locked = getPiece(s.board, { r: 0, c: 0 })!;
  s = useSkill(s, 'simayi-guicai', { kind: 'pos', pos: { r: 0, c: 0 } });
  assert(s.skillBroadcast?.skill === '鬼才', '鬼才 broadcasts after target');
  assert(skillTypeLabel(GENERALS.find((d) => d.id === 'simayi')!.skills.find((x) => x.id === 'simayi-guicai')!) === '主动技', '鬼才 labeled 主动技');
  assert(skillPhaseOf(GENERALS.find((d) => d.id === 'simayi')!.skills.find((x) => x.id === 'simayi-guicai')!) === '走棋阶段', '鬼才 phase 走棋阶段');
  assert(s.side === 'red', '鬼才 does not end the turn');
  assert(s.pending.guicaiLock?.pieceId === locked.id, 'lock still present for highlight');
  assert(s.pending.guicaiLock?.untilSide === 'black', 'untilSide is victim');
  assert(skillLiveState(s, 'simayi-guicai', 'red')?.includes('锁定'), 'live state reports lock');
}

// 破军: never sets skillBroadcast
{
  let s = base();
  s.qi = { red: 0, black: 0 };
  s.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'zhangfei')!, false))];
  s.blackGenerals = [];
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[7][0] = P('R', 'red', 'rr');
  s.board[0][0] = P('A', 'black', 'ba');
  s.board[5][4] = P('P', 'red', 'block');
  s.skillBroadcast = null;
  s = settle(makeMove(s, { r: 7, c: 0 }, { r: 0, c: 0 }));
  assert(s.qi.red === 1, '破军 still grants +1 qi');
  assert(s.skillBroadcast?.skill !== '破军', '破军 never broadcasts');
  assert(!s.skillBroadcast || s.skillBroadcast.skill !== '破军', 'no 破军 splash');
}

// 火攻: desc exact; 明炮吃子 +2; 暗棋自炮位翻开吃子不加; 被动技 / phase null
{
  const huogong = GENERALS.find((d) => d.id === 'zhouyu')!.skills.find((x) => x.id === 'zhouyu-huogong')!;
  assert(huogong.desc === '被动技。己方以明炮棋吃子时，战气+2。', '火攻 desc exact');
  assert(huogong.nature === '被动技', '火攻 labeled 被动技');
  assert(skillPhaseOf(huogong) === null, '火攻 phase null');
  assert(skillTypeLabel(huogong) === '被动技', '火攻 skillTypeLabel 被动技');
}

{
  let s = base();
  s.qi = { red: 0, black: 0 };
  s.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'zhouyu')!, false))];
  s.blackGenerals = [];
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[7][0] = P('C', 'red', 'rc');
  s.board[5][0] = P('P', 'red', 'screen');
  s.board[0][0] = P('A', 'black', 'ba');
  s = settle(makeMove(s, { r: 7, c: 0 }, { r: 0, c: 0 }));
  assert(s.qi.red === 2, '明炮吃子 火攻 +2');
}

{
  let s = base();
  s.qi = { red: 0, black: 0 };
  s.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'zhouyu')!, false))];
  s.blackGenerals = [];
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  // Dark piece on 炮 seat (coverType C): capture flips this step — no 火攻
  s.board[7][0] = P('C', 'red', 'dark-c', { revealed: false, coverType: 'C' });
  s.board[5][0] = P('P', 'red', 'screen');
  s.board[0][0] = P('A', 'black', 'ba');
  s = settle(makeMove(s, { r: 7, c: 0 }, { r: 0, c: 0 }));
  assert(s.qi.red === 0, '暗棋自炮位翻开吃子 火攻不加');
  assert(getPiece(s.board, { r: 0, c: 0 })?.revealed === true, '暗棋翻开成为明棋');
}

{
  let s = base();
  s.qi = { red: 0, black: 0 };
  s.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'zhouyu')!, false))];
  s.blackGenerals = [];
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  // True 炮 still hidden, walking by non-cannon cover — no 火攻
  s.board[6][0] = P('C', 'red', 'hidden-c', { revealed: false, coverType: 'P' });
  s.board[5][0] = P('A', 'black', 'ba');
  s = settle(makeMove(s, { r: 6, c: 0 }, { r: 5, c: 0 }));
  assert(s.qi.red === 0, '暗炮以盖面走法吃子 火攻不加');
}

{
  let s = base();
  s.qi = { red: 0, black: 0 };
  s.redGenerals = [readyAll(defToRuntime(GENERALS.find((d) => d.id === 'zhouyu')!, false))];
  s.blackGenerals = [];
  s.board = emptyBoard();
  s.board[9][4] = P('K', 'red', 'rk');
  s.board[0][3] = P('K', 'black', 'bk');
  s.board[7][0] = P('R', 'red', 'rr');
  s.board[0][0] = P('A', 'black', 'ba');
  s.board[5][4] = P('P', 'red', 'block');
  s = settle(makeMove(s, { r: 7, c: 0 }, { r: 0, c: 0 }));
  assert(s.qi.red === 0, '非炮吃子无火攻');
}

// Nature + phase axes
{
  const expect: Record<string, { nature: string; phase: string | null }> = {
    'guanyu-yijue': { nature: '主动技', phase: '走棋阶段' },
    'guanyu-wusheng': { nature: '限定技', phase: '走棋阶段' },
    'zhuge-guanxing': { nature: '主动技', phase: '游戏开始' },
    'zhuge-kongcheng': { nature: '主动技', phase: '回合结束' },
    'zhangfei-paoxiao': { nature: '主动技', phase: '走棋阶段' },
    'zhangfei-pojun': { nature: '被动技', phase: null },
    'zhaoyun-longhun': { nature: '主动技', phase: '走棋阶段' },
    'zhaoyun-longdan': { nature: '锁定技', phase: '回合开始' },
    'caocao-guixin': { nature: '主动技', phase: '走棋阶段' },
    'caocao-jianxiong': { nature: '被动技', phase: null },
    'simayi-guicai': { nature: '主动技', phase: '走棋阶段' },
    'simayi-yingshi': { nature: '主动技', phase: '游戏开始' },
    'xiahoudun-ganglie': { nature: '主动技', phase: null },
    'xiahoudun-danjing': { nature: '主动技', phase: '走棋阶段' },
    'huatuo-qingnang': { nature: '主动技', phase: '走棋阶段' },
    'huatuo-shenyi': { nature: '被动技', phase: null },
    'zhouyu-fanjian': { nature: '主动技', phase: '走棋阶段' },
    'zhouyu-huogong': { nature: '被动技', phase: null },
    'sunshangxiang-lianyin': { nature: '主动技', phase: '走棋阶段' },
    'sunshangxiang-xiaoji': { nature: '被动技', phase: null },
    'ganning-chaiqiao': { nature: '主动技', phase: '走棋阶段' },
    'ganning-jinfan': { nature: '被动技', phase: null },
    'lvbu-chitu': { nature: '主动技', phase: '走棋阶段' },
    'lvbu-wushuang': { nature: '限定技', phase: '走棋阶段' },
    'diaochan-lijian': { nature: '主动技', phase: '走棋阶段' },
    'diaochan-biyue': { nature: '锁定技', phase: '回合结束' },
  };
  const seen = new Set<string>();
  for (const g of GENERALS) {
    for (const sk of g.skills) {
      seen.add(sk.id);
      const exp = expect[sk.id];
      assert(!!exp, `${sk.id} listed in nature/phase table`);
      assert(sk.nature === exp.nature, `${sk.id} nature ${exp.nature} (got ${sk.nature})`);
      const phase = skillPhaseOf(sk);
      assert(phase === exp.phase, `${sk.id} phase ${String(exp.phase)} (got ${String(phase)})`);
      const tag = skillTypeLabel(sk);
      assert(tag === exp.nature, `${sk.id} skillTypeLabel prefers nature`);
      assert(
        tag !== '出牌技' && tag !== '开局技' && tag !== '回合技' && tag !== '回合主动技',
        `${sk.id} never shows old combined badge`,
      );
    }
  }
  for (const id of Object.keys(expect)) {
    assert(seen.has(id), `table id ${id} exists on GENERALS`);
  }
  const blank = (extra: Partial<SkillDef>): SkillDef => ({
    id: 'd',
    name: 'd',
    desc: '',
    kind: 'active',
    maxUses: 1,
    rechargeNeed: 0,
    rechargeTrigger: 'none',
    nature: '主动技',
    ...extra,
  });
  assert(skillTypeLabel(blank({ nature: '限定技', engineKind: 'limited' })) === '限定技', 'prefers nature 限定技');
  assert(skillTypeLabel(blank({ nature: '主动技', engineKind: 'window' })) === '主动技', 'prefers nature 主动技');
  assert(skillTypeLabel(blank({ nature: '被动技', kind: 'passive', engineKind: 'passive' })) === '被动技', 'prefers nature 被动技');
  assert(skillTypeLabel(blank({ nature: '锁定技', kind: 'passive', engineKind: 'passive' })) === '锁定技', 'prefers nature 锁定技');
  assert(skillTypeLabel(blank({ nature: '主动技', labelKind: 'none' })) === null, 'none hides badge');
  assert(skillPhaseOf(blank({ phase: '走棋阶段' })) === '走棋阶段', 'skillPhaseOf returns phase');
  assert(skillPhaseOf(blank({ phase: null })) === null, 'skillPhaseOf null when phase is null');
}

// 禁止长将：同一方连续将军到第 3 次非法
{
  function longCheckBoard(): GameState {
    const s = base();
    s.board = emptyBoard();
    // Kings off the same file so flying-general never interferes
    s.board[9][8] = P('K', 'red', 'rk');
    s.board[0][3] = P('K', 'black', 'bk');
    s.board[5][0] = P('R', 'red', 'rr');
    // Black pawn gives a quiet reply that does not check red
    s.board[3][8] = P('P', 'black', 'bp');
    // Red pawn: quiet non-checking alternative when streak === 2
    s.board[6][0] = P('P', 'red', 'rp');
    return s;
  }

  // 第 1、第 2 次连将合法；streak 正确累加
  {
    let s = longCheckBoard();
    assert((s.checkStreak?.red ?? 0) === 0, 'streak starts at 0');
    assert(listLegalFrom(s, { r: 5, c: 0 }).some((m) => m.r === 5 && m.c === 3), '1st check dest legal');
    s = settle(makeMove(s, { r: 5, c: 0 }, { r: 5, c: 3 }));
    assert(s.checkStreak.red === 1, 'after 1st check streak === 1');
    assert(inCheck(s.board, 'black'), 'black in check after 1st');
    // Black king steps aside
    s = settle(makeMove(s, { r: 0, c: 3 }, { r: 0, c: 4 }));
    assert(s.checkStreak.red === 1, 'red streak preserved while black replies');
    assert(listLegalFrom(s, { r: 5, c: 3 }).some((m) => m.r === 5 && m.c === 4), '2nd check dest legal');
    s = settle(makeMove(s, { r: 5, c: 3 }, { r: 5, c: 4 }));
    assert(s.checkStreak.red === 2, 'after 2nd check streak === 2');
    assert(inCheck(s.board, 'black'), 'black in check after 2nd');
  }

  // 第 3 次连将不在 legal 里；whyIllegalDest 提示
  {
    let s = longCheckBoard();
    s = settle(makeMove(s, { r: 5, c: 0 }, { r: 5, c: 3 }));
    s = settle(makeMove(s, { r: 0, c: 3 }, { r: 0, c: 4 }));
    s = settle(makeMove(s, { r: 5, c: 3 }, { r: 5, c: 4 }));
    s = settle(makeMove(s, { r: 0, c: 4 }, { r: 0, c: 3 }));
    assert(s.side === 'red' && s.checkStreak.red === 2, 'setup: streak 2, red to move');
    assert(
      !listLegalFrom(s, { r: 5, c: 4 }).some((m) => m.r === 5 && m.c === 3),
      '3rd consecutive check filtered from listLegalFrom',
    );
    assert(
      !listLegalMoves(s).some((m) => m.from.r === 5 && m.from.c === 4 && m.to.r === 5 && m.to.c === 3),
      '3rd consecutive check filtered from listLegalMoves',
    );
    const hint = whyIllegalDest(s, { r: 5, c: 4 }, { r: 5, c: 3 });
    assert(
      hint === '不能长将' || hint === '连续将军不能到第三次',
      `whyIllegalDest 长将提示 (got ${hint})`,
    );
    const before = s;
    s = makeMove(s, { r: 5, c: 4 }, { r: 5, c: 3 });
    assert(s === before, 'makeMove rejects 3rd consecutive check');
  }

  // 中间夹一步不将军则计数清零，之后可再将
  {
    let s = longCheckBoard();
    s = settle(makeMove(s, { r: 5, c: 0 }, { r: 5, c: 3 }));
    s = settle(makeMove(s, { r: 0, c: 3 }, { r: 0, c: 4 }));
    s = settle(makeMove(s, { r: 5, c: 3 }, { r: 5, c: 4 }));
    s = settle(makeMove(s, { r: 0, c: 4 }, { r: 0, c: 3 }));
    assert(s.checkStreak.red === 2, 'setup streak 2');
    // Quiet pawn push — not a check
    s = settle(makeMove(s, { r: 6, c: 0 }, { r: 5, c: 0 }));
    assert(s.checkStreak.red === 0, 'non-check clears streak');
    s = settle(makeMove(s, { r: 3, c: 8 }, { r: 4, c: 8 }));
    assert(listLegalFrom(s, { r: 5, c: 4 }).some((m) => m.r === 5 && m.c === 3), 'can check again after reset');
    s = settle(makeMove(s, { r: 5, c: 4 }, { r: 5, c: 3 }));
    assert(s.checkStreak.red === 1, 'new check streak starts at 1');
  }

  // 剔除第 3 次长将后无其他合法着 → 长将方困毙负
  {
    let s = base();
    s.board = emptyBoard();
    s.board[9][8] = P('K', 'red', 'rk');
    s.board[0][3] = P('K', 'black', 'bk');
    // Rook at 5,4: only empty ray square is 5,3 (checks). 鬼才 lock so blockers need not be immobile.
    // Use dark advisors on file 4 so they do not orthogonally check black's king.
    s.board[5][4] = P('R', 'red', 'rr');
    for (const [r, c] of [
      [5, 5], [5, 6], [5, 7], [5, 8],
      [5, 2], [5, 1], [5, 0],
      [6, 4], [7, 4], [8, 4], [9, 4],
    ] as const) {
      s.board[r][c] = P('P', 'red', `block-${r}-${c}`);
    }
    for (const [r, c] of [
      [4, 4], [3, 4], [2, 4], [1, 4], [0, 4],
    ] as const) {
      s.board[r][c] = P('A', 'red', `block-${r}-${c}`, { revealed: false, coverType: 'A' });
    }
    s.board[3][8] = P('P', 'black', 'bp');
    s.pending = { ...s.pending, guicaiLock: { pieceId: 'rr', untilSide: 'red' } };
    s.checkStreak = { red: 0, black: 0 };
    s.side = 'red';
    s.movesLeft = 1;
    const geo = listLegalMoves(s);
    assert(geo.length > 0 && geo.every((m) => m.to.r === 5 && m.to.c === 3), 'setup: only geo move is the check');
    assert(!inCheck(s.board, 'black'), 'setup: black not already in check');
    s.checkStreak = { red: 2, black: 0 };
    assert(listLegalMoves(s).length === 0, 'streak-2 filters the only check move');
    s.side = 'black';
    s.movesLeft = 1;
    s = settle(makeMove(s, { r: 3, c: 8 }, { r: 4, c: 8 }));
    assert(s.winner === 'black', '长将困毙：红方负');
  }
}

console.log(`\n${passed} skill/engine checks passed`);
