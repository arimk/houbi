// 6h Sprint Board
// Deterministic board from topic + seed + variant.
// Offline, shareable URLs, local notes + timer.
// ASCII only.

const LS_NOTES_PREFIX = "sb6_notes_";
const LS_TIMER_PREFIX = "sb6_timer_";

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

const BANK = {
  verbs: [
    "tighten",
    "simplify",
    "rename",
    "surface",
    "reduce",
    "ship",
    "trim",
    "clarify",
    "stabilize",
    "make visible"
  ],
  objects: [
    "the landing page",
    "one app",
    "one interaction",
    "the navigation",
    "the writing flow",
    "a tiny UI state",
    "the copy",
    "the empty state",
    "the sidebar",
    "the share link"
  ],
  constraints: [
    "no new dependencies",
    "offline only",
    "single file change",
    "under 30 lines",
    "no new UI controls",
    "keyboard-only friendly",
    "mobile-first",
    "ship with a test case"
  ],
  deliverables: [
    "a visible before/after",
    "a new post + link",
    "a tiny screenshot",
    "a single new page",
    "a better export",
    "a clearer README snippet",
    "a small refactor",
    "a new preset"
  ],
  cutList: [
    "polish",
    "animations",
    "new features",
    "options",
    "edge cases",
    "the perfect design",
    "the full rewrite",
    "performance tuning"
  ]
};

function buildBoard(topic, seed, variant){
  const t = String(topic || "").trim();
  const s = String(seed || "").trim();
  const v = clampInt(variant, 0, 99, 0);
  const base = "topic=" + t + "|seed=" + s + "|v=" + String(v);
  const h = fnv1a32(base);
  const rng = xorshift32(h);

  const verb = pick(rng, BANK.verbs);
  const obj = pick(rng, BANK.objects);
  const con = pick(rng, BANK.constraints);
  const del = pick(rng, BANK.deliverables);
  const cut = pick(rng, BANK.cutList);

  const cards = [
    {
      title: "Pick the micro-change",
      text: verb + " " + obj + " (" + con + ").",
      tag: "Aim: concrete edit"
    },
    {
      title: "Cut aggressively",
      text: "Explicitly skip: " + cut + ". Keep it shippable in 25 min.",
      tag: "Aim: remove friction"
    },
    {
      title: "Ship + capture",
      text: "Deliver: " + del + ". Write 1 line: what surprised you.",
      tag: "Aim: close the loop"
    }
  ];

  const commit = "sprint: " + verb + " " + obj.replace(/^the\s+/, "") + " (" + u32ToHex(h).slice(0, 4) + ")";

  return { hash: u32ToHex(h), cards, commit };
}

function getBaseUrl(){
  try{
    return window.location.origin || "";
  }catch{
    return "";
  }
}

function buildPermalink(params){
  const basePath = window.location.pathname.replace(/\/index\.html$/, "/");
  const u = new URL(getBaseUrl() + basePath);
  if (params.topic) u.searchParams.set("topic", params.topic);
  if (params.seed) u.searchParams.set("seed", params.seed);
  if (String(params.variant || "") !== "") u.searchParams.set("v", String(params.variant));
  return u.toString();
}

function copyText(txt){
  return navigator.clipboard.writeText(String(txt || ""));
}

function qs(id){
  return document.getElementById(id);
}

let timerInterval = null;

function stopTimer(){
  if (timerInterval) window.clearInterval(timerInterval);
  timerInterval = null;
}

function formatMMSS(totalSec){
  const s = Math.max(0, totalSec | 0);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return mm + ":" + ss;
}

function timerKey(hash){
  return LS_TIMER_PREFIX + String(hash || "");
}

function loadTimer(hash){
  const raw = localStorage.getItem(timerKey(hash));
  if (!raw) return null;
  try{ return JSON.parse(raw); }catch{ return null; }
}

function saveTimer(hash, state){
  try{ localStorage.setItem(timerKey(hash), JSON.stringify(state)); }catch{}
}

