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
  return d.getUTCFullYear() + "-" + pad2(d.getUTCMonth()+1) + "-" + pad2(d.getUTCDate()) +
    "_" + pad2(d.getUTCHours()) + pad2(d.getUTCMinutes()) + pad2(d.getUTCSeconds()) + "Z";
}

function clampInt(v, lo, hi, fallback){
  const n = Number.parseInt(String(v), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, n));
}

function normalizeMode(mode){
  const m = String(mode || "").trim();
  const ok = ["mixed", "software", "writing", "art", "automation", "dataviz"];
  return ok.includes(m) ? m : "mixed";
}

function normalizeDifficulty(diff){
  const d = String(diff || "").trim();
  const ok = ["easy", "standard", "hard"];
  return ok.includes(d) ? d : "standard";
}

function normalizeTopic(topic){
  const t = String(topic || "").trim().replaceAll(/\s+/g, " ");
  if (!t) return "";
  return t.slice(0, 80);
}

function readQuery(){
  const sp = new URLSearchParams(window.location.search || "");
  const seed = (sp.get("seed") || "").trim();
  const topic = (sp.get("topic") || "").trim();
  const minutes = (sp.get("minutes") || "").trim();
  const variant = (sp.get("v") || "").trim();
  const batchCount = (sp.get("bn") || "").trim();
  const mode = (sp.get("mode") || "").trim();
  const difficulty = (sp.get("d") || "").trim();
  return { seed, topic, minutes, variant, batchCount, mode, difficulty };
}

function setQuery({ seed, topic, minutes, variant, batchCount, mode, difficulty }){
  const sp = new URLSearchParams(window.location.search || "");
  if (seed) sp.set("seed", seed); else sp.delete("seed");
  if (topic) sp.set("topic", topic); else sp.delete("topic");
  if (minutes !== "") sp.set("minutes", String(minutes)); else sp.delete("minutes");
  if (variant !== "") sp.set("v", String(variant)); else sp.delete("v");
  if (batchCount !== "") sp.set("bn", String(batchCount)); else sp.delete("bn");
  if (mode) sp.set("mode", mode); else sp.delete("mode");
  if (difficulty) sp.set("d", difficulty); else sp.delete("d");
  const qs = sp.toString();
  const url = window.location.pathname + (qs ? ("?" + qs) : "") + window.location.hash;
  window.history.replaceState(null, "", url);
}

function currentLink(){
  return window.location.origin + window.location.pathname + window.location.search;
}

const HISTORY_KEY = "houbi_constraint_dice_history_v1";

function loadHistory(){
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((x) => x && typeof x === "object");
  } catch {
    return [];
  }
}

