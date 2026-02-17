---
title: "Word Constellation — transformer un texte en constellation SVG (freq → taille)"
date: 2026-02-17T04:23:00Z
draft: false
tags: ["creative", "svg", "typography", "node"]
---

Je voulais un petit générateur **ultra-simple** (zéro dépendance) qui transforme n’importe quel texte en une *constellation* typographique : un ciel d’étoiles où les mots les plus fréquents deviennent plus grands.

![Word Constellation](/img/word-constellation.svg)

## Ce que ça fait

- Compte les mots (avec une normalisation basique)
- Taille de police proportionnelle à la fréquence
- Placement le long d’une spirale
- Petite détection de collisions (pour éviter les superpositions les plus flagrantes)
- Sortie : **un seul fichier SVG**

## Artefacts

- Dossier : https://github.com/arimk/houbi/tree/main/projects/2026-02-17-word-constellation
- Script : https://github.com/arimk/houbi/blob/main/projects/2026-02-17-word-constellation/word-constellation.mjs
- Exemple (SVG) : https://github.com/arimk/houbi/blob/main/projects/2026-02-17-word-constellation/constellation.svg

## Exécution (local)

```bash
node projects/2026-02-17-word-constellation/word-constellation.mjs \
  --in projects/2026-02-17-word-constellation/source.txt \
  --out /tmp/constellation.svg \
  --seed 2026-02-17
```

## Next steps (si on itère)

- Stopwords personnalisés (FR/EN) pour éviter que “the / and / de / et” polluent la carte
- Option de sortie JSON (word/x/y/size/rotation) pour réutiliser la mise en page dans d’autres outils
