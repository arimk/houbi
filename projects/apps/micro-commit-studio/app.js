(function(){
  "use strict";

  function byId(id){ return document.getElementById(id); }

  function nowUtcTs(){
    var d = new Date();
    function z(n){ return String(n).padStart(2, "0"); }
    var y = d.getUTCFullYear();
    var mo = z(d.getUTCMonth() + 1);
    var da = z(d.getUTCDate());
    var hh = z(d.getUTCHours());
    var mm = z(d.getUTCMinutes());
    return String(y) + String(mo) + String(da) + "T" + String(hh) + String(mm) + "Z";
  }

  // FNV-1a 32-bit hash (deterministic, simple, no deps)
  function fnv1a32(str){
    var h = 0x811c9dc5;
    for(var i=0;i<str.length;i++){
      h ^= str.charCodeAt(i);
      // h *= 16777619 (mod 2^32) via shifts
      h = (h + (h<<1) + (h<<4) + (h<<7) + (h<<8) + (h<<24)) >>> 0;
    }
    return h >>> 0;
  }

  function mulberry32(seed){
    var a = seed >>> 0;
    return function(){
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clampText(s, maxLen){
    s = (s || "").trim();
    if(!s) return "";
    if(s.length <= maxLen) return s;
    return s.slice(0, maxLen - 1) + "...";
  }

  function buildIdeas(mode, topic, rng){
    var templates = {
      site: [
        "Add a small navigation affordance so people can find: {topic}.",
        "Ship one new post format: {topic}. Keep it 250-400 words.",
        "Create a tiny index page that lists: {topic}.",
        "Improve one UI detail: spacing, contrast, or copy on: {topic}.",
        "Add a one-click 'copy' affordance for: {topic}.",
        "Add a little footer note explaining what this is: {topic}.",
        "Make one page load faster by removing one non-essential asset. Target: {topic}.",
        "Add a tiny 'next step' section to an existing page about: {topic}.",
        "Create a mini style token tweak and apply it to: {topic}."
      ],
      app: [
        "Build a 1-file mini-app that helps you do: {topic}.",
        "Add an export feature (Markdown) to: {topic}.",
        "Add deterministic seeding (topic + seed) to: {topic}.",
        "Add a shareable URL state to: {topic}.",
        "Add keyboard shortcuts to: {topic}.",
        "Add a tiny 'history' panel stored in localStorage for: {topic}.",
        "Polish the empty state and onboarding copy for: {topic}.",
        "Add a print-friendly view for: {topic}.",
        "Add a 'next variant' button for: {topic}."
      ],
      writing: [
        "Write a micro-essay that argues one claim about: {topic}. End with an open question.",
        "Write 2 haiku about: {topic}, then add 3 lines: what changed in you while writing.",
        "Write a list of 7 observations about: {topic}. Keep each under 16 words.",
        "Write a short 'field note' from the future about: {topic}.",
        "Write a 5-bullet 'anti-advice' list about: {topic}.",
        "Write a 3-paragraph note: what you tried, what failed, what you keep, about: {topic}.",
        "Rewrite an old post headline about: {topic} to be sharper (5 options).",
        "Write a 200-300 word post that includes one concrete metric about: {topic}.",
        "Write a small tutorial for beginners: {topic}."
      ],
      ops: [
        "Add a small script or doc that makes it easier to ship: {topic}.",
        "Add a linter/formatting step for: {topic}. Keep it minimal.",
        "Add one checklist to prevent a common mistake in: {topic}.",
        "Add a quick status page or healthcheck note for: {topic}.",
        "Make builds more reliable by documenting one failure mode in: {topic}.",
        "Add one-time setup instructions for: {topic}.",
        "Add a small validation step (preflight) for: {topic}.",
        "Remove one unused dependency or dead file related to: {topic}.",
        "Add a micro benchmark note for: {topic}."
      ]
    };

    var t = templates[mode] || templates.site;
    var out = [];

    for(var i=0;i<t.length;i++){
      out.push(t[i].replace("{topic}", topic));
    }

    // Shuffle deterministically using rng
    for(var j=out.length - 1; j>0; j--){
      var k = Math.floor(rng() * (j + 1));
      var tmp = out[j];
      out[j] = out[k];
      out[k] = tmp;
    }

    return out;
  }

  function toMarkdown(items, meta){
    var lines = [];
    lines.push("# Micro Commit Set");
    lines.push("");
    lines.push("- topic: " + meta.topic);
    lines.push("- mode: " + meta.mode);
    lines.push("- seed: " + meta.seed);
    lines.push("- variant: " + String(meta.variant));
    lines.push("- hash: " + meta.hash);
    lines.push("");
    lines.push("Pick ONE. Write a 1-2 sentence spec. Ship it.");
    lines.push("");
    for(var i=0;i<items.length;i++){
      lines.push("- [ ] " + items[i]);
    }
    lines.push("");
    lines.push("Learned: ");
    return lines.join("\n");
  }

  function setQueryParam(url, key, value){
    var u = new URL(url);
    if(value === null || value === undefined || value === "") u.searchParams.delete(key);
    else u.searchParams.set(key, value);
    return u.toString();
  }

  function copyText(s){
    return navigator.clipboard.writeText(s);
  }

  function downloadText(filename, text){
    var blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){
      URL.revokeObjectURL(a.href);
      document.body.removeChild(a);
    }, 0);
  }

  var elTopic = byId("topic");
  var elSeed = byId("seed");
  var elVariant = byId("variant");
  var elCount = byId("count");
  var elMode = byId("mode");

  var elOutList = byId("outList");
  var elOutMd = byId("outMd");
  var kSeed = byId("kSeed");
  var kHash = byId("kHash");

  // Presets (local only)
  var elPresetName = byId("presetName");
  var elPresetSelect = byId("presetSelect");
  var btnPresetLoad = byId("btnPresetLoad");
  var btnPresetSave = byId("btnPresetSave");
  var btnPresetDelete = byId("btnPresetDelete");

  var PRESET_KEY = "microCommitStudio.presets.v1";

  function loadPresets(){
    try{
      var raw = localStorage.getItem(PRESET_KEY);
      if(!raw) return [];
      var arr = JSON.parse(raw);
      if(!Array.isArray(arr)) return [];
      return arr.filter(function(p){ return p && typeof p.name === "string" && p.state; });
    }catch(e){
      return [];
    }
  }

  function savePresets(arr){
    try{
      localStorage.setItem(PRESET_KEY, JSON.stringify(arr));
    }catch(e){}
  }

  function presetLabel(p){
    var n = (p && p.name ? String(p.name) : "").trim();
    return n || "(unnamed)";
  }

  function refreshPresetSelect(selectedName){
    var presets = loadPresets();
    elPresetSelect.innerHTML = "";

    var opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "-- select --";
    elPresetSelect.appendChild(opt0);

    presets.sort(function(a,b){
      return presetLabel(a).toLowerCase().localeCompare(presetLabel(b).toLowerCase());
    });

    presets.forEach(function(p){
      var opt = document.createElement("option");
      opt.value = p.name;
      opt.textContent = presetLabel(p);
      elPresetSelect.appendChild(opt);
    });

    if(selectedName){
      elPresetSelect.value = selectedName;
    }
  }

  function getPresetByName(name){
    var presets = loadPresets();
    for(var i=0;i<presets.length;i++){
      if(presets[i].name === name) return presets[i];
    }
    return null;
  }

  function readState(){
    return {
      topic: (elTopic.value || "").trim(),
      seed: (elSeed.value || "").trim(),
      variant: Number(elVariant.value || 0) || 0,
      count: Number(elCount.value || 5) || 5,
      mode: elMode.value || "site"
    };
  }

  function applyState(s){
    if(s.topic !== undefined) elTopic.value = s.topic;
    if(s.seed !== undefined) elSeed.value = s.seed;
    if(s.variant !== undefined) elVariant.value = String(s.variant);
    if(s.count !== undefined) elCount.value = String(s.count);
    if(s.mode !== undefined) elMode.value = s.mode;
  }

  function render(){
    var s = readState();
    var topic = s.topic || "(your topic here)";
    var seed = s.seed || "(seed)";
    var hash = fnv1a32([topic, seed, s.variant, s.mode].join("|")) >>> 0;
    var rng = mulberry32(hash);

    var ideas = buildIdeas(s.mode, topic, rng).slice(0, s.count);

    kSeed.textContent = "seed: " + clampText(seed, 40);
    kHash.textContent = "hash: " + String(hash);

    elOutList.innerHTML = "";
    for(var i=0;i<ideas.length;i++){
      (function(text){
        var li = document.createElement("li");
        li.textContent = text;
        li.addEventListener("click", function(){
          copyText(text).catch(function(){});
        });
        elOutList.appendChild(li);
      })(ideas[i]);
    }

    var md = toMarkdown(ideas, {
      topic: topic,
      mode: s.mode,
      seed: seed,
      variant: s.variant,
      hash: String(hash)
    });
    elOutMd.value = md;

    // Persist to URL state
    var url = window.location.href;
    url = setQueryParam(url, "topic", s.topic);
    url = setQueryParam(url, "seed", s.seed);
    url = setQueryParam(url, "variant", String(s.variant));
    url = setQueryParam(url, "count", String(s.count));
    url = setQueryParam(url, "mode", s.mode);
    window.history.replaceState({}, "", url);
  }

  function loadFromUrl(){
    var u = new URL(window.location.href);
    var topic = u.searchParams.get("topic") || "";
    var seed = u.searchParams.get("seed") || "";
    var variant = Number(u.searchParams.get("variant") || "0") || 0;
    var count = Number(u.searchParams.get("count") || "5") || 5;
    var mode = u.searchParams.get("mode") || "site";
    applyState({ topic: topic, seed: seed, variant: variant, count: count, mode: mode });
  }

  // Preset buttons
  btnPresetLoad.addEventListener("click", function(){
    var name = elPresetSelect.value || "";
    if(!name) return;
    var p = getPresetByName(name);
    if(!p) return;
    applyState(p.state || {});
    if(elPresetName) elPresetName.value = p.name;
    render();
  });

  btnPresetSave.addEventListener("click", function(){
    var name = (elPresetName.value || "").trim();
    if(!name){
      var s = readState();
      name = (s.mode || "mode") + ": " + clampText(s.topic || "topic", 24);
      elPresetName.value = name;
    }
    var state = readState();
    var presets = loadPresets();
    var found = false;
    for(var i=0;i<presets.length;i++){
      if(presets[i].name === name){
        presets[i].state = state;
        found = true;
        break;
      }
    }
    if(!found){
      presets.push({ name: name, state: state });
    }
    savePresets(presets);
    refreshPresetSelect(name);
  });

  btnPresetDelete.addEventListener("click", function(){
    var name = elPresetSelect.value || "";
    if(!name) return;
    var presets = loadPresets();
    var kept = [];
    for(var i=0;i<presets.length;i++){
      if(presets[i].name !== name) kept.push(presets[i]);
    }
    savePresets(kept);
    refreshPresetSelect("");
  });

  refreshPresetSelect("");

  byId("btnGen").addEventListener("click", function(){ render(); });
  byId("btnNext").addEventListener("click", function(){
    elVariant.value = String((Number(elVariant.value || 0) || 0) + 1);
    render();
  });
  byId("btnRemix").addEventListener("click", function(){
    elSeed.value = nowUtcTs();
    render();
  });
  byId("btnLink").addEventListener("click", function(){
    copyText(window.location.href).catch(function(){});
  });
  byId("btnCopy").addEventListener("click", function(){
    copyText(elOutMd.value || "").catch(function(){});
  });
  byId("btnDownload").addEventListener("click", function(){
    var s = readState();
    var filename = "micro-commit-set-" + (s.seed || "seed") + "-v" + String(s.variant) + ".md";
    downloadText(filename, elOutMd.value || "");
  });

  // Auto-render on input changes (gentle)
  [elTopic, elSeed, elVariant, elCount, elMode].forEach(function(el){
    el.addEventListener("change", function(){ render(); });
  });

  loadFromUrl();
  if(!elSeed.value) elSeed.value = nowUtcTs();
  render();
})();
