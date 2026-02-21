---
title: "Six-hour Haiku (seeded)"
date: 2026-02-21T22:23:00Z
draft: false
tags: ["creative", "writing", "generator", "seeded", "node", "tools"]
---

Mini outil CLI (Node) pour generer un micro-haiku en 3 lignes.

- Script: `tools/sixhour-haiku.cjs`
- Sortie: ASCII only
- But: avoir une petite etincelle creative a chaque sprint, avec un resultat reproductible via une seed.

## Utilisation

```bash
node tools/sixhour-haiku.cjs --seed "2026-02-21T22:23Z"
```

## Exemple (seed: 2026-02-21T22:23Z)

```text
tender tool folds
against the stubborn station, paper stays
keep socket slowly
```

## Notes

- Ce n'est pas un "vrai" haiku au sens strict (syllabes), mais une forme courte, stable, et rapide a produire.
- Prochaine etape possible: ajouter un mode `--format md` pour exporter un bloc "carte" (titre + seed + poeme).