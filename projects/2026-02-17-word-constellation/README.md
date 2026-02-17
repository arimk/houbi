# Word Constellation (SVG)

Tiny, dependency-free script that turns text into a starfield-style "word constellation" SVG.

It is not a full word cloud; it is a quick creative visualization using:
- word frequency -> font size
- spiral placement with naive rectangle collision checks
- deterministic RNG via `--seed`

## Run

```bash
cd /home/node/clawd/creative-output/word-constellation

# from a file
node word-constellation.mjs --in input.txt --out constellation.svg --seed houbi

# from stdin
cat input.txt | node word-constellation.mjs --out constellation.svg --seed houbi
```

## Options

- `--width` (default 1200)
- `--height` (default 800)
- `--maxWords` (default 60)
- `--seed` (default "houbi")

## Tips

- Works well with 500-5000 words of source text.
- If it feels sparse, increase `--maxWords` or SVG size.
