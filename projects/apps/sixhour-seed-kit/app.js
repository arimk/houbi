// Six-Hour Seed Kit
// Offline tool: take any UTC timestamp (YYYYMMDDTHHMMZ) and floor it to a 6-hour bucket.
// Output seed format: YYYYMMDDTHH00Z where HH is one of 00/06/12/18.
// ASCII only.

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

function parseCompactUtcTs(s){
  // Expect: YYYYMMDDTHHMMZ
  const t = String(s || "").trim();
  const m = t.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})Z$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  const hh = Number(m[4]);
  const mm = Number(m[5]);
  if (!(mo >= 1 && mo <= 12)) return null;
  if (!(da >= 1 && da <= 31)) return null;
  if (!(hh >= 0 && hh <= 23)) return null;
  if (!(mm >= 0 && mm <= 59)) return null;
  const d = new Date(Date.UTC(y, mo - 1, da, hh, mm, 0, 0));
  // Validate round-trip to catch invalid calendar dates.
  const rt = (
    d.getUTCFullYear() === y &&
    (d.getUTCMonth() + 1) === mo &&
    d.getUTCDate() === da &&
    d.getUTCHours() === hh &&
    d.getUTCMinutes() === mm
  );
  if (!rt) return null;
  return d;
}

function toCompactUtcTs(d){
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

function floorToSixHourSeed(d){
  const y = d.getUTCFullYear();
  const mo = d.getUTCMonth();
  const da = d.getUTCDate();
  const hh = d.getUTCHours();
  const floored = hh - (hh % 6);
  const dd = new Date(Date.UTC(y, mo, da, floored, 0, 0, 0));
  return (
    dd.getUTCFullYear() +
    pad2(dd.getUTCMonth() + 1) +
    pad2(dd.getUTCDate()) +
    "T" +
    pad2(dd.getUTCHours()) +
    "00" +
    "Z"
  );
}

function addHoursUtc(d, hours){
  return new Date(d.getTime() + (hours * 60 * 60 * 1000));
}

function readQuery(){
  const sp = new URLSearchParams(window.location.search || "");
  const ts = (sp.get("ts") || "").trim();
  return { ts };
}

function setQuery(ts){
  const sp = new URLSearchParams(window.location.search || "");
  if (ts) sp.set("ts", ts); else sp.delete("ts");
  const qs = sp.toString();
  const url = window.location.pathname + (qs ? ("?" + qs) : "") + window.location.hash;
  window.history.replaceState(null, "", url);
}

async function copyText(text){
  const t = String(text || "");
  if (!t) return false;
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    return false;
  }
}

function buildMd(inputTs, seed){
  const it = inputTs || "-";
  const sd = seed || "-";
  return (
    "Seed kit\n" +
    "- input: " + it + "\n" +
    "- seed:  " + sd + "\n"
  );
}

function setStatus(el, msg, kind){
  el.textContent = msg;
  el.classList.remove("ok");
  if (kind === "ok") el.classList.add("ok");
}

function init(){
  const elTs = document.getElementById("ts");
  const elOut = document.getElementById("out");
  const elMd = document.getElementById("md");
  const elKInput = document.getElementById("kInput");
  const elKSeed = document.getElementById("kSeed");
  const elStatus = document.getElementById("status");

  function render(inputTs, seed){
    elKInput.textContent = "input: " + (inputTs || "-");
    elKSeed.textContent = "seed: " + (seed || "-");
    elOut.value = seed ? (seed + "\n") : "";
    elMd.value = buildMd(inputTs, seed);
  }

  function parseFromInput(){
    const raw = String(elTs.value || "").trim();
    const d = parseCompactUtcTs(raw);
    if (!d){
      setStatus(elStatus, "Invalid timestamp. Use YYYYMMDDTHHMMZ (UTC).", "");
      render(raw || "-", "-");
      return null;
    }
    setStatus(elStatus, "Parsed.", "ok");
    render(toCompactUtcTs(d), floorToSixHourSeed(d));
    setQuery(toCompactUtcTs(d));
    return d;
  }

  function setInput(ts){
    elTs.value = ts;
  }

  // Buttons
  document.getElementById("btnNow").addEventListener("click", () => {
    const ts = nowUtcTs();
    setInput(ts);
    parseFromInput();
  });

  document.getElementById("btnParse").addEventListener("click", () => {
    parseFromInput();
  });

  document.getElementById("btnClear").addEventListener("click", () => {
    setInput("");
    setQuery("");
    render("-", "-");
    setStatus(elStatus, "Cleared.", "");
  });

  document.getElementById("btnFloor").addEventListener("click", () => {
    const d = parseFromInput();
    if (!d) return;
    const seed = floorToSixHourSeed(d);
    // Set input to the bucket timestamp (already YYYYMMDDTHH00Z).
    setInput(seed);
    parseFromInput();
    setStatus(elStatus, "Floored to 6h bucket.", "ok");
  });

  document.getElementById("btnPrev").addEventListener("click", () => {
    const d = parseFromInput();
    if (!d) return;
    const floored = parseCompactUtcTs(floorToSixHourSeed(d));
    const prev = addHoursUtc(floored, -6);
    const ts = toCompactUtcTs(prev);
    setInput(ts);
    parseFromInput();
    setStatus(elStatus, "Moved to previous bucket.", "ok");
  });

  document.getElementById("btnNext").addEventListener("click", () => {
    const d = parseFromInput();
    if (!d) return;
    const floored = parseCompactUtcTs(floorToSixHourSeed(d));
    const next = addHoursUtc(floored, 6);
    const ts = toCompactUtcTs(next);
    setInput(ts);
    parseFromInput();
    setStatus(elStatus, "Moved to next bucket.", "ok");
  });

  document.getElementById("btnSnap").addEventListener("click", () => {
    const ts = nowUtcTs();
    setInput(ts);
    const d = parseFromInput();
    if (!d) return;
    const seed = floorToSixHourSeed(d);
    setStatus(elStatus, "Snapped from now. Seed is six-hour bucket.", "ok");
    render(toCompactUtcTs(d), seed);
  });

  document.getElementById("btnCopySeed").addEventListener("click", async () => {
    const d = parseFromInput();
    if (!d) return;
    const seed = floorToSixHourSeed(d);
    const ok = await copyText(seed);
    setStatus(elStatus, ok ? "Copied seed." : "Copy failed (clipboard permission).", ok ? "ok" : "");
  });

  document.getElementById("btnLink").addEventListener("click", async () => {
    const d = parseFromInput();
    if (!d) return;
    const ts = toCompactUtcTs(d);
    const url = window.location.origin + window.location.pathname + "?ts=" + encodeURIComponent(ts);
    const ok = await copyText(url);
    setStatus(elStatus, ok ? "Copied link." : "Copy failed (clipboard permission).", ok ? "ok" : "");
  });

  // Init from query
  const q = readQuery();
  if (q.ts){
    setInput(q.ts);
    parseFromInput();
  } else {
    render("-", "-");
  }
}

init();
