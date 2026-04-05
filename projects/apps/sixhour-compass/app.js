// Six-Hour Sprint Compass
// Offline helper: TS (YYYYMMDDTHHMMZ) -> deterministic pick.
// Reimplements tools/sixhour-pick-type.cjs in browser.
// ASCII only.

function pad2(n){ return String(n).padStart(2, "0"); }

function fmtTsFromDateUtc(d){
  // YYYYMMDDTHHMMZ
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

function parseTsToDateUtc(ts){
  // Very small parser; returns null if invalid.
  const s = String(ts || "").trim();
  const m = /^([0-9]{4})([0-9]{2})([0-9]{2})T([0-9]{2})([0-9]{2})Z$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  const hh = Number(m[4]);
  const mm = Number(m[5]);
  if (mo < 1 || mo > 12) return null;
  if (da < 1 || da > 31) return null;
  if (hh < 0 || hh > 23) return null;
  if (mm < 0 || mm > 59) return null;
  const d = new Date(Date.UTC(y, mo - 1, da, hh, mm, 0, 0));
  // Re-format to ensure no overflow normalization.
  if (fmtTsFromDateUtc(d) !== s) return null;
  return d;
}

function hash31(str){
  // Same as tools/sixhour-pick-type.cjs
  let x = 0;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++){
    x = (Math.imul(x, 31) + s.charCodeAt(i)) >>> 0;
  }
  return x >>> 0;
}

function pickType(ts){
  const h = hash31(ts);
  const r = (h % 10000) / 10000;

  const buckets = [
    { k: "poc_app", w: 0.45 },
    { k: "micro_essay", w: 0.20 },
    { k: "utc_glyph", w: 0.15 },
    { k: "haiku", w: 0.10 },
    { k: "quote_react", w: 0.10 }
  ];

  let acc = 0;
  for (const b of buckets){
    acc += b.w;
    if (r < acc) return { type: b.k, h, r, buckets };
  }
  return { type: buckets[buckets.length - 1].k, h, r, buckets };
}

function setClipboard(text){
  const t = String(text || "");
  if (navigator.clipboard && navigator.clipboard.writeText){
    return navigator.clipboard.writeText(t);
  }
  // Fallback
  const ta = document.createElement("textarea");
  ta.value = t;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); } catch(e) {}
  document.body.removeChild(ta);
  return Promise.resolve();
}

function snapToSixHourBoundary(d){
  const x = new Date(d.getTime());
  const hh = x.getUTCHours();
  const snapped = Math.floor(hh / 6) * 6;
  x.setUTCHours(snapped);
  x.setUTCMinutes(0);
  x.setUTCSeconds(0);
  x.setUTCMilliseconds(0);
  return x;
}

function addHoursUtc(d, hours){
  return new Date(d.getTime() + (hours * 3600 * 1000));
}

function buildSchedule({ startTs, count, stepHours }){
  const d0 = parseTsToDateUtc(startTs);
  if (!d0) return [];
  const out = [];
  for (let i = 0; i < count; i++){
    const di = addHoursUtc(d0, stepHours * i);
    const ts = fmtTsFromDateUtc(di);
    const p = pickType(ts);
    out.push({ ts, type: p.type });
  }
  return out;
}

function scheduleToMarkdown(items){
  const lines = [];
  lines.push("Six-hour sprint schedule (deterministic picks)");
  lines.push("");
  for (const it of items){
    lines.push("- " + it.ts + " -> " + it.type);
  }
  return lines.join("\n");
}

