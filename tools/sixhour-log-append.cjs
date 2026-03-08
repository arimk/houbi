#!/usr/bin/env node
/*
  sixhour-log-append.cjs
  Append a single line to the creative six-hour log in a safe, shell-quoting-free way.

  Usage:
    node tools/sixhour-log-append.cjs \
      --log "/home/node/clawd/memory/creative-sixhour-log.md" \
      --ts "20260308T1623Z" \
      --type "haiku" \
      --status "published" \
      --commit "26441d0" \
      --note "optional"

  Output: none (exit 0 on success)
*/

const fs = require("fs");

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const v = argv[i + 1];
      out[k] = v;
      i++;
    }
  }
  return out;
}

function main() {
  const a = parseArgs(process.argv);
  const logPath = a.log || "/home/node/clawd/memory/creative-sixhour-log.md";
  const ts = a.ts || "";
  const type = a.type || "";
  const status = a.status || "";
  const commit = a.commit || "";
  const note = a.note || "";

  if (!ts || !type || !status) {
    console.error("missing required args: --ts, --type, --status");
    process.exit(2);
  }

  // Keep it append-only, single line, easy to grep.
  // Example:
  // - 20260308T1623Z haiku: published (commit 26441d0) note: ...
  let line = `- ${ts} ${type}: ${status}`;
  if (commit) line += ` (commit ${commit})`;
  if (note) line += ` note: ${note}`;
  line += "\n";

  fs.appendFileSync(logPath, line, { encoding: "utf8" });
}

main();
