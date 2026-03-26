const $ = (sel) => document.querySelector(sel);

function pad2(n){ return String(n).padStart(2, "0"); }

function utcTsFromDate(d){
  const y = d.getUTCFullYear();
  const mo = pad2(d.getUTCMonth() + 1);
  const da = pad2(d.getUTCDate());
  const hh = pad2(d.getUTCHours());
  const mm = pad2(d.getUTCMinutes());
  return `${y}${mo}${da}T${hh}${mm}Z`;
}

function utcHumanFromDate(d){
  const y = d.getUTCFullYear();
  const mo = pad2(d.getUTCMonth() + 1);
  const da = pad2(d.getUTCDate());
  const hh = pad2(d.getUTCHours());
  const mm = pad2(d.getUTCMinutes());
  return `${y}-${mo}-${da} ${hh}:${mm}`;
}

function floorToSixHours(d){
  const y = d.getUTCFullYear();
  const mo = d.getUTCMonth();
  const da = d.getUTCDate();
  const hh = d.getUTCHours();
  const flo = Math.floor(hh / 6) * 6;
  return new Date(Date.UTC(y, mo, da, flo, 0, 0));
}

function parseTs(ts){
  // Expected: YYYYMMDDTHHMMZ
  const m = /^([0-9]{4})([0-9]{2})([0-9]{2})T([0-9]{2})([0-9]{2})Z$/.exec((ts || "").trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const da = Number(m[3]);
  const hh = Number(m[4]);
  const mm = Number(m[5]);
  const d = new Date(Date.UTC(y, mo, da, hh, mm, 0));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function addHours(d, hours){
  return new Date(d.getTime() + hours * 60 * 60 * 1000);
}

function hash32(str){
  // FNV-1a 32-bit
  let h = 2166136261;
  for (let i = 0; i < str.length; i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function xorshift32(seed){
  let x = seed >>> 0;
  return () => {
    x ^= (x << 13) >>> 0;
    x ^= (x >>> 17) >>> 0;
    x ^= (x << 5) >>> 0;
    return (x >>> 0);
  };
}

function pick(rng, arr){
  const n = arr.length;
  const v = rng() % n;
  return arr[v];
}

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function blockLabelFromSeedTs(ts){
  const d = parseTs(ts);
  if (!d) return "-";
  const start = floorToSixHours(d);
  const end = new Date(start.getTime() + 6 * 60 * 60 * 1000 - 60 * 1000);
  const sameDay = start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth() && start.getUTCDate() === end.getUTCDate();
  if (sameDay){
    return `${utcHumanFromDate(start)}-${pad2(end.getUTCHours())}:${pad2(end.getUTCMinutes())} UTC`;
  }
  return `${utcHumanFromDate(start)} to ${utcHumanFromDate(end)} UTC`;
}

function planFor(ts, minutes, energy){
  const seed = hash32(`${ts}|${minutes}|${energy}`);
  const rng = xorshift32(seed);

  const modes = [
    "Build a tiny thing",
    "Write and sharpen",
    "Polish and simplify",
    "Ship and share"
  ];

  const mode = pick(rng, modes);

  const openers = [
    "Make it real, then make it better.",
    "Small, committed output beats perfect intent.",
    "Do the smallest action that changes the deployed artifact.",
    "If you can not demo it, it did not happen."
  ];

  const constraints = [
    "One file only.",
    "No new dependencies.",
    "No scrolling UI.",
    "Must work offline.",
    "Must be linkable.",
    "Text first, styling last.",
    "Cut scope by 30%."
  ];

  const deliverables = [
    "A live page with one clear interaction.",
    "A new post that ends with a question.",
    "A before/after screenshot and a short note.",
    "A tiny tool you can re-use tomorrow.",
    "A single new feature for an existing mini-app."
  ];

  const energyMoves = {
    low: [
      "Copy the last shipped thing, remove one annoyance.",
      "Fix one bug, then stop.",
      "Reduce friction: rename, reorder, simplify."
    ],
    medium: [
      "Add one useful control.",
      "Add one export path (copy/link/download).",
      "Add one guided workflow (step 1/2/3)."
    ],
    high: [
      "Add one new mode or view.",
      "Add keyboard shortcuts and a focus flow.",
      "Add a small visual artifact (SVG) and make it shareable."
    ]
  };

  const timePlan = (() => {
    const m = clamp(Number(minutes) || 35, 10, 120);
    const a = Math.max(5, Math.round(m * 0.20));
    const b = Math.max(10, Math.round(m * 0.60));
    const c = Math.max(5, m - a - b);
    return { m, a, b, c };
  })();

  const opener = pick(rng, openers);
  const constraint = pick(rng, constraints);
  const deliverable = pick(rng, deliverables);
  const move = pick(rng, energyMoves[energy] || energyMoves.medium);

  const steps = [
    `${timePlan.a}m: Decide the smallest change. Write the acceptance check in one sentence.`,
    `${timePlan.b}m: Build. Keep the loop tight (refresh, test, commit-ready).`,
    `${timePlan.c}m: Ship polish: title, one hint line, and an export path.`
  ];

  const checklist = [
    "Can someone use it without reading instructions?",
    "Is there one obvious next step?",
    "Did you make a committed change (git diff not empty)?"
  ];

  const md = [
    `## Six-Hour Compass (${ts})`,
    "",
    `Block: ${blockLabelFromSeedTs(ts)}`,
    "",
    `Mode: **${mode}**`,
    "",
    `Constraint: **${constraint}**`,
    "",
    `Deliverable: **${deliverable}**`,
    "",
    `Move: ${move}`,
    "",
    "Plan:",
    ...steps.map((s) => `- ${s}`),
    "",
    "Checks:",
    ...checklist.map((s) => `- ${s}`),
    "",
    `Note: ${opener}`
  ].join("\n");

  return {
    mode,
    opener,
    constraint,
    deliverable,
    move,
    steps,
    checklist,
    md
  };
}

function setStatus(msg, kind){
  const el = $("#status");
  el.textContent = msg;
  el.classList.remove("ok");
  el.classList.remove("warn");
  if (kind) el.classList.add(kind);
}

function setPlanHtml(ts, plan){
  const el = $("#plan");
  el.innerHTML = [
    `<h3>${plan.opener}</h3>`,
    `<div><strong>Mode:</strong> ${plan.mode}</div>`,
    `<div><strong>Constraint:</strong> ${plan.constraint}</div>`,
    `<div><strong>Deliverable:</strong> ${plan.deliverable}</div>`,
    `<div><strong>Move:</strong> ${plan.move}</div>`,
    "<ul>",
    ...plan.steps.map((s) => `<li>${escapeHtml(s)}</li>`),
    "</ul>",
    "<ul>",
    ...plan.checklist.map((s) => `<li>${escapeHtml(s)}</li>`),
    "</ul>"
  ].join("\n");

  $("#kSeed").textContent = `seed: ${ts}`;
  $("#kBlock").textContent = `block: ${blockLabelFromSeedTs(ts)}`;
  $("#kMode").textContent = `mode: ${plan.mode}`;
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function copyText(text){
  try{
    await navigator.clipboard.writeText(text);
    return true;
  }catch(_e){
    return false;
  }
}

function getSeedFromUrl(){
  const u = new URL(window.location.href);
  const seed = u.searchParams.get("seed");
  return seed || "";
}

function setUrlSeed(seed){
  const u = new URL(window.location.href);
  u.searchParams.set("seed", seed);
  history.replaceState(null, "", u.toString());
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

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function boot(){
  const seedInUrl = getSeedFromUrl();
  if (seedInUrl) $("#seed").value = seedInUrl;

  function setSeedToCurrentBlock(quiet){
    const now = new Date();
    const flo = floorToSixHours(now);
    $("#seed").value = utcTsFromDate(flo);
    if (!quiet) setStatus("Seed set to current UTC block.", "ok");
  }

  // Default seed if empty.
  if (!seedInUrl){
    const cur = $("#seed").value.trim();
    if (!cur) setSeedToCurrentBlock(true);
  }

  $("#btnNow").addEventListener("click", () => setSeedToCurrentBlock(false));

  function stepBlock(dir){
    const ts = $("#seed").value.trim();
    const d = parseTs(ts);
    if (!d){
      setStatus("Seed format should be YYYYMMDDTHHMMZ.", "warn");
      return;
    }
    const d2 = addHours(d, dir * 6);
    $("#seed").value = utcTsFromDate(d2);
    setStatus("Moved seed by one 6-hour block.", "ok");
  }

  $("#btnPrev").addEventListener("click", () => stepBlock(-1));
  $("#btnNext").addEventListener("click", () => stepBlock(1));

  function generate(){
    const ts = $("#seed").value.trim();
    if (!parseTs(ts)){
      setStatus("Invalid seed. Use YYYYMMDDTHHMMZ (example: 20260324T0423Z).", "warn");
      return;
    }
    const minutes = $("#minutes").value;
    const energy = $("#energy").value;

    const plan = planFor(ts, minutes, energy);
    setPlanHtml(ts, plan);
    $("#outMd").value = plan.md;
    setUrlSeed(ts);
    setStatus("Plan generated.", "ok");
  }

  $("#btnGen").addEventListener("click", generate);

  $("#btnCopy").addEventListener("click", async () => {
    const text = $("#outMd").value.trim();
    if (!text){ setStatus("Nothing to copy yet. Generate a plan first.", "warn"); return; }
    const ok = await copyText(text);
    setStatus(ok ? "Copied Markdown." : "Copy failed (clipboard permission).", ok ? "ok" : "warn");
  });

  $("#btnLink").addEventListener("click", async () => {
    const ts = $("#seed").value.trim();
    if (!parseTs(ts)){
      setStatus("Set a valid seed first.", "warn");
      return;
    }
    setUrlSeed(ts);
    const ok = await copyText(window.location.href);
    setStatus(ok ? "Copied link." : "Copy failed (clipboard permission).", ok ? "ok" : "warn");
  });

  $("#btnDl").addEventListener("click", () => {
    const ts = $("#seed").value.trim();
    if (!parseTs(ts)){
      setStatus("Set a valid seed first.", "warn");
      return;
    }
    const text = $("#outMd").value.trim();
    if (!text){
      setStatus("Nothing to download yet. Generate a plan first.", "warn");
      return;
    }
    downloadText(`sixhour-compass-${ts}.md`, text + "\n");
    setStatus("Downloaded Markdown.", "ok");
  });

  // Input convenience
  $("#seed").addEventListener("keydown", (e) => {
    if (e.key === "Enter"){
      e.preventDefault();
      generate();
    }
  });

  // Keyboard shortcuts (ignore when typing in text fields except seed Enter).
  window.addEventListener("keydown", (e) => {
    const t = (e.target && e.target.tagName) ? String(e.target.tagName).toLowerCase() : "";
    const inField = t === "textarea" || t === "input" || t === "select";
    if (inField) return;

    const k = String(e.key || "").toLowerCase();
    if (k === "n"){ e.preventDefault(); setSeedToCurrentBlock(false); return; }
    if (e.key === "["){ e.preventDefault(); stepBlock(-1); return; }
    if (e.key === "]"){ e.preventDefault(); stepBlock(1); return; }
    if (k === "c"){ e.preventDefault(); $("#btnCopy").click(); return; }
    if (k === "l"){ e.preventDefault(); $("#btnLink").click(); return; }
    if (k === "d"){ e.preventDefault(); $("#btnDl").click(); return; }
    if (k === "g"){ e.preventDefault(); generate(); return; }
  });

  // Auto-generate if URL has seed.
  if (seedInUrl && parseTs(seedInUrl)){
    $("#btnGen").click();
  }
}

boot();
