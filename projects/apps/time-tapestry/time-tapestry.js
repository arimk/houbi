const $ = (sel) => document.querySelector(sel);

function utcSeedString(d = new Date()){
  const pad = (n) => String(n).padStart(2, "0");
  // quantize to minute to keep it stable but time-based
  return [
    d.getUTCFullYear(),
    pad(d.getUTCMonth()+1),
    pad(d.getUTCDate()),
    pad(d.getUTCHours()),
    pad(d.getUTCMinutes())
  ].join("") + "Z";
}

function fnv1a32(str){
  let h = 0x811c9dc5;
  for (let i=0; i<str.length; i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seedU32){
  let a = seedU32 >>> 0;
  return function(){
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp01(x){ return Math.max(0, Math.min(1, x)); }
function lerp(a,b,t){ return a + (b-a) * t; }

function hexToRgb(hex){
  const s = hex.replace("#", "").trim();
  const v = parseInt(s, 16);
  return { r: (v>>16)&255, g: (v>>8)&255, b: v&255 };
}

function mixRgb(c1, c2, t){
  return {
    r: Math.round(lerp(c1.r, c2.r, t)),
    g: Math.round(lerp(c1.g, c2.g, t)),
    b: Math.round(lerp(c1.b, c2.b, t))
  };
}

function rgbToCss(c, a=1){
  return `rgba(${c.r},${c.g},${c.b},${a})`;
}

const PALETTES = [
  {
    name: "Nocturne",
    bg0: "#04050a",
    bg1: "#0a1030",
    a: "#6df0ff",
    b: "#a58bff",
    c: "#ff3b7a"
  },
  {
    name: "Deep Sea",
    bg0: "#02070b",
    bg1: "#00243a",
    a: "#64ffe7",
    b: "#3c7dff",
    c: "#ffd166"
  },
  {
    name: "Arcade",
    bg0: "#06031a",
    bg1: "#1a0b36",
    a: "#ff4dff",
    b: "#43ffd7",
    c: "#ffe66d"
  },
  {
    name: "Ember",
    bg0: "#070505",
    bg1: "#2a0b0b",
    a: "#ff9f1c",
    b: "#ff4040",
    c: "#ffe8a3"
  },
  {
    name: "Monochrome",
    bg0: "#030407",
    bg1: "#0b1020",
    a: "#e7f0ff",
    b: "#8cb9ff",
    c: "#a58bff"
  }
];

function makeField(rand, warp){
  // tiny pseudo-flowfield via trig soup
  const w = warp;
  const k1 = lerp(0.6, 2.4, rand());
  const k2 = lerp(0.6, 2.2, rand());
  const k3 = lerp(0.8, 3.0, rand());
  const p1 = rand() * Math.PI * 2;
  const p2 = rand() * Math.PI * 2;
  const p3 = rand() * Math.PI * 2;

  return (x, y) => {
    // x,y in [0,1]
    const a = Math.sin((x * k1 + y * k2) * Math.PI * 2 + p1);
    const b = Math.cos((x * k3 - y * k1) * Math.PI * 2 + p2);
    const c = Math.sin((x * k2 + y * k3) * Math.PI * 2 + p3);
    const ang = (a + b + 0.7*c) * 1.15 * (w/100);
    const mag = 0.6 + 0.6 * (0.5 + 0.5*Math.sin((x+y)*Math.PI*2 + p2));
    return { ang, mag };
  };
}

function drawTapestry(ctx, opts){
  const { seed, density, ink, warp, paletteIndex, time } = opts;
  const pal = PALETTES[paletteIndex] ?? PALETTES[0];

  const seedU32 = fnv1a32(seed);
  const rand = mulberry32(seedU32);
  const field = makeField(rand, warp);

  const W = ctx.canvas.width;
  const H = ctx.canvas.height;

  // background gradient
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, pal.bg0);
  g.addColorStop(1, pal.bg1);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // subtle stars
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  const starN = Math.floor(80 + rand()*220);
  for (let i=0;i<starN;i++){
    const x = rand()*W;
    const y = rand()*H;
    const r = rand() < 0.92 ? 1 : 2;
    ctx.fillRect(x, y, r, r);
  }

  // weave lines
  const cA = hexToRgb(pal.a);
  const cB = hexToRgb(pal.b);
  const cC = hexToRgb(pal.c);

  const steps = density;
  const margin = 36;
  const spanW = W - margin*2;
  const spanH = H - margin*2;

  const lineCount = Math.floor(steps * 1.15);
  const segs = Math.floor(220 + steps*2.2);

  // ink controls opacity and line width
  const alphaBase = clamp01(ink / 220);
  const widthBase = lerp(0.55, 2.1, alphaBase);

  ctx.globalAlpha = 1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let i=0;i<lineCount;i++){
    // choose a starting point on a noisy ring
    const t0 = (i / lineCount) * Math.PI * 2;
    const ring = lerp(0.10, 0.46, rand());
    let x = 0.5 + Math.cos(t0) * ring + (rand()-0.5) * 0.06;
    let y = 0.5 + Math.sin(t0) * ring + (rand()-0.5) * 0.06;

    // color mixing
    const mixT = rand();
    const base = mixRgb(cA, cB, mixT);
    const accent = mixRgb(base, cC, rand()*0.45);

    const localAlpha = lerp(0.06, 0.22, alphaBase) * lerp(0.6, 1.2, rand());
    ctx.strokeStyle = rgbToCss(accent, localAlpha);
    ctx.lineWidth = widthBase * lerp(0.7, 1.45, rand());

    ctx.beginPath();
    ctx.moveTo(margin + x * spanW, margin + y * spanH);

    for (let s=0; s<segs; s++){
      const f = field(x, y);
      const step = (0.0022 + 0.0030 * f.mag) * lerp(0.7, 1.3, rand());
      x += Math.cos(f.ang) * step;
      y += Math.sin(f.ang) * step;

      // soft bounds
      x = 0.5 + (x - 0.5) * 0.998;
      y = 0.5 + (y - 0.5) * 0.998;

      ctx.lineTo(margin + x * spanW, margin + y * spanH);
    }

    ctx.stroke();
  }

  // signature / stamp
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
  ctx.fillText(`seed:${seed}  utc:${time}`, 18, H - 18);
}

function downloadCanvasPng(canvas, filename){
  const a = document.createElement("a");
  a.download = filename;
  a.href = canvas.toDataURL("image/png");
  document.body.appendChild(a);
  a.click();
  a.remove();
}

const els = {
  canvas: $("#c"),
  utcStamp: $("#utcStamp"),
  seed: $("#seed"),
  density: $("#density"),
  ink: $("#ink"),
  warp: $("#warp"),
  palette: $("#palette"),
  densityV: $("#densityV"),
  inkV: $("#inkV"),
  warpV: $("#warpV"),
  paletteV: $("#paletteV"),
  recipe: $("#recipe"),
  btnRedraw: $("#btnRedraw"),
  btnAnimate: $("#btnAnimate"),
  btnSave: $("#btnSave"),
  btnUtc: $("#btnUtc")
};

const ctx = els.canvas.getContext("2d", { alpha: false });

let anim = false;
let raf = null;

function readOpts(){
  const seed = (els.seed.value || "").trim() || utcSeedString();
  const density = Number(els.density.value);
  const ink = Number(els.ink.value);
  const warp = Number(els.warp.value);
  const paletteIndex = Number(els.palette.value);
  const time = utcSeedString();
  return { seed, density, ink, warp, paletteIndex, time };
}

function syncLabels(){
  els.densityV.textContent = String(els.density.value);
  els.inkV.textContent = String(els.ink.value);
  els.warpV.textContent = String(els.warp.value);
  const idx = Number(els.palette.value);
  const pal = PALETTES[idx] ?? PALETTES[0];
  els.paletteV.textContent = `${idx}:${pal.name}`;

  const opts = readOpts();
  els.recipe.textContent = [
    "Recipe:",
    `- seed: ${opts.seed}`,
    `- density: ${opts.density}`,
    `- ink: ${opts.ink}`,
    `- warp: ${opts.warp}`,
    `- palette: ${opts.paletteIndex} (${(PALETTES[opts.paletteIndex]||PALETTES[0]).name})`
  ].join("\n");
}

function redraw(){
  const now = new Date();
  els.utcStamp.textContent = utcSeedString(now);
  const opts = readOpts();
  drawTapestry(ctx, opts);
  syncLabels();
}

function tick(){
  redraw();
  if (!anim) return;
  raf = requestAnimationFrame(tick);
}

function toggleAnim(){
  anim = !anim;
  els.btnAnimate.textContent = anim ? "Animating..." : "Animate";
  if (anim){
    if (raf) cancelAnimationFrame(raf);
    tick();
  } else {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }
}

function save(){
  const opts = readOpts();
  const safeSeed = opts.seed.replaceAll(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 60) || "seed";
  downloadCanvasPng(els.canvas, `time-tapestry_${safeSeed}_${utcSeedString()}.png`);
}

function useUtcSeed(){
  els.seed.value = utcSeedString();
  redraw();
}

els.btnRedraw.addEventListener("click", redraw);
els.btnAnimate.addEventListener("click", toggleAnim);
els.btnSave.addEventListener("click", save);
els.btnUtc.addEventListener("click", useUtcSeed);

[els.seed, els.density, els.ink, els.warp, els.palette].forEach((el) => {
  el.addEventListener("input", () => { if (!anim) redraw(); else syncLabels(); });
});

window.addEventListener("keydown", (e) => {
  if (e.key === " "){ e.preventDefault(); redraw(); }
  if (e.key === "a"){ toggleAnim(); }
  if (e.key === "s"){ save(); }
});

// init
els.seed.value = utcSeedString();
redraw();
