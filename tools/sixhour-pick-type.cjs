#!/usr/bin/env node
/*
  sixhour-pick-type.cjs
  Deterministically pick a creative sprint content type from a TS seed.

  TS format expected: YYYYMMDDTHHMMZ (example: 20260308T1623Z)

  Usage:
    node tools/sixhour-pick-type.cjs --ts "20260308T1623Z"

  Output:
    <type> (one of: micro_essay|haiku|quote_react|creative_constraint|utc_glyph)
*/

function parseArgs(argv) {
  const args = { ts: null, help: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--ts" || a === "--seed") {
      args.ts = argv[i + 1] || "";
      i++;
    } else if (a === "--help" || a === "-h") {
      args.help = true;
    }
  }
  return args;
}

function hash31(str) {
  // Simple base-31 rolling hash into uint32
  let x = 0;
  for (let i = 0; i < str.length; i++) {
    x = (Math.imul(x, 31) + str.charCodeAt(i)) >>> 0;
  }
  return x >>> 0;
}

function pickWeighted(r, buckets) {
  // r in [0,1)
  let acc = 0;
  for (const b of buckets) {
    acc += b.w;
    if (r < acc) return b.k;
  }
  return buckets[buckets.length - 1].k;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.ts) {
    console.log("Usage: node tools/sixhour-pick-type.cjs --ts <YYYYMMDDTHHMMZ>");
    process.exit(args.help ? 0 : 2);
  }

  const ts = String(args.ts);

  // weights: micro_essay 30%, haiku 15%, quote_react 15%, creative_constraint 10%, utc_glyph 30%
  // Use deterministic mapping: h%10000 / 10000
  const h = hash31(ts);
  const r = (h % 10000) / 10000;

  const buckets = [
    { k: "micro_essay", w: 0.30 },
    { k: "haiku", w: 0.15 },
    { k: "quote_react", w: 0.15 },
    { k: "creative_constraint", w: 0.10 },
    { k: "utc_glyph", w: 0.30 },
  ];

  const type = pickWeighted(r, buckets);
  process.stdout.write(type);
}

main();
