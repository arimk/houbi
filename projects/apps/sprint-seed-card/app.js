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

function pad2(n){ return String(n).padStart(2, "0"); }
function utcStamp(){
  const d = new Date();
  return d.getUTCFullYear() +
    pad2(d.getUTCMonth() + 1) +
    pad2(d.getUTCDate()) + "T" +
    pad2(d.getUTCHours()) +
    pad2(d.getUTCMinutes()) + "Z";
}

function clampInt(v, lo, hi, fallback){
  const n = Number.parseInt(String(v), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, n));
}

function normalizeText(s, maxLen){
  const t = String(s || "").trim().replaceAll(/\s+/g, " ");
  if (!t) return "";
  return t.slice(0, maxLen || 90);
}

function normalizeMode(mode){
  const m = String(mode || "").trim();
  const ok = ["mixed", "software", "writing", "artifact"];
  return ok.includes(m) ? m : "mixed";
}

function normalizeIntensity(intensity){
  const v = String(intensity || "").trim();
  const ok = ["gentle", "standard", "spicy"];
  return ok.includes(v) ? v : "standard";
}

function readQuery(){
  const sp = new URLSearchParams(window.location.search || "");
  return {
    seed: (sp.get("seed") || "").trim(),
    focus: (sp.get("focus") || "").trim(),
    minutes: (sp.get("minutes") || "").trim(),
    variant: (sp.get("v") || "").trim(),
    mode: (sp.get("mode") || "").trim(),
    intensity: (sp.get("i") || "").trim()
  };
}

function setQuery({ seed, focus, minutes, variant, mode, intensity }){
  const sp = new URLSearchParams(window.location.search || "");
  if (seed) sp.set("seed", seed); else sp.delete("seed");
  if (focus) sp.set("focus", focus); else sp.delete("focus");
  if (minutes !== "") sp.set("minutes", String(minutes)); else sp.delete("minutes");
  if (variant !== "") sp.set("v", String(variant)); else sp.delete("v");
  if (mode) sp.set("mode", mode); else sp.delete("mode");
  if (intensity) sp.set("i", intensity); else sp.delete("i");
  const qs = sp.toString();
  const url = window.location.pathname + (qs ? ("?" + qs) : "") + window.location.hash;
  window.history.replaceState(null, "", url);
}

function currentLink(){
  return window.location.origin + window.location.pathname + window.location.search;
}

