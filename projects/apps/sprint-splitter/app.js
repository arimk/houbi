// Sprint Splitter
// Deterministic plan generator from (goal + seed + variant + minutes + steps).
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

function pick(rng, arr){
  return arr[Math.floor((rng() / 4294967296) * arr.length)];
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

function buildShareUrl(state){
  const s = state || {};
  const p = new URLSearchParams();
  if (s.goal) p.set("goal", s.goal);
  if (s.seed) p.set("seed", s.seed);
  if (Number.isFinite(s.variant)) p.set("v", String(s.variant));
  if (Number.isFinite(s.minutes)) p.set("m", String(s.minutes));
  if (Number.isFinite(s.steps)) p.set("n", String(s.steps));
  const q = p.toString();
  const base = window.location.origin + window.location.pathname;
  return q ? (base + "?" + q) : base;
}

function readQuery(){
  const p = new URLSearchParams(window.location.search || "");
  return {
    goal: p.get("goal") || "",
    seed: p.get("seed") || "",
    v: p.get("v") || "0",
    m: p.get("m") || "45",
    n: p.get("n") || "6"
  };
}

function formatMinutesSplit(total, steps, rng){
  // produce steps integers summing to total, with slight variation but sane.
  const n = Math.max(1, steps);
  const base = Math.floor(total / n);
  let rem = total - (base * n);

  const out = Array.from({ length: n }, () => base);

  // distribute remainder
  for (let i = 0; i < n && rem > 0; i++){
    out[i] += 1;
    rem -= 1;
  }

  // small swaps to avoid uniformity
  const swaps = Math.min(8, n * 2);
  for (let k = 0; k < swaps; k++){
    const i = Math.floor((rng() / 4294967296) * n);
    const j = Math.floor((rng() / 4294967296) * n);
    if (i === j) continue;
    if (out[i] <= 5) continue;
    out[i] -= 1;
    out[j] += 1;
  }

  // ensure no step is too tiny
  for (let i = 0; i < n; i++){
    if (out[i] < 5) out[i] = 5;
  }

  // re-normalize to total (keep within a few mins)
  let sum = out.reduce((a,b) => a + b, 0);
  while (sum > total){
    const i = Math.floor((rng() / 4294967296) * n);
    if (out[i] > 5){ out[i] -= 1; sum -= 1; }
    else break;
  }
  while (sum < total){
    const i = Math.floor((rng() / 4294967296) * n);
    out[i] += 1;
    sum += 1;
  }

  return out;
}

const BANK = {
  verbs: [
    "Sketch",
    "Define",
    "Implement",
    "Wire",
    "Refine",
    "Test",
    "Polish",
    "Ship",
    "Document",
    "Tighten"
  ],
  focuses: [
    "the smallest usable flow",
    "a visible UI change",
    "one core interaction",
    "copy and UX clarity",
    "edge cases",
    "naming and structure",
    "loading and empty states",
    "export and sharing",
    "constraints and guardrails"
  ],
  artifacts: [
    "a checklist",
    "a single page app",
    "a post draft",
    "a small demo",
    "a linkable tool",
    "a cleaned-up layout",
    "a tiny dataset",
    "a static page"
  ],
  doneLines: [
    "It works offline and has a clear default state.",
    "A stranger can use it in under 30 seconds.",
    "The output can be copied or downloaded.",
    "The result is visible on the site (not just code).",
    "There is at least one obvious next step." 
  ]
};

function buildPlan(state){
  const goal = String(state.goal || "").trim();
  const seed = String(state.seed || "").trim();
  const variant = clampInt(state.variant, 0, 99, 0);
  const minutes = clampInt(state.minutes, 10, 180, 45);
  const steps = clampInt(state.steps, 5, 8, 6);

  const key = goal + "::" + seed + "::v" + String(variant) + "::m" + String(minutes) + "::n" + String(steps);
  const h = fnv1a32(key);
  const rng = xorshift32(h ^ 0x9e3779b9);

  const minsSplit = formatMinutesSplit(minutes, steps, rng);

  const out = [];
  for (let i = 0; i < steps; i++){
    const verb = pick(rng, BANK.verbs);
    const focus = pick(rng, BANK.focuses);
    const artifact = pick(rng, BANK.artifacts);

    const line = `${verb} ${artifact}: focus on ${focus}.`;
    out.push({ minutes: minsSplit[i], text: line });
  }

  const done = [];
  const doneCount = 3;
  for (let i = 0; i < doneCount; i++) done.push(pick(rng, BANK.doneLines));

  const commitMsg = `ship: ${goal ? goal.slice(0, 48) : "tiny sprint"}`.replace(/\s+/g, " ").trim();

  return { steps: out, hashHex: u32ToHex(h), key, done, commitMsg };
}

function escapeMd(s){
  return String(s || "").replace(/\r/g, "");
}

function buildMarkdown(state, plan){
  const goal = String(state.goal || "").trim();
  const seed = String(state.seed || "").trim();
  const variant = clampInt(state.variant, 0, 99, 0);
  const minutes = clampInt(state.minutes, 10, 180, 45);

  let md = "";
  md += `# Sprint Splitter\n\n`;
  md += `Goal: ${goal || "(none)"}\n`;
  md += `Seed: ${seed || "(none)"} | Variant: ${variant} | Minutes: ${minutes} | Hash: ${plan.hashHex}\n\n`;

  md += "## Steps\n";
  for (const s of plan.steps){
    md += `- [ ] (${s.minutes}m) ${s.text}\n`;
  }

  md += "\n## Definition of done\n";
  for (const d of plan.done){
    md += `- [ ] ${d}\n`;
  }

  md += "\n## Suggested commit message\n";
  md += "```\n" + escapeMd(plan.commitMsg) + "\n```\n";

  return md;
}

async function copyText(txt){
  const t = String(txt || "");
  if (!t) return false;
  try{
    await navigator.clipboard.writeText(t);
    return true;
  }catch(_e){
    return false;
  }
}

function downloadText(filename, text){
  const blob = new Blob([String(text || "")], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

(function main(){
  const elGoal = document.querySelector("#goal");
  const elSeed = document.querySelector("#seed");
  const elVariant = document.querySelector("#variant");
  const elMinutes = document.querySelector("#minutes");
  const elSteps = document.querySelector("#steps");

  const elKSeed = document.querySelector("#kSeed");
  const elKHash = document.querySelector("#kHash");
  const elKMins = document.querySelector("#kMins");

  const elStatus = document.querySelector("#status");
  const elOutList = document.querySelector("#outList");
  const elOutMd = document.querySelector("#outMd");

  const btnGen = document.querySelector("#btnGen");
  const btnRemix = document.querySelector("#btnRemix");
  const btnCopy = document.querySelector("#btnCopy");
  const btnLink = document.querySelector("#btnLink");
  const btnDownload = document.querySelector("#btnDownload");

  function setStatus(msg, kind){
    elStatus.textContent = msg;
    elStatus.className = "small " + (kind === "err" ? "" : "muted");
  }

  function readState(){
    return {
      goal: String(elGoal.value || "").trim(),
      seed: String(elSeed.value || "").trim(),
      variant: clampInt(elVariant.value, 0, 99, 0),
      minutes: clampInt(elMinutes.value, 10, 180, 45),
      steps: clampInt(elSteps.value, 5, 8, 6)
    };
  }

  function render(){
    const st = readState();
    const plan = buildPlan(st);
    const md = buildMarkdown(st, plan);

    elKSeed.textContent = "seed: " + (st.seed || "-");
    elKHash.textContent = "hash: " + plan.hashHex;
    elKMins.textContent = "mins: " + String(st.minutes);

    elOutList.innerHTML = "";
    for (const s of plan.steps){
      const li = document.createElement("li");
      li.textContent = `(${s.minutes}m) ${s.text}`;
      elOutList.appendChild(li);
    }
    elOutMd.value = md;

    setStatus("Generated.", "ok");

    // update URL without reloading
    const url = buildShareUrl({
      goal: st.goal,
      seed: st.seed,
      variant: st.variant,
      minutes: st.minutes,
      steps: st.steps
    });
    window.history.replaceState({}, "", url);
  }

  function initFromQuery(){
    const q = readQuery();
    if (q.goal) elGoal.value = q.goal;
    if (q.seed) elSeed.value = q.seed;
    elVariant.value = String(clampInt(q.v, 0, 99, 0));
    elMinutes.value = String(clampInt(q.m, 10, 180, 45));
    elSteps.value = String(clampInt(q.n, 5, 8, 6));
  }

  btnGen.addEventListener("click", () => render());

  btnRemix.addEventListener("click", () => {
    elSeed.value = nowUtcCompact();
    render();
  });

  btnCopy.addEventListener("click", async () => {
    const ok = await copyText(elOutMd.value);
    setStatus(ok ? "Copied Markdown." : "Copy failed (browser permissions).", ok ? "ok" : "err");
  });

  btnLink.addEventListener("click", async () => {
    const st = readState();
    const url = buildShareUrl({
      goal: st.goal,
      seed: st.seed,
      variant: st.variant,
      minutes: st.minutes,
      steps: st.steps
    });
    const ok = await copyText(url);
    setStatus(ok ? "Copied link." : "Copy failed (browser permissions).", ok ? "ok" : "err");
  });

  btnDownload.addEventListener("click", () => {
    const st = readState();
    const plan = buildPlan(st);
    const md = buildMarkdown(st, plan);
    const fn = `sprint-splitter-${(st.seed || "seed").replace(/[^0-9A-Za-zTZ]/g, "")}-v${st.variant}.md`;
    downloadText(fn, md);
    setStatus("Downloaded .md", "ok");
  });

  initFromQuery();

  if (!elSeed.value) elSeed.value = nowUtcCompact();
  if (!elGoal.value) elGoal.value = "Ship one tiny, visible improvement.";

  render();
})();
