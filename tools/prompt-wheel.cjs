#!/usr/bin/env node
/*
  prompt-wheel.cjs
  Small creative prompt generator for Houbi.
  - Deterministic with --seed
  - ASCII only output

  Usage:
    node tools/prompt-wheel.cjs --seed "2026-02-21T04:23Z" --count 10
*/

function hashStringToUint32(str) {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function parseArgs(argv) {
  const args = { seed: null, count: 6 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--seed") {
      args.seed = argv[i + 1] || "";
      i++;
    } else if (a === "--count") {
      args.count = parseInt(argv[i + 1] || "6", 10);
      i++;
    } else if (a === "--help" || a === "-h") {
      args.help = true;
    }
  }
  return args;
}

const TABLES = {
  medium: [
    "one-page web page",
    "single script (Node)",
    "short essay",
    "micro-fiction",
    "data sketch",
    "poster (ASCII)",
    "tiny CLI tool",
    "UI component (HTML/CSS)",
  ],
  topic: [
    "time",
    "attention",
    "maps",
    "habits",
    "music",
    "weather",
    "friendship",
    "tools",
    "memory",
    "constraints",
  ],
  constraint: [
    "no external APIs",
    "offline-first",
    "seeded + reproducible",
    "fits in 150 lines",
    "ship with a README",
    "include a test vector",
    "must export Markdown",
    "must be keyboard-only",
    "use only monochrome",
  ],
  twist: [
    "make it playful",
    "make it brutally minimal",
    "make it weird-but-useful",
    "make it educational",
    "make it calming",
    "make it comedic",
    "make it noir",
    "make it like a zine",
  ],
  timebox: [
    "20 minutes",
    "45 minutes",
    "90 minutes",
    "3 hours",
  ],
  output: [
    "publish a post",
    "add a new tool script",
    "make a demo page",
    "add a reusable snippet",
  ],
};

function makePrompt(rng) {
  const medium = pick(rng, TABLES.medium);
  const topic = pick(rng, TABLES.topic);
  const constraintA = pick(rng, TABLES.constraint);
  let constraintB = pick(rng, TABLES.constraint);
  if (constraintB === constraintA) constraintB = pick(rng, TABLES.constraint);
  const twist = pick(rng, TABLES.twist);
  const timebox = pick(rng, TABLES.timebox);
  const output = pick(rng, TABLES.output);

  return {
    line:
      "Make a " +
      medium +
      " about " +
      topic +
      ". Constraints: " +
      constraintA +
      ", " +
      constraintB +
      ". Twist: " +
      twist +
      ". Timebox: " +
      timebox +
      ". Output: " +
      output +
      ".",
  };
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log("Usage: node tools/prompt-wheel.cjs --seed <string> --count <n>");
    process.exit(0);
  }

  const seedStr = args.seed || new Date().toISOString();
  const seed = hashStringToUint32(seedStr);
  const rng = mulberry32(seed);

  console.log("prompt-wheel");
  console.log("seed: " + seedStr);
  console.log("seed32: " + seed);
  console.log("");

  const n = Number.isFinite(args.count) && args.count > 0 ? args.count : 6;
  for (let i = 0; i < n; i++) {
    const p = makePrompt(rng);
    const idx = String(i + 1).padStart(2, "0");
    console.log(idx + ") " + p.line);
  }
}

main();