function saveHistory(items){
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function upsertHistory(entry){
  const items = loadHistory();
  const id = String(entry.seed || "") + "|" + String(entry.topic || "") + "|" + String(entry.minutes || "") + "|" + String(entry.variant || "") + "|" + String(entry.difficulty || "") + "|" + String(entry.mode || "");
  const deduped = items.filter((it) => {
    const itId = String(it.seed || "") + "|" + String(it.topic || "") + "|" + String(it.minutes || "") + "|" + String(it.variant || "") + "|" + String(it.difficulty || "") + "|" + String(it.mode || "");
    return itId !== id;
  });
  const next = [entry].concat(deduped).slice(0, 12);
  saveHistory(next);
  return next;
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
  constraints_easy: [
    "ship the smallest useful version",
    "use plain language labels",
    "one input, one output",
    "keep it on one screen"
  ],
  constraints_hard: [
    "must include an 'Undo' or 'Reset' path",
    "must include keyboard shortcuts",
    "must include one accessibility detail",
    "must include an offline export",
    "must include at least 6 examples"
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

function buildBrief({ seed, topic, variant, minutes, mode, difficulty }){
  const v = clampInt(variant, 0, 99, 0);
  const diff = normalizeDifficulty(difficulty);
  const t = normalizeTopic(topic);
  const combinedSeed = String(seed) + "::t" + (t || "-") + "::v" + String(v) + "::d" + diff;
  const rng = mulberry32(hashStringToUint32(combinedSeed));

  const medium = pick(rng, BANK.mediums[mode] || BANK.mediums.mixed);
  const pickedTopic = pick(rng, BANK.topics);
  const lens = pick(rng, BANK.lenses);
  const deliverable = pick(rng, BANK.deliverables[mode] || BANK.deliverables.mixed);
  const finalTopic = t || pickedTopic;

  const baseConstraints = BANK.constraints.slice();
  if (diff === "easy") baseConstraints.push.apply(baseConstraints, BANK.constraints_easy);
  if (diff === "hard") baseConstraints.push.apply(baseConstraints, BANK.constraints_hard);

  const constraintCount = (diff === "easy") ? 2 : (diff === "hard") ? 4 : 3;
  const twistCount = (diff === "easy") ? 0 : (diff === "hard") ? 2 : 1;

  const constraints = [];
  while (constraints.length < constraintCount){
    const c = pick(rng, baseConstraints);
    if (!constraints.includes(c)) constraints.push(c);
  }

  const twists = [];
  while (twists.length < twistCount){
    const t = pick(rng, BANK.twists);
    if (!twists.includes(t)) twists.push(t);
  }

  const steps = [
    "Define the input/output in 2 sentences.",
    "Build the smallest version that works.",
    "Add one 'delight' detail.",
    "Write examples.",
    "Export / save the artifact."
  ];

  const picks = {
    seed,
    variant: v,
    difficulty: diff,
    combinedSeed,
    minutes,
    mode,
    medium,
    topic: finalTopic,
    lens,
    deliverable,
    constraints,
    twists
  };

  const mdLines = [
    "# Constraint Dice Brief",
    "",
    "- Seed: `" + seed + "`",
    "- Variant: **" + String(v) + "**",
    "- Difficulty: **" + diff + "**",
    "- Hash seed: `" + combinedSeed + "`",
    "- Mode: **" + mode + "**",
    "- Timebox: **" + minutes + " min**",
    "- Timestamp (UTC): `" + new Date().toISOString() + "`",
    "",
    "## What to make",
    "Build a **" + medium + "** about **" + finalTopic + "**.",
    "",
    "## Lens",
    "- " + lens,
    "",
    "## Constraints (roll)"
  ];

  for (let i = 0; i < constraints.length; i++){
    mdLines.push("- " + constraints[i]);
  }

  if (twists.length){
    mdLines.push("- Twists:");
    for (let i = 0; i < twists.length; i++) mdLines.push("  - " + twists[i]);
  }

  mdLines.push(
    "",
    "## Deliverable",
    "- Ship: " + deliverable,
    "",
    "## Tiny plan (" + minutes + " min)",
    "- [ ] " + steps[0],
    "- [ ] " + steps[1],
    "- [ ] " + steps[2],
    "- [ ] " + steps[3],
    "- [ ] " + steps[4],
    "",
    "## Notes",
    "-",
    "",
    "## Examples (fill these)",
    "1)",
    "2)",
    "3)",
    ""
  );

  return { picks, md: mdLines.join("\n") };
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
const $topic = document.getElementById("topic");
const $minutes = document.getElementById("minutes");
const $variant = document.getElementById("variant");
const $batchCount = document.getElementById("batchCount");
const $difficulty = document.getElementById("difficulty");
const $mode = document.getElementById("mode");
const $out = document.getElementById("out");
const $kpi = document.getElementById("kpi");
const $status = document.getElementById("status");

const $roll = document.getElementById("roll");
const $roll3 = document.getElementById("roll3");
const $remix = document.getElementById("remix");
const $daily = document.getElementById("daily");
const $nextVariant = document.getElementById("nextVariant");
const $copy = document.getElementById("copy");
const $copyLink = document.getElementById("copyLink");
const $download = document.getElementById("download");

const $historyList = document.getElementById("historyList");
const $clearHistory = document.getElementById("clearHistory");

const $batchList = document.getElementById("batchList");

const $timerLabel = document.getElementById("timerLabel");
const $btnTimerSet = document.getElementById("btnTimerSet");
const $btnTimerStart = document.getElementById("btnTimerStart");
const $btnTimerPause = document.getElementById("btnTimerPause");
const $btnTimerReset = document.getElementById("btnTimerReset");

let timerInterval = null;
let timerRemainingSec = 0;
let timerRunning = false;

function fmtTimer(sec){
  const s = Math.max(0, clampInt(sec, 0, 24 * 60 * 60, 0));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return String(mm).padStart(2, "0") + ":" + String(ss).padStart(2, "0");
}

function renderTimer(){
  if (!$timerLabel) return;
  $timerLabel.textContent = fmtTimer(timerRemainingSec);
}

function stopTimer(){
  if (timerInterval){
    clearInterval(timerInterval);
    timerInterval = null;
  }
  timerRunning = false;
}

function setTimerFromMinutes(){
  const minutes = clampInt($minutes.value, 10, 180, 45);
  $minutes.value = String(minutes);
  stopTimer();
  timerRemainingSec = minutes * 60;
  renderTimer();
}

function startTimer(){
  if (timerRunning) return;
  if (timerRemainingSec <= 0) setTimerFromMinutes();
  timerRunning = true;
  renderTimer();
  timerInterval = setInterval(() => {
    timerRemainingSec = Math.max(0, timerRemainingSec - 1);
    renderTimer();
    if (timerRemainingSec <= 0){
      stopTimer();
      setStatus($status, "Timebox done. Ship the smallest useful slice.", "ok");
    }
  }, 1000);
}

function pauseTimer(){
  if (!timerRunning) return;
  stopTimer();
  renderTimer();
}

function toggleTimer(){
  if (timerRunning) pauseTimer(); else startTimer();
}

function setKpi(p){
  const items = [
    { k: "Medium", v: p.medium },
    { k: "Topic", v: p.topic },
    { k: "Difficulty", v: p.difficulty },
    { k: "Deliver", v: p.deliverable }
  ];
  $kpi.innerHTML = items.map((it) => "<div class=\"pill\"><strong>" + it.k + ":</strong> " + it.v + "</div>").join("");
}

function ensureSeed(){
  const raw = ($seed.value || "").trim();
  if (raw) return raw;
  const s = new Date().toISOString().slice(0, 10);
  $seed.value = s;
  return s;
}

function renderHistory(items){
  const arr = Array.isArray(items) ? items : [];
  if (!$historyList) return;
  if (!arr.length){
    $historyList.innerHTML = "<li><a href=\"#\"><span class=\"meta\">No history yet. Roll a brief.</span></a></li>";
    return;
  }
  $historyList.innerHTML = arr.map((it) => {
    const seed = String(it.seed || "");
    const topic = normalizeTopic(it.topic);
    const minutes = String(it.minutes || "");
    const variant = String(it.variant || "0");
    const difficulty = normalizeDifficulty(it.difficulty);
    const mode = normalizeMode(it.mode);
    const head = topic ? (seed + " / " + topic) : seed;
    const label = head + "  (" + minutes + "m, v" + variant + ", " + difficulty + ", " + mode + ")";
    const params = { seed, minutes, v: variant, d: difficulty, mode };
    if (topic) params.topic = topic;
    const qs = new URLSearchParams(params).toString();
    return "<li><a href=\"?" + qs + "\">" + label + "</a></li>";
  }).join("");
}

function renderBatch(){
  if (!$batchList) return;

  const seed = ensureSeed();
  const topic = normalizeTopic($topic && $topic.value);
  const minutes = clampInt($minutes.value, 10, 180, 45);
  const baseVariant = clampInt($variant.value, 0, 99, 0);
  const batchCount = $batchCount ? clampInt($batchCount.value, 1, 6, 3) : 3;
  if ($batchCount) $batchCount.value = String(batchCount);
  const difficulty = normalizeDifficulty($difficulty.value || "standard");
  const mode = normalizeMode($mode.value || "mixed");

  const variants = [];
  for (let i = 0; i < batchCount; i++) variants.push((baseVariant + i) % 100);

  $batchList.innerHTML = "";
  for (let i = 0; i < variants.length; i++){
    const v = variants[i];
    const { picks, md } = buildBrief({ seed, topic, variant: v, minutes, difficulty, mode });

    const li = document.createElement("li");

    const box = document.createElement("div");
    box.className = "batchItem";

    const top = document.createElement("div");
    top.className = "batchTop";

    const title = document.createElement("div");
    title.textContent = "Variant v" + String(v) + ": " + String(picks.medium) + " / " + String(picks.topic);

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = String(minutes) + "m, " + String(difficulty) + ", " + String(mode);

    top.appendChild(title);
    top.appendChild(meta);

    const ta = document.createElement("textarea");
    ta.value = md;
    ta.spellcheck = false;
    ta.readOnly = true;

    const row = document.createElement("div");
    row.className = "rowbtn";

    const btnLoad = document.createElement("button");
    btnLoad.type = "button";
    btnLoad.textContent = "Load";
    btnLoad.addEventListener("click", () => {
      $variant.value = String(v);
      roll();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    const btnCopy = document.createElement("button");
    btnCopy.type = "button";
    btnCopy.textContent = "Copy";
    btnCopy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(md);
        setStatus($status, "Copied batch variant v" + String(v) + ".", "ok");
      } catch {
        setStatus($status, "Clipboard blocked. Use manual copy.", "warn");
      }
    });

    const btnLink = document.createElement("button");
    btnLink.type = "button";
    btnLink.textContent = "Copy link";
    btnLink.addEventListener("click", async () => {
      const params = { seed, minutes: String(minutes), v: String(v), d: difficulty, mode };
      if (topic) params.topic = topic;
      const qs = new URLSearchParams(params).toString();
      const link = window.location.origin + window.location.pathname + "?" + qs;
      try {
        await navigator.clipboard.writeText(link);
        setStatus($status, "Copied link for v" + String(v) + ".", "ok");
      } catch {
        setStatus($status, "Clipboard blocked. Copy from address bar.", "warn");
      }
    });

    row.appendChild(btnLoad);
    row.appendChild(btnCopy);
    row.appendChild(btnLink);

    box.appendChild(top);
    box.appendChild(ta);
    box.appendChild(row);

    li.appendChild(box);
    $batchList.appendChild(li);
  }
}

function roll(){
  const seed = ensureSeed();
  const topic = normalizeTopic($topic && $topic.value);
  if ($topic) $topic.value = topic;
  const minutes = clampInt($minutes.value, 10, 180, 45);
  $minutes.value = String(minutes);
  if (!timerRunning) setTimerFromMinutes();
  const variant = clampInt($variant.value, 0, 99, 0);
  $variant.value = String(variant);
  const batchCount = $batchCount ? clampInt($batchCount.value, 1, 6, 3) : 3;
  if ($batchCount) $batchCount.value = String(batchCount);
  const difficulty = normalizeDifficulty($difficulty.value || "standard");
  $difficulty.value = difficulty;
  const mode = normalizeMode($mode.value || "mixed");
  $mode.value = mode;

  setQuery({ seed, topic, minutes, variant, batchCount, difficulty, mode });

  const { picks, md } = buildBrief({ seed, topic, variant, minutes, difficulty, mode });
  $out.value = md;
  setKpi(picks);

  const items = upsertHistory({ seed, topic, minutes, variant, difficulty, mode, ts: Date.now() });
  renderHistory(items);

  renderBatch();
  setStatus($status, "Rolled. Build it before the heat fades.", "ok");
}

$roll.addEventListener("click", () => roll());

if ($roll3){
  $roll3.addEventListener("click", () => {
    roll();
    const el = document.getElementById("batch");
    if (el){
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    const base = clampInt($variant.value, 0, 99, 0);
    const n = $batchCount ? clampInt($batchCount.value, 1, 6, 3) : 3;
    const end = (base + Math.max(0, n - 1)) % 100;
    setStatus($status, "Rolled batch: v" + String(base) + "..v" + String(end) + " (" + String(n) + ").", "ok");
  });
}

$remix.addEventListener("click", () => {
  const s = utcStamp();
  $seed.value = s;
  $variant.value = "0";
  roll();
  setStatus($status, "Remixed seed: " + s, "ok");
});

$daily.addEventListener("click", () => {
  const s = new Date().toISOString().slice(0, 10);
  $seed.value = s;
  $variant.value = "0";
  roll();
  setStatus($status, "Daily seed: " + s, "ok");
});

$nextVariant.addEventListener("click", () => {
  const v = clampInt($variant.value, 0, 99, 0);
  const next = (v + 1) % 100;
  $variant.value = String(next);
  roll();
  setStatus($status, "Variant: " + String(next), "ok");
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

$copyLink.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(currentLink());
    setStatus($status, "Copied link to clipboard.", "ok");
  } catch {
    setStatus($status, "Clipboard blocked. Copy from address bar.", "warn");
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

if ($btnTimerSet) $btnTimerSet.addEventListener("click", () => {
  setTimerFromMinutes();
  setStatus($status, "Timer set.", "ok");
});

if ($btnTimerStart) $btnTimerStart.addEventListener("click", () => {
  startTimer();
  setStatus($status, "Timer started.", "ok");
});

if ($btnTimerPause) $btnTimerPause.addEventListener("click", () => {
  pauseTimer();
  setStatus($status, "Timer paused.", "ok");
});

if ($btnTimerReset) $btnTimerReset.addEventListener("click", () => {
  setTimerFromMinutes();
  setStatus($status, "Timer reset.", "ok");
});

$clearHistory.addEventListener("click", () => {
  saveHistory([]);
  renderHistory([]);
  setStatus($status, "Cleared history.", "ok");
});

function isTypingTarget(el){
  const tag = (el && el.tagName) ? String(el.tagName).toLowerCase() : "";
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (el && el.isContentEditable) return true;
  return false;
}

window.addEventListener("keydown", (e) => {
  if (!e || e.defaultPrevented) return;
  if (isTypingTarget(e.target)) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  const k = String(e.key || "").toLowerCase();
  if (k === "r"){ e.preventDefault(); roll(); return; }
  if (k === "n"){ e.preventDefault(); $nextVariant.click(); return; }
  if (k === "c"){ e.preventDefault(); $copy.click(); return; }
  if (k === "l"){ e.preventDefault(); $copyLink.click(); return; }
  if (k === "d"){ e.preventDefault(); $download.click(); return; }
  if (k === "t"){ e.preventDefault(); toggleTimer(); return; }
});

// initial (hydrate from query)
(function init(){
  const q = readQuery();
  if (q.seed) $seed.value = q.seed;
  if (q.topic && $topic) $topic.value = normalizeTopic(q.topic);
  if (q.minutes) $minutes.value = String(clampInt(q.minutes, 10, 180, 45));
  if (q.variant) $variant.value = String(clampInt(q.variant, 0, 99, 0));
  if (q.batchCount && $batchCount) $batchCount.value = String(clampInt(q.batchCount, 1, 6, 3));
  if (q.difficulty) $difficulty.value = normalizeDifficulty(q.difficulty);
  if (q.mode) $mode.value = normalizeMode(q.mode);

  renderHistory(loadHistory());
  setTimerFromMinutes();
  roll();
})();
