// Open Question Dial
// Deterministic open questions from (topic + seed + variant + tone).
// Now supports pinning questions (stored in localStorage by hash).
// Plus local History (saved states).
// ASCII only.

const THEME_KEY = "oqd_theme"; // auto|light|dark

function getPreferredTheme(){
  const saved = String(localStorage.getItem(THEME_KEY) || "auto");
  if (saved === "light" || saved === "dark") return saved;
  return "auto";
}

function resolveTheme(mode){
  if (mode === "light" || mode === "dark") return mode;
  try{
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  }catch{
    return "light";
  }
}

function applyTheme(mode){
  const root = document.documentElement;
  const resolved = resolveTheme(mode);
  if (resolved === "dark") root.setAttribute("data-theme", "dark");
  else root.removeAttribute("data-theme");
  const btn = document.getElementById("btnTheme");
  if (btn){
    btn.textContent = "Theme: " + mode;
  }
}

function cycleTheme(mode){
  if (mode === "auto") return "light";
  if (mode === "light") return "dark";
  return "auto";
}

function fnv1a32(str){
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function xorshift32(seed){
  let x = seed >>> 0;
  return () => {
    x ^= (x << 13) >>> 0;
    x ^= (x >>> 17) >>> 0;
    x ^= (x << 5) >>> 0;
    return x >>> 0;
  };
}

function u32ToHex(u){
  return (u >>> 0).toString(16).padStart(8, "0");
}

function clampInt(v, lo, hi, fallback){
  const n = Number.parseInt(String(v), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, n));
}

function escapeHtml(s){
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
}

function highlightHtml(text, q){
  const t = String(text || "");
  const needle = String(q || "").trim().toLowerCase();
  if (!needle) return escapeHtml(t);
  const low = t.toLowerCase();
  let i = 0;
  let out = "";
  while (i < t.length){
    const j = low.indexOf(needle, i);
    if (j === -1){
      out += escapeHtml(t.slice(i));
      break;
    }
    out += escapeHtml(t.slice(i, j));
    out += "<mark>" + escapeHtml(t.slice(j, j + needle.length)) + "</mark>";
    i = j + needle.length;
  }
  return out;
}

function parsePinsParam(raw, maxCount){
  const txt = String(raw || "").trim();
  if (!txt) return [];
  const parts = txt.split(",");
  const out = [];
  const seen = new Set();
  const lim = clampInt(maxCount, 0, 256, 32);
  for (const p of parts){
    const n = Number.parseInt(String(p || "").trim(), 10);
    if (!Number.isFinite(n)) continue;
    if (n < 0 || n > 255) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
    if (out.length >= lim) break;
  }
  out.sort((a,b) => a - b);
  return out;
}

function nowUtcCompact(){
  // YYYYMMDDTHHMMZ
  const d = new Date();
  const pad2 = (n) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear() +
    pad2(d.getUTCMonth() + 1) +
    pad2(d.getUTCDate()) +
    "T" +
    pad2(d.getUTCHours()) +
    pad2(d.getUTCMinutes()) +
    "Z"
  );
}

function nowUtcSixHourSeed(){
  // Floor UTC time to a 6-hour bucket, minutes=00.
  // Output: YYYYMMDDTHH00Z
  const d = new Date();
  const pad2 = (n) => String(n).padStart(2, "0");
  const h = d.getUTCHours();
  const hh = h - (h % 6);
  return (
    d.getUTCFullYear() +
    pad2(d.getUTCMonth() + 1) +
    pad2(d.getUTCDate()) +
    "T" +
    pad2(hh) +
    "00" +
    "Z"
  );
}

function pick(rng, arr){
  return arr[Math.floor((rng() / 4294967296) * arr.length)];
}