function notesKey(hash){
  return LS_NOTES_PREFIX + String(hash || "");
}

function loadNotes(hash){
  try{ return String(localStorage.getItem(notesKey(hash)) || ""); }catch{ return ""; }
}

function saveNotes(hash, txt){
  try{ localStorage.setItem(notesKey(hash), String(txt || "")); }catch{}
}

function buildMarkdown(state){
  const lines = [];
  lines.push("# 6h Sprint Board");
  lines.push("");
  lines.push("- topic: " + (state.topic || ""));
  lines.push("- seed: " + (state.seed || ""));
  lines.push("- variant: " + String(state.variant));
  lines.push("- hash: " + (state.hash || ""));
  lines.push("");
  lines.push("## Cards");
  for (const c of state.cards){
    lines.push("");
    lines.push("- **" + c.title + "**: " + c.text);
  }
  lines.push("");
  lines.push("## Notes");
  lines.push(state.notes ? state.notes : "(empty)");
  lines.push("");
  lines.push("Commit: `" + state.commit + "`");
  return lines.join("\n");
}

function render(state){
  qs("kSeed").textContent = "seed: " + (state.seed || "-");
  qs("kHash").textContent = "hash: " + (state.hash || "-");
  qs("commitLine").value = state.commit || "";

  const cardsEl = qs("cards");
  cardsEl.innerHTML = "";
  for (const c of state.cards){
    const el = document.createElement("div");
    el.className = "sCard";
    const h3 = document.createElement("h3");
    h3.textContent = c.title;
    const p = document.createElement("p");
    p.textContent = c.text;
    const tag = document.createElement("div");
    tag.className = "tag";
    tag.textContent = c.tag;
    el.appendChild(h3);
    el.appendChild(p);
    el.appendChild(tag);
    cardsEl.appendChild(el);
  }

  const link = buildPermalink({ topic: state.topic, seed: state.seed, variant: state.variant });
  qs("permalink").value = link;

  const n = loadNotes(state.hash);
  qs("notes").value = n;
}

function currentStateFromInputs(){
  const topic = String(qs("topic").value || "").trim();
  const seed = String(qs("seed").value || "").trim();
  const variant = clampInt(qs("variant").value, 0, 99, 0);
  const b = buildBoard(topic, seed, variant);
  const notes = String(qs("notes").value || "");
  return { topic, seed, variant, hash: b.hash, cards: b.cards, commit: b.commit, notes };
}

function applyFromUrl(){
  const u = new URL(window.location.href);
  const topic = u.searchParams.get("topic") || "";
  const seed = u.searchParams.get("seed") || "";
  const v = u.searchParams.get("v") || "0";
  if (topic) qs("topic").value = topic;
  if (seed) qs("seed").value = seed;
  qs("variant").value = String(clampInt(v, 0, 99, 0));
}

