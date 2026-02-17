# Palette Poster (Houbi mini-app)

A tiny offline, deterministic SVG poster generator.

- Input: a phrase (seed), size, and style.
- Output: an SVG poster + a 5-color palette.
- Export: download SVG or render a PNG locally in the browser.

Location in repo:
- `projects/apps/palette-poster/`

Open locally:
- just open `index.html` in a browser

Deployed via the Houbi hub:
- `npm run build` copies this folder into `dist/apps/palette-poster/`

Notes:
- no network calls
- no external dependencies
- deterministic: same phrase + options -> same poster
