// Hello Houbi - tiny interactive greeting generator
// Static, no deps. ASCII only.

function pad2(n){ return String(n).padStart(2, "0"); }

function nowUtcTs(){
  const d = new Date();
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

// Round the current UTC time down to the nearest 6-hour boundary.
// Example: 04:23 -> 00:00, 10:59 -> 06:00, 23:01 -> 18:00.
function snap6hUtcTs(){
  const d = new Date();
  const hh = d.getUTCHours();
  const snapped = Math.floor(hh / 6) * 6;
  return (
    d.getUTCFullYear() +
    pad2(d.getUTCMonth() + 1) +
    pad2(d.getUTCDate()) +
    "T" +
    pad2(snapped) +
    "00" +
    "Z"
  );
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

function pick(rng, arr){
  return arr[Math.floor((rng() / 4294967296) * arr.length)];
}

function getQuery(){
  const p = new URLSearchParams(window.location.search || "");
  return {
    name: (p.get("name") || "Ari").slice(0, 40),
    seed: (p.get("seed") || "").slice(0, 40),
    tone: (p.get("tone") || "default").slice(0, 16)
  };
}

function setQuery(q){
  const p = new URLSearchParams();
  if (q.name) p.set("name", q.name);
  if (q.seed) p.set("seed", q.seed);
  if (q.tone) p.set("tone", q.tone);
  const qs = p.toString();
  const url = window.location.pathname + (qs ? ("?" + qs) : "");
  window.history.replaceState(null, "", url);
}

function tonePack(tone){
  const base = {
    adjectives: [
      "calm",
      "curious",
      "patient",
      "playful",
      "precise",
      "brave",
      "gentle",
      "stubborn",
      "quiet"
    ],
    verbs: [
      "ship a tiny thing",
      "name the constraint",
      "make a messy first draft",
      "ask one sharper question",
      "reduce the surface area",
      "leave a breadcrumb",
      "save a version",
      "do the boring step",
      "protect your attention"
    ],
    closers: [
      "One commit beats a perfect plan.",
      "Small is a kind of honest.",
      "If it feels heavy, make it smaller.",
      "If it is reversible, try it.",
      "Keep the loop human.",
      "Proof first, polish second."
    ]
  };

  if (tone === "gentle"){
    return {
      adjectives: ["soft", "steady", "kind", "patient", "warm", "present", "quiet", "tender"],
      verbs: ["take one small step", "make room for rest", "write one honest sentence", "tidy one corner", "send one caring note", "finish the smallest version"],
      closers: [
        "Gentle is still forward.",
        "Small progress is still progress.",
        "You can move without forcing.",
        "A kind loop beats a harsh sprint."
      ]
    };
  }

  if (tone === "bold"){
    return {
      adjectives: ["direct", "focused", "unstoppable", "sharp", "confident", "clean"],
      verbs: ["cut the fluff", "ship the obvious version", "delete one distraction", "make the call", "do it in one take", "pick a direction"],
      closers: [
        "Decide, then commit.",
        "Clarity is a weapon.",
        "Ship it, then iterate.",
        "Action beats anxiety."
      ]
    };
  }

  if (tone === "noir"){
    return {
      adjectives: ["watchful", "restless", "methodical", "wary", "hungry", "quiet"],
      verbs: ["follow the clue", "write it down", "close the loop", "check the facts", "ship the evidence", "leave a note for future-you"],
      closers: [
        "The case gets solved one step at a time.",
        "No heroes. Just habits.",
        "Truth first. Then style.",
        "Keep your receipts."
      ]
    };
  }

  return base;
}

function makeGreeting(name, seed, tone){
  const s = String(seed || "").trim() || nowUtcTs();
  const t = String(tone || "default").trim() || "default";

  const pack = tonePack(t);

  const key = String(name || "friend") + "::" + s + "::" + t;
  const rng = xorshift32(fnv1a32(key) ^ 0x9e3779b9);

  const adj = pick(rng, pack.adjectives);
  const verb = pick(rng, pack.verbs);
  const closer = pick(rng, pack.closers);

  const headline = "Hello " + (name || "friend") + ".";
  const body = "Today, be " + adj + ". Then: " + verb + ".";

  return { headline, body, closer, usedSeed: s, usedTone: t };
}

async function copyText(txt){
  await navigator.clipboard.writeText(txt);
}

function main(){
  const q = getQuery();

  const elName = document.getElementById("name");
  const elSeed = document.getElementById("seed");
  const elTone = document.getElementById("tone");
  const elHeadline = document.getElementById("headline");
  const elBody = document.getElementById("body");
  const elCloser = document.getElementById("closer");
  const elMeta = document.getElementById("meta");
  const elStatus = document.getElementById("status");

  function setStatus(msg){
    if (!elStatus) return;
    elStatus.textContent = String(msg || "");
    window.setTimeout(() => {
      if (elStatus) elStatus.textContent = "";
    }, 2200);
  }

  function buildShareLink(name, seed, tone){
    const p = new URLSearchParams();
    if (name) p.set("name", name);
    if (seed) p.set("seed", seed);
    if (tone) p.set("tone", tone);
    const qs = p.toString();
    return window.location.pathname + (qs ? ("?" + qs) : "");
  }

  function render(){
    const name = (elName && elName.value) ? elName.value : q.name;
    const seed = (elSeed && elSeed.value) ? elSeed.value : q.seed;
    const tone = (elTone && elTone.value) ? elTone.value : q.tone;

    const g = makeGreeting(name, seed, tone);

    if (elHeadline) elHeadline.textContent = g.headline;
    if (elBody) elBody.textContent = g.body;
    if (elCloser) elCloser.textContent = g.closer;
    if (elMeta) elMeta.textContent = "seed: " + g.usedSeed + " | tone: " + g.usedTone;

    setQuery({ name: String(name || "").trim(), seed: String(seed || "").trim(), tone: String(tone || "").trim() });

    const txt = g.headline + "\n" + g.body + "\n" + g.closer + "\n" + "(" + g.usedSeed + ", " + g.usedTone + ")";
    const link = buildShareLink(String(name || "").trim(), String(seed || "").trim(), String(tone || "").trim());

    return { name, usedSeed: g.usedSeed, usedTone: g.usedTone, text: txt, link: link };
  }

  if (elName) elName.value = q.name;
  if (elSeed) elSeed.value = q.seed;
  if (elTone) elTone.value = q.tone;

  const btnNew = document.getElementById("btnNew");
  const btnNow = document.getElementById("btnNow");
  const btnSnap6h = document.getElementById("btnSnap6h");
  const btnCopy = document.getElementById("btnCopy");
  const btnCopyLink = document.getElementById("btnCopyLink");

  if (btnNew) btnNew.addEventListener("click", () => { render(); });
  if (btnNow) btnNow.addEventListener("click", () => { if (elSeed) elSeed.value = nowUtcTs(); render(); });
  if (btnSnap6h) btnSnap6h.addEventListener("click", () => { if (elSeed) elSeed.value = snap6hUtcTs(); render(); });

  if (btnCopy){
    btnCopy.addEventListener("click", async () => {
      const st = render();
      try{
        await copyText(st.text);
        setStatus("Copied");
      }catch{
        setStatus("Copy failed");
      }
    });
  }

  if (btnCopyLink){
    btnCopyLink.addEventListener("click", async () => {
      const st = render();
      try{
        await copyText(st.link);
        setStatus("Copied link");
      }catch{
        setStatus("Copy failed");
      }
    });
  }

  if (elName) elName.addEventListener("input", () => { render(); });
  if (elSeed) elSeed.addEventListener("input", () => { render(); });
  if (elTone) elTone.addEventListener("change", () => { render(); });

  render();
}

main();
