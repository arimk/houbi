function fnv1a32(str){
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
function utcNowStamp(){
  const d = new Date();
  return d.getUTCFullYear() + "-" + pad2(d.getUTCMonth()+1) + "-" + pad2(d.getUTCDate()) +
    "T" + pad2(d.getUTCHours()) + ":" + pad2(d.getUTCMinutes()) + ":" + pad2(d.getUTCSeconds()) + "Z";
}

function utcSixHourSeed(){
  const d = new Date();
  const y = d.getUTCFullYear();
  const mo = pad2(d.getUTCMonth() + 1);
  const da = pad2(d.getUTCDate());
  const hh = Math.floor(d.getUTCHours() / 6) * 6;
  return String(y) + String(mo) + String(da) + "T" + pad2(hh) + "00Z";
}

function tryNotifyDone(){
  if (!els.chkNotify || !els.chkNotify.checked) return;
  if (!("Notification" in window)) return;

  const st = getState();
  const body = st.topic ? ("Intent: " + st.topic) : "Sprint finished.";

  if (Notification.permission === "granted"){
    try { new Notification("Sprint done", { body }); } catch {}
    return;
  }

  if (Notification.permission === "default"){
    Notification.requestPermission().then((p) => {
      if (p === "granted"){
        try { new Notification("Sprint done", { body }); } catch {}
      }
    }).catch(() => {});
  }
}

function readQuery(){
  const sp = new URLSearchParams(window.location.search || "");
  return {
    seed: (sp.get("seed") || "").trim(),
    topic: (sp.get("topic") || "").trim(),
    minutes: (sp.get("m") || "").trim(),
    mode: (sp.get("mode") || "").trim()
  };
}

function setQuery({ seed, topic, minutes, mode }){
  const sp = new URLSearchParams(window.location.search || "");
  if (seed) sp.set("seed", seed); else sp.delete("seed");
  if (topic) sp.set("topic", topic); else sp.delete("topic");
  if (minutes) sp.set("m", String(minutes)); else sp.delete("m");
  if (mode) sp.set("mode", String(mode)); else sp.delete("mode");
  const qs = sp.toString();
  const url = window.location.pathname + (qs ? ("?" + qs) : "") + window.location.hash;
  window.history.replaceState(null, "", url);
}

function currentLink(){
  return window.location.origin + window.location.pathname + window.location.search;
}

function safeOneLine(s, max){
  const x = String(s || "").replace(/\s+/g, " ").trim();
  if (!x) return "";
  return x.slice(0, max);
}

const $ = (id) => document.getElementById(id);

const els = {
  seed: $("seed"),
  topic: $("topic"),
  minutes: $("minutes"),
  mode: $("mode"),
  btnPrompt: $("btnPrompt"),
  btnSnap6h: $("btnSnap6h"),
  btnLink: $("btnLink"),
  prompt: $("prompt"),
  metaHash: $("metaHash"),
  clock: $("clock"),
  timerMeta: $("timerMeta"),
  btnStart: $("btnStart"),
  btnPause: $("btnPause"),
  btnReset: $("btnReset"),
  btnMark: $("btnMark"),
  chkNotify: $("chkNotify"),
  notes: $("notes"),
  btnCopy: $("btnCopy"),
  btnDownload: $("btnDownload"),
  btnClear: $("btnClear"),
  mdPreview: $("mdPreview"),
  metaRun: $("metaRun")
};

const PROMPTS = {
  build: [
    "Ship one visible change that removes friction.",
    "Make the smallest version that still feels complete.",
    "Add one feature + one affordance (hint/help/export).",
    "Make it offline, linkable, and reversible.",
    "Turn a repeated annoyance into a one-screen tool."
  ],
  write: [
    "Write a tight draft, then cut 20%.",
    "Name the tension. Name the tradeoff.",
    "End with an honest open question.",
    "Make the structure obvious: claim, example, next step.",
    "Write for a tired reader: short sentences, clear verbs."
  ],
  clean: [
    "Delete one thing. Simplify two things.",
    "Improve labels, spacing, and defaults.",
    "Add one test or one guardrail.",
    "Reduce surprise: make state visible.",
    "Make it easier to undo than to do."
  ],
  review: [
    "Look for the smallest missing link.",
    "What is confusing to a first-time user? Fix that.",
    "Add one example or one explanation.",
    "Improve the happy path: fewer clicks, better defaults.",
    "Write the next step as if future-you is busy."
  ]
};

let timer = {
  state: "idle",
  totalMs: 25 * 60 * 1000,
  remainingMs: 25 * 60 * 1000,
  startedAt: 0,
  tickId: null,
  finishedAt: 0,
  doneMarks: []
};

function fmtClock(ms){
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return String(mm).padStart(2, "0") + ":" + String(ss).padStart(2, "0");
}

function setButtons(){
  els.btnStart.disabled = (timer.state === "running");
  els.btnPause.disabled = (timer.state !== "running");
}

function renderTimer(){
  els.clock.textContent = fmtClock(timer.remainingMs);
  let meta = "Ready.";
  if (timer.state === "running") meta = "Running...";
  if (timer.state === "done") meta = "Done. Nice. Add notes and export.";
  els.timerMeta.textContent = meta;
  setButtons();
}

function stopTick(){
  if (timer.tickId) window.clearInterval(timer.tickId);
  timer.tickId = null;
}

function startTick(){
  stopTick();
  timer.tickId = window.setInterval(() => {
    const now = Date.now();
    const elapsed = now - timer.startedAt;
    timer.remainingMs = Math.max(0, timer.totalMs - elapsed);
    if (timer.remainingMs <= 0){
      timer.state = "done";
      timer.finishedAt = now;
      stopTick();
      tryBeep();
      tryNotifyDone();
    }
    renderTimer();
    renderMarkdown();
  }, 250);
}

function tryBeep(){
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 660;
    g.gain.value = 0.001;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
    o.stop(ctx.currentTime + 0.24);
    window.setTimeout(() => { try { ctx.close(); } catch {} }, 400);
  } catch {
    // ignore
  }
}

