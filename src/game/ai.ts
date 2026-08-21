import {
  allPieces,
  applyMove,
  crossedRiver,
  evaluateBoard,
  getAllLegalMoves,
  findKing,
  getPiece,
  inCheck,
  isAdjacent,
  isAttacked,
  isGameOver,
  knownIdsOn,
  opposite,
  pieceValueAt,
} from './core';
import {
  canUseSkill,
  listLegalFrom,
  listLegalMoves,
  makeMove,
  peekedOf,
  pickYingshiTarget,
  skipKongcheng,
  useSkill,
  validSkillTargets,
} from './engine';
import { isSkillReady } from './generals';
import type { GameState, Move, Pos, Side, SkillPayload } from './types';

const TIME_BUDGET_MS = 620;

function searchEval(
  board: GameState['board'],
  side: Side,
  depth: number,
  alpha: number,
  beta: number,
  perspective: Side,
  deadline: number,
  frozen?: Pos,
  knownIds?: string[],
): number {
  if (Date.now() > deadline) return evaluateBoard(board, perspective, knownIds);
  const over = isGameOver(board, side, { frozen });
  if (over.over) {
    if (over.winner === perspective) return 80000 + depth * 20;
    if (over.winner) return -80000 - depth * 20;
    return 0;
  }
  if (depth <= 0) return evaluateBoard(board, perspective, knownIds);
  const moves = getAllLegalMoves(board, side, { frozen });
  if (moves.length === 0) return side === perspective ? -80000 : 80000;

  moves.sort((a, b) => {
    const ca = board[b.to.r][b.to.c] ? 1 : 0;
    const cb = board[a.to.r][a.to.c] ? 1 : 0;
    return ca - cb;
  });

  if (side === perspective) {
    let best = -Infinity;
    for (const m of moves) {
      const { board: nb } = applyMove(board, m.from, m.to);
      const v = searchEval(nb, opposite(side), depth - 1, alpha, beta, perspective, deadline, undefined, knownIds);
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (beta <= alpha || Date.now() > deadline) break;
    }
    return best;
  }
  let best = Infinity;
  for (const m of moves) {
    const { board: nb } = applyMove(board, m.from, m.to);
    const v = searchEval(nb, opposite(side), depth - 1, alpha, beta, perspective, deadline, undefined, knownIds);
    if (v < best) best = v;
    if (best < beta) beta = best;
    if (beta <= alpha || Date.now() > deadline) break;
  }
  return best;
}

function moveDesire(s: GameState, m: Move): number {
  const target = s.board[m.to.r][m.to.c];
  const mover = s.board[m.from.r][m.from.c];
  const knownIds = knownIdsOn(s.board, peekedOf(s, s.side));
  let v = 0;
  if (target) v += pieceValueAt(target, m.to.r, knownIds) + 12;
  if (mover && !mover.revealed) v += 8;
  return v;
}

function searchBestMove(s: GameState, depth: number, deadline: number): { move: Move; score: number } | null {
  const side = s.side;
  const knownIds = knownIdsOn(s.board, peekedOf(s, side));
  const moves = listLegalMoves(s, side);
  if (moves.length === 0) return null;

  moves.sort((a, b) => moveDesire(s, b) - moveDesire(s, a));

  let best = moves[0];
  let bestScore = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;

  for (const m of moves) {
    if (Date.now() > deadline) break;
    const { board: nb } = applyMove(s.board, m.from, m.to);
    const score = searchEval(nb, opposite(side), depth - 1, alpha, beta, side, deadline, undefined, knownIds);
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
    if (score > alpha) alpha = score;
  }
  return { move: best, score: bestScore };
}

function pickBoardMove(s: GameState): Move | null {
  const start = Date.now();
  const deadline = start + TIME_BUDGET_MS;
  let chosen: Move | null = null;
  const d1 = searchBestMove(s, 1, deadline);
  if (d1) chosen = d1.move;
  if (Date.now() < deadline - 80) {
    const d2 = searchBestMove(s, 2, deadline);
    if (d2) chosen = d2.move;
  }
  if (chosen && Date.now() - start < 220 && Date.now() < deadline - 200) {
    const d3 = searchBestMove(s, 3, deadline);
    if (d3 && Date.now() <= deadline) chosen = d3.move;
  }
  if (chosen) return chosen;
  const fallback = listLegalMoves(s);
  return fallback[0] ?? null;
}

