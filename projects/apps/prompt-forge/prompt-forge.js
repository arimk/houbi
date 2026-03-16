// Prompt Forge - static offline idea generator
// No deps. Plain ASCII only.

function xmur3(str){
  // Simple hash to seed PRNG
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++){
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function(){
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function sfc32(a, b, c, d){
  return function(){
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

function makeRng(seedStr){
  const seed = xmur3(seedStr);
  return sfc32(seed(), seed(), seed(), seed());
}

function pick(rng, arr){
  return arr[Math.floor(rng() * arr.length)];
}

function shuffle(rng, arr){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--){
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

function uid(){
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

const BANK = {
  mediums: [
    "mini-app statique (HTML/CSS/JS)",
    "script Node.js (CLI)",
    "petit outil Python (local)",
    "data viz (SVG/canvas)",
    "poeme structure (contraintes)",
    "micro-essay (600-900 mots)",
    "automation repo (build, lints, helper)",
    "poster typographique (SVG)",
    "generateur de titres et sous-titres"
  ],
  vibes: [
    "noir + neon",
    "minimalisme brutal",
    "retro-futuriste",
    "bureaucratie surrrealiste",
    "dream logic",
    "cyber noctrune",
    "bibliotheque obscure",
    "radio pirate",
    "musee des erreurs"
  ],
  constraints: [
    "livrable: un fichier unique",
    "zero dependance",
    "offline",
    "deterministe via seed",
    "export Markdown",
    "export SVG",
    "a11y: contrast + clavier",
    "moins de 200 lignes de JS",
    "temps: 20-60 min"
  ],
  targets: [
    "transformer un log en objet",
    "convertir texte -> visuel",
    "faire une liste d'idees actionnables",
    "fabriquer un outil de remix",
    "rendre une routine jouable",
    "cartographier un theme",
    "creer un artefact reutilisable",
    "resumer des notes en poster"
  ],
  nouns: [
    "atlas",
    "forge",
    "scanner",
    "cabinet",
    "observatoire",
    "antenne",
    "rituel",
    "moteur",
    "labo",
    "mur"
  ],
  subjects: [
    "micro-habitudes",
    "erreurs",
    "idees inachevees",
    "dialogues internes",
    "pistes de projets",
    "couleurs",
    "mots",
    "temps",
    "signaux",
    "cartes"
  ],
  outputs: [
    "un fichier index.html utilisable",
    "un README clair",
    "un export telechargeable",
    "une vignette SVG",
    "une liste de 10 variants",
    "un mode imprime (A4)",
    "un mode 'remix seed'"
  ]
};

function buildIdea(rng, opts){
  const medium = pick(rng, BANK.mediums);
  const vibe = pick(rng, BANK.vibes);
  const target = pick(rng, BANK.targets);
  const noun = pick(rng, BANK.nouns);
  const subject = pick(rng, BANK.subjects);
  const output = pick(rng, BANK.outputs);

  const k = opts.moreConstraints ? 4 : 2;
  const cs = shuffle(rng, BANK.constraints).slice(0, k);

  const title = `${subject} ${noun}`;

  const steps = [
    `Definis l'entree (ex: texte, seed, liste).`,
    `Genere 10 variants (bouton Remix).`,
    `Ajoute un export (Markdown ou SVG).`,
    `Fais un style coherent (${vibe}).`,
    `Ecris un README de 10 lignes.`
  ];

  return {
    id: uid(),
    title,
    pitch: `Construis un(e) ${medium} qui vise: ${target}. Theme: ${subject}. Esthetique: ${vibe}.`,
    constraints: cs,
    deliverable: output,
    steps
  };
}

function ideaToMarkdown(idea){
  const lines = [];
  lines.push(`### ${idea.title}`);
  lines.push("");
  lines.push(idea.pitch);
  lines.push("");
  lines.push("- Contraintes:");
  for (const c of idea.constraints) lines.push(`  - ${c}`);
  lines.push(`- Livrable: ${idea.deliverable}`);
  lines.push("");
  lines.push("Steps:");
  for (let i = 0; i < idea.steps.length; i++){
    lines.push(`${i+1}) ${idea.steps[i]}`);
  }
  return lines.join("\n");
}

function setText(el, value){
  el.textContent = value;
}

function safeInt(value, fallback){
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function buildPermalink(seed, n, more){
  const url = new URL(window.location.href);
  url.searchParams.set("seed", seed);
  url.searchParams.set("count", String(n));
  if (more) url.searchParams.set("more", "1");
  else url.searchParams.delete("more");
  return url.toString();
}

function applyUrlState(seedEl, countEl, moreEl){
  const url = new URL(window.location.href);
  const seed = (url.searchParams.get("seed") || "").trim();
  const count = safeInt(url.searchParams.get("count"), 10);
  const more = url.searchParams.get("more") === "1";

  if (seed) seedEl.value = seed;
  if (count) countEl.value = String(Math.max(1, Math.min(50, count)));
  moreEl.checked = !!more;
}

function main(){
  const seedEl = document.querySelector("#seed");
  const countEl = document.querySelector("#count");
  const moreEl = document.querySelector("#moreConstraints");
  const listEl = document.querySelector("#ideas");
  const mdEl = document.querySelector("#markdown");
  const linkEl = document.querySelector("#permalink");
  const copyLinkEl = document.querySelector("#copyLink");

  applyUrlState(seedEl, countEl, moreEl);

  function currentSeed(){
    const s = seedEl.value.trim();
    return s ? s : "prompt-forge";
  }

  function currentCount(){
    return Math.max(1, Math.min(50, safeInt(countEl.value, 10)));
  }

  function updatePermalink(seed, n, more){
    const url = buildPermalink(seed, n, more);
    linkEl.value = url;
    try {
      window.history.replaceState(null, "", url);
    } catch {
      // ignore
    }
  }

  function generate(){
    const n = currentCount();
    const seed = currentSeed();
    const more = !!moreEl.checked;

    updatePermalink(seed, n, more);

    const rng = makeRng(seed);
    const ideas = [];
    for (let i = 0; i < n; i++) ideas.push(buildIdea(rng, { moreConstraints: more }));

    listEl.innerHTML = "";
    for (const idea of ideas){
      const item = document.createElement("article");
      item.className = "idea";

      const h = document.createElement("h3");
      setText(h, idea.title);

      const p = document.createElement("p");
      setText(p, idea.pitch);

      const ul = document.createElement("ul");
      ul.className = "constraints";
      for (const c of idea.constraints){
        const li = document.createElement("li");
        setText(li, c);
        ul.appendChild(li);
      }

      const del = document.createElement("div");
      del.className = "deliverable";
      del.innerHTML = `<span class="label">Livrable</span><span class="value"></span>`;
      del.querySelector(".value").textContent = idea.deliverable;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy";
      btn.textContent = "Copier en Markdown";
      btn.addEventListener("click", async () => {
        const md = ideaToMarkdown(idea);
        try {
          await navigator.clipboard.writeText(md);
          btn.textContent = "Copie!";
          setTimeout(() => (btn.textContent = "Copier en Markdown"), 900);
        } catch {
          mdEl.value = md;
          mdEl.focus();
          mdEl.select();
        }
      });

      item.appendChild(h);
      item.appendChild(p);
      item.appendChild(ul);
      item.appendChild(del);
      item.appendChild(btn);
      listEl.appendChild(item);
    }

    const md = ideas.map(ideaToMarkdown).join("\n\n---\n\n");
    mdEl.value = `# Prompt Forge (${new Date().toISOString()})\n\nSeed: ${seed}\n\n${md}\n`;
  }

  function remixSeed(){
    seedEl.value = `seed-${uid().slice(0,8)}`;
    generate();
  }

  document.querySelector("#generate").addEventListener("click", generate);
  document.querySelector("#remixSeed").addEventListener("click", remixSeed);
  document.querySelector("#downloadMd").addEventListener("click", () => {
    const blob = new Blob([mdEl.value], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `prompt-forge-${currentSeed().replace(/[^a-zA-Z0-9_-]/g, "-")}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
  });

  copyLinkEl.addEventListener("click", async () => {
    const url = linkEl.value.trim();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      copyLinkEl.textContent = "Copie!";
      setTimeout(() => (copyLinkEl.textContent = "Copier lien"), 900);
    } catch {
      linkEl.focus();
      linkEl.select();
    }
  });

  // Regenerate on key changes to keep the permalink accurate.
  seedEl.addEventListener("change", generate);
  countEl.addEventListener("change", generate);
  moreEl.addEventListener("change", generate);

  generate();
}

main();
