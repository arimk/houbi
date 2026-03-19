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
function utcSeedNow(){
  const d = new Date();
  return String(d.getUTCFullYear()) + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate()) +
    "T" + pad2(d.getUTCHours()) + pad2(d.getUTCMinutes()) + "Z";
}

function clampInt(v, lo, hi, fallback){
  const n = Number.parseInt(String(v), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, n));
}

function readQuery(){
  const sp = new URLSearchParams(window.location.search || "");
  const seed = (sp.get("seed") || "").trim();
  const minutes = (sp.get("m") || "").trim();
  const variant = (sp.get("v") || "").trim();
  return { seed, minutes, variant };
}

function setQuery({ seed, minutes, variant }){
  const sp = new URLSearchParams(window.location.search || "");
  if (seed) sp.set("seed", seed); else sp.delete("seed");
  if (minutes !== "") sp.set("m", String(minutes)); else sp.delete("m");
  if (variant !== "") sp.set("v", String(variant)); else sp.delete("v");
  const qs = sp.toString();
  const url = window.location.pathname + (qs ? ("?" + qs) : "");
  window.history.replaceState(null, "", url);
}

function currentLink(){
  return window.location.origin + window.location.pathname + window.location.search;
}

const BANK = {
  verbs: ["sketch", "draft", "prototype", "refactor", "simplify", "label", "compress", "map", "collect", "index", "ritualize"],
  nouns: ["a page", "a tiny app", "a checklist", "a prompt", "a timeline", "a glossary", "a seedable generator", "a tiny archive", "a scorecard", "a notebook"],
  themes: ["memory", "friction", "calm", "night work", "constraints", "tiny tools", "offline", "reversibility", "logging", "attention"],
  constraints: [
    "no dependencies",
    "one screen",
    "offline-first",
    "must have a reset or undo path",
    "must have one keyboard shortcut",
    "export as Markdown",
    "handle empty input gracefully",
    "explain itself in 3 lines",
    "make the happy path obvious"
  ],
  delights: [
    "add a single pleasing animation (subtle)",
    "add a one-sentence mantra at the bottom",
    "add one helpful default",
    "add a copy-to-clipboard button",
    "add a shareable URL state",
    "add a tiny 'examples' section"
  ],
  checks: [
    "Is it usable by a tired person?",
    "Is there a clear next action?",
    "Can you undo or reset?",
    "Can it be shared (link or export)?",
    "Is the output a tangible artifact?"
  ]
};

function buildSprint({ seed, minutes, variant }){
  const v = clampInt(variant, 0, 99, 0);
  const m = clampInt(minutes, 10, 180, 30);

  const combined = String(seed || "") + "::v" + String(v) + "::m" + String(m);
  const rng = mulberry32(hashStringToUint32(combined));

  const verb = pick(rng, BANK.verbs);
  const noun = pick(rng, BANK.nouns);
  const themeA = pick(rng, BANK.themes);
  let themeB = pick(rng, BANK.themes);
  if (themeB === themeA) themeB = pick(rng, BANK.themes);

  const c1 = pick(rng, BANK.constraints);
  let c2 = pick(rng, BANK.constraints);
  if (c2 === c1) c2 = pick(rng, BANK.constraints);

  const delight = pick(rng, BANK.delights);

  const steps = [
    "0-5m: Write the smallest input/output in plain language.",
    "5-" + String(Math.max(10, Math.floor(m * 0.55))) + "m: Build the core flow (ugly is fine).",
    "" + String(Math.max(15, Math.floor(m * 0.55))) + "-" + String(Math.max(20, Math.floor(m * 0.85))) + "m: Apply constraints + one delight.",
    "" + String(Math.max(20, Math.floor(m * 0.85))) + "-" + String(m) + "m: Export an artifact + write 3 bullets: what, why, next."
  ];

  const title = "" + verb + " " + noun + " for " + themeA + " + " + themeB;

  const md = [
    "# Seeded Sprint (" + seed + ")",
    "",
    "- Seed: `" + seed + "`",
    "- Variant: **" + String(v) + "**",
    "- Timebox: **" + String(m) + " minutes**",
    "- Hash: `" + combined + "`",
    "",
    "## Make",
    "" + title + ".",
    "",
    "## Constraints",
    "- " + c1,
    "- " + c2,
    "",
    "## One delight",
    "- " + delight,
    "",
    "## Steps",
    "- " + steps.join("\n- "),
    "",
    "## Finish check",
    "- " + BANK.checks.join("\n- "),
    "",
    "## Notes",
    "- What did you ship?",
    "- What would you do next?"
  ].join("\n");

  return {
    seed,
    minutes: m,
    variant: v,
    title,
    constraints: [c1, c2],
    delight,
    md
  };
}

const els = {
  seed: document.getElementById("seed"),
  minutes: document.getElementById("minutes"),
  v: document.getElementById("v"),
  out: document.getElementById("out"),
  kpi: document.getElementById("kpi"),
  status: document.getElementById("status"),
  history: document.getElementById("history"),
  generate: document.getElementById("generate"),
  now: document.getElementById("now"),
  next: document.getElementById("next"),
  copy: document.getElementById("copy"),
  copyLink: document.getElementById("copyLink"),
  save: document.getElementById("save"),
  clear: document.getElementById("clear")
};