function getState(){
  const seed = safeOneLine(els.seed.value, 80);
  const topic = safeOneLine(els.topic.value, 120);
  const minutes = String(els.minutes.value || "").trim();
  const mode = String(els.mode.value || "build").trim();
  return { seed, topic, minutes, mode };
}

function hashForState(st){
  return fnv1a32([st.seed, st.topic, st.minutes, st.mode].join("|"));
}

function genPrompt(){
  const st = getState();
  const h = hashForState(st);
  const rng = mulberry32(h);
  const pool = PROMPTS[st.mode] || PROMPTS.build;

  const constraint = pick(rng, [
    "one screen only",
    "no dependencies",
    "export something",
    "linkable state",
    "offline-first"
  ]);

  const success = pick(rng, [
    "a user can finish in under 30 seconds",
    "you can explain it in 2 sentences",
    "no dead ends",
    "defaults feel good",
    "it looks calm"
  ]);

  const micro = pick(rng, pool);
  const intent = st.topic ? ("Intent: " + st.topic) : "Intent: (write one sentence)";

  const out =
    "Seed: " + (st.seed || "-") + "\n" +
    intent + "\n" +
    "Mode: " + st.mode + " | Minutes: " + st.minutes + "\n\n" +
    "Micro prompt: " + micro + "\n" +
    "Constraint: " + constraint + "\n" +
    "Success metric: " + success;

  els.prompt.textContent = out;
  els.metaHash.textContent = "hash: " + h;
  els.metaRun.textContent = "run: " + utcNowStamp();

  setQuery({ seed: st.seed, topic: st.topic, minutes: st.minutes, mode: st.mode });
  renderMarkdown();
}

function renderMarkdown(){
  const st = getState();
  const h = hashForState(st);
  const now = utcNowStamp();

  const marks = timer.doneMarks.map((m, i) => "- [x] done mark " + (i+1) + " at " + m).join("\n");
  const marksBlock = marks ? ("\n\n" + marks) : "";

  const md =
    "# Sprint log\n\n" +
    "- time: " + now + "\n" +
    "- seed: " + (st.seed || "-") + "\n" +
    "- intent: " + (st.topic || "-") + "\n" +
    "- mode: " + st.mode + "\n" +
    "- minutes: " + st.minutes + "\n" +
    "- hash: " + h + "\n" +
    "\n" +
    "## Prompt\n\n" +
    els.prompt.textContent + "\n" +
    "\n## Notes\n\n" +
    (els.notes.value || "") +
    marksBlock +
    "\n";

  els.mdPreview.textContent = md;
  return md;
}

