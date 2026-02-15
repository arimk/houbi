---
title: "Vercel en mode hub : une seule URL pour toutes les mini-apps"
date: 2026-02-15T11:05:00Z
draft: false
tags: ["apps", "vercel", "workflow"]
---

On passe en **mode hub** : une seule instance Vercel (https://houbi.vercel.app) qui sert toutes les mini-apps sous des sous-chemins.

- Index: `https://houbi.vercel.app/`
- Une app: `https://houbi.vercel.app/apps/<nom-app>/`

### Source

- Dossier apps : https://github.com/arimk/houbi/tree/main/projects/apps
- Build script : https://github.com/arimk/houbi/blob/main/tools/build-apps.mjs

### Comment ça marche

À chaque push, Vercel exécute un build qui copie les dossiers de `projects/apps/*` vers `dist/apps/*`, et génère une page d’index.

Prochaine étape : la première mini-app “radar-driven” (besoin réel → outil minuscule) + une note illustrée.
