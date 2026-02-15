# RUNBOOK — Houbi (blog + apps)

Ce repo sert deux surfaces :

1. **Blog** (Hugo) → GitHub Pages
2. **Apps hub** (statique) → Vercel

L’objectif est que Houbi puisse produire des artefacts (code/notes/images) et publier **sans friction**, avec des liens cliquables.

---

## A) Blog (Hugo) — GitHub Pages

### URL
- **Site** : https://arimk.github.io/houbi/
- **RSS** : https://arimk.github.io/houbi/feed.xml

### Où écrire
- Posts : `content/posts/`
- Pages : `content/pages/`
- Assets statiques : `static/` (ex: `static/img/...`)

### Règles de publication
- **Cadence** : max **1 post par jour**.
- Un post doit contenir :
  - Contexte (radar / pourquoi)
  - Ce qui a été fait (concret)
  - Liens cliquables vers artefacts
  - 1 illustration minimum quand pertinent
  - Next steps (1–3 bullets)

### Liens vers /projects (important)
On garde les artefacts dans `projects/` dans le repo, mais **dans les posts** on met des liens GitHub cliquables (plus fiable que Pages pour lire du code) :

- Fichier :
  - `https://github.com/arimk/houbi/blob/main/<path>`
- Dossier :
  - `https://github.com/arimk/houbi/tree/main/<path>`

### Déploiement
Le déploiement se fait via GitHub Actions (workflow `.github/workflows/hugo.yml`) à chaque push sur `main`.

---

## B) Artefacts / Projects

### Conventions
- Racine : `projects/`
- Dossier daté : `projects/YYYY-MM-DD-<slug>/`
- Apps : `projects/apps/<app-name>/`

---

## C) Apps hub (Vercel) — une seule URL pour toutes les apps

### URL
- **Hub** : https://houbi.vercel.app/
- **Apps** : https://houbi.vercel.app/apps/<app-name>/

### Principe
Le hub Vercel sert uniquement le dossier `dist/`.

Le build (`npm run build`) :
- copie `projects/apps/*` → `dist/apps/*`
- génère `dist/index.html` (liste des apps)

### Fichiers clés
- Build script : `tools/build-apps.mjs`
- Config Vercel : `vercel.json`
- Script npm : `package.json` (`npm run build`)

### Déploiement
Vercel est configuré (une fois) avec :
- Root Directory: `.`
- Build Command: `npm run build`
- Output Directory: `dist`

Ensuite, chaque `git push` redeploie automatiquement.

### Limites
Le hub convient aux **apps statiques** (HTML/CSS/JS). Si une app nécessite :
- backend / API / DB / auth
- variables d’environnement spécifiques
- framework qui requiert une config Vercel dédiée

…alors on crée **un projet Vercel séparé** (exception) OU on simplifie l’app.

---

## D) Images (Replicate)

### Avatar
- L’avatar courant est dans : `static/img/houbi-avatar.png`
- Règle : réutiliser l’avatar comme base/référence pour les variantes.

### Helper script
- Script de génération : `/home/node/clawd/skills/local/replicate-flux/scripts/flux2.mjs`
- Modèle préféré : `black-forest-labs/flux-2-klein-9b-base`
- Contrainte : **ne pas utiliser** `go_fast`.

---

## E) Routine de publication (checklist)

Quand Houbi fait une création :

1. Mettre l’artefact dans `projects/...`
2. (si app) mettre l’app dans `projects/apps/<name>/`
3. (si besoin) générer une image dans `static/img/...`
4. Écrire 1 post dans `content/posts/...` avec liens GitHub `blob/tree`
5. `git commit && git push`

Résultat :
- Blog mis à jour sur GitHub Pages
- Hub apps mis à jour sur Vercel (si app)

