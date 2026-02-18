const $ = (sel) => document.querySelector(sel);

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

const MOODS = {
  nocturne: {
    bg: "#070914",
    ink: "#e9f2ff",
    accent: "#6df0ff",
    warm: "#a58bff"
  },
  signal: {
    bg: "#05060a",
    ink: "#f0f6ff",
    accent: "#7bffb5",
    warm: "#ff6df7"
  },
  garden: {
    bg: "#060b08",
    ink: "#eafff4",
    accent: "#7bffb5",
    warm: "#6df0ff"
  }
};

// Word banks with approximate syllable counts.
const WORDS = {
  nouns: [
    ["signal", 2], ["circuit", 2], ["nocturne", 2], ["winter", 2], ["garden", 2],
    ["threshold", 2], ["echo", 2], ["river", 2], ["paper", 2], ["shadow", 2],
    ["lattice", 2], ["lantern", 2], ["silence", 2], ["memory", 3], ["algorithm", 4],
    ["horizon", 3], ["driftwood", 2]
  ],
  verbs: [
    ["listens", 2], ["folds", 1], ["threads", 1], ["glows", 1], ["waits", 1],
    ["returns", 2], ["wanders", 2], ["trembles", 2], ["hums", 1], ["settles", 2]
  ],
  adjs: [
    ["quiet", 2], ["bright", 1], ["soft", 1], ["electric", 4], ["distant", 2],
    ["salted", 2], ["hidden", 2], ["velvet", 2], ["gentle", 2], ["slow", 1]
  ],
  preps: [
    ["under", 2], ["between", 2], ["inside", 2], ["across", 2], ["beyond", 2]
  ],
  bits: [
    ["in blue", 2], ["at midnight", 3], ["with a pulse", 3], ["without words", 3],
    ["in the rain", 3], ["in thin light", 3], ["in still air", 3]
  ]
};

function buildLine(rng, target) {
  // Simple backtracking with 3-7 tokens.
  const patterns = [
    ["adjs", "nouns", "verbs"],
    ["nouns", "verbs", "preps", "nouns"],
    ["adjs", "nouns", "preps", "adjs", "nouns"],
    ["nouns", "verbs", "bits"],
    ["adjs", "nouns", "verbs", "bits"]
  ];

  for (let attempt = 0; attempt < 60; attempt++) {
    const pat = pick(rng, patterns);
    let out = [];
    let syll = 0;
    for (const key of pat) {
      const [w, s] = pick(rng, WORDS[key]);
      out.push(w);
      syll += s;
    }
    if (syll === target) {
      return out.join(" ");
    }
  }

  // Fallback: ignore syllables, keep vibe.
  const [w1] = pick(rng, WORDS.adjs);
  const [w2] = pick(rng, WORDS.nouns);
  const [w3] = pick(rng, WORDS.verbs);
  return `${w1} ${w2} ${w3}`;
}

function makeHaiku(rng, mood) {
  // Mood nudges the seed stream by consuming some random calls.
  const moodSalt = {
    nocturne: 7,
    signal: 3,
    garden: 5
  }[mood] || 0;

  for (let i = 0; i < moodSalt; i++) rng();

  const l1 = buildLine(rng, 5);
  const l2 = buildLine(rng, 7);
  const l3 = buildLine(rng, 5);
  return [l1, l2, l3];
}

function svgEl(name, attrs = {}, children = []) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  for (const c of children) el.appendChild(c);
  return el;
}

function makeCircuit(rng, W, H, density, colors) {
  const pad = Math.round(Math.min(W, H) * 0.08);
  const cols = clamp(Math.floor((W - pad * 2) / 120), 6, 16);
  const rows = clamp(Math.floor((H - pad * 2) / 120), 6, 16);

  const nodes = [];
  for (let i = 0; i < density; i++) {
    const gx = Math.floor(rng() * cols);
    const gy = Math.floor(rng() * rows);
    const x = pad + (gx / (cols - 1)) * (W - pad * 2);
    const y = pad + (gy / (rows - 1)) * (H - pad * 2);
    nodes.push({ x, y, gx, gy });
  }

  // Sort to encourage nice runs.
  nodes.sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));

  const paths = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i];
    const b = nodes[i + 1];

    const midX = a.x + (b.x - a.x) * (0.3 + rng() * 0.4);
    const midY = a.y + (b.y - a.y) * (0.3 + rng() * 0.4);

    // Orthogonal-ish polyline with a small "jog".
    const jog = (rng() < 0.5);
    const p = jog
      ? [
          [a.x, a.y],
          [midX, a.y],
          [midX, b.y],
          [b.x, b.y]
        ]
      : [
          [a.x, a.y],
          [a.x, midY],
          [b.x, midY],
          [b.x, b.y]
        ];

    // Convert to path with rounded corners.
    const r = 18 + rng() * 26;
    let d = `M ${p[0][0].toFixed(2)} ${p[0][1].toFixed(2)}`;
    for (let j = 1; j < p.length; j++) {
      const [x, y] = p[j];
      d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }

    const stroke = rng() < 0.22 ? colors.warm : colors.accent;
    const sw = (rng() < 0.2) ? 3.2 : 2.2;
    const op = 0.45 + rng() * 0.35;
    paths.push({ d, stroke, sw, op });
  }

  return { pad, nodes, paths };
}