async function copyText(text){
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function downloadText(filename, text){
  const blob = new Blob([text], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function bootFromQuery(){
  const q = readQuery();
  if (q.seed) els.seed.value = q.seed;
  if (q.topic) els.topic.value = q.topic;
  if (q.minutes){
    const ok = ["15","25","45","60"].includes(q.minutes) ? q.minutes : "25";
    els.minutes.value = ok;
  }
  if (q.mode){
    const ok = ["build","write","clean","review"].includes(q.mode) ? q.mode : "build";
    els.mode.value = ok;
  }
  timer.totalMs = Number(els.minutes.value) * 60 * 1000;
  timer.remainingMs = timer.totalMs;

  try {
    const v = window.localStorage.getItem("sprintTicker.notify");
    if (els.chkNotify) els.chkNotify.checked = (v === "1");
  } catch {}

  renderTimer();
  renderMarkdown();
}

els.btnPrompt.addEventListener("click", () => genPrompt());

if (els.btnSnap6h){
  els.btnSnap6h.addEventListener("click", () => {
    els.seed.value = utcSixHourSeed();
    genPrompt();
  });
}

if (els.chkNotify){
  els.chkNotify.addEventListener("change", () => {
    try { window.localStorage.setItem("sprintTicker.notify", els.chkNotify.checked ? "1" : "0"); } catch {}
    if (els.chkNotify.checked && ("Notification" in window) && Notification.permission === "default"){
      try {
        Notification.requestPermission().then(() => {}).catch(() => {});
      } catch {}
    }
  });
}

els.btnLink.addEventListener("click", async () => {
  genPrompt();
  const ok = await copyText(currentLink());
  els.timerMeta.textContent = ok ? "Link copied." : "Could not copy link.";
});

els.minutes.addEventListener("change", () => {
  const m = Number(els.minutes.value);
  timer.totalMs = m * 60 * 1000;
  timer.remainingMs = timer.totalMs;
  timer.state = "idle";
  stopTick();
  renderTimer();
  renderMarkdown();
});

els.mode.addEventListener("change", () => { renderMarkdown(); });
els.seed.addEventListener("input", () => { renderMarkdown(); });
els.topic.addEventListener("input", () => { renderMarkdown(); });
els.notes.addEventListener("input", () => { renderMarkdown(); });

els.btnStart.addEventListener("click", () => {
  timer.state = "running";
  timer.startedAt = Date.now() - (timer.totalMs - timer.remainingMs);
  startTick();
  renderTimer();
});

els.btnPause.addEventListener("click", () => {
  if (timer.state !== "running") return;
  timer.state = "idle";
  const elapsed = Date.now() - timer.startedAt;
  timer.remainingMs = Math.max(0, timer.totalMs - elapsed);
  stopTick();
  renderTimer();
  renderMarkdown();
});

els.btnReset.addEventListener("click", () => {
  timer.state = "idle";
  timer.remainingMs = timer.totalMs;
  timer.startedAt = 0;
  stopTick();
  renderTimer();
  renderMarkdown();
});

els.btnMark.addEventListener("click", () => {
  const t = utcNowStamp();
  timer.doneMarks.push(t);
  els.timerMeta.textContent = "Marked done at " + t;
  renderMarkdown();
});

els.btnCopy.addEventListener("click", async () => {
  const md = renderMarkdown();
  const ok = await copyText(md);
  els.timerMeta.textContent = ok ? "Markdown copied." : "Could not copy Markdown.";
});

els.btnDownload.addEventListener("click", () => {
  const md = renderMarkdown();
  const fn = "sprint-" + utcNowStamp().replace(/[:]/g, "") + ".md";
  downloadText(fn, md);
});

els.btnClear.addEventListener("click", () => {
  els.notes.value = "";
  timer.doneMarks = [];
  renderMarkdown();
});

bootFromQuery();
