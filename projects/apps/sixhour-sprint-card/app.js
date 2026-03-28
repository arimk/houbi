// Six-Hour Sprint Card
// Deterministic sprint prompt + constraints + checklist, seeded by UTC.
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

const BANK = {
  prompts: [
    "Ship a tiny tool that turns a vague feeling into a clear choice.",
    "Make a small page that rewards curiosity in under 30 seconds.",
    "Build a single-purpose widget that reduces a recurring friction.",
    "Create a mini-app that generates one good question (then stops).",
    "Publish a tiny artifact that makes your thinking visible.",
    "Make a micro playground for a constraint you keep avoiding.",
    "Turn a messy list into a calm interface.",
    "Design a one-screen ritual for starting (not finishing)."
  ],
  constraints: [
    "No external libraries.",
    "One screen only.",
    "Must work offline.",
    "Use only 2 colors + 1 accent.",
    "Make it shareable via URL.",
    "Prefer text over images.",
    "Add a single keyboard shortcut.",
    "Include an export button.",
    "Handle empty input gracefully.",
    "Delight: one subtle animation max."
  ],
  deliverables: [
    "A new app folder under projects/apps/<slug>/.",
    "A new post with a link + what changed.",
    "A before/after note: what got simpler?",
    "A next step idea (one sentence)."
  ],
  rules: [
    "Timebox: stop at the bell and commit.",
    "Avoid polishing: prioritize a visible change.",
    "If stuck for 7 minutes: shrink the goal by half.",
    "Document the decision in the post.",
    "Make one thing clickably useful."
  ]
};

function buildCard(seed, variant, minutes){
  const s = String(seed || "").trim();
  const v = clampInt(variant, 0, 99, 0);
  const m = clampInt(minutes, 5, 180, 45);

  const key = s + "::v" + String(v) + "::m" + String(m);
  const hash = fnv1a32(key);
  const rng = xorshift32(hash ^ 0x9e3779b9);

  const prompt = pick(rng, BANK.prompts);

  const c1 = pick(rng, BANK.constraints);
  let c2 = pick(rng, BANK.constraints);
  let tries = 0;
  while (c2 === c1 && tries < 10){
    c2 = pick(rng, BANK.constraints);
    tries++;
  }

  const rule = pick(rng, BANK.rules);

  const checklist = [
    "Name the smallest shippable version (1 sentence).",
    "Make the main interaction work end-to-end.",
    "Add one tiny affordance (copy/export/link).",
    "Write the post: what it does + link + next step.",
    "Run build, commit, push."
  ];

  return {
    seed: s,
    variant: v,
    minutes: m,
    hashHex: u32ToHex(hash),
    prompt,
    constraints: [c1, c2],
    rule,
    deliverables: BANK.deliverables.slice(),
    checklist
  };
}

function readQuery(){
  const p = new URLSearchParams(window.location.search || "");
  return {
    seed: p.get("seed") || "",
    v: p.get("v") || "0",
    m: p.get("m") || "45"
  };
}

function setQuery(seed, v, m){
  const p = new URLSearchParams();
  if (seed) p.set("seed", seed);
  p.set("v", String(v));
  p.set("m", String(m));
  const qs = p.toString();
  const url = window.location.pathname + (qs ? ("?" + qs) : "");
  window.history.replaceState(null, "", url);
}

function currentLink(){
  return window.location.origin + window.location.pathname + window.location.search;
}

async function copyToClipboard(text){
  await navigator.clipboard.writeText(text);
}

function fmtTimer(sec){
  const s = Math.max(0, sec | 0);
  const mm = Math.floor(s / 60);
  const rr = s % 60;
  return String(mm).padStart(2, "0") + ":" + String(rr).padStart(2, "0");
}

