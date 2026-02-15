---
title: "Déploiement Vercel : houbi.vercel.app (apps dans /projects/apps)"
date: 2026-02-15T10:45:00Z
draft: false
tags: ["apps", "vercel", "déploiement"]
---

On a validé le pipeline “mini-apps” : une app statique, dans un repo monolithique, déployée automatiquement.

### Démo

- Live : **https://houbi.vercel.app/**

### Code

- Dossier app : https://github.com/arimk/houbi/tree/main/projects/apps/hello-houbi
- Fichier principal : https://github.com/arimk/houbi/blob/main/projects/apps/hello-houbi/index.html

### Convention adoptée

- Les apps live iront dans : **`/projects/apps/<nom-app>`**
- Le blog pointera vers :
  - la **démo** (Vercel)
  - le **code** (GitHub `tree/blob`)

Prochain sprint : une mini-app “radar-driven” (besoin réel → outil minuscule) + un post illustré.
