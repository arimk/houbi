const $ = (sel) => document.querySelector(sel);

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function fnv1a32(str){
  // Simple deterministic hash (not crypto). ASCII/UTF-16 safe.
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++){
    h ^= str.charCodeAt(i);
    // h *= 16777619 (with 32-bit overflow)
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
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

function utcNowSeed(){
  const d = new Date();
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const da = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${y}${mo}${da}T${hh}${mm}Z`;
}

function palettes(){
  return {
    night: { bg: '#070A16', ink: '#EAF2FF', accent: '#6DF0FF', accent2: '#8C63FF', grid: 'rgba(120,165,255,.18)' },
    paper: { bg: '#F6F2E9', ink: '#161821', accent: '#1A74FF', accent2: '#FF3D7F', grid: 'rgba(20,25,35,.18)' },
    ember: { bg: '#12070A', ink: '#FFE8EA', accent: '#FF7A2A', accent2: '#FF3D7F', grid: 'rgba(255,160,120,.16)' },
    mint: { bg: '#061311', ink: '#E7FFF6', accent: '#38F2A5', accent2: '#6DF0FF', grid: 'rgba(110,255,220,.16)' },
  };
}

function esc(s){
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildSvg({ seed, line, paletteKey, w, h }){
  const pal = palettes()[paletteKey] || palettes().night;
  const base = `${seed}|${line}|${paletteKey}|${w}x${h}`;
  const hash = fnv1a32(base);
  const rand = mulberry32(hash);

  const pad = Math.round(Math.min(w, h) * 0.06);
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  // Pattern: a set of curved "signal" strokes + dots.
  const strokes = clamp(Math.floor(10 + rand() * 18), 10, 28);
  const dots = clamp(Math.floor(60 + rand() * 120), 60, 220);

  const gridStep = Math.round(Math.max(18, Math.min(60, Math.min(w, h) / 16)));

  let paths = '';
  for (let i = 0; i < strokes; i++){
    const x0 = pad + rand() * innerW;
    const y0 = pad + rand() * innerH;
    const x1 = pad + rand() * innerW;
    const y1 = pad + rand() * innerH;

    const cx0 = pad + rand() * innerW;
    const cy0 = pad + rand() * innerH;
    const cx1 = pad + rand() * innerW;
    const cy1 = pad + rand() * innerH;

    const sw = 1 + rand() * 2.6;
    const a = 0.10 + rand() * 0.24;
    const useAccent = rand() < 0.35;
    const stroke = useAccent ? pal.accent : pal.ink;

    paths += `<path d="M ${x0.toFixed(1)} ${y0.toFixed(1)} C ${cx0.toFixed(1)} ${cy0.toFixed(1)}, ${cx1.toFixed(1)} ${cy1.toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}" stroke="${stroke}" stroke-opacity="${a.toFixed(3)}" stroke-width="${sw.toFixed(2)}" fill="none" stroke-linecap="round" />`;
  }

  let dotEls = '';
  for (let i = 0; i < dots; i++){
    const x = pad + rand() * innerW;
    const y = pad + rand() * innerH;
    const r = 0.7 + rand() * 2.0;
    const a = 0.05 + rand() * 0.18;
    const fill = (rand() < 0.18) ? pal.accent2 : pal.ink;
    dotEls += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${fill}" fill-opacity="${a.toFixed(3)}" />`;
  }

  // "Stamp" corner block
  const stampW = Math.round(Math.min(w, h) * 0.18);
  const stampH = Math.round(stampW * 0.78);
  const stampX = w - pad - stampW;
  const stampY = pad;

  const title = (line || 'six-hour postcard').slice(0, 80);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n` +
`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Six-Hour Postcard">\n` +
`  <defs>\n` +
`    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">\n` +
`      <stop offset="0" stop-color="${pal.bg}" />\n` +
`      <stop offset="1" stop-color="${pal.bg}" />\n` +
`    </linearGradient>\n` +
`    <pattern id="grid" width="${gridStep}" height="${gridStep}" patternUnits="userSpaceOnUse">\n` +
`      <path d="M ${gridStep} 0 L 0 0 0 ${gridStep}" fill="none" stroke="${pal.grid}" stroke-width="1"/>\n` +
`    </pattern>\n` +
`  </defs>\n` +
`  <rect x="0" y="0" width="${w}" height="${h}" fill="url(#bg)"/>\n` +
`  <rect x="0" y="0" width="${w}" height="${h}" fill="url(#grid)" opacity="0.55"/>\n` +
`  <rect x="${pad}" y="${pad}" width="${innerW}" height="${innerH}" rx="22" fill="none" stroke="${pal.ink}" stroke-opacity="0.20"/>\n` +
`  <g>${paths}${dotEls}</g>\n` +
`  <g>\n` +
`    <rect x="${stampX}" y="${stampY}" width="${stampW}" height="${stampH}" rx="14" fill="${pal.ink}" fill-opacity="0.06" stroke="${pal.ink}" stroke-opacity="0.24"/>\n` +
`    <circle cx="${(stampX + stampW * 0.28).toFixed(1)}" cy="${(stampY + stampH * 0.36).toFixed(1)}" r="${Math.max(6, Math.round(stampW * 0.10))}" fill="${pal.accent}" fill-opacity="0.65"/>\n` +
`    <circle cx="${(stampX + stampW * 0.62).toFixed(1)}" cy="${(stampY + stampH * 0.58).toFixed(1)}" r="${Math.max(5, Math.round(stampW * 0.085))}" fill="${pal.accent2}" fill-opacity="0.55"/>\n` +
`  </g>\n` +
`  <g font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="${pal.ink}">\n` +
`    <text x="${pad}" y="${h - pad - 34}" font-size="16" opacity="0.92">${esc(seed)}</text>\n` +
`    <text x="${pad}" y="${h - pad - 14}" font-size="18" opacity="0.96">${esc(title)}</text>\n` +
`    <text x="${w - pad}" y="${h - pad - 14}" font-size="12" opacity="0.65" text-anchor="end">hash ${hash.toString(16).padStart(8,'0')}</text>\n` +
`  </g>\n` +
`</svg>\n`;

  return { svg, hash };
}

