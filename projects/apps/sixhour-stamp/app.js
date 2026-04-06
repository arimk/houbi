const $ = (sel) => document.querySelector(sel);

function xfnv1a(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function utcNowTs() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const mo = pad2(d.getUTCMonth() + 1);
  const da = pad2(d.getUTCDate());
  const hh = pad2(d.getUTCHours());
  const mm = pad2(d.getUTCMinutes());
  return `${y}${mo}${da}T${hh}${mm}Z`;
}

function escapeXml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function pickPalette(style) {
  if (style === "neon") {
    return {
      bg0: "#05060a",
      bg1: "#0b0f1a",
      ink: "#eaf2ff",
      ink2: "#9ab0d7",
      a: "#6df0ff",
      b: "#a58bff",
      c: "#4dffb5",
      paper: "rgba(10,16,32,0.75)",
    };
  }
  if (style === "mono") {
    return {
      bg0: "#0b0b0c",
      bg1: "#141417",
      ink: "#f3f3f4",
      ink2: "#c6c6ca",
      a: "#f3f3f4",
      b: "#c6c6ca",
      c: "#8a8a90",
      paper: "rgba(18,18,20,0.75)",
    };
  }
  return {
    bg0: "#05060a",
    bg1: "#0b0f1a",
    ink: "#ecf3ff",
    ink2: "#9ab0d7",
    a: "#6df0ff",
    b: "#a58bff",
    c: "#ffd56d",
    paper: "rgba(14,21,38,0.78)",
  };
}

function buildStampSvg({ seed, note, style, size }) {
  const pal = pickPalette(style);
  const hash = xfnv1a(`${seed}|${note}|${style}|${size}`);
  const rnd = mulberry32(hash);

  const W = Number(size) || 720;
  const H = Math.round(W * 0.56);

  const r = Math.round(W * 0.045);
  const pad = Math.round(W * 0.06);

  const ringW = clamp(Math.round(W * (0.012 + rnd() * 0.018)), 7, 22);
  const noiseN = 40 + Math.floor(rnd() * 40);

  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(W, H) * (0.36 + rnd() * 0.04);

  const topText = seed;
  const bottomText = note ? note : "creative sprint";

  const arcFlip = rnd() > 0.5 ? 1 : 0;
  const tilt = (rnd() - 0.5) * 4.2;

  const bars = 22 + Math.floor(rnd() * 20);
  const barMax = Math.round(W * 0.09);

  let barEls = "";
  for (let i = 0; i < bars; i++) {
    const x = pad + (i / (bars - 1)) * (W - pad * 2);
    const h = Math.round(8 + rnd() * barMax);
    const y0 = H - pad - h;
    const w = 2 + Math.floor(rnd() * 5);
    const alpha = 0.22 + rnd() * 0.38;
    const col = rnd() < 0.34 ? pal.a : rnd() < 0.67 ? pal.b : pal.c;
    barEls += `<rect x="${x.toFixed(1)}" y="${y0}" width="${w}" height="${h}" rx="1" fill="${col}" opacity="${alpha.toFixed(3)}" />`;
  }

  let speck = "";
  for (let i = 0; i < noiseN; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const rr = 0.5 + rnd() * 1.8;
    const a = 0.08 + rnd() * 0.12;
    speck += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rr.toFixed(2)}" fill="${pal.ink}" opacity="${a.toFixed(3)}" />`;
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n` +
`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Sixhour Stamp ${escapeXml(seed)}">\n` +
`  <defs>\n` +
`    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">\n` +
`      <stop offset="0" stop-color="${pal.bg0}"/>\n` +
`      <stop offset="1" stop-color="${pal.bg1}"/>\n` +
`    </linearGradient>\n` +
`    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">\n` +
`      <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" result="b"/>\n` +
`      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>\n` +
`    </filter>\n` +
`    <path id="arcTop" d="M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}" />\n` +
`    <path id="arcBot" d="M ${cx + R} ${cy} A ${R} ${R} 0 0 1 ${cx - R} ${cy}" />\n` +
`  </defs>\n` +
`  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#bg)"/>\n` +
`  <g transform="rotate(${tilt.toFixed(2)} ${cx} ${cy})">\n` +
`    <rect x="${pad}" y="${pad}" width="${W - pad * 2}" height="${H - pad * 2}" rx="${r}" fill="${pal.paper}" stroke="${pal.ink2}" stroke-opacity="0.28"/>\n` +
`    <g opacity="0.96" filter="url(#soft)">\n` +
`      <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${pal.ink}" stroke-opacity="0.90" stroke-width="${ringW}"/>\n` +
`      <circle cx="${cx}" cy="${cy}" r="${(R * 0.78).toFixed(2)}" fill="none" stroke="${pal.ink2}" stroke-opacity="0.34" stroke-width="${Math.max(2, Math.round(ringW * 0.32))}"/>\n` +
`    </g>\n` +
`    <g font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="${pal.ink}">\n` +
`      <text font-size="${Math.round(W * 0.042)}" letter-spacing="2" opacity="0.98">\n` +
`        <textPath href="#arcTop" startOffset="50%" text-anchor="middle">${escapeXml(arcFlip ? bottomText.toUpperCase() : topText)}</textPath>\n` +
`      </text>\n` +
`      <text font-size="${Math.round(W * 0.034)}" letter-spacing="1" opacity="0.90">\n` +
`        <textPath href="#arcBot" startOffset="50%" text-anchor="middle">${escapeXml(arcFlip ? topText : bottomText.toUpperCase())}</textPath>\n` +
`      </text>\n` +
`    </g>\n` +
`    <g>${barEls}</g>\n` +
`    <g opacity="0.95">${speck}</g>\n` +
`    <text x="${pad}" y="${H - pad}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="${Math.round(W * 0.024)}" fill="${pal.ink2}" opacity="0.85">hash ${hash.toString(16)}</text>\n` +
`  </g>\n` +
`</svg>\n`;

  return { svg, hash: hash.toString(16) };
}

