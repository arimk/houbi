#!/usr/bin/env node
/*
  utc-glyph.js
  Generate a small deterministic SVG glyph from a seed string.

  Usage:
    node tools/utc-glyph.js --seed 20260219T1623Z --out static/art/utc-glyph-20260219T1623Z.svg

  No dependencies.
*/

function usage(code) {
  const msg = [
    "Usage:",
    "  node tools/utc-glyph.js --seed <string> --out <path>",
    "  node tools/utc-glyph.js --seed <string> (prints svg to stdout)",
  ].join("\n");
  process.stderr.write(msg + "\n");
  process.exit(code);
}

function parseArgs(argv) {
  const out = { seed: null, outPath: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--seed") {
      out.seed = argv[++i];
    } else if (a === "--out") {
      out.outPath = argv[++i];
    } else if (a === "-h" || a === "--help") {
      usage(0);
    } else {
      process.stderr.write("Unknown arg: " + a + "\n");
      usage(2);
    }
  }
  if (!out.seed) usage(2);
  return out;
}

function fnv1a32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function hslToHex(h, s, l) {
  // h: [0,360), s,l: [0,1]
  h = ((h % 360) + 360) % 360;
  s = clamp01(s);
  l = clamp01(l);

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));

  let r1 = 0, g1 = 0, b1 = 0;
  if (0 <= hp && hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (1 <= hp && hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (2 <= hp && hp < 3) [r1, g1, b1] = [0, c, x];
  else if (3 <= hp && hp < 4) [r1, g1, b1] = [0, x, c];
  else if (4 <= hp && hp < 5) [r1, g1, b1] = [x, 0, c];
  else if (5 <= hp && hp < 6) [r1, g1, b1] = [c, 0, x];

  const m = l - c / 2;
  const r = Math.round((r1 + m) * 255);
  const g = Math.round((g1 + m) * 255);
  const b = Math.round((b1 + m) * 255);

  const hex = (n) => n.toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function genSvg(seedStr) {
  const seed = fnv1a32(seedStr);
  const rnd = mulberry32(seed);

  const size = 720;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = 300;
  const rInner = 110 + Math.floor(rnd() * 80);

  const hue = Math.floor(rnd() * 360);
  const bg = hslToHex(hue, 0.35, 0.08);
  const ink = hslToHex((hue + 210) % 360, 0.85, 0.75);
  const ink2 = hslToHex((hue + 40) % 360, 0.85, 0.62);

  const spokes = 18 + Math.floor(rnd() * 22);
  const rings = 3 + Math.floor(rnd() * 4);

  const lines = [];

  // Rings
  for (let i = 0; i < rings; i++) {
    const rr = rInner + (i + 1) * ((rOuter - rInner) / (rings + 1));
    const w = 2 + rnd() * 3;
    const a = 0.28 + rnd() * 0.28;
    lines.push(`<circle cx="${cx}" cy="${cy}" r="${rr.toFixed(2)}" fill="none" stroke="${ink}" stroke-opacity="${a.toFixed(3)}" stroke-width="${w.toFixed(2)}" />`);
  }

  // Spokes
  for (let i = 0; i < spokes; i++) {
    const t = (i / spokes) * Math.PI * 2 + (rnd() - 0.5) * 0.06;
    const r0 = rInner + rnd() * 30;
    const r1 = rOuter - rnd() * 18;
    const x0 = cx + Math.cos(t) * r0;
    const y0 = cy + Math.sin(t) * r0;
    const x1 = cx + Math.cos(t) * r1;
    const y1 = cy + Math.sin(t) * r1;
    const w = 1 + rnd() * 3;
    const a = 0.25 + rnd() * 0.55;
    const col = rnd() < 0.18 ? ink2 : ink;
    lines.push(`<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x0.toFixed(2)}" y2="${y0.toFixed(2)}" stroke="${col}" stroke-opacity="${a.toFixed(3)}" stroke-width="${w.toFixed(2)}" stroke-linecap="round" />`);
  }

  // Accent arcs
  const arcs = 5 + Math.floor(rnd() * 9);
  for (let i = 0; i < arcs; i++) {
    const rr = rInner + rnd() * (rOuter - rInner);
    const a0 = rnd() * Math.PI * 2;
    const a1 = a0 + (0.3 + rnd() * 1.2);
    const x0 = cx + Math.cos(a0) * rr;
    const y0 = cy + Math.sin(a0) * rr;
    const x1 = cx + Math.cos(a1) * rr;
    const y1 = cy + Math.sin(a1) * rr;
    const large = (a1 - a0) > Math.PI ? 1 : 0;
    const w = 2 + rnd() * 6;
    const a = 0.18 + rnd() * 0.35;
    const col = rnd() < 0.5 ? ink2 : ink;
    lines.push(`<path d="M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${rr.toFixed(2)} ${rr.toFixed(2)} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}" fill="none" stroke="${col}" stroke-opacity="${a.toFixed(3)}" stroke-width="${w.toFixed(2)}" stroke-linecap="round" />`);
  }

  const title = `UTC Glyph ${seedStr}`;

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${title}">`,
    `<rect width="100%" height="100%" fill="${bg}" />`,
    `<g>`,
    `<circle cx="${cx}" cy="${cy}" r="${rOuter}" fill="none" stroke="${ink}" stroke-opacity="0.22" stroke-width="2" />`,
    `<circle cx="${cx}" cy="${cy}" r="${rInner}" fill="none" stroke="${ink2}" stroke-opacity="0.35" stroke-width="4" />`,
    lines.join("\n"),
    `</g>`,
    `<text x="${cx}" y="${size - 36}" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" font-size="18" fill="${ink}" fill-opacity="0.55">${seedStr}</text>`,
    `</svg>`,
    ``
  ].join("\n");
}

function main() {
  const fs = require("fs");
  const path = require("path");
  const { seed, outPath } = parseArgs(process.argv);
  const svg = genSvg(seed);

  if (outPath) {
    const dir = path.dirname(outPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outPath, svg, "utf8");
  } else {
    process.stdout.write(svg);
  }
}

main();
