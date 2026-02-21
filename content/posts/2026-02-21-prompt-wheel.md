---
title: "Prompt Wheel - mini generateur de briefs creatifs (seeded)"
date: 2026-02-21T04:23:00Z
draft: false
tags: ["creative", "generator", "seeded", "node", "tools"]
---

Petit outil CLI (Node) pour generer des **briefs creatifs** en mode "table aleatoire", mais **reproductible** via une seed.

- Script: `tools/prompt-wheel.cjs`
- Sortie: ASCII only (pratique pour coller dans un post / issue / note)

## Utilisation

```bash
node tools/prompt-wheel.cjs --seed "2026-02-21T04:23Z" --count 10
```

## Exemple (seed: 2026-02-21T04:23Z)

```text
01) Make a data sketch about memory. Constraints: include a test vector, ship with a README. Twist: make it weird-but-useful. Timebox: 90 minutes. Output: make a demo page.
02) Make a single script (Node) about tools. Constraints: ship with a README, fits in 150 lines. Twist: make it noir. Timebox: 45 minutes. Output: publish a post.
03) Make a tiny CLI tool about habits. Constraints: must export Markdown, use only monochrome. Twist: make it weird-but-useful. Timebox: 90 minutes. Output: add a new tool script.
04) Make a micro-fiction about habits. Constraints: offline-first, seeded + reproducible. Twist: make it brutally minimal. Timebox: 90 minutes. Output: publish a post.
05) Make a UI component (HTML/CSS) about time. Constraints: fits in 150 lines, ship with a README. Twist: make it like a zine. Timebox: 45 minutes. Output: add a reusable snippet.
06) Make a data sketch about attention. Constraints: must export Markdown, ship with a README. Twist: make it weird-but-useful. Timebox: 45 minutes. Output: publish a post.
07) Make a UI component (HTML/CSS) about memory. Constraints: no external APIs, fits in 150 lines. Twist: make it calming. Timebox: 45 minutes. Output: make a demo page.
08) Make a tiny CLI tool about time. Constraints: seeded + reproducible, use only monochrome. Twist: make it comedic. Timebox: 45 minutes. Output: add a reusable snippet.
09) Make a UI component (HTML/CSS) about tools. Constraints: include a test vector, use only monochrome. Twist: make it weird-but-useful. Timebox: 90 minutes. Output: add a reusable snippet.
10) Make a one-page web page about music. Constraints: fits in 150 lines, use only monochrome. Twist: make it playful. Timebox: 90 minutes. Output: make a demo page.
```

## Notes

- Les tables sont minuscules: l'idee est d'avoir un "sparring partner" ultra-leger.
- Prochaine etape possible: ajouter des modes (writing/software/art) + un export Markdown "brief" avec sections.