function readyActiveIds(s: GameState): string[] {
  const gens = s.side === 'red' ? s.redGenerals : s.blackGenerals;
  const qi = s.qi?.[s.side] ?? 0;
  return gens.flatMap((g) => g.skills).filter((sk) => isSkillReady(sk, qi) && canUseSkill(s, sk.id)).map((sk) => sk.id);
}

function tryResolveCheckWithSkill(s: GameState): GameState | null {
  if (!inCheck(s.board, s.side)) return null;
  const ready = readyActiveIds(s);

  const tryState = (ns: GameState): boolean => {
    if (ns === s) return false;
    if (ns.winner === s.side) return true;
    if (!inCheck(ns.board, ns.side) && listLegalMoves(ns).length > 0) return true;
    return listLegalMoves(ns).some((m) => {
      const after = makeMove(ns, m.from, m.to);
      return after.winner === s.side || (after.side !== s.side && !inCheck(after.board, s.side));
    });
  };

  const order = [
    'zhaoyun-longhun',
    'sunshangxiang-lianyin',
    'huatuo-qingnang',
    'caocao-guixin',
    'zhangfei-paoxiao',
    'ganning-chaiqiao',
    'lvbu-wushuang',
    'lvbu-chitu',
  ];
  for (const id of order) {
    if (!ready.includes(id)) continue;
    if (id === 'caocao-guixin' || id === 'ganning-chaiqiao' || id === 'huatuo-qingnang' || id === 'lvbu-wushuang') {
      const ns = useSkill(s, id, { kind: 'none' });
      if (tryState(ns)) return ns;
    }
    if (id === 'zhangfei-paoxiao') {
      const mine = allPieces(s.board, s.side).filter((m) => !m.piece.revealed);
      const scored = mine
        .map((m) => {
          const dests = listLegalFrom(s, m.pos);
          const canCap = dests.some((d) => !!s.board[d.r][d.c]);
          return { pos: m.pos, dests, canCap };
        })
        .filter((x) => x.dests.length > 0)
        .sort((a, b) => Number(b.canCap) - Number(a.canCap));
      if (scored[0]) {
        const ns = useSkill(s, 'zhangfei-paoxiao', { kind: 'pos', pos: scored[0].pos });
        if (tryState(ns)) return ns;
      }
    }
    if (id === 'zhaoyun-longhun') {
      const mine = allPieces(s.board, s.side).filter((m) => m.piece.type !== 'K');
      for (let i = 0; i < mine.length; i++) {
        for (let j = i + 1; j < mine.length; j++) {
          const ns = useSkill(s, 'zhaoyun-longhun', { kind: 'twoPos', a: mine[i].pos, b: mine[j].pos });
          if (tryState(ns)) return ns;
        }
      }
    }
    if (id === 'sunshangxiang-lianyin') {
      const t = validSkillTargets(s, 'sunshangxiang-lianyin');
      for (const p of t.positions) {
        const ns = useSkill(s, 'sunshangxiang-lianyin', { kind: 'pos', pos: p });
        if (tryState(ns)) return ns;
      }
    }
    if (id === 'lvbu-chitu') {
      const t = validSkillTargets(s, 'lvbu-chitu');
      for (const p of t.positions) {
        const ns = useSkill(s, 'lvbu-chitu', { kind: 'pos', pos: p });
        if (tryState(ns)) return ns;
      }
    }
  }
  return null;
}