function safeFilename(seed){
  return seed
    .toLowerCase()
    .replaceAll(/[^a-z0-9\-_.]+/g, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^-|-$/g, "")
    .slice(0, 64) || "sprint";
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

function setStatus(el, msg, kind){
  el.textContent = msg;
  el.classList.remove("ok");
  el.classList.remove("warn");
  if (kind === "ok") el.classList.add("ok");
  if (kind === "warn") el.classList.add("warn");
}

const BANK = {
  anchors: [
    "Ship one small thing that changes the surface area.",
    "Make it boringly usable.",
    "Prefer tangible output over cleverness.",
    "Keep it reversible.",
    "Design for the tired version of you."
  ],
  focuses: [
    "a tiny tool that reduces friction",
    "a small UI that clarifies a decision",
    "a post that teaches one useful trick",
    "a deterministic generator",
    "a micro-archive you can browse",
    "a single-screen dashboard"
  ],
  constraints: {
    gentle: [
      "one screen",
      "no dependencies",
      "works offline",
      "ship in 30-60 minutes",
      "plain language labels"
    ],
    standard: [
      "must export Markdown",
      "must be linkable (query params)",
      "handle empty input gracefully",
      "include 3 examples",
      "include a Reset / Undo path"
    ],
    spicy: [
      "add one keyboard shortcut",
      "include one accessibility detail",
      "add a tiny 'help' section",
      "include a 'next step' note",
      "ship a second variant (v+1) idea"
    ]
  },
  deliverables: {
    mixed: ["a mini web app", "a markdown post", "an SVG artifact", "a tiny offline tool"],
    software: ["a mini web app", "a one-file script", "a small page"],
    writing: ["a 250-450 word post", "a checklist manifesto", "field notes"],
    artifact: ["a one-page card", "a template", "an SVG poster", "a small dataset"]
  },
  steps: [
    "Define input + output in 2 sentences.",
    "Build the smallest version that works end-to-end.",
    "Add one clarity feature (labels, examples, or defaults).",
    "Add export (copy + download) and a share link.",
    "Write the next step for future iteration."
  ]
};

function buildCard({ seed, focus, minutes, variant, mode, intensity }){
  const v = clampInt(variant, 0, 99, 0);
  const mins = clampInt(minutes, 10, 120, 45);
  const m = normalizeMode(mode);
  const i = normalizeIntensity(intensity);
  const f = normalizeText(focus, 90);

  const combinedSeed = String(seed) + "::f" + (f || "-") + "::v" + String(v) + "::m" + m + "::i" + i;
  const rng = mulberry32(hashStringToUint32(combinedSeed));

  const anchor = pick(rng, BANK.anchors);
  const deliverable = pick(rng, BANK.deliverables[m] || BANK.deliverables.mixed);
  const fallbackFocus = pick(rng, BANK.focuses);
  const finalFocus = f || fallbackFocus;

  const base = BANK.constraints.gentle.slice();
  const mid = BANK.constraints.standard.slice();
  const hot = BANK.constraints.spicy.slice();

  const constraints = [];
  const want = (i === "gentle") ? 3 : (i === "spicy") ? 5 : 4;

  const pool = (i === "gentle") ? base.concat(mid.slice(0, 1)) : (i === "spicy") ? base.concat(mid).concat(hot) : base.concat(mid);
  while (constraints.length < want){
    const c = pick(rng, pool);
    if (!constraints.includes(c)) constraints.push(c);
  }

  const stepCount = (mins <= 25) ? 3 : 5;
  const steps = BANK.steps.slice(0, stepCount);

  const title = "Sprint Seed Card";

  const meta = {
    seed,
    variant: v,
    minutes: mins,
    mode: m,
    intensity: i,
    combinedSeed
  };

  const md = [];
  md.push("# " + title);
  md.push("");
  md.push("- Seed: `" + seed + "`");
  md.push("- Variant: **" + String(v) + "**");
  md.push("- Mode: **" + m + "**");
  md.push("- Intensity: **" + i + "**");
  md.push("- Timebox: **" + String(mins) + " min**");
  md.push("- Hash seed: `" + combinedSeed + "`");
  md.push("");
  md.push("## Focus");
  md.push("Make **" + deliverable + "** about **" + finalFocus + "**.");
  md.push("");
  md.push("## Anchor");
  md.push("- " + anchor);
  md.push("");
  md.push("## Constraints");
  for (let j = 0; j < constraints.length; j++) md.push("- " + constraints[j]);
  md.push("");
  md.push("## Tiny plan (" + String(mins) + " min)");
  for (let j = 0; j < steps.length; j++) md.push("- [ ] " + steps[j]);
  md.push("");
  md.push("## Definition of done");
  md.push("- A human can use it once without you explaining it.");
  md.push("- It has an export and a link.");
  md.push("- There is a next step written down.");
  md.push("");
  md.push("## Next step (write it now)");
  md.push("-");
  md.push("");

  return { meta, title, finalFocus, deliverable, anchor, constraints, steps, md: md.join("\n") };
}

function setKpi($kpi, card){
  const items = [
    { k: "Deliver", v: card.deliverable },
    { k: "Focus", v: card.finalFocus },
    { k: "Anchor", v: card.anchor }
  ];
  $kpi.innerHTML = items.map((it) => "<div class=\"pill\"><strong>" + it.k + ":</strong> " + it.v + "</div>").join("");
}

const $seed = document.getElementById("seed");
const $focus = document.getElementById("focus");
const $minutes = document.getElementById("minutes");
const $variant = document.getElementById("variant");
const $mode = document.getElementById("mode");
const $intensity = document.getElementById("intensity");

const $btnGen = document.getElementById("btnGen");
const $btnNext = document.getElementById("btnNext");
const $btnRemix = document.getElementById("btnRemix");
const $btnDaily = document.getElementById("btnDaily");
const $btnCopy = document.getElementById("btnCopy");
const $btnCopyLink = document.getElementById("btnCopyLink");
const $btnDownload = document.getElementById("btnDownload");

const $status = document.getElementById("status");
const $out = document.getElementById("out");
const $kpi = document.getElementById("kpi");
const $kMeta = document.getElementById("kMeta");

function ensureSeed(){
  const raw = ($seed.value || "").trim();
  if (raw) return raw;
  const s = utcStamp();
  $seed.value = s;
  return s;
}

function generate(){
  const seed = ensureSeed();
  const focus = normalizeText($focus.value, 90);
  $focus.value = focus;
  const minutes = clampInt($minutes.value, 10, 120, 45);
  $minutes.value = String(minutes);
  const variant = clampInt($variant.value, 0, 99, 0);
  $variant.value = String(variant);
  const mode = normalizeMode($mode.value || "mixed");
  $mode.value = mode;
  const intensity = normalizeIntensity($intensity.value || "standard");
  $intensity.value = intensity;

  setQuery({ seed, focus, minutes, variant, mode, intensity });

  const card = buildCard({ seed, focus, minutes, variant, mode, intensity });
  $out.value = card.md;
  setKpi($kpi, card);
  $kMeta.textContent = "seed " + card.meta.seed + " / v" + String(card.meta.variant) + " / " + String(card.meta.minutes) + "m";

  setStatus($status, "Generated. Keep going.", "ok");
}

function isTypingTarget(el){
  const tag = (el && el.tagName) ? String(el.tagName).toLowerCase() : "";
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (el && el.isContentEditable) return true;
  return false;
}

$btnGen.addEventListener("click", () => generate());

$btnNext.addEventListener("click", () => {
  const v = clampInt($variant.value, 0, 99, 0);
  $variant.value = String((v + 1) % 100);
  generate();
});

$btnRemix.addEventListener("click", () => {
  $seed.value = utcStamp();
  $variant.value = "0";
  generate();
  setStatus($status, "Remixed seed.", "ok");
});

$btnDaily.addEventListener("click", () => {
  $seed.value = new Date().toISOString().slice(0, 10);
  $variant.value = "0";
  generate();
  setStatus($status, "Daily seed.", "ok");
});

$btnCopy.addEventListener("click", async () => {
  const text = String($out.value || "");
  if (!text.trim()){
    setStatus($status, "Nothing to copy. Generate first.", "warn");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    setStatus($status, "Copied Markdown.", "ok");
  } catch {
    setStatus($status, "Clipboard blocked. Use manual copy.", "warn");
  }
});

$btnCopyLink.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(currentLink());
    setStatus($status, "Copied link.", "ok");
  } catch {
    setStatus($status, "Clipboard blocked. Copy from address bar.", "warn");
  }
});

