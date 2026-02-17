// Word Constellation - browser version (no deps).
// Deterministic RNG: xmur3 + mulberry32.

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
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

const STOPWORDS = new Set([
  "a","an","and","are","as","at","be","but","by","can","could","did","do","does","doing","done","for","from","had","has","have","having",
  "he","her","hers","him","his","how","i","if","in","into","is","it","its","just","let","like","may","me","more","most","my","no","not","now",
  "of","on","one","or","our","out","over","said","say","says","she","so","some","than","that","the","their","them","then","there","these","they",
  "this","those","to","too","up","us","very","was","we","were","what","when","where","which","who","why","will","with","you","your","yours"
]);

function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^'+|'+$/g, ""))
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
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]));
  return arr.slice(0, maxWords);
}

function approxTextBox(word, fontSize, rotateDeg) {
  const w = fontSize * 0.62 * word.length;
  const h = fontSize * 1.0;
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
  return [
    "#E7E9FF", "#B9C2FF", "#8FA1FF", "#7EE7FF", "#97F0C8",
    "#FFD9A3", "#FFB0B0", "#E2A6FF", "#D1D6FF"
  ];
}

function svgEscape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function buildSvg(opts) {
  const width = opts.width;
  const height = opts.height;
  const items = opts.items;
  const seed = opts.seed;
  const rotationMode = opts.rotationMode;

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
    return Math.round(18 + Math.pow(t, 0.65) * 76);
  }

  function rotationFor() {
    if (rotationMode === "none") return 0;
    if (rotationMode === "wild") {
      if (rand() < 0.40) return (rand() < 0.5 ? -35 : 35);
      if (rand() < 0.15) return (rand() < 0.5 ? -18 : 18);
      return 0;
    }
    // subtle
    return (rand() < 0.22) ? (rand() < 0.5 ? -22 : 22) : 0;
  }

  for (let idx = 0; idx < items.length; idx++) {
    const [word, count] = items[idx];
    const fontSize = scaleFont(count);
    const rotateDeg = rotationFor();
    const box0 = approxTextBox(word, fontSize, rotateDeg);

    let chosen = null;

    const maxIter = 4200;
    const a = 2.0;
    const step = 0.22;

    for (let k = 0; k < maxIter; k++) {
      const t = k * step;
      const r = a * t;
      const angle = t;
      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);

      const x1 = px - box0.w / 2;
      const y1 = py - box0.h / 2;
      const x2 = px + box0.w / 2;
      const y2 = py + box0.h / 2;

      if (x1 < 18 || y1 < 18 || x2 > width - 18 || y2 > height - 18) continue;

      const candidate = { x1, y1, x2, y2, px, py, word, count, fontSize, rotateDeg };
      let ok = true;
      for (const b of placed) {
        if (intersects(candidate, b)) { ok = false; break; }
      }
      if (ok) { chosen = candidate; break; }
    }

    if (!chosen) continue;
    placed.push(chosen);
  }

  // Stars
  const starCount = Math.round(clamp((width * height) / 18000, 40, 240));
  const stars = [];
  for (let i = 0; i < starCount; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const r = 0.4 + rand() * 1.4;
    const a = 0.10 + rand() * 0.55;
    stars.push({ x, y, r, a });
  }

  const bg = {
    top: "#05060a",
    bottom: "#0b0f1a",
    glow1: "rgba(80, 111, 255, 0.30)",
    glow2: "rgba(0, 220, 255, 0.18)"
  };

  const wordsSvg = placed.map((p, i) => {
    const fill = palette[i % palette.length];
    const opacity = 0.82 + rand() * 0.18;
    const shadow = 0.15 + rand() * 0.25;

    const t = `<text x="${p.px.toFixed(2)}" y="${p.py.toFixed(2)}"` +
      ` text-anchor="middle" dominant-baseline="middle"` +
      ` font-family="Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"` +
      ` font-size="${p.fontSize}"` +
      ` fill="${fill}" fill-opacity="${opacity.toFixed(3)}"` +
      ` transform="rotate(${p.rotateDeg} ${p.px.toFixed(2)} ${p.py.toFixed(2)})"` +
      ` filter="url(#glow)">` +
      `${svgEscape(p.word)}` +
      `</text>`;

    // faint duplicate for aura
    const aura = `<text x="${p.px.toFixed(2)}" y="${p.py.toFixed(2)}"` +
      ` text-anchor="middle" dominant-baseline="middle"` +
      ` font-family="Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"` +
      ` font-size="${p.fontSize}"` +
      ` fill="${fill}" fill-opacity="${shadow.toFixed(3)}"` +
      ` transform="rotate(${p.rotateDeg} ${p.px.toFixed(2)} ${p.py.toFixed(2)})"` +
      ` filter="url(#blur)">` +
      `${svgEscape(p.word)}` +
      `</text>`;

    return aura + "\n" + t;
  }).join("\n");

  const starsSvg = stars.map((s) => {
    return `<circle cx="${s.x.toFixed(2)}" cy="${s.y.toFixed(2)}" r="${s.r.toFixed(2)}" fill="rgba(231,233,255,${s.a.toFixed(3)})" />`;
  }).join("\n");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n` +
    `  <defs>\n` +
    `    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">\n` +
    `      <stop offset="0" stop-color="${bg.top}" />\n` +
    `      <stop offset="1" stop-color="${bg.bottom}" />\n` +
    `    </linearGradient>\n` +
    `    <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">\n` +
    `      <feGaussianBlur stdDeviation="2.2" />\n` +
    `    </filter>\n` +
    `    <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">\n` +
    `      <feGaussianBlur stdDeviation="0.9" result="b"/>\n` +
    `      <feMerge>\n` +
    `        <feMergeNode in="b"/>\n` +
    `        <feMergeNode in="SourceGraphic"/>\n` +
    `      </feMerge>\n` +
    `    </filter>\n` +
    `    <radialGradient id="glow1" cx="80%" cy="0%" r="70%">\n` +
    `      <stop offset="0" stop-color="${bg.glow1}"/>\n` +
    `      <stop offset="1" stop-color="rgba(0,0,0,0)"/>\n` +
    `    </radialGradient>\n` +
    `    <radialGradient id="glow2" cx="0%" cy="100%" r="70%">\n` +
    `      <stop offset="0" stop-color="${bg.glow2}"/>\n` +
    `      <stop offset="1" stop-color="rgba(0,0,0,0)"/>\n` +
    `    </radialGradient>\n` +
    `  </defs>\n` +
    `  <rect width="100%" height="100%" fill="url(#bg)"/>\n` +
    `  <rect width="100%" height="100%" fill="url(#glow1)"/>\n` +
    `  <rect width="100%" height="100%" fill="url(#glow2)"/>\n` +
    `  <g id="stars">\n${starsSvg}\n  </g>\n` +
    `  <g id="words">\n${wordsSvg}\n  </g>\n` +
    `</svg>\n`;

  return { svg, placedCount: placed.length, starCount };
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // fallback
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  ta.remove();
}

