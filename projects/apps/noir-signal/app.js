function clampInt(value, min, max, fallback){
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function nowSeed(){
  const d = new Date();
  const pad2 = (x) => String(x).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth()+1)}${pad2(d.getUTCDate())}-${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}`;
}

function xmur3(str){
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

function mulberry32(a){
  return function(){
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr){
  return arr[Math.floor(rng() * arr.length)];
}

function maybe(rng, p){ return rng() < p; }

function buildLexicon(mood){
  const base = {
    openings: [
      "This is a low-power transmission.",
      "Signal acquired. Keep your hands off the glass.",
      "The city is still awake inside the wires.",
      "I found your name in a cache that should not exist.",
      "Listen: the rain is just the network rehearsing.",
      "Do not answer if your room has mirrors."
    ],
    subjects: [
      "the elevator to floor 0",
      "a vending machine that remembers",
      "an alley with a firewall for a sky",
      "a dead drop under the neon river",
      "a payphone with no keypad",
      "a map that redraws the streets"
    ],
    actions: [
      "is humming",
      "is leaking",
      "keeps repeating",
      "refuses to forget",
      "learned a new password",
      "swallowed the last witness"
    ],
    details: [
      "in violet light",
      "behind the static",
      "under the satellite bruises",
      "in the seam between frames",
      "where the ads go to die",
      "in a pocket of clean silence"
    ],
    directives: [
      "Meet me where the signal drops.",
      "Leave nothing but heat.",
      "Bring a coin for the old machines.",
      "Do not say my name out loud.",
      "If the door is open, do not enter.",
      "Trust the second shadow."
    ],
    signoffs: [
      "End of line.",
      "If you heard this, you were meant to.",
      "Burn after reading."
    ]
  };

  const moods = {
    tender: {
      openings: [
        "If you are still up, this is for you.",
        "I left warmth inside the noise.",
        "The city is loud but I heard your quiet."
      ],
      actions: ["is waiting", "is breathing", "keeps a light on"],
      directives: ["Call me when the rain changes.", "Keep the small promises.", "Hold on to the bright part."]
    },
    cold: {
      openings: [
        "Report: conditions are stable and cruel.",
        "No anomalies. Only consequences.",
        "This channel is not safe. Continue anyway."
      ],
      actions: ["is operational", "is compromised", "is sealed"],
      directives: ["Proceed without witnesses.", "Do not improvise.", "Assume you are late."]
    },
    paranoid: {
      openings: [
        "They are reading over my shoulder.",
        "Someone rewired the air.",
        "If you get this twice, pretend you did not."
      ],
      actions: ["is listening", "is watching", "keeps copying itself"],
      directives: ["Turn off the lights before you decide.", "Change routes twice.", "Never answer unknown silence."]
    },
    mythic: {
      openings: [
        "The old protocols are singing again.",
        "A small god lives in the streetlight.",
        "Tonight the servers dream in prophecy."
      ],
      subjects: ["the oracle kiosk", "the neon shrine", "the copper moon", "the subway basilica"],
      actions: ["is calling", "is blessing", "is collecting debts"],
      directives: ["Offer a memory, not a password.", "Follow the third bell.", "Do not look back at the glow."]
    }
  };

  if (mood === "balanced" || !moods[mood]) return base;

  const patch = moods[mood];
  return {
    openings: [...patch.openings, ...base.openings],
    subjects: [...(patch.subjects || []), ...base.subjects],
    actions: [...patch.actions, ...base.actions],
    details: [...(patch.details || []), ...base.details],
    directives: [...patch.directives, ...base.directives],
    signoffs: [...(patch.signoffs || []), ...base.signoffs]
  };
}

function generateSignal({ mood, lines, seed }){
  const s = (seed && seed.trim()) ? seed.trim() : nowSeed();
  const seedFn = xmur3(`${mood}|${lines}|${s}`);
  const rng = mulberry32(seedFn());
  const L = buildLexicon(mood);

  const out = [];
  out.push(pick(rng, L.openings));

  const bodyLines = Math.max(1, lines - 2);
  for (let i = 0; i < bodyLines; i++){
    const a = pick(rng, L.subjects);
    const b = pick(rng, L.actions);
    const c = pick(rng, L.details);

    const extra = maybe(rng, 0.35)
      ? `; ${pick(rng, ["do not blink", "keep your voice low", "remember the code", "leave no trace", "trust the static"])}`
      : "";

    out.push(`${a} ${b} ${c}${extra}.`);
  }

  out.push(maybe(rng, 0.65) ? pick(rng, L.directives) : pick(rng, L.signoffs));

  return { seed: s, text: out.join("\n") };
}

function setHint(el, msg, kind){
  el.textContent = msg;
  el.classList.remove("ok", "err");
  if (kind) el.classList.add(kind);
}

function toTxtFilename(mood, seed){
  const safeMood = String(mood || "balanced").replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
  const safeSeed = String(seed || "seed").replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
  return `noir-signal_${safeMood}_${safeSeed}.txt`;
}

function updatePermalink({ mood, lines, seed }){
  const u = new URL(window.location.href);
  u.searchParams.set("mood", mood);
  u.searchParams.set("lines", String(lines));
  if (seed && seed.trim()) u.searchParams.set("seed", seed.trim());
  else u.searchParams.delete("seed");
  return u.toString();
}

const els = {
  mood: document.getElementById("mood"),
  lines: document.getElementById("lines"),
  seed: document.getElementById("seed"),
  gen: document.getElementById("gen"),
  copy: document.getElementById("copy"),
  download: document.getElementById("download"),
  permalink: document.getElementById("permalink"),
  text: document.getElementById("text"),
  hint: document.getElementById("hint")
};

function readState(){
  const mood = els.mood.value;
  const lines = clampInt(els.lines.value, 1, 6, 3);
  const seed = els.seed.value;
  return { mood, lines, seed };
}

function applyFromUrl(){
  const u = new URL(window.location.href);
  const mood = u.searchParams.get("mood");
  const lines = u.searchParams.get("lines");
  const seed = u.searchParams.get("seed");

  if (mood && ["balanced","tender","cold","paranoid","mythic"].includes(mood)) els.mood.value = mood;
  if (lines) els.lines.value = String(clampInt(lines, 1, 6, 3));
  if (seed) els.seed.value = seed;
}

function render(){
  const state = readState();
  const { seed, text } = generateSignal(state);
  els.text.textContent = text;

  const link = updatePermalink({ ...state, seed });
  window.history.replaceState({}, "", link);

  setHint(els.hint, `Seed: ${seed}`, "");
}

async function copyText(){
  try {
    await navigator.clipboard.writeText(els.text.textContent || "");
    setHint(els.hint, "Copied to clipboard.", "ok");
  } catch {
    setHint(els.hint, "Clipboard failed (try manual copy).", "err");
  }
}

function downloadTxt(){
  const state = readState();
  const seed = (state.seed && state.seed.trim()) ? state.seed.trim() : nowSeed();
  const name = toTxtFilename(state.mood, seed);
  const blob = new Blob([els.text.textContent || ""], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(a.href);
  a.remove();
  setHint(els.hint, `Downloaded: ${name}`, "ok");
}

async function copyPermalink(){
  try {
    await navigator.clipboard.writeText(window.location.href);
    setHint(els.hint, "Permalink copied.", "ok");
  } catch {
    setHint(els.hint, window.location.href, "");
  }
}

els.gen.addEventListener("click", render);
els.copy.addEventListener("click", copyText);
els.download.addEventListener("click", downloadTxt);
els.permalink.addEventListener("click", copyPermalink);

applyFromUrl();
render();