function heuristicSkill(s: GameState): { id: string; payload: SkillPayload } | null {
  const ready = readyActiveIds(s);
  if (ready.length === 0) return null;

  if (ready.includes('lvbu-wushuang')) {
    const king = findKing(s.board, s.side);
    const threatened = !!(king && isAttacked(s.board, king, opposite(s.side)));
    if (threatened || inCheck(s.board, s.side) || Math.random() < 0.35) {
      return { id: 'lvbu-wushuang', payload: { kind: 'none' } };
    }
  }

  if (ready.includes('caocao-guixin')) {
    const hits = allPieces(s.board, opposite(s.side)).filter((x) => {
      const r = x.pos.r;
      const c = x.pos.c;
      if (c < 3 || c > 5) return false;
      return s.side === 'red' ? r >= 7 && r <= 9 : r >= 0 && r <= 2;
    });
    if (hits.length > 0) return { id: 'caocao-guixin', payload: { kind: 'none' } };
  }

  if (ready.includes('diaochan-lijian')) {
    const dark = allPieces(s.board, opposite(s.side)).filter((x) => !x.piece.revealed);
    if (dark.length >= 1) {
      const scored = dark
        .map((x) => ({ pos: x.pos, v: pieceValueAt(x.piece, x.pos.r) }))
        .sort((a, b) => b.v - a.v);
      if (scored[0]) return { id: 'diaochan-lijian', payload: { kind: 'pos', pos: scored[0].pos } };
    }
  }

  if (ready.includes('lvbu-chitu')) {
    const t = validSkillTargets(s, 'lvbu-chitu');
    if (t.positions[0] && Math.random() < 0.4) {
      return { id: 'lvbu-chitu', payload: { kind: 'pos', pos: t.positions[0] } };
    }
  }

  if (ready.includes('simayi-guicai')) {
    const t = validSkillTargets(s, 'simayi-guicai');
    const scored = t.positions
      .map((pos) => {
        const p = getPiece(s.board, pos);
        return { pos, v: p ? pieceValueAt(p, pos.r) : 0 };
      })
      .sort((a, b) => b.v - a.v);
    if (scored[0]) return { id: 'simayi-guicai', payload: { kind: 'pos', pos: scored[0].pos } };
  }

  if (ready.includes('zhouyu-fanjian')) {
    const enemies = allPieces(s.board, opposite(s.side));
    let best: { pos: Pos; v: number } | null = null;
    for (const e of enemies) {
      const attacks = listLegalFrom({ ...s, side: e.piece.side }, e.pos);
      const hitsKing = attacks.some((d) => {
        const k = s.board[d.r][d.c];
        return !!(k && k.type === 'K' && k.side === s.side);
      });
      const v = pieceValueAt(e.piece, e.pos.r) + (hitsKing ? 80 : 0);
      if (!best || v > best.v) best = { pos: e.pos, v };
    }
    if (best) return { id: 'zhouyu-fanjian', payload: { kind: 'pos', pos: best.pos } };
  }

  if (ready.includes('guanyu-wusheng')) {
    const t = validSkillTargets(s, 'guanyu-wusheng');
    const high = t.positions
      .map((pos) => {
        const p = getPiece(s.board, pos);
        return { pos, p };
      })
      .filter((x) => x.p && (x.p.type === 'R' || x.p.type === 'C' || x.p.type === 'N'))
      .filter((x) => isAttacked(s.board, x.pos, opposite(s.side)));
    if (high[0]) return { id: 'guanyu-wusheng', payload: { kind: 'pos', pos: high[0].pos } };
  }

  if (ready.includes('guanyu-yijue')) {
    const mine = allPieces(s.board, s.side).filter((x) => !x.piece.revealed && x.piece.type !== 'K');
    const theirs = allPieces(s.board, opposite(s.side)).filter(
      (x) => !x.piece.revealed && x.piece.type !== 'K',
    );
    for (const m of mine) {
      const match = theirs.find((e) => e.piece.type === m.piece.type);
      if (match) {
        return { id: 'guanyu-yijue', payload: { kind: 'twoPos', a: m.pos, b: match.pos } };
      }
    }
    const bestEnemy = theirs
      .map((e) => ({ e, v: pieceValueAt(e.piece, e.pos.r) }))
      .sort((a, b) => b.v - a.v)[0];
    if (bestEnemy && bestEnemy.v >= 40 && mine[0] && Math.random() < 0.35) {
      return {
        id: 'guanyu-yijue',
        payload: { kind: 'twoPos', a: mine[0].pos, b: bestEnemy.e.pos },
      };
    }
  }

  if (ready.includes('huatuo-qingnang') && Math.random() < 0.2) {
    return { id: 'huatuo-qingnang', payload: { kind: 'none' } };
  }

  if (ready.includes('ganning-chaiqiao')) {
    const enemies = allPieces(s.board, opposite(s.side));
    const shouldFire = enemies.some((e) => {
      if (crossedRiver(e.pos.r, e.piece.side)) return false;
      if (e.piece.type === 'P') return true;
      return e.piece.side === 'red' ? e.pos.r === 5 : e.pos.r === 4;
    });
    if (shouldFire) return { id: 'ganning-chaiqiao', payload: { kind: 'none' } };
  }

  const skip = new Set([
    'lvbu-wushuang',
    'lvbu-chitu',
    'zhouyu-fanjian',
    'diaochan-lijian',
    'huatuo-qingnang',
    'ganning-chaiqiao',
    'guanyu-wusheng',
    'guanyu-yijue',
    'caocao-guixin',
  ]);
  const others = ready.filter((id) => !skip.has(id));
  if (others.length && Math.random() < 0.25) {
    const id = others[Math.floor(Math.random() * others.length)];
    if (id === 'zhangfei-paoxiao') {
      const mine = allPieces(s.board, s.side).filter((m) => !m.piece.revealed);
      const scored = mine
        .map((m) => {
          const dests = listLegalFrom(s, m.pos);
          const canCap = dests.some((d) => !!s.board[d.r][d.c]);
          return { pos: m.pos, dests, canCap };
        })
        .filter((x) => x.dests.length > 0)
        .sort((a, b) => Number(b.canCap) - Number(a.canCap));
      if (scored[0]) return { id, payload: { kind: 'pos', pos: scored[0].pos } };
    }
    if (id === 'sunshangxiang-lianyin' || id === 'xiahoudun-danjing') {
      const t = validSkillTargets(s, id);
      if (t.positions[0]) return { id, payload: { kind: 'pos', pos: t.positions[0] } };
    }
  }
  return null;
}

