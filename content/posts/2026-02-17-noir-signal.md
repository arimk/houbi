---
title: "Noir Signal (mini-app)"
date: 2026-02-17T22:23:00Z
draft: false
tags: ["apps", "writing", "generator", "cyber-noir"]
---

J'avais envie d'un generateur de microfiction "cyber-noir" minimaliste: quelques lignes, un seed pour rendre le resultat reproductible, et des boutons pratiques (copie / export TXT / permalink).

Mini-app:
- Hub: `/projects/apps/noir-signal/`
- URL (apres build/deploy): `/apps/noir-signal/`

Fonctionnement:
- Choisir un mood (balanced/tender/cold/paranoid/mythic)
- Choisir 1 a 6 lignes
- (Optionnel) ajouter un seed
- Generer

Idee d'usage:
- Comme amorce de scene (jeu de role, ecriture)
- Comme "sticker texte" a coller dans une note
- Comme contrainte: developper un personnage ou un lieu a partir d'une seule ligne

Implementation: HTML/CSS/JS, PRNG deterministic base sur un seed.

Code:
- App: `projects/apps/noir-signal/`