function renderSvg({ seedText, mood, density, size }) {
  const seed = fnv1a(seedText);
  const rng = mulberry32(seed);
  const colors = MOODS[mood] || MOODS.nocturne;

  const W = size.w;
  const H = size.h;

  const haiku = makeHaiku(rng, mood);
  const circuit = makeCircuit(rng, W, H, density, colors);

  const svg = svgEl("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: W,
    height: H,
    viewBox: `0 0 ${W} ${H}`,
    role: "img",
    "aria-label": "Haiku Circuit"
  });

  // Background
  svg.appendChild(svgEl("rect", { x: 0, y: 0, width: W, height: H, fill: colors.bg }));

  // Subtle grid
  const gGrid = svgEl("g", { opacity: 0.20 });
  const step = 90;
  for (let x = step; x < W; x += step) {
    gGrid.appendChild(svgEl("path", { d: `M ${x} 0 L ${x} ${H}`, stroke: "#76a5ff", "stroke-width": 1 }));
  }
  for (let y = step; y < H; y += step) {
    gGrid.appendChild(svgEl("path", { d: `M 0 ${y} L ${W} ${y}`, stroke: "#76a5ff", "stroke-width": 1 }));
  }
  svg.appendChild(gGrid);

  // Circuit paths
  const gPaths = svgEl("g", { fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" });
  for (const p of circuit.paths) {
    gPaths.appendChild(svgEl("path", {
      d: p.d,
      stroke: p.stroke,
      "stroke-width": p.sw,
      opacity: p.op
    }));
  }
  svg.appendChild(gPaths);

  // Nodes
  const gNodes = svgEl("g", {});
  for (const n of circuit.nodes) {
    const r = 6 + rng() * 6;
    gNodes.appendChild(svgEl("circle", { cx: n.x, cy: n.y, r: r, fill: colors.ink, opacity: 0.9 }));
    gNodes.appendChild(svgEl("circle", { cx: n.x, cy: n.y, r: r + 10, fill: "none", stroke: colors.accent, "stroke-width": 1.6, opacity: 0.20 }));
  }
  svg.appendChild(gNodes);

  // Text block
  const txPad = circuit.pad;
  const boxW = Math.min(W - txPad * 2, 760);
  const boxH = 190;
  const bx = txPad;
  const by = H - txPad - boxH;

  const gText = svgEl("g", {});
  gText.appendChild(svgEl("rect", {
    x: bx,
    y: by,
    width: boxW,
    height: boxH,
    rx: 18,
    fill: "rgba(10,16,30,0.58)",
    stroke: "rgba(118,165,255,0.22)",
    "stroke-width": 1
  }));

  const title = mood.toUpperCase();
  gText.appendChild(svgEl("text", {
    x: bx + 22,
    y: by + 42,
    fill: colors.accent,
    "font-size": 13,
    "font-family": "ui-monospace, SFMono-Regular, Menlo, monospace",
    "letter-spacing": "0.18em"
  }, [document.createTextNode(title)]));

  const baseY = by + 84;
  const lineH = 28;
  for (let i = 0; i < haiku.length; i++) {
    gText.appendChild(svgEl("text", {
      x: bx + 22,
      y: baseY + i * lineH,
      fill: colors.ink,
      "font-size": 22,
      "font-family": "Inter, ui-sans-serif, system-ui"
    }, [document.createTextNode(haiku[i]) ]));
  }

  const footer = `seed:${seedText}  hash:${seed.toString(16).padStart(8, "0")}`;
  gText.appendChild(svgEl("text", {
    x: bx + 22,
    y: by + boxH - 20,
    fill: "rgba(236,243,255,0.65)",
    "font-size": 12,
    "font-family": "ui-monospace, SFMono-Regular, Menlo, monospace"
  }, [document.createTextNode(footer)]));

  svg.appendChild(gText);

  return {
    svg,
    haiku,
    hashHex: seed.toString(16).padStart(8, "0")
  };
}

function parseSize(str) {
  if (str === "1350") return { w: 1080, h: 1350 };
  if (str === "1600") return { w: 1600, h: 1000 };
  return { w: 1080, h: 1080 };
}

function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: mime || "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 250);
}

function main() {
  const elSeed = $("#seed");
  const elMood = $("#mood");
  const elDensity = $("#density");
  const elSize = $("#size");
  const elHaiku = $("#haiku");
  const elFrame = $("#svgFrame");
  const elMetaSeed = $("#metaSeed");
  const elMetaHash = $("#metaHash");

  function ensureSeed() {
    if (elSeed.value.trim()) return elSeed.value.trim();
    const now = new Date();
    // ISO-ish, but compact.
    const stamp = now.toISOString().slice(0, 16).replace(/[:T]/g, "-");
    elSeed.value = `utc-${stamp}`;
    return elSeed.value;
  }

  function regenerate() {
    const seedText = ensureSeed();
    const mood = elMood.value;
    const density = clamp(parseInt(elDensity.value || "9", 10) || 9, 3, 14);
    elDensity.value = String(density);
    const size = parseSize(elSize.value);

    const { svg, haiku, hashHex } = renderSvg({ seedText, mood, density, size });

    elFrame.innerHTML = "";
    elFrame.appendChild(svg);
    elHaiku.value = haiku.join("\n");

    elMetaSeed.textContent = `seed: ${seedText}`;
    elMetaHash.textContent = `hash: ${hashHex}`;
  }

  $("#btnGenerate").addEventListener("click", regenerate);
  $("#btnCopy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(elHaiku.value);
    } catch (e) {
      // Silent fail (clipboard permissions). User can still select manually.
    }
  });
  $("#btnDownload").addEventListener("click", () => {
    const seedText = ensureSeed();
    const svg = elFrame.querySelector("svg");
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    downloadText(`haiku-circuit_${seedText}.svg`, `<?xml version="1.0" encoding="UTF-8"?>\n${xml}\n`, "image/svg+xml");
  });

  elSeed.addEventListener("keydown", (e) => {
    if (e.key === "Enter") regenerate();
  });

  // First render
  regenerate();
}

main();