function shuffleInPlace(rng, arr){
  for (let i = arr.length - 1; i > 0; i--){
    const j = Math.floor((rng() / 4294967296) * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
}

const BANK = {
  openers: [
    "What would change if",
    "What happens when",
    "Where does",
    "How do you know when",
    "Which part of",
    "What is the smallest version of",
    "What do we lose if",
    "What would it look like to",
    "What is the hidden cost of",
    "What is the simplest test for"
  ],
  frames: {
    gentle: [
      "in a way that feels calm?",
      "without forcing it?",
      "while keeping the human in the loop?",
      "without making it fragile?",
      "and still keep it playful?"
    ],
    sharp: [
      "without excuses?",
      "if you had to ship today?",
      "and what would you cut first?",
      "and what is the one constraint that matters?",
      "and what would you stop doing?"
    ],
    noir: [
      "when the lights are low?",
      "and nobody is watching?",
      "in the alley behind the obvious answer?",
      "when the system lies to you?",
      "when the ritual becomes a trap?"
    ],
    systems: [
      "in the feedback loops?",
      "in the incentives?",
      "in the failure modes?",
      "in the interface between parts?",
      "in the long tail?"
    ]
  },
  lenses: [
    "time",
    "attention",
    "trust",
    "memory",
    "friction",
    "delight",
    "reversibility",
    "constraints",
    "rituals",
    "ownership"
  ],
  verbs: [
    "shape",
    "measure",
    "name",
    "reduce",
    "increase",
    "protect",
    "surface",
    "compress",
    "sequence",
    "make visible"
  ],
  followUps: {
    base: [
      "What is the smallest experiment that would answer it?",
      "What would have to be true for the opposite to be better?",
      "Which assumption is doing the most work here?",
      "What would you do if you could not use your usual tool?",
      "What part of this is reversible, and what is not?",
      "What is the constraint you are pretending you do not have?",
      "What is the most boring version that still works?",
      "What would you remove first, and why?",
      "What would you measure in 7 days to know you are right?",
      "What would make this feel 10 percent lighter?"
    ],
    gentle: [
      "What would make this feel safe enough to try?",
      "Where can you add a little kindness without adding fragility?",
      "What would be a good enough first draft?"
    ],
    sharp: [
      "What would you do if you had to ship in 24 hours?",
      "What is the decision you are delaying?",
      "What would you stop doing today to make room for this?"
    ],
    noir: [
      "Who benefits if you never answer this?",
      "What is the story you tell yourself to stay stuck?",
      "Where is the shadow cost hiding?"
    ],
    systems: [
      "Which feedback loop would amplify the outcome?",
      "What incentive would make the wrong behavior inevitable?",
      "Where is the coupling that will bite you later?"
    ]
  }
};

function buildQuestions({ topic, seed, variant, tone, count }){
  const t = String(topic || "").trim();
  const s = String(seed || "").trim();
  const v = clampInt(variant, 0, 99, 0);
  const toneKey = String(tone || "gentle");
  const n = clampInt(count, 3, 24, 9);

  const key = t + "::" + s + "::v" + String(v) + "::" + toneKey;
  const hash = fnv1a32(key);
  const rng = xorshift32(hash ^ 0x9e3779b9);

  const frames = BANK.frames[toneKey] || BANK.frames.gentle;

  const out = [];

  // Pre-shuffle lenses and verbs so the list feels coherent but varied.
  const lenses = BANK.lenses.slice();
  const verbs = BANK.verbs.slice();
  shuffleInPlace(rng, lenses);
  shuffleInPlace(rng, verbs);

  for (let i = 0; i < n; i++){
    const opener = pick(rng, BANK.openers);
    const frame = pick(rng, frames);
    const lens = lenses[i % lenses.length];
    const verb = verbs[i % verbs.length];

    const subject = t || "this";

    const q = `${opener} you ${verb} ${subject} through the lens of ${lens} ${frame}`;
    out.push(q);
  }

  return { questions: out, hashHex: u32ToHex(hash), key };
}

function buildFollowUps(st, idx){
  const hashHex = String((st && st.hashHex) || "");
  const toneKey = String((st && st.tone) || "gentle");
  const q = String((st && st.questions && st.questions[idx | 0]) || "").trim();
  const topic = String((st && st.topic) || "").trim();

  const seedStr = hashHex + "::fu::" + String(idx | 0) + "::" + toneKey;
  const seed = fnv1a32(seedStr);
  const rng = xorshift32(seed ^ 0xa5a5a5a5);

  const base = (BANK.followUps && BANK.followUps.base) ? BANK.followUps.base.slice() : [];
  const tone = (BANK.followUps && BANK.followUps[toneKey]) ? BANK.followUps[toneKey].slice() : [];

  const pool = base.concat(tone);
  if (!pool.length) return [];

  // Deterministic pick without repeats.
  const out = [];
  const seen = new Set();
  const want = 5;
  for (let tries = 0; tries < 64 && out.length < want; tries++){
    const t = pick(rng, pool);
    const txt = String(t || "").trim();
    if (!txt) continue;
    if (seen.has(txt)) continue;
    seen.add(txt);
    out.push(txt);
  }

  // Lightly contextualize the first follow-up.
  if (out.length && (q || topic)){
    const lead = q ? q : topic;
    out[0] = out[0] + " (" + lead.slice(0, 80) + (lead.length > 80 ? "..." : "") + ")";
  }

  return out;
}

function readQuery(){
  const p = new URLSearchParams(window.location.search || "");
  return {
    topic: p.get("topic") || "",
    seed: p.get("seed") || "",
    v: p.get("v") || "0",
    tone: p.get("tone") || "gentle",
    n: p.get("n") || "9",
    pins: p.get("pins") || ""
  };
}

function setQuery({ topic, seed, v, tone, n, pins }){
  const p = new URLSearchParams();
  if (topic) p.set("topic", topic);
  if (seed) p.set("seed", seed);
  p.set("v", String(v));
  p.set("tone", tone);
  p.set("n", String(n));
  const pinTxt = String(pins || "").trim();
  if (pinTxt) p.set("pins", pinTxt);
  const qs = p.toString();
  const url = window.location.pathname + (qs ? ("?" + qs) : "");
  window.history.replaceState(null, "", url);
}

function makeLink({ topic, seed, v, tone, n, pins }){
  const p = new URLSearchParams();
  if (topic) p.set("topic", topic);
  if (seed) p.set("seed", seed);
  p.set("v", String(v));
  p.set("tone", tone);
  p.set("n", String(n));
  const pinTxt = String(pins || "").trim();
  if (pinTxt) p.set("pins", pinTxt);
  const qs = p.toString();
  return window.location.origin + window.location.pathname + (qs ? ("?" + qs) : "");
}

function currentLink(){
  return window.location.origin + window.location.pathname + window.location.search;
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

function listOqdKeys(){
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i);
      if (!k) continue;
      if (String(k).startsWith("oqd:")) out.push(String(k));
    }
  } catch {
    return [];
  }
  out.sort();
  return out;
}

function exportBackup(){
  const keys = listOqdKeys();
  const data = { version: 1, exportedUtc: nowUtcCompact(), kv: {} };
  for (const k of keys){
    try {
      data.kv[k] = String(localStorage.getItem(k) || "");
    } catch {
      // ignore
    }
  }
  return data;
}

function clearOqdData(){
  const keys = listOqdKeys();
  for (const k of keys){
    try { localStorage.removeItem(k); } catch {}
  }
  return keys.length;
}

function restoreBackup(obj, opts){
  const o = opts || {};
  if (!obj || typeof obj !== "object") return { ok: false, msg: "invalid backup" };
  if (!obj.kv || typeof obj.kv !== "object") return { ok: false, msg: "missing kv" };
  const keys = Object.keys(obj.kv).filter((k) => String(k).startsWith("oqd:"));
  if (!keys.length) return { ok: false, msg: "no oqd keys" };

  if (o.replace){
    clearOqdData();
  }

  let setCount = 0;
  for (const k of keys){
    const v = obj.kv[k];
    try {
      localStorage.setItem(String(k), String(v));
      setCount++;
    } catch {
      // ignore
    }
  }

  return { ok: true, msg: "restored", setCount };
}

async function copyToClipboard(text){
  await navigator.clipboard.writeText(text);
}

function pinsStorageKey(hashHex){
  return "oqd:pins:" + String(hashHex || "");
}

function loadPins(hashHex){
  try {
    const raw = localStorage.getItem(pinsStorageKey(hashHex));
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    const s = new Set();
    for (const v of arr){
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0 && n < 256) s.add(n);
    }
    return s;
  } catch {
    return new Set();
  }
}

function savePins(hashHex, pinSet){
  try {
    const arr = Array.from(pinSet.values()).sort((a,b) => a - b);
    localStorage.setItem(pinsStorageKey(hashHex), JSON.stringify(arr));
  } catch {
    // ignore
  }
}

// Notes storage (per question, per hash)
function noteStorageKey(hashHex, idx){
  return "oqd:note:v1:" + String(hashHex || "") + ":" + String(idx | 0);
}

function loadNote(hashHex, idx){
  try {
    return String(localStorage.getItem(noteStorageKey(hashHex, idx)) || "");
  } catch {
    return "";
  }
}

function saveNote(hashHex, idx, text){
  try {
    localStorage.setItem(noteStorageKey(hashHex, idx), String(text || ""));
    return true;
  } catch {
    return false;
  }
}

// History storage
const HISTORY_STORAGE_KEY = "oqd:history:v1";
const AUTO_HISTORY_KEY = "oqd:autoHistory:v1";

// Topic presets storage (local)
const PRESETS_STORAGE_KEY = "oqd:topicPresets:v1";

function loadSavedPresets(){
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const out = [];
    for (const it of arr){
      if (!it || typeof it !== "object") continue;
      const topic = String(it.topic || "").trim();
      const tone = String(it.tone || "gentle").trim();
      if (!topic) continue;
      out.push({ topic: topic.slice(0, 140), tone: tone || "gentle", savedUtc: String(it.savedUtc || "") });
    }
    return out.slice(0, 24);
  } catch {
    return [];
  }
}

