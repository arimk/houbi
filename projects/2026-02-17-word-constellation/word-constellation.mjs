#!/usr/bin/env node
/*
Word Constellation - tiny SVG word-cloud-ish generator (no deps).

Usage:
  node word-constellation.mjs --in input.txt --out out.svg
  cat input.txt | node word-constellation.mjs --out out.svg

Options:
  --in <path>      Input text file (optional; otherwise stdin)
  --out <path>     Output SVG path (required)
  --width <n>      SVG width (default 1200)
  --height <n>     SVG height (default 800)
  --maxWords <n>   Max words to place (default 60)
  --seed <str>     Seed for deterministic randomness (default "houbi")

Notes:
- Places words along a spiral with naive rectangle collision avoidance.
- Frequency drives font size.
*/

import fs from 'fs';

function usageAndExit(code) {
  const msg = `Word Constellation\n\n` +
    `Usage:\n` +
    `  node word-constellation.mjs --in input.txt --out out.svg\n` +
    `  cat input.txt | node word-constellation.mjs --out out.svg\n\n` +
    `Options:\n` +
    `  --in <path>      Input text file (optional; otherwise stdin)\n` +
    `  --out <path>     Output SVG path (required)\n` +
    `  --width <n>      SVG width (default 1200)\n` +
    `  --height <n>     SVG height (default 800)\n` +
    `  --maxWords <n>   Max words to place (default 60)\n` +
    `  --seed <str>     Seed for deterministic randomness (default "houbi")\n`;
  process.stderr.write(msg + '\n');
  process.exit(code);
}

function parseArgs(argv) {
  const args = { width: 1200, height: 800, maxWords: 60, seed: 'houbi' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') usageAndExit(0);
    if (a === '--in') { args.inPath = argv[++i]; continue; }
    if (a === '--out') { args.outPath = argv[++i]; continue; }
    if (a === '--width') { args.width = parseInt(argv[++i], 10); continue; }
    if (a === '--height') { args.height = parseInt(argv[++i], 10); continue; }
    if (a === '--maxWords') { args.maxWords = parseInt(argv[++i], 10); continue; }
    if (a === '--seed') { args.seed = String(argv[++i]); continue; }
    process.stderr.write(`Unknown arg: ${a}\n`);
    usageAndExit(2);
  }
  if (!args.outPath) usageAndExit(2);
  if (!Number.isFinite(args.width) || !Number.isFinite(args.height)) usageAndExit(2);
  if (!Number.isFinite(args.maxWords) || args.maxWords <= 0) usageAndExit(2);
  return args;
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => data += chunk);
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

// Simple deterministic RNG (xmur3 + mulberry32)
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