function buildMarkdown(card){
  const lines = [];
  lines.push("# Six-Hour Sprint Card");
  lines.push("");
  lines.push("- seed: " + (card.seed || "(empty)"));
  lines.push("- variant: " + String(card.variant));
  lines.push("- minutes: " + String(card.minutes));
  lines.push("- hash: " + String(card.hashHex));
  lines.push("");
  lines.push("## Prompt");
  lines.push("");
  lines.push(card.prompt);
  lines.push("");
  lines.push("## Constraints");
  lines.push("");
  for (const c of card.constraints) lines.push("- " + c);
  lines.push("");
  lines.push("## Rule");
  lines.push("");
  lines.push("- " + card.rule);
  lines.push("");
  lines.push("## Checklist");
  lines.push("");
  for (const t of card.checklist) lines.push("- [ ] " + t);
  lines.push("");
  lines.push("## Deliverables");
  lines.push("");
  for (const d of card.deliverables) lines.push("- " + d);
  lines.push("");
  return lines.join("\n");
}

function main(){
  const elSeed = document.getElementById("seed");
  const elVariant = document.getElementById("variant");
  const elMinutes = document.getElementById("minutes");
  const elStatus = document.getElementById("status");

  const elOutMd = document.getElementById("outMd");
  const elCard = document.getElementById("card");

  const kSeed = document.getElementById("kSeed");
  const kHash = document.getElementById("kHash");
  const kTimer = document.getElementById("kTimer");

  const q = readQuery();
  if (q.seed) elSeed.value = q.seed;
  elVariant.value = String(clampInt(q.v, 0, 99, 0));
  elMinutes.value = String(clampInt(q.m, 5, 180, 45));

  if (!elSeed.value) elSeed.value = nowUtcCompact();

  let timerHandle = null;
  let timerSec = 0;

  function statusOk(msg){
    if (!elStatus) return;
    elStatus.className = "status ok";
    elStatus.textContent = msg;
  }

  function statusWarn(msg){
    if (!elStatus) return;
    elStatus.className = "status warn";
    elStatus.textContent = msg;
  }

  function statusNeutral(msg){
    if (!elStatus) return;
    elStatus.className = "status";
    elStatus.textContent = msg;
  }

  function timerStop(){
    if (timerHandle){
      clearInterval(timerHandle);
      timerHandle = null;
    }
  }

  function timerRender(){
    if (kTimer) kTimer.textContent = "timer: " + fmtTimer(timerSec);
  }

  function timerReset(min){
    timerStop();
    const m = clampInt(min, 5, 180, 45);
    timerSec = m * 60;
    timerRender();
  }

  function timerStart(){
    if (timerHandle) return;
    if (timerSec <= 0) timerReset(elMinutes.value);
    timerHandle = setInterval(() => {
      timerSec = Math.max(0, (timerSec | 0) - 1);
      timerRender();
      if (timerSec <= 0){
        timerStop();
        try { navigator.vibrate && navigator.vibrate([140, 80, 140]); } catch {}
        statusOk("Time. Commit the smallest thing.");
      }
    }, 1000);
    statusOk("Timer running.");
  }

  function render(){
    const seed = String(elSeed.value || "").trim();
    const v = clampInt(elVariant.value, 0, 99, 0);
    const m = clampInt(elMinutes.value, 5, 180, 45);

    const card = buildCard(seed, v, m);
    setQuery(card.seed, card.variant, card.minutes);

    if (kSeed) kSeed.textContent = "seed: " + (card.seed || "(empty)");
    if (kHash) kHash.textContent = "hash: " + card.hashHex;

    // If timer not running, keep it aligned with minutes.
    if (!timerHandle){
      timerReset(card.minutes);
    }

    const md = buildMarkdown(card);
    if (elOutMd) elOutMd.value = md;

    if (elCard){
      elCard.innerHTML = "";

      const h = document.createElement("div");
      h.className = "cardTitle";
      h.textContent = "Sprint: " + String(card.minutes) + " minutes";

      const meta = document.createElement("div");
      meta.className = "cardMeta";
      meta.textContent = "seed " + (card.seed || "(empty)") + " | v" + String(card.variant) + " | hash " + card.hashHex;

      const bPrompt = document.createElement("div");
      bPrompt.className = "cardBlock";
      const pH = document.createElement("h3");
      pH.textContent = "Prompt";
      const pT = document.createElement("div");
      pT.className = "cardPrompt";
      pT.textContent = card.prompt;
      bPrompt.appendChild(pH);
      bPrompt.appendChild(pT);

      const bCons = document.createElement("div");
      bCons.className = "cardBlock";
      const cH = document.createElement("h3");
      cH.textContent = "Constraints";
      const cUl = document.createElement("ul");
      for (const c of card.constraints){
        const li = document.createElement("li");
        li.textContent = c;
        cUl.appendChild(li);
      }
      bCons.appendChild(cH);
      bCons.appendChild(cUl);

      const bRule = document.createElement("div");
      bRule.className = "cardBlock";
      const rH = document.createElement("h3");
      rH.textContent = "Rule";
      const rUl = document.createElement("ul");
      const rLi = document.createElement("li");
      rLi.textContent = card.rule;
      rUl.appendChild(rLi);
      bRule.appendChild(rH);
      bRule.appendChild(rUl);

      const bChk = document.createElement("div");
      bChk.className = "cardBlock";
      const chH = document.createElement("h3");
      chH.textContent = "Checklist";
      const chUl = document.createElement("ul");
      chUl.className = "checklist";
      for (const t of card.checklist){
        const li = document.createElement("li");
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.setAttribute("aria-label", "Checklist item");
        const txt = document.createElement("div");
        txt.className = "txt";
        txt.textContent = t;
        li.appendChild(cb);
        li.appendChild(txt);
        chUl.appendChild(li);
      }
      bChk.appendChild(chH);
      bChk.appendChild(chUl);

      elCard.appendChild(h);
      elCard.appendChild(meta);
      elCard.appendChild(bPrompt);
      elCard.appendChild(bCons);
      elCard.appendChild(bRule);
      elCard.appendChild(bChk);
    }

    statusNeutral("Generated.");
    return { card, md };
  }

  document.getElementById("btnGen").addEventListener("click", () => { render(); });

  document.getElementById("btnNext").addEventListener("click", () => {
    elVariant.value = String(clampInt(Number(elVariant.value) + 1, 0, 99, 0));
    render();
  });

  document.getElementById("btnRemix").addEventListener("click", () => {
    elSeed.value = nowUtcCompact();
    elVariant.value = "0";
    render();
  });

  document.getElementById("btnCopy").addEventListener("click", async () => {
    const r = render();
    try {
      await copyToClipboard(r.md);
      statusOk("Copied Markdown.");
    } catch {
      statusWarn("Clipboard unavailable. Select and copy manually.");
    }
  });

  document.getElementById("btnLink").addEventListener("click", async () => {
    render();
    const url = currentLink();
    try {
      await copyToClipboard(url);
      statusOk("Copied link.");
    } catch {
      statusWarn(url);
    }
  });

  document.getElementById("btnStart").addEventListener("click", () => { render(); timerStart(); });
  document.getElementById("btnPause").addEventListener("click", () => { timerStop(); statusNeutral("Paused."); });
  document.getElementById("btnReset").addEventListener("click", () => { timerReset(elMinutes.value); statusNeutral("Reset."); });

  // Keep output in sync.
  elSeed.addEventListener("input", () => { render(); });
  elVariant.addEventListener("input", () => { render(); });
  elMinutes.addEventListener("input", () => { render(); });

  // Keyboard: R generate, N next, S start/pause.
  window.addEventListener("keydown", (e) => {
    const tag = String((e.target && e.target.tagName) || "").toLowerCase();
    const isTyping = tag === "input" || tag === "textarea";
    if (isTyping) return;

    if (e.key === "r" || e.key === "R"){ e.preventDefault(); render(); }
    if (e.key === "n" || e.key === "N"){ e.preventDefault(); elVariant.value = String(clampInt(Number(elVariant.value) + 1, 0, 99, 0)); render(); }
    if (e.key === "s" || e.key === "S"){
      e.preventDefault();
      render();
      if (timerHandle) { timerStop(); statusNeutral("Paused."); }
      else { timerStart(); }
    }
  });

  render();
}

main();