function saveSavedPresets(items){
  const arr = Array.isArray(items) ? items : [];
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // ignore
  }
}

function addSavedPreset(topic, tone){
  const t = String(topic || "").trim().replace(/\s+/g, " ");
  if (!t) return loadSavedPresets();
  const toneKey = String(tone || "gentle").trim() || "gentle";

  const items = loadSavedPresets();
  const sig = t.toLowerCase() + "|" + toneKey;

  const next = [];
  next.push({ topic: t.slice(0, 140), tone: toneKey, savedUtc: nowUtcCompact() });
  for (const it of items){
    const sig2 = String(it.topic || "").trim().toLowerCase() + "|" + String(it.tone || "gentle").trim();
    if (sig2 === sig) continue;
    next.push(it);
    if (next.length >= 12) break;
  }

  saveSavedPresets(next);
  return next;
}

function clearSavedPresets(){
  saveSavedPresets([]);
  return [];
}

// Focus timer preference (minutes)
const TIMER_MIN_KEY = "oqd:timerMin:v1";

function loadTimerMin(){
  try {
    const raw = localStorage.getItem(TIMER_MIN_KEY);
    const n = Number.parseInt(String(raw || ""), 10);
    if (!Number.isFinite(n)) return 10;
    return clampInt(n, 1, 90, 10);
  } catch {
    return 10;
  }
}

function saveTimerMin(min){
  const n = clampInt(min, 1, 90, 10);
  try {
    localStorage.setItem(TIMER_MIN_KEY, String(n));
  } catch {
    // ignore
  }
  return n;
}

function loadHistory(){
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const out = [];
    for (const it of arr){
      if (!it || typeof it !== "object") continue;
      out.push({
        savedUtc: String(it.savedUtc || ""),
        topic: String(it.topic || ""),
        seed: String(it.seed || ""),
        variant: clampInt(it.variant, 0, 99, 0),
        tone: String(it.tone || "gentle"),
        count: clampInt(it.count, 3, 24, 9)
      });
    }
    return out;
  } catch {
    return [];
  }
}

function saveHistory(items){
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items || []));
  } catch {
    // ignore
  }
}

function getAutoHistoryEnabled(){
  try {
    const raw = localStorage.getItem(AUTO_HISTORY_KEY);
    if (raw === null) return true;
    return raw === "1";
  } catch {
    return true;
  }
}

function setAutoHistoryEnabled(v){
  try {
    localStorage.setItem(AUTO_HISTORY_KEY, v ? "1" : "0");
  } catch {
    // ignore
  }
}

function addToHistory(st){
  const items = loadHistory();
  const built = buildQuestions(st);
  const sig = built.hashHex + "|" + String(st.count);

  const next = [];
  next.push({
    savedUtc: nowUtcCompact(),
    topic: String(st.topic || ""),
    seed: String(st.seed || ""),
    variant: clampInt(st.variant, 0, 99, 0),
    tone: String(st.tone || "gentle"),
    count: clampInt(st.count, 3, 24, 9),
    sig
  });

  // Keep unique by (hash + count).
  for (const it of items){
    const built2 = buildQuestions(it);
    const sig2 = built2.hashHex + "|" + String(it.count);
    if (sig2 === sig) continue;
    next.push(it);
    if (next.length >= 24) break;
  }

  // Strip extra field
  const clean = next.map((it) => ({
    savedUtc: it.savedUtc,
    topic: it.topic,
    seed: it.seed,
    variant: it.variant,
    tone: it.tone,
    count: it.count
  }));

  saveHistory(clean);
  return clean;
}

function buildMarkdown({ topic, seed, variant, tone, hashHex, questions, pinnedIdx }){
  const title = (topic || "Open Question Dial").trim();
  const lines = [];
  lines.push(`# ${title}`);
  lines.push("");
  lines.push(`- seed: ${seed || "(empty)"}`);
  lines.push(`- variant: ${variant}`);
  lines.push(`- tone: ${tone}`);
  lines.push(`- hash: ${hashHex}`);
  lines.push("");
  lines.push("## Questions");
  lines.push("");
  for (const q of questions){
    lines.push(`- ${q}`);
  }

  const pins = Array.isArray(pinnedIdx) ? pinnedIdx : [];
  if (pins.length){
    lines.push("");
    lines.push("## Pinned");
    lines.push("");
    for (const idx of pins){
      const q = questions[idx];
      if (q) lines.push(`- ${q}`);
    }
  }

  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push("Pick one question. Answer for 10 minutes. Then rewrite the question in your own words.");
  lines.push("");
  return lines.join("\n");
}

function buildPinnedMarkdown({ topic, seed, variant, tone, hashHex, questions, pinnedIdx }){
  const pins = Array.isArray(pinnedIdx) ? pinnedIdx : [];
  const title = (topic || "Open Question Dial").trim();
  const lines = [];
  lines.push(`# Pinned - ${title}`);
  lines.push("");
  lines.push(`- seed: ${seed || "(empty)"}`);
  lines.push(`- variant: ${variant}`);
  lines.push(`- tone: ${tone}`);
  lines.push(`- hash: ${hashHex}`);
  lines.push("");
  if (!pins.length){
    lines.push("(No pinned questions yet.)");
    lines.push("");
    return lines.join("\n");
  }
  for (const idx of pins){
    const q = questions[idx];
    if (q) lines.push(`- ${q}`);
  }
  lines.push("");
  return lines.join("\n");
}

function buildPinnedNotesMarkdown({ topic, seed, variant, tone, hashHex, questions, pinnedIdx }){
  const pins = Array.isArray(pinnedIdx) ? pinnedIdx : [];
  const title = (topic || "Open Question Dial").trim();
  const lines = [];
  lines.push(`# Pinned + Notes - ${title}`);
  lines.push("");
  lines.push(`- seed: ${seed || "(empty)"}`);
  lines.push(`- variant: ${variant}`);
  lines.push(`- tone: ${tone}`);
  lines.push(`- hash: ${hashHex}`);
  lines.push("");
  if (!pins.length){
    lines.push("(No pinned questions yet.)");
    lines.push("");
    return lines.join("\n");
  }

  for (const idx of pins){
    const q = questions[idx] || "";
    const note = loadNote(hashHex, idx).trim();
    lines.push(`## Q${idx + 1}`);
    lines.push("");
    lines.push(q ? (`- ${q}`) : "- (empty)");
    lines.push("");
    lines.push("Notes:");
    lines.push("");
    lines.push(note ? note : "(empty)");
    lines.push("");
  }
  return lines.join("\n");
}

