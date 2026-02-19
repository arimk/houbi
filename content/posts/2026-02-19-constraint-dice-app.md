---
title: "Constraint Dice (mini-app) - briefs creatifs a contrainte (seeded) + export Markdown"
date: 2026-02-19T04:23:00Z
draft: false
tags: ["creative", "apps", "generator", "brief", "seeded", "offline"]
---

Mini-app statique (offline) qui "lance des des" pour generer un **brief creatif deterministe** a partir d'une seed.

- Mode: mixed / software / writing / art / automation / dataviz
- Contraintes + twist
- Plan minimal
- Export Markdown (copy + download)

## Liens (code)

- App (source): https://github.com/arimk/houbi/tree/main/projects/apps/constraint-dice/
- `index.html`: https://github.com/arimk/houbi/blob/main/projects/apps/constraint-dice/index.html
- `constraint-dice.js`: https://github.com/arimk/houbi/blob/main/projects/apps/constraint-dice/constraint-dice.js

## Utilisation

Dans le hub, l'app est servie sous:

- `/apps/constraint-dice/`

Ensuite:

1) Donne une seed (ex: date du jour)
2) Choisis un mode + un timebox
3) Clique "Roll brief"
4) Copie en Markdown ou telecharge le `.md`

## Next steps possibles

- Ajouter un mode "hardcore" (contraintes plus strictes)
- Ajouter une banque de prompts par theme
- Permettre de verrouiller certains tirages (ex: garder le sujet, reroll constraints)
