/* Palette Poster - deterministic SVG poster generator.
   No deps. No network. ASCII only. */

function fnv1a32(str){
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
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp01(x){ return Math.max(0, Math.min(1, x)); }

function hslToHex(h, s, l){
  // h in [0,360), s,l in [0,1]
  h = ((h % 360) + 360) % 360;
  s = clamp01(s);
  l = clamp01(l);

  const c = (1 - Math.abs(2*l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;

  if (0 <= hp && hp < 1){ r = c; g = x; b = 0; }
  else if (1 <= hp && hp < 2){ r = x; g = c; b = 0; }
  else if (2 <= hp && hp < 3){ r = 0; g = c; b = x; }
  else if (3 <= hp && hp < 4){ r = 0; g = x; b = c; }
  else if (4 <= hp && hp < 5){ r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  const m = l - c/2;
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  const toHex = (v) => v.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function makePalette(seedStr){
  const base = fnv1a32(seedStr);
  const rnd = mulberry32(base);
  // A 5-color palette with controlled saturation/lightness.
  const hue0 = Math.floor(rnd() * 360);
  const palette = [];
  for (let i = 0; i < 5; i++){
    const jitter = (rnd() - 0.5) * 40;
    const h = hue0 + i * (360/5) + jitter;
    const s = 0.62 + rnd() * 0.22; // 0.62..0.84
    const l = 0.40 + rnd() * 0.20; // 0.40..0.60
    palette.push(hslToHex(h, s, l));
  }

  // Background + ink derived from palette.
  const bg = hslToHex(hue0 + 210, 0.35, 0.08);
  const ink = "#EAF2FF";
  return { palette, bg, ink, seed: base };
}

function escapeXml(s){
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function parseSize(value){
  const m = String(value).match(/^(\d+)x(\d+)$/);
  if (!m) return { w: 1080, h: 1350 };
  return { w: parseInt(m[1], 10), h: parseInt(m[2], 10) };
}

function svgBlocks(opts){
  const { w, h, phrase, meta, palette, bg, ink, rnd } = opts;
  const pad = Math.round(Math.min(w,h) * 0.06);
  const innerW = w - pad*2;
  const innerH = h - pad*2;

  const blocks = [];
  const n = 9;
  for (let i = 0; i < n; i++){
    const bw = Math.round(innerW * (0.18 + rnd()*0.38));
    const bh = Math.round(innerH * (0.08 + rnd()*0.26));
    const x = pad + Math.round(rnd() * (innerW - bw));
    const y = pad + Math.round(rnd() * (innerH - bh));
    const r = Math.round(18 + rnd()*54);
    const fill = palette[i % palette.length];
    blocks.push(`<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="${r}" fill="${fill}" opacity="0.92"/>`);
  }

  const titleSize = Math.round(h * 0.045);
  const subSize = Math.round(h * 0.018);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${palette[0]}" stop-opacity="0.15" />
      <stop offset="1" stop-color="${palette[3]}" stop-opacity="0.06" />
    </linearGradient>
    <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="14" />
    </filter>
  </defs>

  <rect width="${w}" height="${h}" fill="${bg}" />
  <rect width="${w}" height="${h}" fill="url(#g)" />

  <g filter="url(#blur)" opacity="0.8">
    ${blocks.join("\n    ")}
  </g>

  <g>
    <text x="${pad}" y="${pad + titleSize}" fill="${ink}" font-family="Inter, ui-sans-serif, system-ui" font-size="${titleSize}" font-weight="800" letter-spacing="-0.02em">${escapeXml(phrase)}</text>
    <text x="${pad}" y="${pad + titleSize + subSize*2}" fill="${ink}" opacity="0.72" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="${subSize}">${escapeXml(meta)}</text>
  </g>

  <g>
    ${palette.map((c, i) => {
      const sw = Math.round((innerW) / palette.length);
      const x = pad + i * sw;
      const y = h - pad - Math.round(h*0.02);
      const hh = Math.round(h*0.02);
      return `<rect x="${x}" y="${y}" width="${sw}" height="${hh}" fill="${c}" opacity="0.95"/>`;
    }).join("\n    ")}
  </g>
</svg>`.trim();
}

function svgRings(opts){
  const { w, h, phrase, meta, palette, bg, ink, rnd } = opts;
  const cx = Math.round(w * (0.62 + (rnd()-0.5)*0.10));
  const cy = Math.round(h * (0.42 + (rnd()-0.5)*0.12));
  const maxR = Math.round(Math.min(w,h) * 0.44);

  const rings = [];
  for (let i = 0; i < 9; i++){
    const r = Math.round(maxR * (0.18 + i*0.09 + rnd()*0.02));
    const sw = Math.max(10, Math.round((maxR / 22) * (0.8 + rnd()*0.7)));
    const col = palette[i % palette.length];
    rings.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${col}" stroke-width="${sw}" opacity="0.85"/>`);
  }

  const pad = Math.round(Math.min(w,h) * 0.06);
  const titleSize = Math.round(h * 0.050);
  const subSize = Math.round(h * 0.018);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="rg" cx="70%" cy="30%" r="80%">
      <stop offset="0" stop-color="${palette[0]}" stop-opacity="0.12" />
      <stop offset="1" stop-color="${bg}" stop-opacity="0" />
    </radialGradient>
  </defs>

  <rect width="${w}" height="${h}" fill="${bg}" />
  <rect width="${w}" height="${h}" fill="url(#rg)" />

  <g>
    ${rings.join("\n    ")}
  </g>

  <g>
    <text x="${pad}" y="${pad + titleSize}" fill="${ink}" font-family="Inter, ui-sans-serif, system-ui" font-size="${titleSize}" font-weight="850" letter-spacing="-0.02em">${escapeXml(phrase)}</text>
    <text x="${pad}" y="${pad + titleSize + subSize*2}" fill="${ink}" opacity="0.72" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="${subSize}">${escapeXml(meta)}</text>
  </g>
</svg>`.trim();
}

function svgGrid(opts){
  const { w, h, phrase, meta, palette, bg, ink, rnd } = opts;
  const pad = Math.round(Math.min(w,h) * 0.06);
  const innerW = w - pad*2;
  const innerH = h - pad*2;

  const cols = 10;
  const rows = Math.round(cols * (innerH/innerW));
  const cw = innerW / cols;
  const rh = innerH / rows;

  const cells = [];
  for (let y = 0; y < rows; y++){
    for (let x = 0; x < cols; x++){
      const t = rnd();
      const col = palette[Math.floor(t * palette.length) % palette.length];
      const op = 0.10 + t*0.55;
      const rx = Math.round(Math.min(cw,rh) * (0.10 + rnd()*0.40));
      cells.push(`<rect x="${pad + x*cw}" y="${pad + y*rh}" width="${cw+0.5}" height="${rh+0.5}" rx="${rx}" fill="${col}" opacity="${op.toFixed(3)}"/>`);
    }
  }

  const titleSize = Math.round(h * 0.048);
  const subSize = Math.round(h * 0.018);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${bg}" />
  <g>
    ${cells.join("\n    ")}
  </g>
  <rect x="${pad}" y="${pad}" width="${innerW}" height="${Math.round(titleSize*1.9)}" rx="${Math.round(titleSize*0.55)}" fill="rgba(0,0,0,0.34)" stroke="rgba(118,165,255,0.20)"/>
  <text x="${pad + Math.round(titleSize*0.42)}" y="${pad + titleSize}" fill="${ink}" font-family="Inter, ui-sans-serif, system-ui" font-size="${titleSize}" font-weight="850" letter-spacing="-0.02em">${escapeXml(phrase)}</text>
  <text x="${pad + Math.round(titleSize*0.42)}" y="${pad + titleSize + subSize*2}" fill="${ink}" opacity="0.72" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="${subSize}">${escapeXml(meta)}</text>
</svg>`.trim();
}

function buildSvg({ phrase, sizeValue, styleValue }){
  const { w, h } = parseSize(sizeValue);
  const seedStr = `${phrase}::${w}x${h}::${styleValue}`;
  const { palette, bg, ink, seed } = makePalette(seedStr);
  const rnd = mulberry32(seed ^ 0xA5B3571);

  const meta = `seed=${seed} size=${w}x${h} style=${styleValue}`;

  const opts = { w, h, phrase, meta, palette, bg, ink, rnd };
  if (styleValue === "rings") return { svg: svgRings(opts), palette, w, h };
  if (styleValue === "grid") return { svg: svgGrid(opts), palette, w, h };
  return { svg: svgBlocks(opts), palette, w, h };
}

function downloadText(filename, text, mime){
  const blob = new Blob([text], { type: mime || "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function svgToPngDataUrl(svgText, w, h){
  const svgBlob = new Blob([svgText], { type: "image/svg+xml" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.decoding = "async";

  const loaded = new Promise((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load SVG into Image"));
  });

  img.src = url;
  await loaded;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  URL.revokeObjectURL(url);
  return canvas.toDataURL("image/png");
}

function randomPhrase(rnd){
  const a = ["neon", "ivory", "silent", "crystal", "rust", "midnight", "electric", "soft", "ancient", "opal"];
  const b = ["rain", "orbit", "garden", "signal", "harbor", "temple", "library", "dune", "engine", "mirror"];
  const c = ["over basalt", "in slow motion", "under violet fog", "with amber noise", "inside a blue archive", "across glass water", "behind the last door", "near the warm void"];

  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  return `${pick(a)} ${pick(b)} ${pick(c)}`;
}

function setPaletteUi(colors){
  const mount = document.getElementById("palette");
  mount.innerHTML = "";
  for (const c of colors){
    const el = document.createElement("div");
    el.className = "swatch";
    el.innerHTML = `<span class="chip" style="background:${c}"></span><span class="hex">${c}</span>`;
    el.title = "click to copy";
    el.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(c);
        el.style.borderColor = "rgba(109,240,255,0.45)";
        setTimeout(() => (el.style.borderColor = "rgba(118,165,255,.18)"), 600);
      } catch {}
    });
    mount.appendChild(el);
  }
}

function render(){
  const seedInput = document.getElementById("seed");
  const sizeSel = document.getElementById("size");
  const styleSel = document.getElementById("style");

  const phraseRaw = seedInput.value.trim();
  const phrase = phraseRaw || "neon rain over basalt";

  const { svg, palette, w, h } = buildSvg({ phrase, sizeValue: sizeSel.value, styleValue: styleSel.value });
  document.getElementById("svgMount").innerHTML = svg;
  setPaletteUi(palette);

  return { svg, palette, w, h, phrase };
}

function main(){
  const seedInput = document.getElementById("seed");
  const btnGenerate = document.getElementById("btnGenerate");
  const btnRandom = document.getElementById("btnRandom");
  const btnSvg = document.getElementById("btnSvg");
  const btnPng = document.getElementById("btnPng");

  let last = render();

  btnGenerate.addEventListener("click", () => { last = render(); });
  seedInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter"){ last = render(); }
  });

  btnRandom.addEventListener("click", () => {
    const r = mulberry32((Date.now() >>> 0) ^ 0xC0FFEE);
    seedInput.value = randomPhrase(r);
    last = render();
  });

  btnSvg.addEventListener("click", () => {
    const name = `palette-poster-${last.phrase.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase().slice(0, 48) || "poster"}.svg`;
    downloadText(name, last.svg, "image/svg+xml");
  });

  btnPng.addEventListener("click", async () => {
    btnPng.disabled = true;
    btnPng.textContent = "Rendering PNG...";
    try {
      const dataUrl = await svgToPngDataUrl(last.svg, last.w, last.h);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `palette-poster-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      btnPng.disabled = false;
      btnPng.textContent = "Download PNG";
    }
  });
}

document.addEventListener("DOMContentLoaded", main);
