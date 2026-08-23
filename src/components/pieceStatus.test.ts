import { pieceStatusEffect, type PieceStatusSources } from './pieceStatus';

let passed = 0;
function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  passed += 1;
}

const cases: Array<[keyof PieceStatusSources, string, string]> = [
  ['guicaiMarkId', '鬼', 'control'],
  ['lijianMarkId', '离', 'threat'],
  ['fanjianMarkId', '反', 'threat'],
  ['danjingMarkId', '啖', 'threat'],
  ['zhangfeiMarkId', '咆', 'command'],
  ['kongchengMarkId', '空', 'guard'],
  ['wushengMarkId', '武', 'guard'],
  ['wushuangMarkId', '双', 'guard'],
  ['yingshiMarkId', '鹰', 'intel'],
  ['qingnangMarkId', '青', 'support'],
];

for (const [key, mark, tone] of cases) {
  const effect = pieceStatusEffect('p1', { [key]: 'p1' });
  assert(effect?.mark === mark, `${String(key)} shows ${mark}`);
  assert(effect?.tone === tone, `${String(key)} uses ${tone}`);
  assert(!!effect?.label, `${String(key)} has an accessible label`);
}

const priority = pieceStatusEffect('p1', {
  qingnangMarkId: 'p1',
  wushengMarkId: 'p1',
  lijianMarkId: 'p1',
});
assert(priority?.mark === '离', 'harmful pending effects win visual priority');
assert(pieceStatusEffect('other', { lijianMarkId: 'p1' }) == null, 'unmarked pieces stay plain');

console.log(`${passed} piece-status checks passed`);
