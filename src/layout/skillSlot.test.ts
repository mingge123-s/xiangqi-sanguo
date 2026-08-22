/**
 * Contract: announce slots must stay a fixed height matching Board SLOT_RESERVE.
 * If height is auto / min-height-only, wrapped broadcast text grows the flex column
 * and the centered wood board jumps vertically after a move. Overflow stays visible
 * so the fixed slot does not crop two-line text or the surrounding ink wash.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const css = readFileSync(resolve(root, 'src/styles.css'), 'utf8');
const boardSrc = readFileSync(resolve(root, 'src/components/Board.tsx'), 'utf8');

const reserveMatch = boardSrc.match(/const\s+SLOT_RESERVE\s*=\s*(\d+)\s*;/);
assert.ok(reserveMatch, 'Board.tsx must define SLOT_RESERVE');
const slotReserve = Number(reserveMatch[1]);
assert.ok(Number.isFinite(slotReserve) && slotReserve > 0, 'SLOT_RESERVE must be a positive number');

const slotBlockMatch = css.match(/\.skill-slot\s*\{[^}]*\}/);
assert.ok(slotBlockMatch, '.skill-slot rule must exist in styles.css');
const slotBlock = slotBlockMatch[0];

assert.doesNotMatch(
  slotBlock,
  /height\s*:\s*auto\b/,
  '.skill-slot must not use height:auto (grows with wrap and shifts the board)',
);

const heightMatch = slotBlock.match(/height\s*:\s*(\d+)px\b/);
assert.ok(heightMatch, `.skill-slot must set a fixed height in px (expected ${slotReserve}px)`);
assert.equal(
  Number(heightMatch[1]),
  slotReserve,
  `.skill-slot height must equal Board SLOT_RESERVE (${slotReserve})`,
);

assert.match(
  slotBlock,
  /overflow\s*:\s*visible\b/,
  '.skill-slot overflow must stay visible so wrapped text and ink wash are not cropped',
);

const promptBlockMatch = css.match(/\.skill-slot-prompt,\s*\n\.skill-slot-splash\s*\{[^}]*\}/);
assert.ok(promptBlockMatch, '.skill-slot-prompt/.skill-slot-splash rule must exist in styles.css');
assert.match(
  promptBlockMatch[0],
  /overflow\s*:\s*visible\b/,
  '.skill-slot-prompt/.skill-slot-splash overflow must stay visible so two-line text is not cropped',
);

console.log('skillSlot layout ok');
