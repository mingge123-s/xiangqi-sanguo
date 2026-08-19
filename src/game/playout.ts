import { applyAITurn } from './ai';
import { listLegalMoves, makeMove, skipKongcheng, skipOverFive, startMatch, useSkill } from './engine';
import { isSkillReady } from './generals';

function playOnce(seedLabel: string): { turns: number; winner: string | null; last: string } {
  let s = startMatch();
  let guard = 0;
  while (!s.winner && s.phase === 'playing' && guard < 180) {
    guard += 1;
    if (s.side === 'black') {
      s = applyAITurn(s);
      continue;
    }
    if (s.pending.awaitGuanxing) {
      const dark = s.board
        .flatMap((row, r) => row.map((p, c) => ({ p, r, c })))
        .filter((x) => x.p && !x.p.revealed)
        .slice(0, 5)
        .map((x) => ({ r: x.r, c: x.c }));
      s = useSkill(s, 'zhuge-guanxing', { kind: 'posList', positions: dark });
    }
    if (s.pending.awaitYingshi) {
      const enemy = s.board
        .flatMap((row, r) => row.map((p, c) => ({ p, r, c })))
        .find((x) => x.p && x.p.side !== s.side && !x.p.revealed);
      if (enemy) {
        s = useSkill(s, 'simayi-yingshi', { kind: 'pos', pos: { r: enemy.r, c: enemy.c } });
      } else {
        s = { ...s, pending: { ...s.pending, awaitYingshi: undefined } };
      }
    }
    if (s.pending.awaitKongcheng) {
      s = skipKongcheng(s);
      continue;
    }
    if (s.pending.awaitOverFive) {
      s = skipOverFive(s);
    }
    // red: maybe use a ready no-target skill rarely
    const ready = s.redGenerals.flatMap((g) => g.skills).filter((sk) => isSkillReady(sk, s.qi?.red ?? 0) && !s.skillUsedThisTurn);
    const auto = ready.find((sk) => sk.id === 'caocao-guixin' || sk.id === 'ganning-chaiqiao');
    if (auto && Math.random() < 0.15) {
      s = useSkill(s, auto.id, { kind: 'none' });
    }
    const moves = listLegalMoves(s);
    if (moves.length === 0) {
      s = { ...s, winner: 'black', phase: 'result' };
      break;
    }
    const m = moves[Math.floor(Math.random() * moves.length)];
    s = makeMove(s, m.from, m.to);
  }
  return {
    turns: s.turnCount,
    winner: s.winner,
    last: `${seedLabel} ${s.log[s.log.length - 1]?.text ?? ''}`,
  };
}

const results = [playOnce('A'), playOnce('B'), playOnce('C')];
for (const r of results) {
  console.log(JSON.stringify(r));
  if (!r.winner && r.turns >= 180) console.log('reached turn cap (draw-ish, not a crash)');
}
console.log('playout ok');
