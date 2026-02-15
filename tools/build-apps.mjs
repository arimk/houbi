import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const appsRoot = path.join(repoRoot, "projects", "apps");
const distRoot = path.join(repoRoot, "dist");
const distApps = path.join(distRoot, "apps");

function rmrf(p){ fs.rmSync(p, { recursive:true, force:true }); }
function mkdirp(p){ fs.mkdirSync(p, { recursive:true }); }

function copyDir(src, dst){
  const st = fs.statSync(src);
  if (st.isDirectory()){
    mkdirp(dst);
    for (const name of fs.readdirSync(src)){
      if (name.startsWith(".")) continue;
      // skip dev-only files
      if (name === "node_modules") continue;
      copyDir(path.join(src,name), path.join(dst,name));
    }
  } else {
    mkdirp(path.dirname(dst));
    fs.copyFileSync(src,dst);
  }
}

function listApps(){
  if (!fs.existsSync(appsRoot)) return [];
  return fs.readdirSync(appsRoot)
    .filter((n) => !n.startsWith(".") && fs.statSync(path.join(appsRoot,n)).isDirectory())
    .sort();
}

const apps = listApps();
rmrf(distRoot);
mkdirp(distApps);

// copy each app folder into dist/apps/<app>
for (const app of apps){
  const src = path.join(appsRoot, app);
  const dst = path.join(distApps, app);
  copyDir(src, dst);
}

// write index
const indexHtml = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Houbi Apps</title>
  <style>
    :root{color-scheme:dark;}
    body{margin:0;font-family:ui-sans-serif,system-ui;background:#06070b;color:#eaf0ff;}
    .wrap{max-width:960px;margin:0 auto;padding:28px;}
    .card{border:1px solid rgba(120,170,255,.18);border-radius:18px;background:rgba(16,24,48,.72);box-shadow:0 12px 45px rgba(0,0,0,.55);padding:20px}
    h1{margin:0 0 6px;letter-spacing:-.02em}
    p{margin:0 0 14px;color:#98a7c3;line-height:1.7}
    a{color:#66e3ff;text-decoration:none}
    a:hover{text-decoration:underline}
    ul{list-style:none;padding:0;margin:14px 0 0;display:flex;flex-direction:column;gap:10px}
    li{padding:12px 12px;border:1px solid rgba(120,170,255,.18);border-radius:14px;background:rgba(8,10,18,.35)}
    .meta{color:#98a7c3;font-family:ui-monospace,Menlo,monospace;font-size:14px}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="meta">houbi.vercel.app</div>
      <h1>Houbi Apps</h1>
      <p>Mini-apps déployées depuis <code>/projects/apps</code> (monorepo).</p>
      <ul>
        ${apps.map(a => `<li><a href="/apps/${a}/">/apps/${a}/</a> <span class="meta">— ${a}</span></li>`).join("\n")}
      </ul>
      <p style="margin-top:14px" class="meta">Source: <a href="https://github.com/arimk/houbi/tree/main/projects/apps">GitHub</a></p>
    </div>
  </div>
</body>
</html>`;

mkdirp(distRoot);
fs.writeFileSync(path.join(distRoot, "index.html"), indexHtml);

// also copy a minimal vercel.json-friendly 404
fs.writeFileSync(path.join(distRoot, "404.html"), "<meta charset=\"utf-8\"><title>404</title><h1>404</h1>");

console.log(`Built ${apps.length} app(s) into dist/apps/`);
