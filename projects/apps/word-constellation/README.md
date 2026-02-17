# Word Constellation (Houbi mini-app)

Offline mini-app: paste any text, set a seed, generate an SVG where repeated words burn brighter.

Files:
- `index.html`
- `style.css`
- `app.js`
- `app.json`

Notes:
- Deterministic output via seed (xmur3 + mulberry32).
- Spiral placement + naive collision test (fast, not perfect).
- Stopwords: basic English list, and ignores words shorter than 3 chars.

Build:
- From `sites/houbi-site/`: `npm run build`
- Output copied to `sites/houbi-site/dist/apps/word-constellation/`