const STOPWORDS = new Set([
  'a','an','and','are','as','at','be','but','by','can','could','did','do','does','doing','done','for','from','had','has','have','having',
  'he','her','hers','him','his','how','i','if','in','into','is','it','its','just','let','like','may','me','more','most','my','no','not','now',
  'of','on','one','or','our','out','over','said','say','says','she','so','some','than','that','the','their','them','then','there','these','they',
  'this','those','to','too','up','us','very','was','we','were','what','when','where','which','who','why','will','with','you','your','yours'
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .map(w => w.replace(/^'+|'+$/g, ''))
    .filter(Boolean);
}

function wordFreq(words) {
  const m = new Map();
  for (const w of words) {
    if (w.length < 3) continue;
    if (STOPWORDS.has(w)) continue;
    m.set(w, (m.get(w) || 0) + 1);
  }
  return m;
}

function pickTop(freqMap, maxWords) {
  const arr = [...freqMap.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return arr.slice(0, maxWords);
}

function approxTextBox(word, fontSize, rotateDeg) {
  // Crude approximation: monospace-ish width.
  const w = fontSize * 0.62 * word.length;
  const h = fontSize * 1.0;
  // Inflate for rotation.
  const rad = Math.abs(rotateDeg) * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const bw = Math.abs(w * cos) + Math.abs(h * sin);
  const bh = Math.abs(w * sin) + Math.abs(h * cos);
  return { w: bw, h: bh };
}

function intersects(a, b) {
  return !(a.x2 < b.x1 || a.x1 > b.x2 || a.y2 < b.y1 || a.y1 > b.y2);
}

function makePalette() {
  // Muted starfield-ish.
  return [
    '#E7E9FF', '#B9C2FF', '#8FA1FF', '#7EE7FF', '#97F0C8',
    '#FFD9A3', '#FFB0B0', '#E2A6FF', '#D1D6FF'
  ];
}

function svgEscape(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildSvg({ width, height, seed, items }) {
  const seedFn = xmur3(seed);
  const rand = mulberry32(seedFn());
  const palette = makePalette();

  const placed = [];
  const cx = width / 2;
  const cy = height / 2;

  const counts = items.map(([, c]) => c);
  const maxC = Math.max(...counts);
  const minC = Math.min(...counts);

  function scaleFont(c) {
    if (maxC === minC) return 48;
    const t = (c - minC) / (maxC - minC);
    // Nonlinear: pop big words.
    return Math.round(18 + Math.pow(t, 0.65) * 76);
  }

  for (let idx = 0; idx < items.length; idx++) {
    const [word, count] = items[idx];
    const fontSize = scaleFont(count);
    const rotateDeg = (rand() < 0.22) ? (rand() < 0.5 ? -22 : 22) : 0;
    const box0 = approxTextBox(word, fontSize, rotateDeg);

    let placedBox = null;
    let px = cx, py = cy;

    // Spiral search.
    const maxIter = 4000;
    const a = 2.0; // spiral growth
    const step = 0.22;
    for (let k = 0; k < maxIter; k++) {
      const t = k * step;
      const r = a * t;
      const angle = t;
      px = cx + r * Math.cos(angle);
      py = cy + r * Math.sin(angle);

      const x1 = px - box0.w / 2;
      const y1 = py - box0.h / 2;
      const x2 = px + box0.w / 2;
      const y2 = py + box0.h / 2;

      // Keep inside margins.
      if (x1 < 16 || y1 < 16 || x2 > width - 16 || y2 > height - 16) continue;

      const candidate = { x1, y1, x2, y2 };
      let ok = true;
      for (const b of placed) {
        if (intersects(candidate, b)) { ok = false; break; }
      }
      if (!ok) continue;
      placedBox = candidate;
      placed.push(candidate);
      break;
    }

    if (!placedBox) continue;

    const color = palette[Math.floor(rand() * palette.length)];
    const opacity = clamp(0.72 + rand() * 0.24, 0.65, 0.92);

    items[idx] = {
      word,
      count,
      fontSize,
      x: px,
      y: py,
      rotateDeg,
      color,
      opacity
    };
  }

  const good = items.filter(x => typeof x === 'object');

  const bg = `\n  <defs>\n    <radialGradient id="bg" cx="50%" cy="45%" r="70%">\n      <stop offset="0%" stop-color="#0A0D2A"/>\n      <stop offset="55%" stop-color="#07091C"/>\n      <stop offset="100%" stop-color="#03040E"/>\n    </radialGradient>\n    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">\n      <feGaussianBlur stdDeviation="1.6" result="blur"/>\n      <feMerge>\n        <feMergeNode in="blur"/>\n        <feMergeNode in="SourceGraphic"/>\n      </feMerge>\n    </filter>\n  </defs>`;

  const stars = [];
  const seed2 = mulberry32(seedFn());
  const nStars = Math.round((width * height) / 18000);
  for (let i = 0; i < nStars; i++) {
    const x = Math.round(seed2() * width);
    const y = Math.round(seed2() * height);
    const r = clamp(0.5 + seed2() * 1.8, 0.6, 2.0);
    const aStar = clamp(0.18 + seed2() * 0.35, 0.12, 0.5);
    stars.push(`  <circle cx="${x}" cy="${y}" r="${r.toFixed(2)}" fill="#D7DCFF" opacity="${aStar.toFixed(3)}"/>`);
  }

  const textEls = good.map((w) => {
    const tr = w.rotateDeg ? ` transform="rotate(${w.rotateDeg.toFixed(0)} ${w.x.toFixed(1)} ${w.y.toFixed(1)})"` : '';
    return `  <text x="${w.x.toFixed(1)}" y="${w.y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" font-size="${w.fontSize}" fill="${w.color}" opacity="${w.opacity.toFixed(3)}" filter="url(#glow)"${tr}>${svgEscape(w.word)}</text>`;
  });

  const meta = `  <text x="${width - 12}" y="${height - 10}" text-anchor="end" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="12" fill="#A9B0FF" opacity="0.5">word-constellation seed=${svgEscape(seed)}</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n` +
    `${bg}\n` +
    `  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#bg)"/>\n` +
    stars.join('\n') + '\n' +
    textEls.join('\n') + '\n' +
    meta + '\n' +
    `</svg>\n`;
}

async function main() {
  const args = parseArgs(process.argv);

  let text = '';
  if (args.inPath) {
    text = fs.readFileSync(args.inPath, 'utf8');
  } else {
    // If no stdin, this will hang; detect TTY.
    if (process.stdin.isTTY) {
      process.stderr.write('No --in provided and stdin is a TTY. Provide input via --in or pipe text.\n');
      usageAndExit(2);
    }
    text = await readStdin();
  }

  const words = tokenize(text);
  const freq = wordFreq(words);
  const top = pickTop(freq, args.maxWords);

  if (top.length === 0) {
    process.stderr.write('No usable words found.\n');
    process.exit(1);
  }

  const svg = buildSvg({
    width: args.width,
    height: args.height,
    seed: args.seed,
    items: top
  });

  fs.writeFileSync(args.outPath, svg, 'utf8');
  process.stdout.write(`Wrote ${args.outPath} (${top.length} words considered)\n`);
}

main().catch((err) => {
  process.stderr.write(String(err && err.stack || err) + '\n');
  process.exit(1);
});