function renderBuckets(container, buckets, pickedType){
  container.innerHTML = "";
  for (const b of buckets){
    const el = document.createElement("div");
    el.className = "bucket";

    const top = document.createElement("div");
    top.className = "bucketTop";

    const k = document.createElement("div");
    k.className = "bucketKey";
    k.textContent = b.k;

    const w = document.createElement("div");
    w.className = "bucketNote";
    w.textContent = String(Math.round(b.w * 100)) + "%";

    top.appendChild(k);
    top.appendChild(w);

    const bar = document.createElement("div");
    bar.className = "bucketBar";
    const fill = document.createElement("div");
    fill.className = "bucketFill" + (b.k === pickedType ? " isPicked" : "");
    fill.style.width = String(Math.max(0, Math.min(100, b.w * 100))) + "%";
    bar.appendChild(fill);

    const note = document.createElement("div");
    note.className = "bucketNote";
    note.textContent = (b.k === pickedType) ? "picked" : "";

    el.appendChild(top);
    el.appendChild(bar);
    el.appendChild(note);
    container.appendChild(el);
  }
}

function main(){
  const elTs = document.getElementById("ts");
  const elPickType = document.getElementById("pickType");
  const elPickMeta = document.getElementById("pickMeta");
  const elBuckets = document.getElementById("buckets");

  const elKTs = document.getElementById("kTs");
  const elKHash = document.getElementById("kHash");
  const elKR = document.getElementById("kR");

  const elSchedule = document.getElementById("schedule");
  const elN = document.getElementById("n");
  const elStep = document.getElementById("step");

  function setTs(ts){
    elTs.value = String(ts || "");
    onTsChange();
  }

  function onTsChange(){
    const ts = String(elTs.value || "").trim();
    const d = parseTsToDateUtc(ts);
    if (!d){
      elPickType.textContent = "-";
      elPickMeta.textContent = "Enter a valid TS: YYYYMMDDTHHMMZ";
      elKTs.textContent = "ts: -";
      elKHash.textContent = "hash31: -";
      elKR.textContent = "r: -";
      elBuckets.innerHTML = "";
      return;
    }

    const p = pickType(ts);
    elPickType.textContent = p.type;
    elPickMeta.textContent = "Deterministic pick for TS " + ts + ".";

    elKTs.textContent = "ts: " + ts;
    elKHash.textContent = "hash31: " + String(p.h);
    elKR.textContent = "r: " + String(p.r.toFixed(4));

    renderBuckets(elBuckets, p.buckets, p.type);
  }

  function renderSchedule(items){
    elSchedule.innerHTML = "";
    for (const it of items){
      const li = document.createElement("li");
      li.textContent = it.ts + " -> " + it.type;
      elSchedule.appendChild(li);
    }
  }

  function buildScheduleFromUi(){
    const ts = String(elTs.value || "").trim();
    const count = Number.parseInt(String(elN.value || "6"), 10);
    const stepHours = Number.parseInt(String(elStep.value || "6"), 10);
    const items = buildSchedule({ startTs: ts, count: Number.isFinite(count) ? count : 6, stepHours: Number.isFinite(stepHours) ? stepHours : 6 });
    renderSchedule(items);
    return items;
  }

  elTs.addEventListener("input", onTsChange);

  document.getElementById("btnNow").addEventListener("click", () => {
    const d = new Date();
    d.setUTCSeconds(0);
    d.setUTCMilliseconds(0);
    setTs(fmtTsFromDateUtc(d));
  });

  document.getElementById("btnSnap6").addEventListener("click", () => {
    const d = new Date();
    const s = snapToSixHourBoundary(d);
    setTs(fmtTsFromDateUtc(s));
  });

  document.getElementById("btnCopy").addEventListener("click", () => {
    setClipboard(String(elTs.value || "").trim());
  });

  document.getElementById("btnBuildSchedule").addEventListener("click", () => {
    buildScheduleFromUi();
  });

  document.getElementById("btnCopySchedule").addEventListener("click", () => {
    const items = buildScheduleFromUi();
    setClipboard(scheduleToMarkdown(items));
  });

  // Initialize with current time.
  const d = new Date();
  d.setUTCSeconds(0);
  d.setUTCMilliseconds(0);
  setTs(fmtTsFromDateUtc(d));
}

main();