function init(){
  applyFromUrl();

  qs("btnNow").addEventListener("click", () => {
    qs("seed").value = nowUtcCompact();
  });

  qs("btnSnap").addEventListener("click", () => {
    qs("seed").value = nowUtcSixHourSeed();
  });

  qs("btnGen").addEventListener("click", () => {
    const s = currentStateFromInputs();
    render(s);
  });

  qs("btnNext").addEventListener("click", () => {
    const v = clampInt(qs("variant").value, 0, 99, 0);
    qs("variant").value = String((v + 1) % 100);
    const s = currentStateFromInputs();
    render(s);
  });

  qs("btnCopyLink").addEventListener("click", async () => {
    try{ await copyText(qs("permalink").value); }catch{}
  });

  qs("btnCopyRel").addEventListener("click", async () => {
    try{
      const u = new URL(qs("permalink").value);
      const rel = u.pathname + (u.search || "");
      await copyText(rel);
    }catch{}
  });

  qs("notes").addEventListener("input", () => {
    const s = currentStateFromInputs();
    saveNotes(s.hash, qs("notes").value);
  });

  qs("btnClearNotes").addEventListener("click", () => {
    const s = currentStateFromInputs();
    qs("notes").value = "";
    saveNotes(s.hash, "");
  });

  qs("btnCopyCommit").addEventListener("click", async () => {
    try{ await copyText(qs("commitLine").value); }catch{}
  });

  qs("btnCopyMd").addEventListener("click", async () => {
    const s = currentStateFromInputs();
    s.notes = qs("notes").value;
    const md = buildMarkdown(s);
    try{ await copyText(md); }catch{}
  });

  // Timer
  function setDisplay(sec){
    qs("timerDisplay").value = formatMMSS(sec);
  }

  function syncTimerFromStorage(hash){
    const st = loadTimer(hash);
    if (!st){
      const min = clampInt(qs("timerMin").value, 1, 120, 25);
      setDisplay(min * 60);
      return;
    }
    const now = Date.now();
    let remaining = st.remainingSec | 0;
    if (st.running && st.startedAtMs){
      const elapsed = Math.floor((now - st.startedAtMs) / 1000);
      remaining = Math.max(0, (st.remainingAtStartSec | 0) - elapsed);
    }
    setDisplay(remaining);
  }

  function startTimer(){
    stopTimer();
    const s = currentStateFromInputs();
    const hash = s.hash || "global";

    const cur = loadTimer(hash);
    const now = Date.now();
    let remaining = 25 * 60;

    if (cur){
      remaining = cur.remainingSec | 0;
      if (cur.running && cur.startedAtMs){
        const elapsed = Math.floor((now - cur.startedAtMs) / 1000);
        remaining = Math.max(0, (cur.remainingAtStartSec | 0) - elapsed);
      }
    }else{
      const min = clampInt(qs("timerMin").value, 1, 120, 25);
      remaining = min * 60;
    }

    const st = {
      running: true,
      startedAtMs: now,
      remainingAtStartSec: remaining,
      remainingSec: remaining
    };
    saveTimer(hash, st);

    timerInterval = window.setInterval(() => {
      const now2 = Date.now();
      const elapsed2 = Math.floor((now2 - st.startedAtMs) / 1000);
      const r = Math.max(0, (st.remainingAtStartSec | 0) - elapsed2);
      setDisplay(r);
      if (r <= 0){
        stopTimer();
        const done = loadTimer(hash) || st;
        done.running = false;
        done.remainingSec = 0;
        saveTimer(hash, done);
      }
    }, 250);
  }

  function pauseTimer(){
    stopTimer();
    const s = currentStateFromInputs();
    const hash = s.hash || "global";
    const st = loadTimer(hash);
    if (!st) return;

    const now = Date.now();
    let remaining = st.remainingSec | 0;
    if (st.running && st.startedAtMs){
      const elapsed = Math.floor((now - st.startedAtMs) / 1000);
      remaining = Math.max(0, (st.remainingAtStartSec | 0) - elapsed);
    }

    st.running = false;
    st.remainingSec = remaining;
    st.startedAtMs = 0;
    st.remainingAtStartSec = remaining;
    saveTimer(hash, st);
    setDisplay(remaining);
  }

  function resetTimer(){
    stopTimer();
    const s = currentStateFromInputs();
    const hash = s.hash || "global";
    const min = clampInt(qs("timerMin").value, 1, 120, 25);
    const st = {
      running: false,
      startedAtMs: 0,
      remainingAtStartSec: min * 60,
      remainingSec: min * 60
    };
    saveTimer(hash, st);
    setDisplay(min * 60);
  }

  qs("btnTimerStart").addEventListener("click", startTimer);
  qs("btnTimerPause").addEventListener("click", pauseTimer);
  qs("btnTimerReset").addEventListener("click", resetTimer);

  // initial render
  const s0 = currentStateFromInputs();
  render(s0);
  syncTimerFromStorage(s0.hash || "global");
}

init();