function $(id) { return document.getElementById(id); }

const elText = $("text");
const elSeed = $("seed");
const elMaxWords = $("maxWords");
const elWidth = $("width");
const elHeight = $("height");
const elRotation = $("rotation");
const elPreview = $("preview");
const elSvgOut = $("svgOut");
const elMeta = $("meta");

let lastSvg = "";

function render() {
  const seed = String(elSeed.value || "houbi");
  const maxWords = clamp(parseInt(elMaxWords.value || "60", 10), 10, 300);
  const width = clamp(parseInt(elWidth.value || "1200", 10), 400, 4000);
  const height = clamp(parseInt(elHeight.value || "800", 10), 300, 3000);
  const rotationMode = String(elRotation.value || "subtle");

  const words = tokenize(elText.value || "");
  const freq = wordFreq(words);
  const items = pickTop(freq, maxWords);

  if (!items.length) {
    lastSvg = "";
    elPreview.innerHTML = `<div style="color: #98aacd; padding: 12px;">No words to place. Try a longer text.</div>`;
    elSvgOut.value = "";
    elMeta.textContent = "";
    return;
  }

  const out = buildSvg({ width, height, seed, items, rotationMode });
  lastSvg = out.svg;

  elPreview.innerHTML = out.svg;
  elSvgOut.value = out.svg;
  elMeta.textContent = `Placed ${out.placedCount}/${items.length} words, ${out.starCount} stars. Seed: ${seed}.`;
}

$("render").addEventListener("click", render);
$("download").addEventListener("click", () => {
  if (!lastSvg) render();
  if (!lastSvg) return;
  const seed = String(elSeed.value || "houbi").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 60) || "houbi";
  downloadText(`word-constellation_${seed}.svg`, lastSvg);
});

$("copy").addEventListener("click", async () => {
  if (!lastSvg) render();
  if (!lastSvg) return;
  await copyToClipboard(lastSvg);
  elMeta.textContent = (elMeta.textContent ? elMeta.textContent + " " : "") + "(SVG copied)";
});

// Render on load.
render();
