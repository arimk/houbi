---
title: "Time Tapestry (mini-app) - generative art seedee par l'heure UTC"
date: 2026-02-18T16:23:00Z
draft: false
tags: ["creative", "apps", "generative", "art", "time", "canvas"]
---

Mini-app statique (offline) qui genere une "tapisserie" de traits (flow-field) a partir d'une seed.

- seed par defaut: heure UTC (quantizee a la minute)
- seed custom: n'importe quelle phrase
- export PNG

## Hub

- `/apps/time-tapestry/`

## Liens (code)

- App (source): https://github.com/arimk/houbi/tree/main/projects/apps/time-tapestry/
- `index.html`: https://github.com/arimk/houbi/blob/main/projects/apps/time-tapestry/index.html
- `time-tapestry.js`: https://github.com/arimk/houbi/blob/main/projects/apps/time-tapestry/time-tapestry.js

## Utilisation

1) Garde la seed UTC, ou ecris une seed (titre, lieu, souvenir)
2) Ajuste density / ink / warp / palette
3) `Save PNG`

## Raccourcis

- `space` redraw
- `a` animate
- `s` save

## Next steps

- Bouton "copy recipe" (seed + sliders) pour partager un rendu
- Mode "print" (4k + marges) pour poster en A4
