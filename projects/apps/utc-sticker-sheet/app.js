function qs(sel){ return document.querySelector(sel); }

// Small, deterministic PRNG setup (string seed -> uint32 -> float[0,1)).
// xmur3 + mulberry32 pattern.
function xmur3(str){
  let h = 1779033703 ^ str.length;
  for(let i=0;i<str.length;i++){
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function(){
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function mulberry32(a){
  return function(){
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function clamp01(x){ return Math.max(0, Math.min(1, x)); }
function lerp(a,b,t){ return a + (b-a)*t; }

function toHex2(n){
  const s = Math.max(0, Math.min(255, n|0)).toString(16);
  return s.length === 1 ? ("0" + s) : s;
}
function rgb(r,g,b){
  return "#" + toHex2(r) + toHex2(g) + toHex2(b);
}

function hslToRgb(h,s,l){
  // h in [0,360)
  const C = (1 - Math.abs(2*l - 1)) * s;
  const hp = (h % 360) / 60;
  const X = C * (1 - Math.abs((hp % 2) - 1));
  let r1=0,g1=0,b1=0;
  if(0<=hp && hp<1){ r1=C; g1=X; b1=0; }
  else if(1<=hp && hp<2){ r1=X; g1=C; b1=0; }
  else if(2<=hp && hp<3){ r1=0; g1=C; b1=X; }
  else if(3<=hp && hp<4){ r1=0; g1=X; b1=C; }
  else if(4<=hp && hp<5){ r1=X; g1=0; b1=C; }
  else { r1=C; g1=0; b1=X; }
  const m = l - C/2;
  const r = Math.round((r1+m)*255);
  const g = Math.round((g1+m)*255);
  const b = Math.round((b1+m)*255);
  return { r, g, b };
}

function pick(arr, rng){ return arr[Math.floor(rng() * arr.length)]; }

function utcSeedNow(){
  const d = new Date();
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth()+1).padStart(2,"0");
  const da = String(d.getUTCDate()).padStart(2,"0");
  const hh = String(d.getUTCHours()).padStart(2,"0");
  const mm = String(d.getUTCMinutes()).padStart(2,"0");
  return String(y) + mo + da + "T" + hh + mm + "Z";
}

function buildPalette(rng){
  const baseH = Math.floor(rng() * 360);
  const sat = lerp(0.55, 0.85, rng());
  const l1 = lerp(0.52, 0.68, rng());
  const l2 = clamp01(l1 - lerp(0.14, 0.22, rng()));
  const l3 = clamp01(l1 + lerp(0.08, 0.16, rng()));

  const hA = baseH;
  const hB = (baseH + (rng() < 0.5 ? 30 : 210)) % 360;
  const hC = (baseH + (rng() < 0.5 ? 160 : 110)) % 360;

  const A = hslToRgb(hA, sat, l1);
  const B = hslToRgb(hB, sat, l2);
  const C = hslToRgb(hC, sat, l3);

  return {
    bg: "#070A14",
    ink: "#EAF2FF",
    a: rgb(A.r,A.g,A.b),
    b: rgb(B.r,B.g,B.b),
    c: rgb(C.r,C.g,C.b)
  };
}

function stickerSvg(cellX, cellY, cellW, cellH, rng, pal){
  const pad = Math.floor(Math.min(cellW, cellH) * 0.10);
  const x0 = cellX + pad;
  const y0 = cellY + pad;
  const w0 = cellW - 2*pad;
  const h0 = cellH - 2*pad;

  const bg = pick([pal.a, pal.b, pal.c], rng);
  const fg = pick([pal.ink, pal.a, pal.b, pal.c], rng);
  const fg2 = pick([pal.ink, pal.a, pal.b, pal.c], rng);

  const kinds = ["ring", "bolt", "stairs", "petal", "barcode", "orbit"];
  const kind = pick(kinds, rng);

  const corner = Math.floor(lerp(10, 22, rng()));
  const stroke = Math.max(2, Math.floor(lerp(2, 5, rng())));

  let g = "";
  g += `<rect x="${x0}" y="${y0}" width="${w0}" height="${h0}" rx="${corner}" fill="${bg}" opacity="0.98" />`;

  const cx = x0 + w0/2;
  const cy = y0 + h0/2;

  if(kind === "ring"){
    const r = Math.min(w0,h0) * lerp(0.22, 0.34, rng);
    g += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${fg}" stroke-width="${stroke}" opacity="0.95" />`;
    g += `<circle cx="${cx}" cy="${cy}" r="${r*0.62}" fill="none" stroke="${fg2}" stroke-width="${Math.max(1, stroke-1)}" opacity="0.75" />`;
  } else if(kind === "bolt"){
    const x1 = cx - w0*0.18;
    const y1 = cy - h0*0.24;
    const x2 = cx + w0*0.06;
    const y2 = cy - h0*0.05;
    const x3 = cx - w0*0.02;
    const y3 = cy - h0*0.05;
    const x4 = cx + w0*0.18;
    const y4 = cy + h0*0.26;
    const x5 = cx - w0*0.06;
    const y5 = cy + h0*0.07;
    const x6 = cx + w0*0.02;
    const y6 = cy + h0*0.07;
    const d = `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} L ${x4} ${y4} L ${x5} ${y5} L ${x6} ${y6} Z`;
    g += `<path d="${d}" fill="${fg}" opacity="0.92" />`;
  } else if(kind === "stairs"){
    const steps = 5;
    const sw = w0 * 0.62;
    const sh = h0 * 0.62;
    const sx = cx - sw/2;
    const sy = cy + sh/2;
    let d = `M ${sx} ${sy}`;
    for(let i=0;i<steps;i++){
      const tx = sx + (sw/steps) * (i+1);
      const ty = sy - (sh/steps) * i;
      const ty2 = sy - (sh/steps) * (i+1);
      d += ` L ${tx} ${ty} L ${tx} ${ty2}`;
    }
    g += `<path d="${d}" fill="none" stroke="${fg}" stroke-width="${stroke}" stroke-linejoin="round" opacity="0.9" />`;
  } else if(kind === "petal"){
    const petals = 6;
    const r1 = Math.min(w0,h0) * 0.16;
    const r2 = Math.min(w0,h0) * 0.34;
    for(let i=0;i<petals;i++){
      const a = (Math.PI*2) * (i/petals);
      const px = cx + Math.cos(a) * r2;
      const py = cy + Math.sin(a) * r2;
      g += `<circle cx="${px}" cy="${py}" r="${r1}" fill="${i%2===0 ? fg : fg2}" opacity="0.78" />`;
    }
    g += `<circle cx="${cx}" cy="${cy}" r="${Math.min(w0,h0)*0.12}" fill="${pal.ink}" opacity="0.85" />`;
  } else if(kind === "barcode"){
    const bars = 11;
    const bw = w0 * 0.70;
    const bh = h0 * 0.58;
    const bx = cx - bw/2;
    const by = cy - bh/2;
    let x = bx;
    for(let i=0;i<bars;i++){
      const w = Math.max(2, Math.floor(lerp(3, 10, rng())));
      const gap = Math.max(1, Math.floor(lerp(2, 6, rng())));
      const h = bh * lerp(0.55, 1.0, rng);
      const y = by + (bh - h)/2;
      g += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${i%2===0 ? fg : fg2}" opacity="0.9" />`;
      x += w + gap;
      if(x > bx + bw) break;
    }
  } else {
    const r = Math.min(w0,h0) * lerp(0.12, 0.18, rng);
    const r2 = Math.min(w0,h0) * lerp(0.30, 0.36, rng);
    const dotx = cx + Math.cos(lerp(0, Math.PI*2, rng())) * r2;
    const doty = cy + Math.sin(lerp(0, Math.PI*2, rng())) * r2;
    g += `<circle cx="${cx}" cy="${cy}" r="${r2}" fill="none" stroke="${fg2}" stroke-width="${Math.max(1, stroke-1)}" opacity="0.75" />`;
    g += `<circle cx="${dotx}" cy="${doty}" r="${r}" fill="${fg}" opacity="0.92" />`;
    g += `<circle cx="${cx}" cy="${cy}" r="${Math.max(2, r*0.55)}" fill="${pal.ink}" opacity="0.65" />`;
  }

  // Tiny corner mark.
  const mark = Math.floor(lerp(6, 12, rng()));
  g += `<path d="M ${x0+mark} ${y0+mark} L ${x0+mark} ${y0+mark*2.1} L ${x0+mark*2.1} ${y0+mark*2.1}" fill="none" stroke="${pal.ink}" stroke-width="${Math.max(1, stroke-2)}" opacity="0.35" />`;

  return g;
}

function buildSheet(seed){
  const s = (seed || "").trim();
  const seedFn = xmur3(s.length ? s : "(empty)");
  const a = seedFn();
  const rng = mulberry32(a);

  const pal = buildPalette(rng);

  const W = 900;
  const H = 600;
  const cols = 3;
  const rows = 2;
  const gap = 18;
  const pad = 22;

  const cellW = Math.floor((W - pad*2 - gap*(cols-1)) / cols);
  const cellH = Math.floor((H - pad*2 - gap*(rows-1)) / rows);

  let inner = "";

  // Background frame.
  inner += `<rect x="0" y="0" width="${W}" height="${H}" rx="28" fill="${pal.bg}" />`;

  let mix = 0;
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const x = pad + c*(cellW + gap);
      const y = pad + r*(cellH + gap);
      inner += stickerSvg(x, y, cellW, cellH, rng, pal);
      mix += Math.floor(rng() * 1000);
    }
  }

  // Footer seed label.
  const label = (s.length ? s : "(empty)");
  inner += `<text x="${pad}" y="${H - 10}" fill="${pal.ink}" opacity="0.55" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14">seed ${escapeXml(label)}</text>`;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">\n` +
    `<title>UTC Sticker Sheet</title>\n` +
    `<desc>Deterministic sticker sheet generated from seed: ${escapeXml(label)}</desc>\n` +
    inner + "\n</svg>\n";

  return { svg, pal, mix };
}

function escapeXml(s){
  return String(s)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/\"/g,"&quot;")
    .replace(/'/g,"&apos;");
}

function setStatus(msg, ok){
  const el = qs("#status");
  el.textContent = msg;
  el.className = "status" + (ok ? " ok" : "");
}

async function copyText(txt){
  await navigator.clipboard.writeText(txt);
}

function downloadText(filename, txt){
  const blob = new Blob([txt], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 800);
}

function currentUrlWithSeed(seed){
  const u = new URL(window.location.href);
  u.searchParams.set("seed", seed);
  return u.toString();
}

function render(){
  const seed = qs("#seed").value.trim();
  const built = buildSheet(seed);

  qs("#kSeed").innerHTML = "seed: <strong>" + escapeHtml(seed || "(empty)") + "</strong>";
  qs("#kPalette").innerHTML = "palette: <strong>" + built.pal.a + "</strong> <strong>" + built.pal.b + "</strong> <strong>" + built.pal.c + "</strong>";
  qs("#kMix").innerHTML = "mix: <strong>" + String(built.mix) + "</strong>";

  qs("#preview").innerHTML = built.svg;
  qs("#out").value = built.svg;

  setStatus("Generated.", true);
}

function escapeHtml(s){
  return String(s)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/\"/g,"&quot;");
}

function init(){
  const seedEl = qs("#seed");

  const u = new URL(window.location.href);
  const seedParam = u.searchParams.get("seed");
  seedEl.value = seedParam ? seedParam : "20260323T1623Z";

  qs("#btnGen").addEventListener("click", () => render());
  qs("#btnRemix").addEventListener("click", () => {
    seedEl.value = utcSeedNow();
    render();
  });
  qs("#btnCopy").addEventListener("click", async () => {
    try{
      await copyText(qs("#out").value);
      setStatus("Copied SVG to clipboard.", true);
    }catch(err){
      setStatus("Copy failed (clipboard blocked).", false);
    }
  });
  qs("#btnDownload").addEventListener("click", () => {
    const seed = seedEl.value.trim() || "empty";
    downloadText("utc-sticker-sheet-" + seed + ".svg", qs("#out").value);
    setStatus("Downloaded SVG.", true);
  });
  qs("#btnLink").addEventListener("click", async () => {
    const url = currentUrlWithSeed(seedEl.value.trim());
    try{
      await copyText(url);
      setStatus("Copied link.", true);
    }catch(err){
      setStatus("Copy failed (clipboard blocked).", false);
    }
  });

  seedEl.addEventListener("keydown", (e) => {
    if(e.key === "Enter") render();
  });

  render();
}

init();