const HISTORY_KEY = "houbi_seeded_sprint_studio_history_v1";

function setStatus(msg, kind){
  els.status.textContent = msg;
  els.status.className = "status" + (kind ? (" " + kind) : "");
}

function safeJsonParse(raw){
  try { return JSON.parse(raw); } catch { return null; }
}

function loadHistory(){
  const raw = window.localStorage.getItem(HISTORY_KEY);
  const parsed = raw ? safeJsonParse(raw) : null;
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((x) => x && typeof x === "object");
}

function saveHistory(items){
  try { window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items)); } catch {}
}

function renderHistory(){
  const items = loadHistory();
  els.history.innerHTML = "";
  if (!items.length){
    const li = document.createElement("li");
    li.innerHTML = "<a href=\"#\">No saved sprints yet.</a>";
    li.querySelector("a").addEventListener("click", (e) => e.preventDefault());
    els.history.appendChild(li);
    return;
  }

  for (const it of items){
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "#";
    a.innerHTML = "<div><strong>" + (it.seed || "") + "</strong> <span class=\"meta\">v" + String(it.variant || 0) + " / " + String(it.minutes || 30) + "m</span></div><div class=\"meta\">" + (it.title || "") + "</div>";
    a.addEventListener("click", (e) => {
      e.preventDefault();
      els.seed.value = String(it.seed || "");
      els.minutes.value = String(it.minutes || 30);
      els.v.value = String(it.variant || 0);
      setQuery({ seed: els.seed.value.trim(), minutes: els.minutes.value, variant: els.v.value });
      generate();
      setStatus("Loaded from history.", "ok");
    });
    li.appendChild(a);
    els.history.appendChild(li);
  }
}

function setKpi(p){
  const pills = [
    "<span class=\"pill\"><strong>seed</strong> " + p.seed + "</span>",
    "<span class=\"pill\"><strong>v</strong> " + String(p.variant) + "</span>",
    "<span class=\"pill\"><strong>m</strong> " + String(p.minutes) + "</span>"
  ];
  els.kpi.innerHTML = pills.join("\n");
}

let lastSprint = null;

function generate(){
  const seed = (els.seed.value || "").trim();
  if (!seed){
    setStatus("Seed is required. Try 'Use current UTC'.", "warn");
    return;
  }

  const minutes = els.minutes.value;
  const variant = els.v.value;

  setQuery({ seed, minutes, variant });

  const p = buildSprint({ seed, minutes, variant });
  lastSprint = p;
  setKpi(p);
  els.out.value = p.md;
  setStatus("Generated deterministic sprint.", "ok");
}

async function copyText(text){
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function saveCurrent(){
  if (!lastSprint){
    setStatus("Generate first, then save.", "warn");
    return;
  }

  const items = loadHistory();
  const id = String(lastSprint.seed) + "|" + String(lastSprint.minutes) + "|" + String(lastSprint.variant);
  const deduped = items.filter((it) => String(it.seed) + "|" + String(it.minutes) + "|" + String(it.variant) !== id);
  const entry = {
    seed: lastSprint.seed,
    minutes: lastSprint.minutes,
    variant: lastSprint.variant,
    title: lastSprint.title,
    savedAt: new Date().toISOString()
  };
  const next = [entry].concat(deduped).slice(0, 18);
  saveHistory(next);
  renderHistory();
  setStatus("Saved to history.", "ok");
}

function clearHistory(){
  saveHistory([]);
  renderHistory();
  setStatus("History cleared.", "ok");
}

els.generate.addEventListener("click", generate);
els.now.addEventListener("click", () => {
  els.seed.value = utcSeedNow();
  setStatus("Seed set to current UTC.", "ok");
});
els.next.addEventListener("click", () => {
  els.v.value = String(clampInt(els.v.value, 0, 99, 0) + 1);
  generate();
});
els.copy.addEventListener("click", async () => {
  const ok = await copyText(els.out.value || "");
  setStatus(ok ? "Copied Markdown." : "Copy failed (clipboard blocked).", ok ? "ok" : "warn");
});
els.copyLink.addEventListener("click", async () => {
  const ok = await copyText(currentLink());
  setStatus(ok ? "Copied link." : "Copy failed (clipboard blocked).", ok ? "ok" : "warn");
});
els.save.addEventListener("click", saveCurrent);
els.clear.addEventListener("click", clearHistory);

function isTypingTarget(el){
  if (!el) return false;
  const tag = String(el.tagName || "").toUpperCase();
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (isTypingTarget(document.activeElement)) return;

  const k = String(e.key || "").toLowerCase();
  if (k === "g"){ generate(); }
  if (k === "n"){ els.next.click(); }
  if (k === "c"){ els.copy.click(); }
  if (k === "l"){ els.copyLink.click(); }
  if (k === "s"){ els.save.click(); }
});

(function init(){
  const q = readQuery();
  els.seed.value = q.seed || utcSeedNow();
  if (q.minutes) els.minutes.value = q.minutes;
  if (q.variant) els.v.value = q.variant;
  renderHistory();
  generate();
})();
