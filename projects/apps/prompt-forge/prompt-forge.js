// Prompt Forge - static offline idea generator
// No deps.

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

const FAV_KEY = "houbi_prompt_forge_favs_v1";

function loadFavs(){
  try {
    const raw = window.localStorage.getItem(FAV_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((x) => x && typeof x === "object" && typeof x.key === "string");
  } catch {
    return [];
  }
}

function saveFavs(items){
  try {
    window.localStorage.setItem(FAV_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function favKey(seed, index, more){
  return `${seed}|${more ? "1" : "0"}|${String(index)}`;
}

function favExportMarkdown(items){
  const lines = [];
  lines.push(`# Prompt Forge - Favoris (${new Date().toISOString()})`);
  lines.push("");
  if (!items.length){
    lines.push("(Aucun favori pour le moment.)");
    return lines.join("\n");
  }

  lines.push(`Total: ${items.length}`);
  lines.push("");
  for (const it of items){
    lines.push(`## ${it.title || "Idee"}`);
    lines.push("");
    if (it.md) lines.push(it.md);
    else lines.push("(Markdown manquant)");
    lines.push("");
    lines.push(`Meta: seed=${it.seed || ""} key=${it.key}`);
    lines.push("\n---\n");
  }
  return lines.join("\n");
}

function favExportJson(items){
  const payload = {
    version: 1,
    app: "prompt-forge",
    exportedAt: new Date().toISOString(),
    items: items
  };
  return JSON.stringify(payload, null, 2);
}

function normalizeImportedFavs(parsed){
  const items = Array.isArray(parsed) ? parsed : (parsed && parsed.items);
  if (!Array.isArray(items)) return [];

  const out = [];
  for (const it of items){
    if (!it || typeof it !== "object") continue;
    if (typeof it.key !== "string" || !it.key.trim()) continue;
    out.push({
      key: String(it.key),
      seed: typeof it.seed === "string" ? it.seed : "",
      title: typeof it.title === "string" ? it.title : "",
      md: typeof it.md === "string" ? it.md : "",
      createdAt: typeof it.createdAt === "string" ? it.createdAt : new Date().toISOString()
    });
    if (out.length >= 50) break;
  }
  return out;
}

function importFavsJsonText(text){
  const trimmed = String(text || "").trim();
  if (!trimmed) return { ok: false, reason: "empty" };

  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, reason: "invalid_json" };
  }

  const incoming = normalizeImportedFavs(parsed);
  if (!incoming.length) return { ok: false, reason: "no_items" };

  const current = loadFavs();
  const map = new Map();
  for (const it of current){
    if (it && typeof it.key === "string") map.set(it.key, it);
  }
  for (const it of incoming){
    if (!map.has(it.key)) map.set(it.key, it);
  }

  const merged = Array.from(map.values()).slice(0, 50);
  saveFavs(merged);
  return { ok: true, added: Math.max(0, merged.length - current.length), total: merged.length };
}

function downloadText(filename, text, mimeType){
  const blob = new Blob([text], { type: mimeType || "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
}

function main(){
  const seedEl = document.querySelector("#seed");
  const countEl = document.querySelector("#count");
  const moreEl = document.querySelector("#moreConstraints");
  const listEl = document.querySelector("#ideas");
  const mdEl = document.querySelector("#markdown");
  const linkEl = document.querySelector("#permalink");
  const copyLinkEl = document.querySelector("#copyLink");

  const favCountEl = document.querySelector("#favCount");
  const favListEl = document.querySelector("#favList");
  const copyFavsEl = document.querySelector("#copyFavs");
  const downloadFavsEl = document.querySelector("#downloadFavs");
  const exportFavsJsonEl = document.querySelector("#exportFavsJson");
  const importFavsJsonEl = document.querySelector("#importFavsJson");
  const clearFavsEl = document.querySelector("#clearFavs");

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

  function renderFavs(){
    const favs = loadFavs();
    favCountEl.textContent = String(favs.length);

    favListEl.innerHTML = "";
    if (!favs.length){
      const empty = document.createElement("div");
      empty.className = "hint";
      empty.textContent = "Aucun favori. Clique 'Favori' sur une idee pour la garder.";
      favListEl.appendChild(empty);
      return;
    }

    for (const it of favs.slice(0, 20)){
      const row = document.createElement("div");
      row.className = "favItem";

      const title = document.createElement("div");
      title.className = "favItemTitle";
      title.textContent = it.title || "Idee";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Copier";
      btn.addEventListener("click", async () => {
        const text = it.md || "";
        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = "Copie!";
          setTimeout(() => (btn.textContent = "Copier"), 900);
        } catch {
          mdEl.value = text;
          mdEl.focus();
          mdEl.select();
        }
      });

      row.appendChild(title);
      row.appendChild(btn);
      favListEl.appendChild(row);
    }
  }

  function isFav(key){
    const favs = loadFavs();
    return favs.some((x) => x.key === key);
  }

  function toggleFav(key, idea, seed){
    const favs = loadFavs();
    const exists = favs.find((x) => x.key === key);
    if (exists){
      const next = favs.filter((x) => x.key !== key);
      saveFavs(next);
      return false;
    }

    const md = ideaToMarkdown(idea);
    const entry = {
      key,
      seed,
      title: idea.title,
      md,
      createdAt: new Date().toISOString()
    };

    const next = [entry].concat(favs).slice(0, 50);
    saveFavs(next);
    return true;
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
    for (let i = 0; i < ideas.length; i++){
      const idea = ideas[i];
      const key = favKey(seed, i, more);

      const item = document.createElement("article");
      item.className = "idea";

      const top = document.createElement("div");
      top.className = "ideaTop";

      const h = document.createElement("h3");
      setText(h, idea.title);

      const favBtn = document.createElement("button");
      favBtn.type = "button";
      favBtn.textContent = isFav(key) ? "Retirer" : "Favori";
      favBtn.addEventListener("click", () => {
        const nowFav = toggleFav(key, idea, seed);
        favBtn.textContent = nowFav ? "Retirer" : "Favori";
        renderFavs();
      });

      top.appendChild(h);
      top.appendChild(favBtn);

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

      item.appendChild(top);
      item.appendChild(p);
      item.appendChild(ul);
      item.appendChild(del);
      item.appendChild(btn);
      listEl.appendChild(item);
    }

    const md = ideas.map(ideaToMarkdown).join("\n\n---\n\n");
    mdEl.value = `# Prompt Forge (${new Date().toISOString()})\n\nSeed: ${seed}\n\n${md}\n`;

    renderFavs();
  }

  function remixSeed(){
    seedEl.value = `seed-${uid().slice(0,8)}`;
    generate();
  }

  document.querySelector("#generate").addEventListener("click", generate);
  document.querySelector("#remixSeed").addEventListener("click", remixSeed);
  document.querySelector("#downloadMd").addEventListener("click", () => {
    downloadText(
      `prompt-forge-${currentSeed().replace(/[^a-zA-Z0-9_-]/g, "-")}.md`,
      mdEl.value,
      "text/markdown;charset=utf-8"
    );
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

  copyFavsEl.addEventListener("click", async () => {
    const favs = loadFavs();
    const text = favExportMarkdown(favs);
    try {
      await navigator.clipboard.writeText(text);
      copyFavsEl.textContent = "Copie!";
      setTimeout(() => (copyFavsEl.textContent = "Copier favoris"), 900);
    } catch {
      mdEl.value = text;
      mdEl.focus();
      mdEl.select();
    }
  });

  downloadFavsEl.addEventListener("click", () => {
    const favs = loadFavs();
    const text = favExportMarkdown(favs);
    downloadText("prompt-forge-favoris.md", text, "text/markdown;charset=utf-8");
  });

  if (exportFavsJsonEl){
    exportFavsJsonEl.addEventListener("click", () => {
      const favs = loadFavs();
      const text = favExportJson(favs);
      downloadText("prompt-forge-favoris.json", text, "application/json;charset=utf-8");
    });
  }

  if (importFavsJsonEl){
    importFavsJsonEl.addEventListener("click", () => {
      const example = "{\n  \"version\": 1,\n  \"items\": []\n}";
      const raw = window.prompt("Colle ici le JSON exporte (Exporter JSON).", example);
      if (raw === null) return;
      const res = importFavsJsonText(raw);
      if (!res.ok){
        window.alert("Import impossible: " + res.reason);
        return;
      }
      renderFavs();
      window.alert("Import ok. Total favoris: " + String(res.total));
    });
  }

  clearFavsEl.addEventListener("click", () => {
    saveFavs([]);
    renderFavs();
    const buttons = listEl.querySelectorAll("button");
    for (const b of buttons){
      if (b.textContent === "Retirer") b.textContent = "Favori";
    }
  });

  // Regenerate on key changes to keep the permalink accurate.
  seedEl.addEventListener("change", generate);
  countEl.addEventListener("change", generate);
  moreEl.addEventListener("change", generate);

  generate();
}

main();
