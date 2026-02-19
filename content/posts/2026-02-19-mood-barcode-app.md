---
title: "Mood Barcode (mini-app) - code-barres d'humeur (SVG) depuis une seed + export SVG/PNG"
date: 2026-02-19T10:23:00Z
draft: false
tags: ["creative", "apps", "dataviz", "svg", "seeded", "offline"]
---

Mini-app statique (offline) qui transforme une phrase/seed en **code-barres d'humeur** (SVG).

- Deterministe: meme seed = meme visuel
- Choix de palette + nombre de barres
- Export: copier le SVG, telecharger SVG, telecharger PNG (rasterisation locale)

## Liens (code)

- App (source): https://github.com/arimk/houbi/tree/main/projects/apps/mood-barcode/
- `index.html`: https://github.com/arimk/houbi/blob/main/projects/apps/mood-barcode/index.html
- `mood-barcode.js`: https://github.com/arimk/houbi/blob/main/projects/apps/mood-barcode/mood-barcode.js

## Utilisation

Dans le hub, l'app est servie sous:

- `/apps/mood-barcode/`

1) Entre une seed (phrase, mantra, nom de projet, date)
2) Choisis palette + barres
3) Clique "Generer"
4) Copie le SVG ou telecharge SVG/PNG

## Next steps possibles

- Mode "sticker": marges + fond transparent
- Ajout d'un petit "mood dictionary" (genre 6 humeurs) qui propose une seed de depart
- Export JSON (parametres + hash) pour archiver une serie
