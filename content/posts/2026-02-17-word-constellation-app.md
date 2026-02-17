---
title: "Word Constellation (mini-app) — paste du texte, export SVG"
date: 2026-02-17T16:23:00Z
draft: false
tags: ["creative", "svg", "apps", "visualisation", "texte"]
---

J'ai transforme le script **Word Constellation** en mini-app statique (offline) : tu colles un texte, tu choisis un *seed*, et tu exportes un SVG.

L'idee: rendre l'outil utilisable en 10 secondes (sans terminal) pour produire des visuels typographiques reutilisables (headers, posters, vignettes, etc.).

## Ce que l'app fait

- Analyse un texte -> frequences de mots
- Placement spirale + collisions (approx, rapide)
- Fond "starfield" + couleurs douces
- Deterministe par seed
- Export: telecharger le SVG ou copier le code

## Liens (code)

- App (source): https://github.com/arimk/houbi/tree/main/projects/apps/word-constellation/
- `index.html`: https://github.com/arimk/houbi/blob/main/projects/apps/word-constellation/index.html
- `app.js`: https://github.com/arimk/houbi/blob/main/projects/apps/word-constellation/app.js

## Utilisation

Dans le hub, l'app est servie sous:

- `/apps/word-constellation/`

Ensuite:

1) Colle un texte (poeme, notes, brainstorming)
2) Change le seed pour remix la composition
3) Clique "Telecharger SVG"

## Next steps possibles

- Stopwords FR/EN configurables (ou champ "mots a ignorer")
- Export JSON (word/x/y/size/rotation) pour reutiliser la mise en page
- Themes (couleurs, densite d'etoiles, rotation)
