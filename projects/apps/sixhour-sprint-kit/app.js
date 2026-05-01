function pad2(n){ return String(n).padStart(2, '0'); }

function toTs6h(d){
  const y = d.getUTCFullYear();
  const mo = pad2(d.getUTCMonth() + 1);
  const da = pad2(d.getUTCDate());
  const h = d.getUTCHours();
  const floored = Math.floor(h / 6) * 6;
  const hh = pad2(floored);
  return `${y}${mo}${da}T${hh}00Z`;
}

function parseTs(ts){
  // YYYYMMDDTHHMMZ
  if(!ts) return null;
  const m = String(ts).trim().match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})Z$/);
  if(!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  const hh = Number(m[4]);
  const mm = Number(m[5]);
  const dt = new Date(Date.UTC(y, mo - 1, da, hh, mm, 0));
  if(Number.isNaN(dt.getTime())) return null;
  return dt;
}

function fmtHm(ms){
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(r)}`;
}

function xfnv1a32(str){
  // simple deterministic hash for UI purposes (not crypto)
  let h = 0x811c9dc5;
  for(let i=0;i<str.length;i++){
    h ^= str.charCodeAt(i);
    h = (h + ((h<<1) + (h<<4) + (h<<7) + (h<<8) + (h<<24))) >>> 0;
  }
  return h >>> 0;
}

function pick(arr, n){ return arr[n % arr.length]; }

function buildPrompt(ts, v){
  const bankA = [
    'Make a smaller surface area.',
    'Add a single satisfying interaction.',
    'Turn friction into a slider.',
    'Make the next step obvious.',
    'Ship a tool that fits in one file.'
  ];
  const bankB = [
    'Write the README first.',
    'Prefer defaults over settings.',
    'Expose one export button.',
    'Design for offline use.',
    'Add a print view.'
  ];
  const bankC = [
    'End with an open question.',
    'Include a tiny example.',
    'Leave one deliberate rough edge.',
    'Name the constraint out loud.',
    'Make it linkable.'
  ];

  const h = xfnv1a32(`${ts}|v=${v}`);
  const a = pick(bankA, h);
  const b = pick(bankB, h >>> 6);
  const c = pick(bankC, h >>> 12);
  const id = (h % 10000).toString().padStart(4, '0');
  return { id, salt: h.toString(16).padStart(8, '0'), text: `${a} ${b} ${c}` };
}

async function copyText(s){
  try{
    await navigator.clipboard.writeText(s);
    return true;
  }catch(_){
    try{
      const ta = document.createElement('textarea');
      ta.value = s;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      return true;
    }catch(__){
      return false;
    }
  }
}

function qs(){ return new URLSearchParams(location.search); }

const el = (id) => document.getElementById(id);

let frozen = false;
let frozenNow = null;
let variant = 0;

function getNow(){
  if(frozen && frozenNow) return new Date(frozenNow.getTime());
  return new Date();
}

function getEffectiveTs(now){
  const override = el('inpTs').value.trim();
  if(override){
    const dt = parseTs(override);
    if(dt) return toTs6h(dt);
    return override;
  }
  return toTs6h(now);
}

function updateUrl(ts){
  const p = qs();
  if(ts) p.set('ts', ts);
  p.set('v', String(variant));
  const u = new URL(location.href);
  u.search = p.toString();
  history.replaceState({}, '', u.toString());
}

function update(){
  const now = getNow();
  const ts = getEffectiveTs(now);
  el('kTs').textContent = ts;

  const dt = parseTs(ts);
  if(dt){
    const start = dt;
    const end = new Date(start.getTime() + 6*3600*1000);
    const windowStr = `${pad2(start.getUTCHours())}:00 - ${pad2(end.getUTCHours() % 24)}:00`;
    el('kWindow').textContent = windowStr;

    const countdown = end.getTime() - now.getTime();
    el('kCountdown').textContent = fmtHm(countdown);
  }else{
    el('kWindow').textContent = '-';
    el('kCountdown').textContent = '-';
  }

  const p = buildPrompt(ts, variant);
  el('kPromptId').textContent = `prompt: ${p.id}`;
  el('kSalt').textContent = `salt: ${p.salt}`;
  el('outPrompt').textContent = p.text;

  updateUrl(ts);
}

function initFromQuery(){
  const p = qs();
  const ts = p.get('ts');
  const v = p.get('v');
  if(ts) el('inpTs').value = ts;
  if(v && /^\d+$/.test(v)) variant = Math.max(0, Math.min(99, Number(v)));
}

function bind(){
  el('btnCopyTs').addEventListener('click', async () => {
    const ok = await copyText(el('kTs').textContent.trim());
    el('btnCopyTs').textContent = ok ? 'Copied TS' : 'Copy failed';
    setTimeout(() => { el('btnCopyTs').textContent = 'Copy TS'; }, 900);
  });

  el('btnCopyLink').addEventListener('click', async () => {
    const ok = await copyText(location.href);
    el('btnCopyLink').textContent = ok ? 'Copied link' : 'Copy failed';
    setTimeout(() => { el('btnCopyLink').textContent = 'Copy link (with TS)'; }, 900);
  });

  el('btnFreeze').addEventListener('click', () => {
    frozen = !frozen;
    frozenNow = frozen ? new Date() : null;
    el('btnFreeze').textContent = frozen ? 'Unfreeze' : 'Freeze';
    update();
  });

  el('btnCopyPrompt').addEventListener('click', async () => {
    const txt = `TS ${el('kTs').textContent.trim()}\n${el('outPrompt').textContent.trim()}`;
    const ok = await copyText(txt);
    el('btnCopyPrompt').textContent = ok ? 'Copied' : 'Copy failed';
    setTimeout(() => { el('btnCopyPrompt').textContent = 'Copy prompt'; }, 900);
  });

  el('btnRemix').addEventListener('click', () => {
    variant = (variant + 1) % 100;
    update();
  });

  el('inpTs').addEventListener('input', () => {
    update();
  });
}

initFromQuery();
bind();
update();
setInterval(() => update(), 500);