function fmtTimer(sec){
  const s = Math.max(0, sec | 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
}

function main(){
  const elTopic = document.getElementById("topic");
  const elSeed = document.getElementById("seed");
  const elVariant = document.getElementById("variant");
  const elTone = document.getElementById("tone");
  const elCount = document.getElementById("count");

  // Theme.
  const btnTheme = document.getElementById("btnTheme");
  let themeMode = "auto";
  try { themeMode = getPreferredTheme(); } catch { themeMode = "auto"; }
  applyTheme(themeMode);

  if (btnTheme){
    btnTheme.addEventListener("click", () => {
      themeMode = cycleTheme(themeMode);
      try { localStorage.setItem(THEME_KEY, themeMode); } catch {}
      applyTheme(themeMode);
    });
  }

  try{
    if (window.matchMedia){
      const mm = window.matchMedia("(prefers-color-scheme: dark)");
      mm.addEventListener("change", () => {
        if (themeMode === "auto") applyTheme(themeMode);
      });
    }
  }catch{}

  const elFilter = document.getElementById("filter");
  const btnFilterClear = document.getElementById("btnFilterClear");

  const elOutList = document.getElementById("outList");
  const elOutMd = document.getElementById("outMd");
  const elPinnedBoard = document.getElementById("pinnedBoard");

  const kSeed = document.getElementById("kSeed");
  const kHash = document.getElementById("kHash");
  const kPinned = document.getElementById("kPinned");

  // History elements.
  const elHistoryList = document.getElementById("historyList");
  const elAutoHistory = document.getElementById("chkAutoHistory");

  // Saved presets elements.
  const elSavedPresets = document.getElementById("savedPresets");
  const btnSavePreset = document.getElementById("btnSavePreset");
  const btnClearPresets = document.getElementById("btnClearPresets");

  // Focus mode elements.
  const elModal = document.getElementById("focusModal");
  const elFocusMeta = document.getElementById("focusMeta");
  const elFocusQ = document.getElementById("focusQ");
  const elTimerLabel = document.getElementById("timerLabel");
  const elTimerPreset = document.getElementById("timerPreset");
  const elFocusNote = document.getElementById("focusNote");
  const elNoteStatus = document.getElementById("noteStatus");

  const elFocusFollowUps = document.getElementById("focusFollowUps");
  const btnCopyFollowUps = document.getElementById("btnCopyFollowUps");

  let debounceTimer = null;
  let lastState = null;

  function kpiFlash(txt){
    if (!kHash) return;
    kHash.textContent = String(txt || "");
    window.setTimeout(() => {
      if (lastState) kHash.textContent = "hash: " + lastState.hashHex;
    }, 850);
  }

  let focusIndex = 0;
  let timerMin = 10;
  let timerSec = 600;
  let timerHandle = null;

  let noteDebounce = null;
  let lastNoteSig = "";

  // Init timer preference.
  timerMin = loadTimerMin();
  timerSec = Math.max(0, (timerMin | 0) * 60);
  if (elTimerPreset) elTimerPreset.value = String(timerMin);

  function setModalOpen(open){
    if (!elModal) return;
    if (open){
      elModal.classList.add("isOpen");
      elModal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    } else {
      elModal.classList.remove("isOpen");
      elModal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }
  }

  function timerStop(){
    if (timerHandle){
      clearInterval(timerHandle);
      timerHandle = null;
    }
  }

  function timerRender(){
    if (elTimerLabel) elTimerLabel.textContent = fmtTimer(timerSec);
  }

  function timerReset(){
    timerStop();
    timerSec = Math.max(0, (timerMin | 0) * 60);
    timerRender();
  }

  function timerStart(){
    if (timerHandle) return;
    timerHandle = setInterval(() => {
      timerSec = Math.max(0, (timerSec | 0) - 1);
      timerRender();
      if (timerSec <= 0){
        timerStop();
        try { navigator.vibrate && navigator.vibrate([120, 80, 120]); } catch {}
      }
    }, 1000);
  }

  function focusClamp(){
    const st = lastState;
    if (!st || !Array.isArray(st.questions) || !st.questions.length){
      focusIndex = 0;
      return;
    }
    focusIndex = Math.max(0, Math.min(st.questions.length - 1, focusIndex | 0));
  }

  function focusIsOpen(){
    return elModal && elModal.classList.contains("isOpen");
  }

  function focusRender(){
    const st = lastState;
    if (!st) return;
    focusClamp();

    const q = st.questions[focusIndex] || "";
    const pinSet = loadPins(st.hashHex);
    const pinned = pinSet.has(focusIndex);

    if (elFocusMeta){
      elFocusMeta.textContent = `hash ${st.hashHex} | question ${focusIndex + 1}/${st.questions.length} | pinned ${pinned ? "yes" : "no"}`;
    }
    if (elFocusQ){
      elFocusQ.textContent = q;
    }

    // Follow-ups for this question.
    if (elFocusFollowUps){
      const fus = buildFollowUps(st, focusIndex);
      elFocusFollowUps.innerHTML = "";
      for (let i = 0; i < fus.length; i++){
        const li = document.createElement("li");
        li.textContent = fus[i];
        li.title = "Click to copy";
        li.addEventListener("click", async () => {
          try {
            await copyToClipboard(fus[i]);
            kpiFlash("copied");
          } catch {
            alert(fus[i]);
          }
        });
        elFocusFollowUps.appendChild(li);
      }
      if (!fus.length){
        const li = document.createElement("li");
        li.textContent = "(No follow-ups.)";
        li.style.opacity = "0.75";
        elFocusFollowUps.appendChild(li);
      }
    }

    // Notes for this question.
    if (elFocusNote){
      const sig = st.hashHex + ":" + String(focusIndex | 0);
      if (sig !== lastNoteSig){
        elFocusNote.value = loadNote(st.hashHex, focusIndex);
        lastNoteSig = sig;
        if (elNoteStatus) elNoteStatus.textContent = "";
      }
    }

    const btnPin = document.getElementById("btnFocusPin");
    if (btnPin) btnPin.textContent = pinned ? "Unpin" : "Pin";

    timerRender();
  }

  function renderHistory(){
    if (!elHistoryList) return;
    const items = loadHistory();
    elHistoryList.innerHTML = "";

    if (!items.length){
      const empty = document.createElement("div");
      empty.className = "historyMeta";
      empty.textContent = "(No saved items yet.)";
      elHistoryList.appendChild(empty);
      return;
    }

    for (let i = 0; i < items.length; i++){
      const it = items[i];
      const built = buildQuestions(it);
      const title = (it.topic || "(untitled)").trim();

      const row = document.createElement("div");
      row.className = "historyItem";

      const meta = document.createElement("div");
      meta.className = "historyMeta";
      meta.textContent = `saved ${it.savedUtc || "-"} | seed ${it.seed || "(empty)"} | v${it.variant} | ${it.tone} | n${it.count} | hash ${built.hashHex}`;

      const t = document.createElement("div");
      t.className = "historyTitle";
      t.textContent = title;

      const btns = document.createElement("div");
      btns.className = "historyBtns";

      const bLoad = document.createElement("button");
      bLoad.type = "button";
      bLoad.textContent = "Load";
      bLoad.addEventListener("click", () => {
        elTopic.value = it.topic || "";
        elSeed.value = it.seed || "";
        elVariant.value = String(clampInt(it.variant, 0, 99, 0));
        elTone.value = it.tone || "gentle";
        elCount.value = String(clampInt(it.count, 3, 24, 9));
        render({ updateUrl: true });
      });

      const bLink = document.createElement("button");
      bLink.type = "button";
      bLink.textContent = "Copy link";
      bLink.addEventListener("click", async () => {
        const url = makeLink({ topic: it.topic, seed: it.seed, v: it.variant, tone: it.tone, n: it.count });
        try {
          await copyToClipboard(url);
        } catch {
          alert(url);
        }
      });

      const bRemove = document.createElement("button");
      bRemove.type = "button";
      bRemove.className = "ghost";
      bRemove.textContent = "Remove";
      bRemove.addEventListener("click", () => {
        const items2 = loadHistory();
        const next = [];
        for (let j = 0; j < items2.length; j++){
          if (j !== i) next.push(items2[j]);
        }
        saveHistory(next);
        renderHistory();
      });

      btns.appendChild(bLoad);
      btns.appendChild(bLink);
      btns.appendChild(bRemove);

      row.appendChild(meta);
      row.appendChild(t);
      row.appendChild(btns);

      elHistoryList.appendChild(row);
    }
  }

  function renderSavedPresetsUi(){
    if (!elSavedPresets) return;
    const items = loadSavedPresets();
    elSavedPresets.innerHTML = "";

    if (!items.length){
      const empty = document.createElement("div");
      empty.className = "historyMeta";
      empty.textContent = "(No saved presets yet.)";
      elSavedPresets.appendChild(empty);
      return;
    }

    for (let i = 0; i < items.length; i++){
      const it = items[i];
      const topic = String(it.topic || "").trim();
      const tone = String(it.tone || "gentle").trim() || "gentle";

      const row = document.createElement("div");
      row.className = "historyItem";

      const meta = document.createElement("div");
      meta.className = "historyMeta";
      meta.textContent = `tone ${tone}` + (it.savedUtc ? (` | saved ${it.savedUtc}`) : "");

      const t = document.createElement("div");
      t.className = "historyTitle";
      t.textContent = topic;

      const btns = document.createElement("div");
      btns.className = "historyBtns";

      const bLoad = document.createElement("button");
      bLoad.type = "button";
      bLoad.textContent = "Load";
      bLoad.addEventListener("click", () => {
        elTopic.value = topic;
        elTone.value = tone;
        render({ updateUrl: true });
      });

      const bRemove = document.createElement("button");
      bRemove.type = "button";
      bRemove.className = "ghost";
      bRemove.textContent = "Remove";
      bRemove.addEventListener("click", () => {
        const items2 = loadSavedPresets();
        const next = [];
        for (let j = 0; j < items2.length; j++){
          if (j !== i) next.push(items2[j]);
        }
        saveSavedPresets(next);
        renderSavedPresetsUi();
      });

      btns.appendChild(bLoad);
      btns.appendChild(bRemove);

      row.appendChild(meta);
      row.appendChild(t);
      row.appendChild(btns);

      elSavedPresets.appendChild(row);
    }
  }

  function renderPinnedBoard(st){
    if (!elPinnedBoard) return;
    const pins = Array.isArray(st.pinnedIdx) ? st.pinnedIdx : [];
    elPinnedBoard.innerHTML = "";

    if (!pins.length){
      const empty = document.createElement("div");
      empty.className = "historyMeta";
      empty.textContent = "(No pinned questions for this hash yet.)";
      elPinnedBoard.appendChild(empty);
      return;
    }

    for (const idx of pins){
      const q = st.questions[idx] || "";

      const card = document.createElement("div");
      card.className = "pinCard";

      const meta = document.createElement("div");
      meta.className = "pinMeta";

      const left = document.createElement("div");
      left.textContent = `Q${idx + 1} of ${st.questions.length}`;

      const btnUnpin = document.createElement("button");
      btnUnpin.type = "button";
      btnUnpin.className = "ghost";
      btnUnpin.textContent = "Unpin";
      btnUnpin.addEventListener("click", () => {
        const pinSet = loadPins(st.hashHex);
        pinSet.delete(idx);
        savePins(st.hashHex, pinSet);
        render({ updateUrl: true, keepPins: true });
      });

      meta.appendChild(left);
      meta.appendChild(btnUnpin);

      const qt = document.createElement("div");
      qt.className = "pinQ";
      qt.textContent = q;

      const lbl = document.createElement("div");
      lbl.className = "pinNoteLabel";
      lbl.textContent = "Note";

      const ta = document.createElement("textarea");
      ta.className = "pinNote";
      ta.spellcheck = false;
      ta.value = loadNote(st.hashHex, idx);

      const stxt = document.createElement("div");
      stxt.className = "pinNoteStatus";
      stxt.textContent = "";

      let tHandle = null;
      ta.addEventListener("input", () => {
        if (tHandle) clearTimeout(tHandle);
        stxt.textContent = "saving...";
        tHandle = setTimeout(() => {
          const ok = saveNote(st.hashHex, idx, ta.value);
          stxt.textContent = ok ? "saved locally" : "save failed";
        }, 140);
      });

      card.appendChild(meta);
      card.appendChild(qt);
      card.appendChild(lbl);
      card.appendChild(ta);
      card.appendChild(stxt);

      elPinnedBoard.appendChild(card);
    }
  }

  function recordHistoryIfEnabled(st){
    const enabled = elAutoHistory ? !!elAutoHistory.checked : getAutoHistoryEnabled();
    if (!enabled) return;
    addToHistory(st);
    renderHistory();
  }

  function render(opts){
    const o = opts || {};

    const topic = elTopic.value || "";
    const seed = elSeed.value || "";
    const variant = clampInt(elVariant.value, 0, 99, 0);
    const tone = elTone.value || "gentle";
    const count = clampInt(elCount.value, 3, 24, 9);

    const filter = elFilter ? String(elFilter.value || "").trim().toLowerCase() : "";

    const built = buildQuestions({ topic, seed, variant, tone, count });

    // Load pins for this exact output hash.
    const pinSet = loadPins(built.hashHex);

    elOutList.innerHTML = "";
    for (let i = 0; i < built.questions.length; i++){
      const q = built.questions[i];
      const li = document.createElement("li");

      const row = document.createElement("div");
      row.className = "qRow";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = pinSet.has(i);
      cb.setAttribute("aria-label", "Pin question");

      const txt = document.createElement("div");
      txt.className = "qText" + (cb.checked ? " qPinned" : "");

      const show = !filter || String(q || "").toLowerCase().includes(filter);
      if (!show){
        li.style.display = "none";
      }

      if (filter && show){
        txt.innerHTML = highlightHtml(q, filter);
      } else {
        txt.textContent = q;
      }

      cb.addEventListener("change", () => {
        if (cb.checked) pinSet.add(i);
        else pinSet.delete(i);
        savePins(built.hashHex, pinSet);
        // Update styling + markdown.
        txt.className = "qText" + (cb.checked ? " qPinned" : "");
        render({ updateUrl: true, keepPins: true });
      });

      txt.addEventListener("click", async (e) => {
        if (e && e.altKey){
          const st = render({ updateUrl: true, keepPins: true });
          lastState = st;
          focusIndex = i;
          timerReset();
          setModalOpen(true);
          focusRender();
          return;
        }
        try {
          await copyToClipboard(q);
          kpiFlash("copied");
        } catch {
          alert(q);
        }
      });

      row.appendChild(cb);
      row.appendChild(txt);
      li.appendChild(row);
      elOutList.appendChild(li);
    }

    const pinnedIdx = Array.from(pinSet.values()).sort((a,b) => a - b);

    const md = buildMarkdown({
      topic,
      seed,
      variant,
      tone,
      hashHex: built.hashHex,
      questions: built.questions,
      pinnedIdx
    });
    elOutMd.value = md;

    kSeed.textContent = `seed: ${seed || "(empty)"}`;
    kHash.textContent = `hash: ${built.hashHex}`;
    kPinned.textContent = `pinned: ${pinnedIdx.length}`;

    if (o.updateUrl){
      const pinTxt = pinsInUrl ? pinnedIdx.join(",") : "";
      setQuery({ topic, seed, v: variant, tone, n: count, pins: pinTxt });
    }

    const st = { topic, seed, variant, tone, count, md, hashHex: built.hashHex, questions: built.questions, pinnedIdx };
    lastState = st;
    renderPinnedBoard(st);
    if (focusIsOpen()) focusRender();
    return st;
  }

  function renderSoon(){
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => { render({ updateUrl: true }); }, 120);
  }

  // Load query state.
  const q = readQuery();
  const initialPins = parsePinsParam(q.pins, 64);
  let pinsInUrl = initialPins.length > 0;

  if (q.topic) elTopic.value = q.topic;
  if (q.seed) elSeed.value = q.seed;
  elVariant.value = String(clampInt(q.v, 0, 99, 0));
  elTone.value = q.tone;
  elCount.value = String(clampInt(q.n, 3, 24, 9));

  // History initial state.
  if (elAutoHistory){
    elAutoHistory.checked = getAutoHistoryEnabled();
    elAutoHistory.addEventListener("change", () => {
      setAutoHistoryEnabled(!!elAutoHistory.checked);
    });
  }
  const btnClearHistory = document.getElementById("btnClearHistory");
  if (btnClearHistory){
    btnClearHistory.addEventListener("click", () => {
      saveHistory([]);
      renderHistory();
    });
  }

  // Saved presets.
  if (btnSavePreset){
    btnSavePreset.addEventListener("click", () => {
      const t = String(elTopic.value || "").trim();
      if (!t){
        alert("Add a topic first, then save it as a preset.");
        return;
      }
      addSavedPreset(t, String(elTone.value || "gentle"));
      renderSavedPresetsUi();
    });
  }

  if (btnClearPresets){
    btnClearPresets.addEventListener("click", () => {
      const ok = window.confirm("Clear saved presets (local only)?");
      if (!ok) return;
      clearSavedPresets();
      renderSavedPresetsUi();
    });
  }

  // Backup / restore.
  const btnBackupDownload = document.getElementById("btnBackupDownload");
  if (btnBackupDownload){
    btnBackupDownload.addEventListener("click", () => {
      const data = exportBackup();
      const name = "oqd-backup-" + nowUtcCompact() + ".json";
      downloadText(name, JSON.stringify(data, null, 2), "application/json");
    });
  }

  const fileBackup = document.getElementById("fileBackup");
  const btnBackupRestore = document.getElementById("btnBackupRestore");
  if (btnBackupRestore && fileBackup){
    btnBackupRestore.addEventListener("click", () => {
      fileBackup.value = "";
      fileBackup.click();
    });

    fileBackup.addEventListener("change", () => {
      const f = fileBackup.files && fileBackup.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const txt = String(r.result || "");
          const obj = JSON.parse(txt);
          const ok = window.confirm("Restore backup and replace existing local data for this app?");
          const res = restoreBackup(obj, { replace: ok });
          if (!res.ok){
            alert("Restore failed: " + res.msg);
            return;
          }
          render({ updateUrl: true });
          renderHistory();
          alert("Restored " + String(res.setCount || 0) + " items.");
        } catch {
          alert("Restore failed: invalid JSON");
        }
      };
      r.onerror = () => { alert("Restore failed: could not read file"); };
      r.readAsText(f);
    });
  }

  const btnBackupClear = document.getElementById("btnBackupClear");
  if (btnBackupClear){
    btnBackupClear.addEventListener("click", () => {
      const ok = window.confirm("Clear all local data for Open Question Dial (pins, notes, history)?");
      if (!ok) return;
      const n = clearOqdData();
      render({ updateUrl: true });
      renderHistory();
      alert("Cleared " + String(n) + " keys.");
    });
  }

  document.getElementById("btnGen").addEventListener("click", () => {
    const st = render({ updateUrl: true });
    recordHistoryIfEnabled(st);
  });

  document.getElementById("btnNext").addEventListener("click", () => {
    elVariant.value = String(clampInt(Number(elVariant.value) + 1, 0, 99, 0));
    const st = render({ updateUrl: true });
    recordHistoryIfEnabled(st);
  });

  document.getElementById("btnRemix").addEventListener("click", () => {
    elSeed.value = nowUtcCompact();
    const st = render({ updateUrl: true });
    recordHistoryIfEnabled(st);
  });

  const btnSnap6h = document.getElementById("btnSnap6h");
  if (btnSnap6h){
    btnSnap6h.addEventListener("click", () => {
      elSeed.value = nowUtcSixHourSeed();
      const st = render({ updateUrl: true });
      recordHistoryIfEnabled(st);
      kpiFlash("seed 6h");
    });
  }

  document.getElementById("btnCopy").addEventListener("click", async () => {
    const st = render({ updateUrl: true });
    try {
      await copyToClipboard(st.md);
    } catch {
      alert("Clipboard unavailable. Use download.");
    }
  });

  document.getElementById("btnCopyPinned").addEventListener("click", async () => {
    const st = render({ updateUrl: true });
    const pm = buildPinnedMarkdown(st);
    try {
      await copyToClipboard(pm);
    } catch {
      alert("Clipboard unavailable. Use download.");
    }
  });

  const btnCopyPinnedNotes = document.getElementById("btnCopyPinnedNotes");
  if (btnCopyPinnedNotes){
    btnCopyPinnedNotes.addEventListener("click", async () => {
      const st = render({ updateUrl: true });
      const pm = buildPinnedNotesMarkdown(st);
      try {
        await copyToClipboard(pm);
      } catch {
        alert("Clipboard unavailable. Use download.");
      }
    });
  }

  const btnDownloadPinnedNotes = document.getElementById("btnDownloadPinnedNotes");
  if (btnDownloadPinnedNotes){
    btnDownloadPinnedNotes.addEventListener("click", () => {
      const st = render({ updateUrl: true });
      const pm = buildPinnedNotesMarkdown(st);
      const safe = (st.topic || "open-question-dial").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const name = `open-question-dial-pinned-notes-${safe || "topic"}-${st.hashHex}.md`;
      downloadText(name, pm, "text/markdown");
    });
  }

  // Export/import a shareable "set" for the current output hash.
  // A set is: settings + pinned indices + their notes (only for this hash).
  function buildCurrentSet(st){
    const pins = Array.isArray(st.pinnedIdx) ? st.pinnedIdx : [];
    const notes = {};
    for (const idx of pins){
      notes[String(idx)] = loadNote(st.hashHex, idx);
    }
    return {
      kind: "oqd-set",
      version: 1,
      exportedUtc: nowUtcCompact(),
      topic: st.topic || "",
      seed: st.seed || "",
      variant: clampInt(st.variant, 0, 99, 0),
      tone: st.tone || "gentle",
      count: clampInt(st.count, 3, 24, 9),
      hashHex: st.hashHex,
      pinnedIdx: pins,
      notes
    };
  }

  function isValidSet(obj){
    if (!obj || typeof obj !== "object") return false;
    if (String(obj.kind || "") !== "oqd-set") return false;
    if (Number(obj.version) !== 1) return false;
    if (!obj.hashHex) return false;
    if (!Array.isArray(obj.pinnedIdx)) return false;
    if (!obj.notes || typeof obj.notes !== "object") return false;
    return true;
  }

  const btnExportSet = document.getElementById("btnExportSet");
  if (btnExportSet){
    btnExportSet.addEventListener("click", () => {
      const st = render({ updateUrl: true });
      const setObj = buildCurrentSet(st);
      const safe = (st.topic || "open-question-dial").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const name = `oqd-set-${safe || "topic"}-${st.hashHex}-${setObj.exportedUtc}.json`;
      downloadText(name, JSON.stringify(setObj, null, 2), "application/json");
    });
  }

  const fileImportSet = document.getElementById("fileImportSet");
  const btnImportSet = document.getElementById("btnImportSet");
  if (btnImportSet && fileImportSet){
    btnImportSet.addEventListener("click", () => {
      fileImportSet.value = "";
      fileImportSet.click();
    });

    fileImportSet.addEventListener("change", () => {
      const f = fileImportSet.files && fileImportSet.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const txt = String(r.result || "");
          const obj = JSON.parse(txt);
          if (!isValidSet(obj)){
            alert("Import failed: not a valid oqd-set file.");
            return;
          }

          // Load settings from file so the hash matches, then apply pins+notes.
          elTopic.value = String(obj.topic || "");
          elSeed.value = String(obj.seed || "");
          elVariant.value = String(clampInt(obj.variant, 0, 99, 0));
          elTone.value = String(obj.tone || "gentle");
          elCount.value = String(clampInt(obj.count, 3, 24, 9));

          const st = render({ updateUrl: true });

          const pins = Array.isArray(obj.pinnedIdx) ? obj.pinnedIdx : [];
          const ps = new Set();
          for (const v of pins){
            const n = clampInt(v, 0, 255, -1);
            if (n >= 0) ps.add(n);
          }
          savePins(st.hashHex, ps);

          // Notes.
          const notes = obj.notes || {};
          for (const k of Object.keys(notes)){
            const idx = clampInt(k, 0, 255, -1);
            if (idx < 0) continue;
            saveNote(st.hashHex, idx, String(notes[k] || ""));
          }

          render({ updateUrl: true });
          alert("Imported set for hash " + String(st.hashHex) + ".");
        } catch {
          alert("Import failed: invalid JSON.");
        }
      };
      r.onerror = () => { alert("Import failed: could not read file."); };
      r.readAsText(f);
    });
  }

  document.getElementById("btnClearPins").addEventListener("click", () => {
    const st = render({ updateUrl: true });
    try {
      localStorage.removeItem(pinsStorageKey(st.hashHex));
    } catch {
      // ignore
    }
    render({ updateUrl: true });
  });

  document.getElementById("btnLink").addEventListener("click", async () => {
    render({ updateUrl: true });
    const url = currentLink();
    try {
      await copyToClipboard(url);
    } catch {
      alert(url);
    }
  });

  const btnLinkPinned = document.getElementById("btnLinkPinned");
  if (btnLinkPinned){
    btnLinkPinned.addEventListener("click", async () => {
      // Opt-in: only add pins to the URL when explicitly requested.
      pinsInUrl = true;
      const st = render({ updateUrl: true });
      const url = makeLink({
        topic: st.topic,
        seed: st.seed,
        v: st.variant,
        tone: st.tone,
        n: st.count,
        pins: (Array.isArray(st.pinnedIdx) && st.pinnedIdx.length) ? st.pinnedIdx.join(",") : ""
      });
      try {
        await copyToClipboard(url);
      } catch {
        alert(url);
      }
    });
  }

  document.getElementById("btnDownload").addEventListener("click", () => {
    const st = render({ updateUrl: true });
    const safe = (st.topic || "open-question-dial").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const name = `open-question-dial-${safe || "topic"}-${st.hashHex}.md`;
    downloadText(name, st.md, "text/markdown");
  });

  document.getElementById("btnFocus").addEventListener("click", () => {
    const st = render({ updateUrl: true });
    lastState = st;
    focusIndex = 0;
    timerReset();
    setModalOpen(true);
    focusRender();
  });

  document.getElementById("btnFocusClose").addEventListener("click", () => {
    setModalOpen(false);
    timerStop();
  });

  document.getElementById("btnFocusPrev").addEventListener("click", () => {
    focusIndex = (focusIndex | 0) - 1;
    focusClamp();
    focusRender();
  });

  document.getElementById("btnFocusNext").addEventListener("click", () => {
    focusIndex = (focusIndex | 0) + 1;
    focusClamp();
    focusRender();
  });

  document.getElementById("btnFocusPin").addEventListener("click", () => {
    const st = lastState;
    if (!st) return;
    const pinSet = loadPins(st.hashHex);
    if (pinSet.has(focusIndex)) pinSet.delete(focusIndex);
    else pinSet.add(focusIndex);
    savePins(st.hashHex, pinSet);
    render({ updateUrl: true });
    focusRender();
  });

  function applyTimerPreset(){
    const v = elTimerPreset ? clampInt(elTimerPreset.value, 1, 90, 10) : 10;
    timerMin = saveTimerMin(v);
    timerReset();
  }

  const btnTimerSet = document.getElementById("btnTimerSet");
  if (btnTimerSet) btnTimerSet.addEventListener("click", () => { applyTimerPreset(); });
  if (elTimerPreset) elTimerPreset.addEventListener("change", () => { applyTimerPreset(); });

  document.getElementById("btnTimerStart").addEventListener("click", () => { timerStart(); });
  document.getElementById("btnTimerPause").addEventListener("click", () => { timerStop(); });
  document.getElementById("btnTimerReset").addEventListener("click", () => { timerReset(); });

  const btnCopyNote = document.getElementById("btnCopyNote");
  if (btnCopyNote){
    btnCopyNote.addEventListener("click", async () => {
      const st = lastState;
      if (!st) return;
      const q = st.questions[focusIndex] || "";
      const note = elFocusNote ? String(elFocusNote.value || "").trim() : "";
      const lines = [];
      lines.push("# Open Question Dial - Note");
      lines.push("");
      lines.push(`- hash: ${st.hashHex}`);
      lines.push(`- question: ${focusIndex + 1}/${st.questions.length}`);
      lines.push("");
      lines.push("## Question");
      lines.push("");
      lines.push(q ? ("- " + q) : "(empty)");
      lines.push("");
      lines.push("## Note");
      lines.push("");
      lines.push(note || "(empty)");
      lines.push("");
      const md = lines.join("\n");
      try {
        await copyToClipboard(md);
        if (elNoteStatus) elNoteStatus.textContent = "copied";
      } catch {
        alert("Clipboard unavailable. Select and copy manually.");
      }
    });
  }

  if (btnCopyFollowUps){
    btnCopyFollowUps.addEventListener("click", async () => {
      const st = lastState;
      if (!st) return;
      const fus = buildFollowUps(st, focusIndex);
      const lines = [];
      lines.push("# Open Question Dial - Follow-ups");
      lines.push("");
      lines.push(`- hash: ${st.hashHex}`);
      lines.push(`- question: ${focusIndex + 1}/${st.questions.length}`);
      lines.push("");
      lines.push("## Follow-ups");
      lines.push("");
      for (const fu of fus){
        lines.push("- " + fu);
      }
      lines.push("");
      const md = lines.join("\n");
      try {
        await copyToClipboard(md);
        kpiFlash("copied");
      } catch {
        alert(md);
      }
    });
  }

  if (elFocusNote){
    elFocusNote.addEventListener("input", () => {
      const st = lastState;
      if (!st) return;
      if (noteDebounce) clearTimeout(noteDebounce);
      if (elNoteStatus) elNoteStatus.textContent = "saving...";
      noteDebounce = setTimeout(() => {
        const ok = saveNote(st.hashHex, focusIndex, elFocusNote.value);
        if (elNoteStatus) elNoteStatus.textContent = ok ? "saved locally" : "save failed";
      }, 140);
    });
  }

  function isTypingTarget(t){
    const el = t && (t.target || t);
    if (!el) return false;
    const tag = String(el.tagName || "").toUpperCase();
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    if (el.isContentEditable) return true;
    return false;
  }

  function toggleFocusHelp(force){
    const el = document.getElementById("focusHelp");
    if (!el) return;
    const next = (typeof force === "boolean") ? force : !el.hasAttribute("hidden");
    if (next) el.setAttribute("hidden", "");
    else el.removeAttribute("hidden");
  }

  const btnFocusHelp = document.getElementById("btnFocusHelp");
  if (btnFocusHelp){
    btnFocusHelp.addEventListener("click", () => {
      toggleFocusHelp();
    });
  }

  window.addEventListener("keydown", async (e) => {
    if (!focusIsOpen()) return;

    // Always allow Esc to close.
    if (e.key === "Escape"){
      e.preventDefault();
      setModalOpen(false);
      timerStop();
      return;
    }

    // Do not steal keys while typing notes or editing fields.
    if (isTypingTarget(e.target)) return;

    if (e.key === "?" || (e.shiftKey && e.key === "/")){
      e.preventDefault();
      toggleFocusHelp();
      return;
    }

    if (e.key === "ArrowLeft" || e.key === "k"){
      e.preventDefault();
      focusIndex = (focusIndex | 0) - 1;
      focusClamp();
      focusRender();
      return;
    }
    if (e.key === "ArrowRight" || e.key === "j"){
      e.preventDefault();
      focusIndex = (focusIndex | 0) + 1;
      focusClamp();
      focusRender();
      return;
    }
    if (e.key === "p"){
      e.preventDefault();
      const st = lastState;
      if (!st) return;
      const pinSet = loadPins(st.hashHex);
      if (pinSet.has(focusIndex)) pinSet.delete(focusIndex);
      else pinSet.add(focusIndex);
      savePins(st.hashHex, pinSet);
      render({ updateUrl: true });
      focusRender();
      kpiFlash("pin");
      return;
    }
    if (e.key === "c"){
      e.preventDefault();
      const st = lastState;
      if (!st) return;
      const q = st.questions[focusIndex] || "";
      try {
        await copyToClipboard(q);
        kpiFlash("copied");
      } catch {
        alert(q);
      }
      return;
    }
    if (e.key === " "){
      e.preventDefault();
      if (timerHandle) timerStop();
      else timerStart();
      return;
    }
  });

  // Preset topic buttons.
  for (const btn of Array.from(document.querySelectorAll(".presetBtn"))){
    btn.addEventListener("click", () => {
      const topic = String(btn.getAttribute("data-topic") || "").trim();
      const tone = String(btn.getAttribute("data-tone") || "").trim();
      if (topic) elTopic.value = topic;
      if (tone) elTone.value = tone;
      // Nudge variant back to 0 so a preset feels like a fresh starting point.
      elVariant.value = "0";
      render({ updateUrl: true });
    });
  }

  elTopic.addEventListener("input", renderSoon);
  elSeed.addEventListener("input", renderSoon);
  elVariant.addEventListener("input", renderSoon);
  elTone.addEventListener("change", renderSoon);
  elCount.addEventListener("change", renderSoon);
  if (elFilter) elFilter.addEventListener("input", renderSoon);
  if (btnFilterClear){
    btnFilterClear.addEventListener("click", () => {
      if (!elFilter) return;
      elFilter.value = "";
      render({ updateUrl: true, keepPins: true });
    });
  }

  // Default seed if none.
  if (!elSeed.value){
    elSeed.value = nowUtcCompact();
  }

  let st0 = render({ updateUrl: true });

  // If a pins= param was provided, apply it to local storage for this exact hash.
  // This makes a pinned link shareable across devices.
  if (initialPins.length){
    const ps = new Set(initialPins);
    savePins(st0.hashHex, ps);
    st0 = render({ updateUrl: true });
  }

  // Global shortcut: t toggles theme.
  window.addEventListener("keydown", (e) => {
    if (e.key !== "t" && e.key !== "T") return;
    if (isTypingTarget(e.target)) return;
    // If focus is open, focus-mode already uses several keys; keep theme toggle global.
    e.preventDefault();
    themeMode = cycleTheme(themeMode);
    try { localStorage.setItem(THEME_KEY, themeMode); } catch {}
    applyTheme(themeMode);
  });

  renderHistory();
  renderSavedPresetsUi();
}

main();
