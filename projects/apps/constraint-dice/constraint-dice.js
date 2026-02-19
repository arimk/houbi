function hashStringToUint32(str){
  // FNV-1a 32-bit
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
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

function pick(rng, arr){
  return arr[Math.floor(rng() * arr.length)];
}

function pickN(rng, arr, n){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--){
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a.slice(0, Math.max(0, Math.min(n, a.length)));
}

function pad2(n){ return String(n).padStart(2, "0"); }
function utcStamp(){
  const d = new Date();
  return d.getUTCFullYear() + "-" + pad2(d.getUTCMonth()+1) + "-" + pad2(d.getUTCDate()) +
    "_" + pad2(d.getUTCHours()) + pad2(d.getUTCMinutes()) + pad2(d.getUTCSeconds()) + "Z";
}

function clampInt(v, lo, hi, fallback){
  const n = Number.parseInt(String(v), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, n));
}

const BANK = {
  mediums: {
    mixed: ["software tool", "micro essay", "poem", "poster prompt", "automation script", "data visualization", "mini web app"],
    software: ["CLI", "mini web app", "tiny library", "one-file script", "text transformer", "offline tool"],
    writing: ["micro essay", "short story", "dialog", "list manifesto", "field notes", "fake manual"],
    art: ["poster prompt", "photo series prompt", "album cover prompt", "comic panel prompt", "typography prompt"],
    automation: ["one-file script", "cron idea", "file organizer", "report generator", "data cleaner"],
    dataviz: ["static chart", "SVG poster", "tiny dashboard", "ASCII chart", "data sonification outline"]
  },
  lenses: [
    "make it usable by a tired person",
    "make it reversible / undoable",
    "design for offline-first",
    "turn repetition into ritual",
    "compress complexity into one screen",
    "make it explain itself",
    "make it playful but precise",
    "make it look like a noir terminal"
  ],
  constraints: [
    "no dependencies",
    "single HTML file (or HTML + one JS)",
    "works without network",
    "use a deterministic seed",
    "must export Markdown",
    "must have a 'Reset' button",
    "must include a tiny help section",
    "must handle empty input gracefully",
    "ship a README-like header",
    "must include at least 3 examples"
  ],
  twists: [
    "include a 'failure mode' section",
    "include a tiny glossary",
    "make it bilingual (EN/FR) with minimal UI",
    "add a 'constraints dial' (easy/hard)",
    "add a random name generator",
    "add a 'daily' mode using date seed",
    "use only monochrome styling",
    "generate a second alternative version"
  ],
  deliverables: {
    mixed: ["a working page", "a markdown post", "a small dataset", "a small script", "a template"],
    software: ["a working page", "a single-file script", "a README", "a tiny demo"],
    writing: ["a markdown post", "a printable page", "a set of 12 lines", "a 3-part structure"],
    art: ["a prompt pack", "a printable poster prompt", "a 9-variant grid prompt"],
    automation: ["a script + sample output", "a scheduled plan + script skeleton", "a report template"],
    dataviz: ["an SVG", "a static HTML chart", "an ASCII chart output", "a tiny dataset + chart"]
  },
  topics: [
    "night work rituals",
    "tiny tools that reduce dread",
    "memory and logging",
    "prompts that produce artifacts",
    "calm interfaces",
    "constraints as engines",
    "micro archives",
    "seeded randomness"
  ]
};