function parseSize(v){
  const m = String(v || '').match(/^(\d+)x(\d+)$/);
  if (!m) return { w: 960, h: 540 };
  return { w: clamp(parseInt(m[1], 10), 320, 2200), h: clamp(parseInt(m[2], 10), 320, 2200) };
}

function setUrlFromState({ seed, line, palette, size }){
  const u = new URL(window.location.href);
  if (seed) u.searchParams.set('seed', seed); else u.searchParams.delete('seed');
  if (line) u.searchParams.set('line', line); else u.searchParams.delete('line');
  if (palette) u.searchParams.set('p', palette); else u.searchParams.delete('p');
  if (size) u.searchParams.set('s', size); else u.searchParams.delete('s');
  history.replaceState({}, '', u.toString());
}

function getStateFromUrl(){
  const u = new URL(window.location.href);
  return {
    seed: u.searchParams.get('seed') || '',
    line: u.searchParams.get('line') || '',
    palette: u.searchParams.get('p') || 'night',
    size: u.searchParams.get('s') || '960x540',
  };
}

function copyText(txt){
  return navigator.clipboard.writeText(txt);
}

function downloadText(filename, text){
  const blob = new Blob([text], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function main(){
  const els = {
    seed: $('#seed'),
    line: $('#line'),
    palette: $('#palette'),
    size: $('#size'),
    btnGen: $('#btnGen'),
    btnNow: $('#btnNow'),
    btnCopy: $('#btnCopy'),
    btnLink: $('#btnLink'),
    btnDownload: $('#btnDownload'),
    mount: $('#mount'),
    out: $('#out'),
    kSeed: $('#kSeed'),
    kHash: $('#kHash'),
  };

  const init = getStateFromUrl();
  els.seed.value = init.seed || '20260409T1023Z';
  els.line.value = init.line || 'shipped a small thing';
  els.palette.value = init.palette;
  els.size.value = init.size;

  let last = { svg: '', hash: 0 };

  function generate(){
    const seed = (els.seed.value || '').trim() || utcNowSeed();
    const line = (els.line.value || '').trim();
    const paletteKey = els.palette.value;
    const size = els.size.value;
    const { w, h } = parseSize(size);

    const res = buildSvg({ seed, line, paletteKey, w, h });
    last = res;

    els.mount.innerHTML = res.svg;
    els.out.value = res.svg;
    els.kSeed.textContent = `seed: ${seed}`;
    els.kHash.textContent = `hash: ${res.hash.toString(16).padStart(8,'0')}`;

    setUrlFromState({ seed, line, palette: paletteKey, size });
  }

  els.btnGen.addEventListener('click', generate);
  els.btnNow.addEventListener('click', () => { els.seed.value = utcNowSeed(); generate(); });

  els.btnCopy.addEventListener('click', async () => {
    try{
      if (!last.svg) generate();
      await copyText(last.svg);
      els.btnCopy.textContent = 'Copied';
      setTimeout(() => els.btnCopy.textContent = 'Copy SVG', 900);
    }catch(e){
      alert('Copy failed. Your browser may block clipboard access.');
    }
  });

  els.btnLink.addEventListener('click', async () => {
    try{
      const url = window.location.href;
      await copyText(url);
      els.btnLink.textContent = 'Copied';
      setTimeout(() => els.btnLink.textContent = 'Copy link', 900);
    }catch(e){
      alert('Copy failed.');
    }
  });

  els.btnDownload.addEventListener('click', () => {
    if (!last.svg) generate();
    const seed = (els.seed.value || '').trim() || 'seed';
    const fname = `sixhour-postcard-${seed}.svg`;
    downloadText(fname, last.svg);
  });

  // Generate once on load.
  generate();
}

main();
