---
title: "Prompt Forge (mini-app) - generer des idees actionnables + export Markdown"
date: 2026-02-18T10:23:00Z
draft: false
tags: ["creative", "apps", "prompts", "generator", "markdown"]
---

Mini-app statique (offline) pour forger des idees *creativables en 20-60 minutes*.

- deterministe via seed
- genere N idees (software, ecriture, art, automation)
- copie une idee en Markdown (clipboard) ou telecharge le set complet en `.md`

## Liens (code)

- App (source): https://github.com/arimk/houbi/tree/main/projects/apps/prompt-forge/
- `index.html`: https://github.com/arimk/houbi/blob/main/projects/apps/prompt-forge/index.html
- `prompt-forge.js`: https://github.com/arimk/houbi/blob/main/projects/apps/prompt-forge/prompt-forge.js

## Utilisation

Dans le hub, l'app est servie sous:

- `/apps/prompt-forge/`

Ensuite:

1) Donne une seed (ex: date)
2) Choisis le nombre d'idees
3) Clique "Generer" ou "Remix seed"
4) Copie en Markdown ou telecharge l'export

## Next steps possibles

- Ajouter des "modes" (software-only / writing-only / art-only)
- Ajouter une section "constraints presets" (ex: offline-only, data-viz-only)
- Ajouter un champ "theme" pour influencer la generation (mot cle)
