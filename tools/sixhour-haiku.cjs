#!/usr/bin/env node
/*
  sixhour-haiku.cjs
  Seeded micro-haiku generator (ASCII-only output).

  Usage:
    node tools/sixhour-haiku.cjs --seed "2026-02-21T22:23Z"
    node tools/sixhour-haiku.cjs --seed "2026-02-21T22:23Z" --count 5
*/

function usageAndExit(msg, code) {
  if (msg) console.error(msg);
  console.error(
    "Usage:\n" +
      "  node tools/sixhour-haiku.cjs --seed <string>\n" +
      "  node tools/sixhour-haiku.cjs --seed <string> --count <n>\n"
  );
  process.exit(code);
}

function parseArgs(argv) {
  const out = { seed: null, count: 1 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--seed") {
      out.seed = argv[++i];
    } else if (a === "--count") {
      out.count = Number(argv[++i]);
    } else if (a === "-h" || a === "--help") {
      usageAndExit(null, 0);
    } else {
      usageAndExit("Unknown arg: " + a, 2);
    }
  }
  if (!out.seed) usageAndExit("Missing --seed", 2);
  if (!Number.isFinite(out.count) || out.count < 1 || out.count > 99) {
    usageAndExit("Bad --count (1..99)", 2);
  }
  return out;
}

function xmur3(str) {
  // https://stackoverflow.com/a/52171480
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

const WORDS = {
  adj: [
    "quiet",
    "salt",
    "soft",
    "sharp",
    "slow",
    "small",
    "bright",
    "tender",
    "spare",
    "future",
    "stubborn",
    "plain",
    "hidden",
    "late",
    "first",
  ],
  noun: [
    "clock",
    "cursor",
    "window",
    "street",
    "paper",
    "socket",
    "memory",
    "signal",
    "lantern",
    "map",
    "seed",
    "tool",
    "thread",
    "station",
    "index",
  ],
  verb: [
    "drifts",
    "clicks",
    "waits",
    "turns",
    "folds",
    "rings",
    "opens",
    "returns",
    "stays",
    "slides",
    "parks",
    "breathes",
  ],
  adv: ["again", "now", "slowly", "nearby", "alone", "today"],
  prep: ["under", "inside", "beyond", "between", "against", "near"],
};

function lineA(rng) {
  // ~5-ish
  return [pick(rng, WORDS.adj), pick(rng, WORDS.noun), pick(rng, WORDS.verb)].join(
    " "
  );
}

function lineB(rng) {
  // ~7-ish
  return [
    pick(rng, WORDS.prep),
    "the",
    pick(rng, WORDS.adj),
    pick(rng, WORDS.noun) + ",",
    pick(rng, WORDS.noun),
    pick(rng, WORDS.verb),
  ].join(" ");
}

function lineC(rng) {
  // ~5-ish
  const tail = rng() < 0.6 ? pick(rng, WORDS.adv) : "";
  return ["keep", pick(rng, WORDS.noun), tail].filter(Boolean).join(" ");
}

function makeHaiku(seed, index) {
  const seedFn = xmur3(seed + "#" + String(index));
  const rng = mulberry32(seedFn());
  return [lineA(rng), lineB(rng), lineC(rng)].join("\n");
}

function main() {
  const args = parseArgs(process.argv);
  for (let i = 1; i <= args.count; i++) {
    if (i > 1) process.stdout.write("\n\n");
    process.stdout.write(makeHaiku(args.seed, i));
  }
}

main();
