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
    seed: (p.get("seed") || "").slice(0, 40)
  };
}

function setQuery(q){
  const p = new URLSearchParams();
  if (q.name) p.set("name", q.name);
  if (q.seed) p.set("seed", q.seed);
  const url = window.location.pathname + "?" + p.toString();
  window.history.replaceState(null, "", url);
}

function makeGreeting(name, seed){
  const adjectives = [
    "calm",
    "curious",
    "patient",
    "playful",
    "precise",
    "brave",
    "gentle",
    "stubborn",
    "quiet"
  ];

  const verbs = [
    "ship a tiny thing",
    "name the constraint",
    "make a messy first draft",
    "ask one sharper question",
    "reduce the surface area",
    "leave a breadcrumb",
    "save a version",
    "do the boring step",
    "protect your attention"
  ];

  const closers = [
    "One commit beats a perfect plan.",
    "Small is a kind of honest.",
    "If it feels heavy, make it smaller.",
    "If it is reversible, try it.",
    "Keep the loop human.",
    "Proof first, polish second."
  ];

  const s = String(seed || "").trim() || nowUtcTs();
  const key = String(name || "friend") + "::" + s;
  const rng = xorshift32(fnv1a32(key) ^ 0x9e3779b9);

  const adj = pick(rng, adjectives);
  const verb = pick(rng, verbs);
  const closer = pick(rng, closers);

  const headline = "Hello " + (name || "friend") + ".";
  const body = "Today, be " + adj + ". Then: " + verb + ".";

  return { headline, body, closer, usedSeed: s };
}

async function copyText(txt){
  await navigator.clipboard.writeText(txt);
}

function main(){
  const q = getQuery();

  const elName = document.getElementById("name");
  const elSeed = document.getElementById("seed");
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

  function render(){
    const name = (elName && elName.value) ? elName.value : q.name;
    const seed = (elSeed && elSeed.value) ? elSeed.value : q.seed;

    const g = makeGreeting(name, seed);

    if (elHeadline) elHeadline.textContent = g.headline;
    if (elBody) elBody.textContent = g.body;
    if (elCloser) elCloser.textContent = g.closer;
    if (elMeta) elMeta.textContent = "seed: " + g.usedSeed;

    setQuery({ name: String(name || "").trim(), seed: String(seed || "").trim() });

    return { name, usedSeed: g.usedSeed, text: g.headline + "\n" + g.body + "\n" + g.closer + "\n" + "(" + g.usedSeed + ")" };
  }

  if (elName) elName.value = q.name;
  if (elSeed) elSeed.value = q.seed;

  const btnNew = document.getElementById("btnNew");
  const btnNow = document.getElementById("btnNow");
  const btnCopy = document.getElementById("btnCopy");

  if (btnNew) btnNew.addEventListener("click", () => { render(); });
  if (btnNow) btnNow.addEventListener("click", () => { if (elSeed) elSeed.value = nowUtcTs(); render(); });

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

  if (elName) elName.addEventListener("input", () => { render(); });
  if (elSeed) elSeed.addEventListener("input", () => { render(); });

  render();
}

main();