function setStatus(msg) {
  const el = $("#kHash");
  el.textContent = `hash: ${msg}`;
}

function toQuery(obj) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const s = String(v);
    if (!s) continue;
    p.set(k, s);
  }
  return p.toString();
}

function fromQuery() {
  const u = new URL(window.location.href);
  const p = u.searchParams;
  return {
    seed: p.get("seed") || "",
    note: p.get("note") || "",
    style: p.get("style") || "ink",
    size: p.get("size") || "720",
  };
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(filename, blob);
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function svgToPngBlob(svgText, width, height) {
  const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const img = new Image();
    const p = new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load SVG into Image"));
    });
    img.src = url;
    await p;

    const w = Number(width) || img.naturalWidth || 720;
    const h = Number(height) || img.naturalHeight || 400;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    const pngBlob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/png");
    });

    if (!pngBlob) throw new Error("Failed to encode PNG");
    return pngBlob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function render() {
  const seed = $("#seed").value.trim();
  const note = $("#note").value.trim();
  const style = $("#style").value;
  const size = $("#size").value;

  if (!seed) {
    $("#mount").innerHTML = "<div class=\"hint\">Enter a seed to generate a stamp.</div>";
    $("#outSvg").value = "";
    $("#kSeed").textContent = "seed: -";
    setStatus("-");
    return;
  }

  const { svg, hash } = buildStampSvg({ seed, note, style, size });
  $("#mount").innerHTML = svg;
  $("#outSvg").value = svg;
  $("#kSeed").textContent = `seed: ${seed}`;
  setStatus(hash);
}

function init() {
  const q = fromQuery();
  $("#seed").value = q.seed || utcNowTs();
  $("#note").value = q.note || "";
  $("#style").value = q.style || "ink";
  $("#size").value = q.size || "720";

  $("#btnGen").addEventListener("click", render);

  $("#btnNow").addEventListener("click", async () => {
    $("#seed").value = utcNowTs();
    render();
  });

  $("#btnCopySvg").addEventListener("click", async () => {
    const t = $("#outSvg").value;
    if (!t.trim()) return;
    await copyText(t);
  });

  $("#btnDownload").addEventListener("click", () => {
    const t = $("#outSvg").value;
    const seed = $("#seed").value.trim() || "stamp";
    if (!t.trim()) return;
    downloadText(`sixhour-stamp-${seed}.svg`, t);
  });

  $("#btnDownloadPng").addEventListener("click", async () => {
    const svgText = $("#outSvg").value;
    const seed = $("#seed").value.trim() || "stamp";
    const size = $("#size").value;
    if (!svgText.trim()) return;

    try {
      setStatus("rendering png...");
      const W = Number(size) || 720;
      const H = Math.round(W * 0.56);
      const pngBlob = await svgToPngBlob(svgText, W, H);
      downloadBlob(`sixhour-stamp-${seed}.png`, pngBlob);
      render();
    } catch (e) {
      setStatus(String(e && e.message ? e.message : e));
    }
  });

  $("#btnLink").addEventListener("click", async () => {
    const seed = $("#seed").value.trim();
    const note = $("#note").value.trim();
    const style = $("#style").value;
    const size = $("#size").value;
    const q = toQuery({ seed, note, style, size });
    const u = new URL(window.location.href);
    u.search = q ? `?${q}` : "";
    await copyText(u.toString());
  });

  // Auto-render on first load.
  render();
}

init();