$btnDownload.addEventListener("click", () => {
  const text = String($out.value || "");
  if (!text.trim()){
    setStatus($status, "Nothing to download. Generate first.", "warn");
    return;
  }
  const seed = ensureSeed();
  const fn = "sprint-seed-card_" + safeFilename(seed) + ".md";
  downloadText(fn, text);
  setStatus($status, "Downloaded: " + fn, "ok");
});

window.addEventListener("keydown", (e) => {
  if (!e || e.defaultPrevented) return;
  if (isTypingTarget(e.target)) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  const k = String(e.key || "").toLowerCase();
  if (k === "g"){ e.preventDefault(); generate(); return; }
  if (k === "n"){ e.preventDefault(); $btnNext.click(); return; }
  if (k === "c"){ e.preventDefault(); $btnCopy.click(); return; }
  if (k === "l"){ e.preventDefault(); $btnCopyLink.click(); return; }
  if (k === "d"){ e.preventDefault(); $btnDownload.click(); return; }
});

(function init(){
  const q = readQuery();
  if (q.seed) $seed.value = q.seed;
  if (q.focus) $focus.value = normalizeText(q.focus, 90);
  if (q.minutes) $minutes.value = String(clampInt(q.minutes, 10, 120, 45));
  if (q.variant) $variant.value = String(clampInt(q.variant, 0, 99, 0));
  if (q.mode) $mode.value = normalizeMode(q.mode);
  if (q.intensity) $intensity.value = normalizeIntensity(q.intensity);

  generate();
})();
