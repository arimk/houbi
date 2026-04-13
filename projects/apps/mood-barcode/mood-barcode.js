// Mood Barcode - deterministic SVG barcode from a seed.
// ASCII only.

function fnv1a32(str){
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // >>> 0 to uint32
  return h >>> 0;
}

function xorshift32(seed){
  let x = seed >>> 0;
  return () => {
    // xorshift32
    x ^= (x << 13) >>> 0;
    x ^= (x >>> 17) >>> 0;
    x ^= (x << 5) >>> 0;
    return x >>> 0;
  };
}

function u32ToHex(u){
  return (u >>> 0).toString(16).padStart(8, "0");
}

function clamp01(v){
  return Math.max(0, Math.min(1, v));
}

function lerp(a,b,t){
  return a + (b-a) * t;
}

function mixRGB(a, b, t){
  return {
    r: Math.round(lerp(a.r, b.r, t)),
    g: Math.round(lerp(a.g, b.g, t)),
    b: Math.round(lerp(a.b, b.b, t))
  };
}

function rgbToHex(c){
  const h = (n) => n.toString(16).padStart(2, "0");
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
}

const PALETTES = {
  nocturne: {
    name: "Nocturne",
    a: { r: 109, g: 240, b: 255 },
    b: { r: 165, g: 139, b: 255 },
    bg: "#05060a",
    text: "#eaf2ff"
  },
  ember: {
    name: "Ember",
    a: { r: 255, g: 151, b: 76 },
    b: { r: 255, g: 82, b: 151 },
    bg: "#080607",
    text: "#fff2ea"
  },
  forest: {
    name: "Forest",
    a: { r: 85, g: 255, b: 188 },
    b: { r: 80, g: 140, b: 255 },
    bg: "#050a08",
    text: "#e8fff4"
  },
  mono: {
    name: "Mono",
    a: { r: 245, g: 248, b: 255 },
    b: { r: 120, g: 135, b: 170 },
    bg: "#05060a",
    text: "#f5f8ff"
  }
};

const LS_KEY_HISTORY = "moodBarcodeHistoryV1";
const HISTORY_MAX = 10;

