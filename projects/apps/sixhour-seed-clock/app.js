(function(){
  "use strict";

  function byId(id){ return document.getElementById(id); }

  function pad2(n){ return String(n).padStart(2, "0"); }

  function toSeed(d){
    var y = d.getUTCFullYear();
    var m = pad2(d.getUTCMonth() + 1);
    var day = pad2(d.getUTCDate());
    var hh = pad2(d.getUTCHours());
    var mm = pad2(d.getUTCMinutes());
    return String(y) + String(m) + String(day) + "T" + String(hh) + String(mm) + "Z";
  }

  function toIso(d){
    return d.toISOString().replace(/\.\d{3}Z$/, "Z");
  }

  function snap6h(d){
    var x = new Date(d.getTime());
    x.setUTCMinutes(0, 0, 0);
    var h = x.getUTCHours();
    var snapped = Math.floor(h / 6) * 6;
    x.setUTCHours(snapped);
    return x;
  }

  function nextSnap6h(d){
    var s = snap6h(d);
    var next = new Date(s.getTime());
    next.setUTCHours(s.getUTCHours() + 6);
    return next;
  }

  function parseSeed(str){
    // Expect YYYYMMDDTHHMMZ
    var s = (str || "").trim();
    if(!/^\d{8}T\d{4}Z$/.test(s)) return null;
    var y = Number(s.slice(0,4));
    var mo = Number(s.slice(4,6));
    var da = Number(s.slice(6,8));
    var hh = Number(s.slice(9,11));
    var mm = Number(s.slice(11,13));
    if(mo < 1 || mo > 12) return null;
    if(da < 1 || da > 31) return null;
    if(hh < 0 || hh > 23) return null;
    if(mm < 0 || mm > 59) return null;
    var d = new Date(Date.UTC(y, mo - 1, da, hh, mm, 0, 0));
    // Validate round-trip
    if(toSeed(d) !== s) return null;
    return d;
  }

  function setText(id, txt){
    var el = byId(id);
    if(el) el.textContent = txt;
  }

  function flashStatus(msg){
    var el = byId("status");
    if(!el) return;
    el.textContent = msg;
    window.clearTimeout(flashStatus._t);
    flashStatus._t = window.setTimeout(function(){ el.textContent = ""; }, 1800);
  }

  function copyText(text){
    return navigator.clipboard.writeText(text).then(function(){
      flashStatus("Copied: " + text);
    }).catch(function(){
      flashStatus("Copy failed (clipboard permissions)");
    });
  }

  function makeTypeCommand(ts){
    return "TS=" + ts + " TYPE=$(node tools/sixhour-pick-type.cjs --ts \"" + ts + "\")";
  }

  function makePostFilename(ts, type){
    var y = ts.slice(0,4);
    var m = ts.slice(4,6);
    var d = ts.slice(6,8);
    return y + "-" + m + "-" + d + "-sprint-" + type + "-" + ts + ".md";
  }

  var elInSeed = byId("inSeed");

  function tick(){
    var now = new Date();
    var tsNow = toSeed(now);
    var snap = snap6h(now);
    var tsSnap = toSeed(snap);
    var next = nextSnap6h(now);

    setText("nowIso", toIso(now));
    setText("seedNow", tsNow);
    setText("seedSnap", tsSnap);
    setText("nextSnap", toIso(next));
  }

  function renderParsed(){
    var raw = elInSeed ? elInSeed.value : "";
    var d = parseSeed(raw);
    if(!d){
      setText("parsed", "-");
      setText("parsedSnap", "-");
      return;
    }
    setText("parsed", toIso(d));
    setText("parsedSnap", toSeed(snap6h(d)));
  }

  function init(){
    tick();
    window.setInterval(tick, 1000);

    var btnCopyNow = byId("btnCopyNow");
    var btnCopySnap = byId("btnCopySnap");
    var btnCopyCmd = byId("btnCopyCmd");
    var btnCopySlug = byId("btnCopySlug");

    if(btnCopyNow) btnCopyNow.addEventListener("click", function(){
      copyText(byId("seedNow").textContent || "");
    });

    if(btnCopySnap) btnCopySnap.addEventListener("click", function(){
      copyText(byId("seedSnap").textContent || "");
    });

    if(btnCopyCmd) btnCopyCmd.addEventListener("click", function(){
      var ts = byId("seedNow").textContent || "";
      if(!ts) return;
      copyText(makeTypeCommand(ts));
    });

    if(btnCopySlug) btnCopySlug.addEventListener("click", function(){
      var ts = byId("seedNow").textContent || "";
      if(!ts) return;
      // For this helper we assume type=poc_app, since it is most common.
      // You can edit it after pasting.
      copyText(makePostFilename(ts, "poc_app"));
    });

    if(elInSeed){
      elInSeed.addEventListener("input", renderParsed);
    }

    var btnUseNow = byId("btnUseNow");
    if(btnUseNow) btnUseNow.addEventListener("click", function(){
      if(!elInSeed) return;
      elInSeed.value = byId("seedNow").textContent || "";
      renderParsed();
      flashStatus("Loaded current seed into scratchpad");
    });

    var btnCopyParsedSnap = byId("btnCopyParsedSnap");
    if(btnCopyParsedSnap) btnCopyParsedSnap.addEventListener("click", function(){
      var v = byId("parsedSnap").textContent || "";
      if(v && v !== "-") copyText(v);
    });

    renderParsed();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  }else{
    init();
  }
})();
