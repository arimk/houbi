// Open Question Dial
// Deterministic open questions from (topic + seed + variant + tone).
// Now supports pinning questions (stored in localStorage by hash).
// Plus local History (saved states).
// ASCII only.

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
  ]
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

function readQuery(){
  const p = new URLSearchParams(window.location.search || "");
  return {
    topic: p.get("topic") || "",
    seed: p.get("seed") || "",
    v: p.get("v") || "0",
    tone: p.get("tone") || "gentle",
    n: p.get("n") || "9"
  };
}

function setQuery({ topic, seed, v, tone, n }){
  const p = new URLSearchParams();
  if (topic) p.set("topic", topic);
  if (seed) p.set("seed", seed);
  p.set("v", String(v));
  p.set("tone", tone);
  p.set("n", String(n));
  const qs = p.toString();
  const url = window.location.pathname + (qs ? ("?" + qs) : "");
  window.history.replaceState(null, "", url);
}

function makeLink({ topic, seed, v, tone, n }){
  const p = new URLSearchParams();
  if (topic) p.set("topic", topic);
  if (seed) p.set("seed", seed);
  p.set("v", String(v));
  p.set("tone", tone);
  p.set("n", String(n));
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

  const elOutList = document.getElementById("outList");
  const elOutMd = document.getElementById("outMd");

  const kSeed = document.getElementById("kSeed");
  const kHash = document.getElementById("kHash");
  const kPinned = document.getElementById("kPinned");

  // History elements.
  const elHistoryList = document.getElementById("historyList");
  const elAutoHistory = document.getElementById("chkAutoHistory");

  // Focus mode elements.
  const elModal = document.getElementById("focusModal");
  const elFocusMeta = document.getElementById("focusMeta");
  const elFocusQ = document.getElementById("focusQ");
  const elTimerLabel = document.getElementById("timerLabel");
  const elFocusNote = document.getElementById("focusNote");
  const elNoteStatus = document.getElementById("noteStatus");

  let debounceTimer = null;
  let lastState = null;

  let focusIndex = 0;
  let timerSec = 600;
  let timerHandle = null;

  let noteDebounce = null;
  let lastNoteSig = "";

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
    timerSec = 600;
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
      txt.textContent = q;

      cb.addEventListener("change", () => {
        if (cb.checked) pinSet.add(i);
        else pinSet.delete(i);
        savePins(built.hashHex, pinSet);
        // Update styling + markdown.
        txt.className = "qText" + (cb.checked ? " qPinned" : "");
        render({ updateUrl: true, keepPins: true });
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
      setQuery({ topic, seed, v: variant, tone, n: count });
    }

    const st = { topic, seed, variant, tone, count, md, hashHex: built.hashHex, questions: built.questions, pinnedIdx };
    lastState = st;
    if (focusIsOpen()) focusRender();
    return st;
  }

  function renderSoon(){
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => { render({ updateUrl: true }); }, 120);
  }

  // Load query state.
  const q = readQuery();
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

  window.addEventListener("keydown", (e) => {
    if (!focusIsOpen()) return;
    if (e.key === "Escape"){
      e.preventDefault();
      setModalOpen(false);
      timerStop();
      return;
    }
    if (e.key === "ArrowLeft"){
      e.preventDefault();
      focusIndex = (focusIndex | 0) - 1;
      focusClamp();
      focusRender();
      return;
    }
    if (e.key === "ArrowRight"){
      e.preventDefault();
      focusIndex = (focusIndex | 0) + 1;
      focusClamp();
      focusRender();
      return;
    }
    if (e.key === " "){
      e.preventDefault();
      if (timerHandle) timerStop();
      else timerStart();
      return;
    }
  });

  elTopic.addEventListener("input", renderSoon);
  elSeed.addEventListener("input", renderSoon);
  elVariant.addEventListener("input", renderSoon);
  elTone.addEventListener("change", renderSoon);
  elCount.addEventListener("change", renderSoon);

  // Default seed if none.
  if (!elSeed.value){
    elSeed.value = nowUtcCompact();
  }

  render({ updateUrl: true });
  renderHistory();
}

main();