function loadHistory(){
  try {
    const raw = localStorage.getItem(LS_KEY_HISTORY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveHistory(list){
  try {
    localStorage.setItem(LS_KEY_HISTORY, JSON.stringify(list || []));
  } catch {
    // ignore
  }
}

function pushHistory(item){
  const list = loadHistory();
  // De-dupe by hash + palette + geometry, keep latest.
  const key = `${item.hashHex}|${item.paletteKey}|${item.bars}|${item.width}|${item.height}|${item.gap}|${item.showCaption ? 1 : 0}|${item.transparentBg ? 1 : 0}`;
  const filtered = list.filter((x) => {
    if (!x) return false;
    const k = `${x.hashHex}|${x.paletteKey}|${x.bars}|${x.width}|${x.height}|${x.gap}|${x.showCaption ? 1 : 0}|${x.transparentBg ? 1 : 0}`;
    return k !== key;
  });

  filtered.unshift({
    ts: Date.now(),
    seedText: item.seedText,
    paletteKey: item.paletteKey,
    bars: item.bars,
    width: item.width,
    height: item.height,
    gap: item.gap,
    showCaption: !!item.showCaption,
    transparentBg: !!item.transparentBg,
    hashHex: item.hashHex
  });

  const clipped = filtered.slice(0, HISTORY_MAX);
  saveHistory(clipped);
  return clipped;
}

function clearHistory(){
  saveHistory([]);
  return [];
}

function buildBarcodeSvg({ seedText, paletteKey, bars, width, height, gapPct, showCaption, transparentBg }){
  const pal = PALETTES[paletteKey] || PALETTES.nocturne;
  const gapP = clamp01((Number(gapPct) || 0) / 100);
  const capOn = (showCaption !== false);
  const bgOn = !transparentBg;

  const hash = fnv1a32(seedText);
  const rand = xorshift32(hash ^ 0x9e3779b9);

  // Layout
  const pad = Math.round(width * 0.06);
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const barH = Math.round(innerH * 0.62);
  const topY = pad + Math.round(innerH * 0.12);

  // Generate bars with variable widths.
  // We generate N weights then normalize to fill innerW.
  const weights = [];
  let wsum = 0;
  for (let i = 0; i < bars; i++){
    const r = rand();
    // Weight in [0.35..1.35] skewed a bit
    const t = ((r & 0xffff) / 0xffff);
    const weight = 0.35 + Math.pow(t, 0.65) * 1.0;
    weights.push(weight);
    wsum += weight;
  }

  const barWs = weights.map((w) => Math.max(1, Math.round((w / wsum) * innerW)));
  // Fix rounding drift to match innerW exactly.
  let drift = innerW - barWs.reduce((a,b) => a + b, 0);
  let idx = 0;
  while (drift !== 0 && idx < barWs.length * 2){
    const j = idx % barWs.length;
    const delta = drift > 0 ? 1 : -1;
    if (barWs[j] + delta >= 1){
      barWs[j] += delta;
      drift -= delta;
    }
    idx++;
  }

  let x = pad;
  const rects = [];

  for (let i = 0; i < bars; i++){
    const r = rand();
    const intensity = ((r >>> 8) & 0xffff) / 0xffff; // 0..1
    const depth = clamp01(0.08 + intensity * 0.92);

    const color = rgbToHex(mixRGB(pal.a, pal.b, depth));

    // Occasionally add "gaps" (quiet moments)
    const gapRoll = (r & 0xff) / 255;
    const isGap = gapRoll < gapP;

    const bw = barWs[i];
    const hNoise = ((r >>> 24) & 0xff) / 255;
    const bh = Math.round(barH * (0.70 + 0.30 * hNoise));
    const y = topY + (barH - bh);

    if (!isGap){
      rects.push(`<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="1" fill="${color}" opacity="0.95" />`);
    }

    x += bw;
  }

  const title = seedText.trim().slice(0, 80) || "(empty seed)";
  const subtitle = `hash ${u32ToHex(hash)} - palette ${pal.name} - bars ${bars}`;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${pal.bg}" />
      <stop offset="1" stop-color="#0b0f1a" />
    </linearGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="6" result="b" />
      <feColorMatrix in="b" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.65 0" result="g" />
      <feMerge>
        <feMergeNode in="g" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  ${bgOn ? `<rect x="0" y="0" width="${width}" height="${height}" fill="url(#bg)" />
  <rect x="${pad}" y="${pad}" width="${innerW}" height="${innerH}" fill="rgba(255,255,255,0.02)" stroke="rgba(140,185,255,0.18)" rx="18" />` : ""}

  <g filter="url(#glow)">
    ${rects.join("\n    ")}
  </g>

  ${capOn ? `<text x="${pad}" y="${Math.round(height - pad * 0.55)}" fill="${pal.text}" font-size="14" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.92">${escapeXml(title)}</text>
  <text x="${pad}" y="${Math.round(height - pad * 0.22)}" fill="rgba(190,210,255,0.85)" font-size="12" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${escapeXml(subtitle)}</text>` : ""}
</svg>`;

  return { svg, hashHex: u32ToHex(hash) };
}

function escapeXml(s){
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
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
  URL.revokeObjectURL(url);
}

async function copyToClipboard(text){
  await navigator.clipboard.writeText(text);
}

async function svgToPngDataUrl(svgText, width, height){
  const svgBlob = new Blob([svgText], { type: "image/svg+xml" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    // Some browsers need crossOrigin for blob? Usually ok.
    const p = new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(e);
    });
    img.src = url;
    await p;

    const canvas = document.getElementById("pngCanvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function downloadDataUrl(filename, dataUrl){
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function nowSeed(){
  const d = new Date();
  return d.toISOString().replace("T", " ").replace("Z", " UTC");
}

function readQueryState(){
  const p = new URLSearchParams(window.location.search || "");
  const seed = p.get("seed");
  const palette = p.get("palette");
  const bars = p.get("bars");
  const w = p.get("w");
  const h = p.get("h");
  const gap = p.get("gap");
  const cap = p.get("cap");
  const bg = p.get("bg");
  return {
    seed: seed == null ? null : seed,
    palette: palette == null ? null : palette,
    bars: bars == null ? null : bars,
    w: w == null ? null : w,
    h: h == null ? null : h,
    gap: gap == null ? null : gap,
    cap: cap == null ? null : cap,
    bg: bg == null ? null : bg
  };
}

function buildShareUrl(state){
  const u = new URL(window.location.href);
  u.search = "";
  const p = u.searchParams;
  if (state.seed != null && state.seed !== "") p.set("seed", state.seed);
  if (state.palette) p.set("palette", state.palette);
  if (state.bars) p.set("bars", String(state.bars));
  if (state.w) p.set("w", String(state.w));
  if (state.h) p.set("h", String(state.h));
  if (state.gap != null && state.gap !== "") p.set("gap", String(state.gap));
  if (state.cap != null && state.cap !== "") p.set("cap", String(state.cap));
  if (state.bg != null && state.bg !== "") p.set("bg", String(state.bg));
  return u.toString();
}

function updateUrl(state){
  try {
    const url = buildShareUrl(state);
    window.history.replaceState(null, "", url);
  } catch {
    // ignore
  }
}

function getInt(id, def){

  const v = Number(document.getElementById(id).value);
  return Number.isFinite(v) ? v : def;
}

function main(){
  const elSeed = document.getElementById("seed");
  const elPalette = document.getElementById("palette");
  const elBars = document.getElementById("bars");
  const svgMount = document.getElementById("svgMount");
  const outHash = document.getElementById("outHash");
  const elHistoryList = document.getElementById("historyList");

  let debounceTimer = null;

  function renderHistory(list){
    if (!elHistoryList) return;
    elHistoryList.innerHTML = "";
    const items = (list || []).slice(0, HISTORY_MAX);
    if (items.length === 0){
      const p = document.createElement("div");
      p.className = "hint small";
      p.textContent = "No saved items yet.";
      elHistoryList.appendChild(p);
      return;
    }

    for (let i = 0; i < items.length; i++){
      const it = items[i] || {};
      const b = document.createElement("button");
      b.type = "button";
      b.className = "historyItem";

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = `hash ${it.hashHex || "-"} - ${it.paletteKey || "-"} - ${it.bars || "-"} bars`;

      const seed = document.createElement("div");
      seed.className = "seed";
      const s = String(it.seedText || "").trim();
      seed.textContent = (s.length > 72) ? (s.slice(0, 72) + "...") : (s || "(empty)");

      b.appendChild(meta);
      b.appendChild(seed);

      b.addEventListener("click", () => {
        elSeed.value = String(it.seedText || "");
        if (it.paletteKey && PALETTES[it.paletteKey]) elPalette.value = it.paletteKey;
        if (it.bars != null) elBars.value = String(it.bars);
        if (it.width != null) document.getElementById("w").value = String(it.width);
        if (it.height != null) document.getElementById("h").value = String(it.height);
        if (it.gap != null) document.getElementById("gap").value = String(it.gap);
        if (it.showCaption != null) document.getElementById("showCaption").checked = !!it.showCaption;
        if (it.transparentBg != null) document.getElementById("transparentBg").checked = !!it.transparentBg;
        render({ updateUrl: true });
      });

      elHistoryList.appendChild(b);
    }
  }

  function render(opts){
    const o = opts || {};
    const seedText = elSeed.value || "";
    const paletteKey = elPalette.value;
    const bars = Number(elBars.value) || 64;
    const width = getInt("w", 900);
    const height = getInt("h", 240);
    const gap = getInt("gap", 7);
    const showCaption = !!document.getElementById("showCaption").checked;
    const transparentBg = !!document.getElementById("transparentBg").checked;

    const { svg, hashHex } = buildBarcodeSvg({ seedText, paletteKey, bars, width, height, gapPct: gap, showCaption, transparentBg });
    svgMount.innerHTML = svg;
    outHash.textContent = `hash: ${hashHex}`;

    if (o.updateUrl){
      updateUrl({ seed: seedText, palette: paletteKey, bars, w: width, h: height, gap, cap: showCaption ? 1 : 0, bg: transparentBg ? 0 : 1 });
    }

    return { svg, hashHex, width, height, paletteKey, bars, seedText, gap, showCaption, transparentBg };
  }

  function renderSoon(){
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => { render({ updateUrl: true }); }, 120);
  }

  // Load state from URL.
  const q = readQueryState();
  if (q.seed != null) elSeed.value = q.seed;
  if (q.palette && PALETTES[q.palette]) elPalette.value = q.palette;
  if (q.bars != null && q.bars !== "") elBars.value = String(q.bars);
  if (q.w != null && q.w !== "") document.getElementById("w").value = String(q.w);
  if (q.h != null && q.h !== "") document.getElementById("h").value = String(q.h);
  if (q.gap != null && q.gap !== "") document.getElementById("gap").value = String(q.gap);
  if (q.cap != null && q.cap !== "") document.getElementById("showCaption").checked = (String(q.cap) !== "0");
  if (q.bg != null && q.bg !== "") document.getElementById("transparentBg").checked = (String(q.bg) === "0");

  document.getElementById("btnGen").addEventListener("click", () => {
    const st = render({ updateUrl: true });
    const list = pushHistory(st);
    renderHistory(list);
  });

  document.getElementById("btnShuffle").addEventListener("click", () => {
    elSeed.value = nowSeed();
    const st = render({ updateUrl: true });
    const list = pushHistory(st);
    renderHistory(list);
  });

  const btnSaveHistory = document.getElementById("btnSaveHistory");
  if (btnSaveHistory){
    btnSaveHistory.addEventListener("click", () => {
      const st = render({ updateUrl: true });
      const list = pushHistory(st);
      renderHistory(list);
    });
  }

  const btnClearHistory = document.getElementById("btnClearHistory");
  if (btnClearHistory){
    btnClearHistory.addEventListener("click", () => {
      const list = clearHistory();
      renderHistory(list);
    });
  }

  document.getElementById("btnCopy").addEventListener("click", async () => {
    const { svg } = render({ updateUrl: true });
    try {
      await copyToClipboard(svg);
    } catch {
      // ignore
      alert("Clipboard indisponible. Utilise 'Telecharger SVG'.");
    }
  });

  document.getElementById("btnLink").addEventListener("click", async () => {
    const st = render({ updateUrl: true });
    const url = buildShareUrl({ seed: st.seedText, palette: st.paletteKey, bars: st.bars, w: st.width, h: st.height, gap: st.gap, cap: st.showCaption ? 1 : 0, bg: st.transparentBg ? 0 : 1 });
    try {
      await copyToClipboard(url);
    } catch {
      alert(url);
    }
  });

  document.getElementById("btnSvg").addEventListener("click", () => {
    const { svg, hashHex } = render({ updateUrl: true });
    downloadText(`mood-barcode-${hashHex}.svg`, svg, "image/svg+xml");
  });

  document.getElementById("btnPng").addEventListener("click", async () => {
    const { svg, hashHex, width, height } = render({ updateUrl: true });
    try {
      const dataUrl = await svgToPngDataUrl(svg, width, height);
      downloadDataUrl(`mood-barcode-${hashHex}.png`, dataUrl);
    } catch {
      alert("PNG failed (browser). Try SVG.");
    }
  });

  // Update on control changes.
  elSeed.addEventListener("input", renderSoon);
  elPalette.addEventListener("change", renderSoon);
  elBars.addEventListener("change", renderSoon);
  document.getElementById("w").addEventListener("input", renderSoon);
  document.getElementById("h").addEventListener("input", renderSoon);
  document.getElementById("gap").addEventListener("input", renderSoon);
  document.getElementById("showCaption").addEventListener("change", renderSoon);
  document.getElementById("transparentBg").addEventListener("change", renderSoon);

  document.getElementById("btnPresetBanner").addEventListener("click", () => {
    document.getElementById("w").value = "900";
    document.getElementById("h").value = "240";
    render({ updateUrl: true });
  });

  document.getElementById("btnPresetSquare").addEventListener("click", () => {
    document.getElementById("w").value = "600";
    document.getElementById("h").value = "600";
    render({ updateUrl: true });
  });

  // Auto-render on load.
  renderHistory(loadHistory());
  render({ updateUrl: true });
}

main();
