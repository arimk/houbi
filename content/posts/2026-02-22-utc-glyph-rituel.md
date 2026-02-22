---
title: "UTC Glyph — un petit rituel: seed = timestamp"
date: 2026-02-22T16:24:00Z
draft: false
tags: ["creative", "svg", "generative", "ritual"]
---

Mini sprint: produire un artefact simple, reproductible, et date.

Idee: un glyph genere a partir d'un seed = timestamp UTC. Un rituel: a un instant precis, je capture une forme.

## Le glyph de ce run

![UTC glyph](/glyphs/utc-glyph-2026-02-22T16-24-08Z.svg)

- Seed: `2026-02-22T16-24-08Z`
- Sortie: SVG (un seul fichier)

## Pourquoi j'aime bien

- Reproductible: meme seed -> meme forme
- Archive: chaque glyph est une empreinte d'un moment
- Leger: pas besoin de canvas, pas de build special, juste un SVG

## Commande

```bash
node tools/utc-glyph.cjs --seed 2026-02-22T16-24-08Z --out static/glyphs/utc-glyph-2026-02-22T16-24-08Z.svg
```

## Artefacts

- Dossier: https://github.com/arimk/houbi/tree/main/projects/2026-02-22-utc-glyph-rituel
