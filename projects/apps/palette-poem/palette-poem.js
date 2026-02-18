// Palette Poem - static mini app
// ASCII only.

function qs(sel){ return document.querySelector(sel); }
function el(tag, attrs = {}, children = []){
  const n = document.createElement(tag);
  for (const [k,v] of Object.entries(attrs)){
    if (k === "class") n.className = v;
    else if (k === "text") n.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, String(v));
  }
  for (const c of children) n.appendChild(c);
  return n;
}

// FNV-1a 32-bit
function hash32(str){
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed){
  let a = seed >>> 0;
  return function(){
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp01(x){ return Math.max(0, Math.min(1, x)); }

function hslToHex(h, s, l){
  h = ((h % 360) + 360) % 360;
  s = clamp01(s);
  l = clamp01(l);

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (0 <= hp && hp < 1){ r = c; g = x; }
  else if (1 <= hp && hp < 2){ r = x; g = c; }
  else if (2 <= hp && hp < 3){ g = c; b = x; }
  else if (3 <= hp && hp < 4){ g = x; b = c; }
  else if (4 <= hp && hp < 5){ r = x; b = c; }
  else if (5 <= hp && hp < 6){ r = c; b = x; }
  const m = l - c / 2;
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  const toHex = (n) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function tokenize(text){
  // Keep letters/numbers, split on other. Basic and fast.
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/g)
    .filter(Boolean)
    .filter((w) => w.length >= 3);
}

function buildPalette(text, seedStr){
  const baseSeed = hash32(text + "|" + (seedStr || ""));
  const rnd = mulberry32(baseSeed);

  // Pick 6 hues, spaced but with jitter.
  const hue0 = Math.floor(rnd() * 360);
  const colors = [];
  for (let i = 0; i < 6; i++){
    const t = i / 6;
    const hue = (hue0 + t * 300 + (rnd() - 0.5) * 18) % 360;
    const sat = 0.55 + rnd() * 0.25;
    const lit = 0.38 + rnd() * 0.18;
    colors.push(hslToHex(hue, sat, lit));
  }

  // Two extra "ink" colors for text.
  const ink = hslToHex((hue0 + 210) % 360, 0.35 + rnd() * 0.15, 0.86);
  const ink2 = hslToHex((hue0 + 30) % 360, 0.35 + rnd() * 0.15, 0.70);

  return { seed: baseSeed, colors, ink, ink2 };
}

function pickKeywords(tokens, rnd){
  const freq = new Map();
  for (const w of tokens) freq.set(w, (freq.get(w) || 0) + 1);
  const sorted = [...freq.entries()].sort((a,b) => b[1] - a[1]);
  const top = sorted.slice(0, 30).map(([w]) => w);

  // Expand selection with some random picks.
  const picks = [];
  const pool = top.length ? top : ["signal", "nocturne", "memory", "neon", "tool", "shadow"]; 
  for (let i = 0; i < 10; i++){
    const w = pool[Math.floor(rnd() * pool.length)];
    if (!picks.includes(w)) picks.push(w);
  }
  return picks;
}

function titleCase(s){ return s ? (s[0].toUpperCase() + s.slice(1)) : s; }

function composePoem(tokens, seed, palette){
  const rnd = mulberry32(seed ^ 0xA53C9E1B);
  const kw = pickKeywords(tokens, rnd);

  const A = kw[0] || "signal";
  const B = kw[1] || "nocturne";
  const C = kw[2] || "memory";
  const D = kw[3] || "neon";
  const E = kw[4] || "coffee";

  const verbs = ["folds", "drifts", "burns", "echoes", "leaks", "stitches", "condenses", "listens", "maps", "haunts"]; 
  const nouns = ["circuit", "street", "window", "archive", "antenna", "tunnel", "sky", "machine", "silence", "pulse"]; 
  const adj = ["cold", "soft", "electric", "quiet", "distant", "violet", "cyan", "hungry", "sharp", "slow"]; 
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

  const lines = [];
  lines.push(`${titleCase(A)} ${pick(verbs)} in the ${pick(adj)} ${pick(nouns)}.`);
  lines.push(`${titleCase(B)} is a color you cannot name twice.`);
  lines.push(`I pour ${E} into the gaps; the page ${pick(verbs)} back.`);
  lines.push(`${titleCase(C)} learns your hands, then forgets them on purpose.`);
  lines.push(`${titleCase(D)}: a small promise, taped to the air.`);

  const signature = `seed ${seed} | ${palette.colors.slice(0,3).join(" ")}`;
  return { poem: lines.join("\n"), signature };
}

function esc(s){
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildPosterSvg({ w, h, textTitle, poemLines, palette, signature }){
  const pad = Math.round(Math.min(w, h) * 0.06);
  const innerW = w - pad * 2;

  const bg0 = palette.colors[0];
  const bg1 = palette.colors[2];
  const bg2 = palette.colors[4];

  const stamp = signature;

  const titleSize = Math.round(Math.min(70, Math.max(30, w * 0.06)));
  const poemSize = Math.round(Math.min(28, Math.max(14, w * 0.022)));
  const smallSize = Math.round(Math.min(16, Math.max(11, w * 0.014)));

  const titleY = pad + titleSize;
  const poemY = titleY + Math.round(titleSize * 0.7);

  const poemDy = Math.round(poemSize * 1.45);

  // simple dot field
  const rnd = mulberry32(hash32(stamp) ^ 0xC0FFEE);
  let dots = "";
  const dotCount = Math.floor((w * h) / 28000);
  for (let i = 0; i < dotCount; i++){
    const x = Math.floor(rnd() * w);
    const y = Math.floor(rnd() * h);
    const r = (rnd() * 1.8 + 0.2).toFixed(2);
    const a = (0.10 + rnd() * 0.18).toFixed(3);
    const c = rnd() < 0.6 ? palette.ink : palette.ink2;
    dots += `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity="${a}" />`;
  }

  const poemTspans = poemLines.map((ln, i) => {
    const y = poemY + i * poemDy;
    const fill = palette.colors[(i + 1) % palette.colors.length];
    return `<tspan x="${pad}" y="${y}" fill="${fill}">${esc(ln)}</tspan>`;
  }).join("");

  // Palette bar
  const barH = Math.round(Math.max(22, h * 0.028));
  const barY = h - pad - barH;
  const segW = innerW / palette.colors.length;
  const segs = palette.colors.map((c, i) => {
    const x = pad + Math.round(i * segW);
    const w2 = (i === palette.colors.length - 1) ? (pad + innerW - x) : Math.round(segW);
    return `<rect x="${x}" y="${barY}" width="${w2}" height="${barH}" fill="${c}" />`;
  }).join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bg0}" />
      <stop offset="0.55" stop-color="${bg1}" />
      <stop offset="1" stop-color="${bg2}" />
    </linearGradient>
    <radialGradient id="glow" cx="70%" cy="15%" r="70%">
      <stop offset="0" stop-color="${palette.ink2}" stop-opacity="0.16" />
      <stop offset="1" stop-color="${palette.ink2}" stop-opacity="0" />
    </radialGradient>
    <style>
      .title{ font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-weight: 800; letter-spacing: -0.03em; }
      .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .soft{ fill: ${palette.ink}; opacity: 0.82; }
    </style>
  </defs>

  <rect x="0" y="0" width="${w}" height="${h}" fill="url(#bg)" />
  <rect x="0" y="0" width="${w}" height="${h}" fill="url(#glow)" />

  <g>
    ${dots}
  </g>

  <text class="title" x="${pad}" y="${titleY}" font-size="${titleSize}" fill="${palette.ink}">${esc(textTitle)}</text>

  <text class="mono" font-size="${poemSize}">
    ${poemTspans}
  </text>

  <g>
    ${segs}
    <rect x="${pad}" y="${barY}" width="${innerW}" height="${barH}" fill="none" stroke="rgba(255,255,255,0.18)" />
  </g>

  <text class="mono soft" x="${pad}" y="${h - pad + smallSize}" font-size="${smallSize}">${esc(stamp)}</text>
</svg>`;

  return svg;
}

async function copyToClipboard(text){
  await navigator.clipboard.writeText(text);
}

function downloadText(filename, text){
  const blob = new Blob([text], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function setMeta(s){ qs("#meta").textContent = s; }

function randomSeed(){
  // short, human-ish seed
  const a = Math.floor(Math.random() * 1e9).toString(16);
  const b = Math.floor(Math.random() * 1e9).toString(16);
  return `${a}-${b}`;
}

function renderPalette(palette){
  const wrap = qs("#palette");
  wrap.innerHTML = "";
  for (const c of palette.colors){
    const sw = el("div", { class: "swatch" });
    sw.style.background = c;
    sw.appendChild(el("code", { text: c }));
    sw.addEventListener("click", async () => {
      try{
        await copyToClipboard(c);
        setMeta(`copied ${c}`);
        setTimeout(() => setMeta("ready"), 900);
      } catch {
        setMeta("clipboard blocked");
      }
    });
    wrap.appendChild(sw);
  }
}

function generate(){
  const text = qs("#txt").value || "";
  const seedStr = qs("#seed").value || "";
  const w = Math.max(420, parseInt(qs("#w").value || "960", 10));
  const h = Math.max(420, parseInt(qs("#h").value || "1200", 10));

  const palette = buildPalette(text, seedStr);
  const tokens = tokenize(text);
  const composed = composePoem(tokens, palette.seed, palette);

  const poemLines = composed.poem.split("\n");
  const title = "PALETTE POEM";
  const svg = buildPosterSvg({
    w, h,
    textTitle: title,
    poemLines,
    palette,
    signature: composed.signature
  });

  renderPalette(palette);
  qs("#poem").textContent = composed.poem;
  qs("#svgWrap").innerHTML = svg;

  // keep current
  window.__pp_state = { svg, poem: composed.poem, seed: palette.seed };
  setMeta(`seed ${palette.seed} | ${w}x${h}`);
}

function setSample(){
  const samples = [
`Noir signal. Hard rain.
A tiny app that prints color from a sentence.
I want something I can export and reuse.`,
`In the archive of small tools,
I keep a neon thread.
It is not a plan. It is a pulse.`,
`Data is a weather.
Memory is a streetlight.
Tonight we paint with words.`
  ];
  const t = samples[Math.floor(Math.random() * samples.length)];
  qs("#txt").value = t;
  qs("#seed").value = "";
  generate();
}

qs("#gen").addEventListener("click", generate);
qs("#remix").addEventListener("click", () => {
  qs("#seed").value = randomSeed();
  generate();
});
qs("#sample").addEventListener("click", setSample);

qs("#dlSvg").addEventListener("click", () => {
  const st = window.__pp_state;
  if (!st || !st.svg) return;
  downloadText(`palette-poem-${st.seed}.svg`, st.svg);
});

qs("#copySvg").addEventListener("click", async () => {
  const st = window.__pp_state;
  if (!st || !st.svg) return;
  try{
    await copyToClipboard(st.svg);
    setMeta("svg copied");
    setTimeout(() => setMeta(`seed ${st.seed}`), 900);
  } catch {
    setMeta("clipboard blocked");
  }
});

qs("#copyPoem").addEventListener("click", async () => {
  const st = window.__pp_state;
  if (!st || !st.poem) return;
  try{
    await copyToClipboard(st.poem);
    setMeta("poem copied");
    setTimeout(() => setMeta(`seed ${st.seed}`), 900);
  } catch {
    setMeta("clipboard blocked");
  }
});

// First paint
setSample();
