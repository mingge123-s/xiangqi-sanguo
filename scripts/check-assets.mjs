import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicRoot = resolve(root, 'public');
const checked = new Set();

async function checkPortrait(relativePath) {
  if (checked.has(relativePath)) return;
  const data = await readFile(resolve(publicRoot, relativePath));
  const extension = extname(relativePath).toLowerCase();

  if (extension === '.webp') {
    assert(data.length >= 20, `${relativePath}: WebP is too short (possibly a symlink text file)`);
    assert.equal(data.toString('ascii', 0, 4), 'RIFF', `${relativePath}: missing RIFF header`);
    assert.equal(data.toString('ascii', 8, 12), 'WEBP', `${relativePath}: missing WEBP signature`);
    assert.equal(data.readUInt32LE(4) + 8, data.length, `${relativePath}: truncated RIFF payload`);
    assert(['VP8 ', 'VP8L', 'VP8X'].includes(data.toString('ascii', 12, 16)), `${relativePath}: invalid WebP image chunk`);
  } else if (extension === '.png') {
    assert(data.length >= 45, `${relativePath}: PNG is too short (possibly a symlink text file)`);
    assert(data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), `${relativePath}: missing PNG signature`);
    assert.equal(data.toString('ascii', 12, 16), 'IHDR', `${relativePath}: missing PNG image header`);
    assert(data.readUInt32BE(16) > 0 && data.readUInt32BE(20) > 0, `${relativePath}: empty PNG dimensions`);
    assert.equal(data.toString('ascii', data.length - 8, data.length - 4), 'IEND', `${relativePath}: truncated PNG payload`);
  } else {
    assert.fail(`${relativePath}: unsupported portrait format ${extension}`);
  }

  checked.add(relativePath);
}

const definitions = await readFile(resolve(root, 'src/game/generals.ts'), 'utf8');
const generalIds = [...definitions.matchAll(/^ {4}id: ['"]([^'"]+)['"],?\s*$/gm)].map((match) => match[1]);
assert(generalIds.length > 0, 'No general IDs found; update the asset checker if the definitions format changes');
for (const id of generalIds) await checkPortrait(`generals/${id}.webp`);

const wiki = await readFile(resolve(publicRoot, 'wiki.html'), 'utf8');
const wikiPortraits = [...wiki.matchAll(/<img\b[^>]*\bsrc=['"](generals\/[^'"]+)['"]/g)].map((match) => match[1]);
assert(wikiPortraits.length > 0, 'No Wiki portraits found');
for (const portrait of wikiPortraits) await checkPortrait(portrait);

// Also check PNG originals and legacy aliases: a Windows checkout can turn a
// Git symlink into a tiny text file that the browser cannot decode as an image.
for (const entry of await readdir(resolve(publicRoot, 'generals'), { withFileTypes: true })) {
  if (/\.(png|webp)$/i.test(entry.name)) await checkPortrait(`generals/${entry.name}`);
}

console.log(`Asset checks passed: ${generalIds.length} general portraits, ${wikiPortraits.length} Wiki references, ${checked.size} raster files.`);
