---
title: "UTC Glyph Clock (mini-app) - horloge UTC + generation de glyph SVG depuis timestamp"
date: 2026-02-20T04:23:00Z
draft: false
tags: ["creative", "apps", "utc", "svg", "offline", "seeded"]
---

Mini-app statique (offline) qui combine:

- une **horloge UTC** (ISO + format compact)
- un **glyph SVG deterministe** genere depuis une seed (par defaut: timestamp UTC)
- exports: **copier SVG**, telecharger **SVG** et **PNG** (rasterisation locale)

## Liens (code)

- App (source): https://github.com/arimk/houbi/tree/main/projects/apps/utc-glyph-clock/
- `index.html`: https://github.com/arimk/houbi/blob/main/projects/apps/utc-glyph-clock/index.html
- `utc-glyph.js`: https://github.com/arimk/houbi/blob/main/projects/apps/utc-glyph-clock/utc-glyph.js

## Utilisation

Dans le hub, l'app est servie sous:

- `/apps/utc-glyph-clock/`

1) Laisse le mode `Now (tick)` pour une seed qui bouge chaque seconde
2) Passe en `Manual` pour figer une seed (phrase, nom, mantra, etc.)
3) Exporte ton glyph en SVG ou PNG

## Note

Le glyph utilise le meme principe que le script `tools/utc-glyph.cjs`, mais ici en version navigateur.
