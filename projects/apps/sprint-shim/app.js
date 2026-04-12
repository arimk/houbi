/* Sprint Shim - deterministic micro-plan generator (offline).
   No dependencies.
*/

(function(){
  "use strict";

  const $ = (id) => document.getElementById(id);
  const elTopic = $("topic");
  const elSeed = $("seed");
  const elMinutes = $("minutes");
  const elMode = $("mode");
  const elVariant = $("variant");
  const elOut = $("outMd");
  const elStatus = $("status");
  const elChecklist = $("checklist");
  const elKSeed = $("kSeed");
  const elKHash = $("kHash");
  const elKMinutes = $("kMinutes");

  const KEY = "ssh:v1";

  function setStatus(msg, kind){
    if (!elStatus) return;
    elStatus.textContent = msg || "";
    elStatus.className = "status" + (kind ? (" " + kind) : "");
  }

  function clampInt(v, lo, hi, def){
    const n = Number.parseInt(String(v || ""), 10);
    if (!Number.isFinite(n)) return def;
    return Math.max(lo, Math.min(hi, n));
  }

  // Simple, stable 32-bit hash.
  function hash32(str){
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++){
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // xorshift32 PRNG
  function makeRng(seedU32){
    let x = (seedU32 >>> 0) || 1;
    return function(){
      x ^= (x << 13); x >>>= 0;
      x ^= (x >>> 17); x >>>= 0;
      x ^= (x << 5); x >>>= 0;
      return (x >>> 0);
    };
  }

  function pick(rng, arr){
    if (!arr.length) return "";
    const i = (rng() % arr.length) >>> 0;
    return arr[i];
  }

  function snap6hSeed(now){
    // Floor UTC time to nearest 6-hour block.
    const d = now ? new Date(now) : new Date();
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const day = d.getUTCDate();
    const hr = d.getUTCHours();
    const snappedHr = Math.floor(hr / 6) * 6;
    const dd = new Date(Date.UTC(y, m, day, snappedHr, 0, 0));
    return fmtTS(dd);
  }

  function pad2(n){ return String(n).padStart(2, "0"); }

  function fmtTS(d){
    return String(d.getUTCFullYear()) +
      pad2(d.getUTCMonth() + 1) +
      pad2(d.getUTCDate()) + "T" +
      pad2(d.getUTCHours()) +
      pad2(d.getUTCMinutes()) + "Z";
  }

  function remixSeed(){
    return fmtTS(new Date());
  }

  function toQuery(state){
    const sp = new URLSearchParams();
    if (state.topic) sp.set("topic", state.topic);
    if (state.seed) sp.set("seed", state.seed);
    sp.set("minutes", String(state.minutes));
    sp.set("mode", state.mode);
    sp.set("variant", String(state.variant));
    return sp.toString();
  }

  function fromQuery(){
    const sp = new URLSearchParams(window.location.search || "");
    const topic = String(sp.get("topic") || "");
    const seed = String(sp.get("seed") || "");
    const minutes = clampInt(sp.get("minutes"), 10, 180, 45);
    const mode = String(sp.get("mode") || "software");
    const variant = clampInt(sp.get("variant"), 0, 99, 0);
    const okModes = ["software","writing","design","life"];
    return {
      topic,
      seed,
      minutes,
      mode: okModes.includes(mode) ? mode : "software",
      variant
    };
  }

  function saveLocal(obj){
    try{ localStorage.setItem(KEY, JSON.stringify(obj)); }catch(e){}
  }

  function loadLocal(){
    try{
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      return obj && typeof obj === "object" ? obj : null;
    }catch(e){
      return null;
    }
  }

  function readInputs(){
    return {
      topic: String(elTopic ? (elTopic.value || "") : "").trim(),
      seed: String(elSeed ? (elSeed.value || "") : "").trim(),
      minutes: clampInt(elMinutes ? elMinutes.value : 45, 10, 180, 45),
      mode: String(elMode ? elMode.value : "software"),
      variant: clampInt(elVariant ? elVariant.value : 0, 0, 99, 0)
    };
  }

  function writeInputs(state){
    if (elTopic) elTopic.value = state.topic || "";
    if (elSeed) elSeed.value = state.seed || "";
    if (elMinutes) elMinutes.value = String(state.minutes || 45);
    if (elMode) elMode.value = state.mode || "software";
    if (elVariant) elVariant.value = String(state.variant || 0);
  }

  function planBank(mode){
    const baseGoal = {
      software: [
        "make a tiny page that solves one annoying micro-problem",
        "ship one useful interaction with clear input/output",
        "build a no-build-step tool that works in one tab"
      ],
      writing: [
        "draft something you can publish today",
        "write a short piece with one sharp point",
        "turn a vague thought into a concrete paragraph"
      ],
      design: [
        "sketch a single screen with one key flow",
        "make a tiny visual system and apply it",
        "create one strong visual artifact and export it"
      ],
      life: [
        "reduce future friction by finishing one admin loop",
        "set up a small system that prevents one recurring hassle",
        "do one thing that removes a mental open tab"
      ]
    };

    const constraints = {
      software: [
        "offline-first; no network calls",
        "one HTML file plus optional JS/CSS",
        "must have a copy/export button",
        "use localStorage for persistence",
        "single purpose; no settings sprawl",
        "explain it in one sentence on the page"
      ],
      writing: [
        "200-450 words",
        "end with one open question",
        "use one concrete example",
        "avoid buzzwords; be literal",
        "write a title that includes a timestamp"
      ],
      design: [
        "two colors + one accent only",
        "make hierarchy obvious at a glance",
        "one reusable component",
        "export as SVG or PNG",
        "use consistent spacing (8px grid)"
      ],
      life: [
        "one phone call or one email draft only",
        "must end with a saved template or note",
        "timebox to 20 minutes then decide",
        "write the next action in plain language",
        "remove one thing from your physical space"
      ]
    };

    const steps = {
      software: [
        "Define the input and output in one sentence.",
        "Make the UI: one input, one output, one primary button.",
        "Implement the core transform (deterministic).",
        "Add copy/export, then a tiny help hint.",
        "Do a 2-minute polish pass (spacing, labels, empty states)."
      ],
      writing: [
        "Write the ending question first.",
        "Dump 8-12 bullet notes (no sentences yet).",
        "Turn bullets into 3 short paragraphs.",
        "Add one concrete detail or mini-story.",
        "Tighten: delete 10% of words and publish."
      ],
      design: [
        "Pick one constraint (colors or grid) and commit.",
        "Sketch the flow with boxes and labels.",
        "Make one component and reuse it 3x.",
        "Adjust typography (sizes, weights) for hierarchy.",
        "Export and write a 2-line caption."
      ],
      life: [
        "Name the loop you are closing (one sentence).",
        "Gather the minimum info needed (links, numbers, docs).",
        "Do the smallest irreversible action (send / schedule / pay).",
        "Create a template/note so you never repeat the work.",
        "Reward: mark done and close every related tab."
      ]
    };

    const checks = {
      software: [
        { t: "Add a clear title + one-sentence description on the page.", m: "If a stranger landed here, could they use it in 10 seconds?" },
        { t: "Make the primary action obvious (one button).", m: "No decision fatigue." },
        { t: "Implement persistence (localStorage) for the last used values.", m: "Respect the next session." },
        { t: "Add copy/export for the output.", m: "Let it leave the page." },
        { t: "Do a 2-minute UX sweep: labels, empty states, spacing.", m: "Polish is part of shipping." }
      ],
      writing: [
        { t: "Write the ending question (one sentence).", m: "Make it genuinely open." },
        { t: "Keep it within 200-450 words.", m: "Small is the point." },
        { t: "Include one concrete example.", m: "Anchor it in reality." },
        { t: "Cut the fluff: remove one paragraph or 10% of words.", m: "Clarity over vibes." },
        { t: "Publish and stop tweaking.", m: "Done is a feature." }
      ],
      design: [
        { t: "Pick 2 colors + 1 accent and apply consistently.", m: "Constraint = coherence." },
        { t: "Define a spacing rule (8px grid) and stick to it.", m: "Rhythm." },
        { t: "Create one reusable component.", m: "Design systems start small." },
        { t: "Check hierarchy at thumbnail size.", m: "Does it still read?" },
        { t: "Export and write a caption.", m: "Artifacts want context." }
      ],
      life: [
        { t: "Write the next action in plain words.", m: "No future decoding." },
        { t: "Do one irreversible step (send/schedule/pay).", m: "Progress, not prep." },
        { t: "Make a template/note for next time.", m: "Reduce repetition." },
        { t: "File the outcome (calendar, folder, note).", m: "Findable later." },
        { t: "Close the loop: mark done and stop.", m: "No lingering tabs." }
      ]
    };

    return {
      goals: baseGoal[mode] || baseGoal.software,
      constraints: constraints[mode] || constraints.software,
      steps: steps[mode] || steps.software,
      checks: checks[mode] || checks.software
    };
  }

  function gen(state){
    const seedStr = (state.seed || "").trim();
    const topic = (state.topic || "").trim();
    const minutes = state.minutes;
    const mode = state.mode;
    const variant = state.variant;

    const mix = seedStr + "|" + topic + "|" + mode + "|" + String(minutes) + "|" + String(variant);
    const h = hash32(mix);
    const rng = makeRng(h || 1);

    const bank = planBank(mode);

    const goal = pick(rng, bank.goals);
    const c1 = pick(rng, bank.constraints);
    let c2 = pick(rng, bank.constraints);
    let c3 = pick(rng, bank.constraints);
    // try to avoid exact duplicates
    if (c2 === c1) c2 = pick(rng, bank.constraints);
    if (c3 === c1 || c3 === c2) c3 = pick(rng, bank.constraints);

    const steps = bank.steps.slice();
    // deterministic shuffle-ish: swap a few times
    for (let i = 0; i < 3; i++){
      const a = rng() % steps.length;
      const b = rng() % steps.length;
      const tmp = steps[a]; steps[a] = steps[b]; steps[b] = tmp;
    }

    const titleTopic = topic ? (" - " + topic) : "";
    const md = [
      "# Sprint Shim plan" + titleTopic,
      "",
      "- seed: `" + (seedStr || "-") + "`",
      "- mode: `" + mode + "`",
      "- minutes: `" + String(minutes) + "`",
      "- variant: `" + String(variant) + "`",
      "- hash: `" + String(h) + "`",
      "",
      "## Goal",
      "- " + goal,
      "",
      "## Constraints",
      "- " + c1,
      "- " + c2,
      "- " + c3,
      "",
      "## Plan (" + String(minutes) + " min)",
      "1. " + steps[0],
      "2. " + steps[1],
      "3. " + steps[2],
      "4. " + steps[3],
      "5. " + steps[4],
      "",
      "## Definition of done",
      "- I can show it to someone in under 30 seconds.",
      "- There is a single output (artifact, link, or file).",
      "- I wrote one next step for future iteration.",
      "",
      "## Next step idea",
      "- Make a second variant that changes only ONE thing (tone, constraints, or output format).",
      ""
    ].join("\n");

    return { hash: h, md, checks: bank.checks };
  }

  function renderChecklist(state, checks, hash){
    if (!elChecklist) return;
    elChecklist.innerHTML = "";

    const key = KEY + ":checks:" + String(hash);
    let done = {};
    try{
      const raw = localStorage.getItem(key);
      if (raw) done = JSON.parse(raw) || {};
    }catch(e){ done = {}; }

    function saveDone(){
      try{ localStorage.setItem(key, JSON.stringify(done)); }catch(e){}
    }

    checks.forEach((c, idx) => {
      const id = "c" + String(idx);
      const wrap = document.createElement("label");
      wrap.className = "checkitem";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!done[id];
      cb.addEventListener("change", () => {
        done[id] = !!cb.checked;
        saveDone();
      });

      const box = document.createElement("div");
      const t = document.createElement("div");
      t.className = "t";
      t.textContent = c.t;
      const m = document.createElement("div");
      m.className = "m";
      m.textContent = c.m;
      box.appendChild(t);
      box.appendChild(m);

      wrap.appendChild(cb);
      wrap.appendChild(box);
      elChecklist.appendChild(wrap);
    });
  }

  function copyText(txt){
    if (!txt) return Promise.reject(new Error("empty"));
    if (navigator.clipboard && navigator.clipboard.writeText){
      return navigator.clipboard.writeText(txt);
    }
    // fallback
    const ta = document.createElement("textarea");
    ta.value = txt;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok ? Promise.resolve() : Promise.reject(new Error("copy failed"));
  }

  function download(filename, text){
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      document.body.removeChild(a);
    }, 0);
  }

  function applyKpis(state, hash){
    if (elKSeed) elKSeed.textContent = "seed: " + (state.seed ? state.seed : "-");
    if (elKHash) elKHash.textContent = "hash: " + String(hash);
    if (elKMinutes) elKMinutes.textContent = "minutes: " + String(state.minutes);
  }

  function generateAndRender(){
    const state = readInputs();
    if (!state.seed){
      setStatus("Add a seed (or click Remix / Snap seed).", "warn");
      return;
    }
    const out = gen(state);
    if (elOut) elOut.value = out.md;
    applyKpis(state, out.hash);
    renderChecklist(state, out.checks, out.hash);

    saveLocal({
      topic: state.topic,
      seed: state.seed,
      minutes: state.minutes,
      mode: state.mode,
      variant: state.variant
    });

    setStatus("Generated.", "ok");
  }

  function init(){
    const q = fromQuery();
    const loc = loadLocal();
    const state = {
      topic: q.topic || (loc ? (loc.topic || "") : ""),
      seed: q.seed || (loc ? (loc.seed || "") : ""),
      minutes: q.minutes || (loc ? (loc.minutes || 45) : 45),
      mode: q.mode || (loc ? (loc.mode || "software") : "software"),
      variant: (typeof q.variant === "number") ? q.variant : (loc ? (loc.variant || 0) : 0)
    };

    writeInputs(state);

    $("btnGen").addEventListener("click", generateAndRender);
    $("btnNext").addEventListener("click", () => {
      const st = readInputs();
      st.variant = clampInt(st.variant + 1, 0, 99, 0);
      if (elVariant) elVariant.value = String(st.variant);
      generateAndRender();
    });

    $("btnRemix").addEventListener("click", () => {
      if (elSeed) elSeed.value = remixSeed();
      generateAndRender();
    });

    $("btnSnap6h").addEventListener("click", () => {
      if (elSeed) elSeed.value = snap6hSeed(new Date());
      generateAndRender();
    });

    $("btnCopy").addEventListener("click", () => {
      const txt = elOut ? String(elOut.value || "") : "";
      copyText(txt).then(() => setStatus("Copied Markdown.", "ok"))
        .catch(() => setStatus("Copy failed.", "warn"));
    });

    $("btnLink").addEventListener("click", () => {
      const st = readInputs();
      const qs = toQuery(st);
      const link = window.location.origin + window.location.pathname + (qs ? ("?" + qs) : "");
      copyText(link).then(() => setStatus("Copied link.", "ok"))
        .catch(() => setStatus("Copy failed.", "warn"));
    });

    $("btnDownload").addEventListener("click", () => {
      const st = readInputs();
      const txt = elOut ? String(elOut.value || "") : "";
      if (!txt){ setStatus("Generate first.", "warn"); return; }
      const safe = (st.topic || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const name = "sprint-shim-" + (st.seed || "seed") + (safe ? ("-" + safe) : "") + ".md";
      download(name, txt);
      setStatus("Downloaded.", "ok");
    });

    // Initial render only if seed is present.
    if (state.seed){
      generateAndRender();
    } else {
      setStatus("Add a seed, then generate.", "");
    }
  }

  init();
})();