function buildBrief({ seed, minutes, mode }){
  const rng = mulberry32(hashStringToUint32(seed));

  const medium = pick(rng, BANK.mediums[mode] || BANK.mediums.mixed);
  const topic = pick(rng, BANK.topics);
  const lens = pick(rng, BANK.lenses);

  const c1 = pick(rng, BANK.constraints);
  const c2 = pick(rng, BANK.constraints);
  const c3 = pick(rng, BANK.constraints);
  const twist = pick(rng, BANK.twists);
  const deliverable = pick(rng, BANK.deliverables[mode] || BANK.deliverables.mixed);

  const steps = [
    "Define the input/output in 2 sentences.",
    "Build the smallest version that works.",
    "Add one 'delight' detail.",
    "Write 3 examples.",
    "Export / save the artifact."
  ];

  const picks = {
    seed,
    minutes,
    mode,
    medium,
    topic,
    lens,
    deliverable,
    constraints: [c1, c2, c3],
    twist
  };

  const md = [
    `# Constraint Dice Brief`,
    ``,
    `- Seed: \`${seed}\``,
    `- Mode: **${mode}**`,
    `- Timebox: **${minutes} min**`,
    `- Timestamp (UTC): \`${new Date().toISOString()}\``,
    ``,
    `## What to make`,
    `Build a **${medium}** about **${topic}**.`,
    ``,
    `## Lens`,
    `- ${lens}`,
    ``,
    `## Constraints (roll)`,
    ...picks.constraints.map((c) => `- ${c}`),
    `- Twist: ${twist}`,
    ``,
    `## Deliverable`,
    `- Ship: ${deliverable}`,
    ``,
    `## Tiny plan (${minutes} min)`,
    ...steps.map((s, i) => `- [ ] ${s}`),
    ``,
    `## Notes`,
    `-`,
    ``,
    `## Examples (fill these)`,
    `1)`,
    `2)`,
    `3)`,
    ``
  ].join("\n");

  return { picks, md };
}

function setStatus(el, msg, kind){
  el.textContent = msg;
  el.classList.remove("ok");
  el.classList.remove("warn");
  if (kind === "ok") el.classList.add("ok");
  if (kind === "warn") el.classList.add("warn");
}

function safeFilename(seed){
  return seed
    .toLowerCase()
    .replaceAll(/[^a-z0-9\-_.]+/g, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^-|-$/g, "")
    .slice(0, 64) || "brief";
}

function downloadText(filename, text){
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const $seed = document.getElementById("seed");
const $minutes = document.getElementById("minutes");
const $mode = document.getElementById("mode");
const $out = document.getElementById("out");
const $kpi = document.getElementById("kpi");
const $status = document.getElementById("status");

const $roll = document.getElementById("roll");
const $remix = document.getElementById("remix");
const $copy = document.getElementById("copy");
const $download = document.getElementById("download");

function setKpi(p){
  const items = [
    { k: "Medium", v: p.medium },
    { k: "Topic", v: p.topic },
    { k: "Deliver", v: p.deliverable }
  ];
  $kpi.innerHTML = items.map((it) => `<div class="pill"><strong>${it.k}:</strong> ${it.v}</div>`).join("");
}

function ensureSeed(){
  const raw = ($seed.value || "").trim();
  if (raw) return raw;
  const s = new Date().toISOString().slice(0, 10);
  $seed.value = s;
  return s;
}

function roll(){
  const seed = ensureSeed();
  const minutes = clampInt($minutes.value, 10, 180, 45);
  $minutes.value = String(minutes);
  const mode = String($mode.value || "mixed");

  const { picks, md } = buildBrief({ seed, minutes, mode });
  $out.value = md;
  setKpi(picks);
  setStatus($status, "Rolled. Build it before the heat fades.", "ok");
}

$roll.addEventListener("click", () => roll());

$remix.addEventListener("click", () => {
  const s = utcStamp();
  $seed.value = s;
  roll();
  setStatus($status, "Remixed seed: " + s, "ok");
});

$copy.addEventListener("click", async () => {
  const text = String($out.value || "");
  if (!text.trim()){
    setStatus($status, "Nothing to copy. Roll a brief first.", "warn");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    setStatus($status, "Copied Markdown to clipboard.", "ok");
  } catch {
    setStatus($status, "Clipboard blocked. Use manual copy.", "warn");
  }
});

$download.addEventListener("click", () => {
  const text = String($out.value || "");
  if (!text.trim()){
    setStatus($status, "Nothing to download. Roll a brief first.", "warn");
    return;
  }
  const seed = ensureSeed();
  const fn = "constraint-dice_" + safeFilename(seed) + ".md";
  downloadText(fn, text);
  setStatus($status, "Downloaded: " + fn, "ok");
});

// initial
roll();
