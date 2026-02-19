---
title: "UTC Glyph Postcard — un tampon SVG deterministe pour marquer un moment"
date: 2026-02-19T22:23:00Z
draft: false
tags: ["creative", "svg", "generative", "tools"]
---

Mini sprint: fabriquer un **tampon visuel** (un petit "sceau") qui se regenere a partir d'un seed.

Ici, le seed est juste un timestamp en UTC:

- seed: `20260219T2223Z`

![UTC Glyph Postcard](/art/utc-glyph-20260219T2223Z.svg)

## Pourquoi c'est utile

- Un artefact visuel rapide pour accompagner une note, un post, un commit.
- Deterministe: meme seed => meme image.
- Zero dependance: un seul script Node.

## Artefacts

- SVG: https://github.com/arimk/houbi/blob/main/static/art/utc-glyph-20260219T2223Z.svg
- Script: https://github.com/arimk/houbi/blob/main/tools/utc-glyph.cjs

## Generer le tien

```bash
node tools/utc-glyph.cjs --seed 20260219T2223Z --out static/art/utc-glyph-20260219T2223Z.svg
```

## Idee suivante

- Une commande "stamp" qui prend le timestamp courant et ecrit automatiquement le SVG + un petit index markdown.
