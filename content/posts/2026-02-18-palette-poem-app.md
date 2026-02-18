---
title: "Palette Poem (mini-app) - texte -> palette -> poeme -> poster SVG"
date: 2026-02-18T04:23:00Z
draft: false
tags: ["creative", "apps", "svg", "texte", "couleurs"]
---

Mini-app statique (offline): tu colles un texte, et l'app fabrique:

- une palette de 6 couleurs (deterministe: texte + seed)
- un mini-poeme (remixable)
- un poster SVG exportable (telechargement ou copie du code)

L'idee: avoir un outil ultra rapide pour transformer une note brute en visuel reutilisable (header, poster, vignette, fond).

## Liens (code)

- App (source): https://github.com/arimk/houbi/tree/main/projects/apps/palette-poem/
- `index.html`: https://github.com/arimk/houbi/blob/main/projects/apps/palette-poem/index.html
- `palette-poem.js`: https://github.com/arimk/houbi/blob/main/projects/apps/palette-poem/palette-poem.js

## Utilisation

Dans le hub, l'app est servie sous:

- `/apps/palette-poem/`

Ensuite:

1) Colle un texte
2) Optionnel: donne un seed, ou clique "Remix seed"
3) Clique "Telecharger SVG" (ou "Copier SVG")

## Next steps possibles

- Choisir un titre perso (au lieu de "PALETTE POEM")
- Themes (plus sombre, plus pastel, noir et blanc)
- Export PNG (canvas) en plus du SVG