function resolveKongcheng(s: GameState): GameState {
  if (!s.pending.awaitKongcheng) return s;
  const t = validSkillTargets(s, 'zhuge-kongcheng');
  const king = findKing(s.board, s.side);
  const ranked = t.positions
    .map((pos) => {
      const p = getPiece(s.board, pos);
      if (!p) return null;
      const revealedMajor = p.revealed && (p.type === 'R' || p.type === 'C' || p.type === 'N');
      const kingAdj = !!(king && isAdjacent(pos, king));
      if (!revealedMajor && !kingAdj) return null;
      const v = (revealedMajor ? 100 : 0) + (kingAdj ? 20 : 0) + pieceValueAt(p, pos.r);
      return { pos, v };
    })
    .filter((x): x is { pos: Pos; v: number } => !!x)
    .sort((a, b) => b.v - a.v);
  if (ranked[0]) {
    return useSkill(s, 'zhuge-kongcheng', { kind: 'pos', pos: ranked[0].pos });
  }
  return skipKongcheng(s);
}

function resolveYingshi(s: GameState): GameState {
  if (!s.pending.awaitYingshi) return s;
  const t = pickYingshiTarget(s, s.side);
  if (!t) {
    return { ...s, pending: { ...s.pending, awaitYingshi: undefined } };
  }
  return useSkill(s, 'simayi-yingshi', { kind: 'pos', pos: t.pos });
}

export function applyAITurn(s0: GameState): GameState {
  if (s0.phase !== 'playing' || s0.winner) return s0;
  if (s0.side !== 'black') return s0;
  // UI owns 刚烈 dice animation; do not advance while pending.
  if (s0.pending.ganglieDice) return s0;
  let s = s0;

  if (s.pending.awaitYingshi) {
    s = resolveYingshi(s);
    if (s.winner || s.side !== 'black') return s;
  }
  if (s.pending.awaitKongcheng) {
    return resolveKongcheng(s);
  }

  const checkFix = tryResolveCheckWithSkill(s);
  if (checkFix) s = checkFix;
  else {
    const skill = heuristicSkill(s);
    if (skill) {
      const ns = useSkill(s, skill.id, skill.payload);
      if (ns !== s) s = ns;
    }
  }

  if (s.winner) return s;
  if (s.side !== 'black') return s;
  if (s.pending.awaitKongcheng) {
    return resolveKongcheng(s);
  }

  const doOne = (st: GameState): GameState => {
    const mv = pickBoardMove(st);
    if (!mv) {
      return { ...st, winner: 'red', phase: 'result', log: [...st.log, { text: '黑方无子可动，红胜', side: st.side }] };
    }
    return makeMove(st, mv.from, mv.to);
  };

  s = doOne(s);
  if (s.winner) return s;
  if (s.side === 'black' && s.pending.zhangFeiPieceId && (s.movesLeft ?? 0) > 0) {
    s = doOne(s);
  }
  if (s.pending.awaitKongcheng) {
    return resolveKongcheng(s);
  }
  return s;
}
