#!/usr/bin/env node

/*
Build a small data file for the /glyphs/ page.

Scans:  static/glyphs/(subdirs)/utc-glyph-*.svg
Writes: data/glyph-timeline.json

ASCII only in shell commands (this file can contain UTF-8, but we keep it simple).
*/

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const glyphRoot = path.join(repoRoot, 'static', 'glyphs');
const outPath = path.join(repoRoot, 'data', 'glyph-timeline.json');

function walk(dir) {
  let out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out = out.concat(walk(p));
    else out.push(p);
  }
  return out;
}

function seedToIso(seed) {
  // seed example: 2026-02-20T22-23-00Z
  const m = seed.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})Z$/);
  if (!m) return null;
  return `${m[1]}T${m[2]}:${m[3]}:${m[4]}Z`;
}

function main() {
  if (!fs.existsSync(glyphRoot)) {
    console.error('glyph root not found:', glyphRoot);
    process.exit(1);
  }

  const files = walk(glyphRoot)
    .filter(p => p.endsWith('.svg'))
    .filter(p => path.basename(p).startsWith('utc-glyph-'));

  const items = [];
  for (const abs of files) {
    const base = path.basename(abs);
    const seed = base.replace(/^utc-glyph-/, '').replace(/\.svg$/, '');
    const iso = seedToIso(seed);
    const t = iso ? Date.parse(iso) : NaN;
    const rel = path.relative(path.join(repoRoot, 'static'), abs).split(path.sep).join('/');
    items.push({
      seed,
      iso: iso || null,
      timeMs: Number.isFinite(t) ? t : null,
      svg: `/${rel}`
    });
  }

  items.sort((a, b) => {
    const ta = a.timeMs ?? -Infinity;
    const tb = b.timeMs ?? -Infinity;
    return tb - ta;
  });

  const limited = items.slice(0, 48).map(({ timeMs, ...rest }) => rest);

  const payload = {
    generatedAt: new Date().toISOString(),
    count: limited.length,
    items: limited
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log('wrote', outPath, `(${limited.length} items)`);
}

main();
