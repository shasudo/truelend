import fs from "node:fs";
import path from "node:path";

const app = process.argv[2];
const root = process.argv[3];
if (!app || !root) throw new Error("Usage: scan-worker-bundle.mjs <app> <bundle-directory>");

const patterns = [
  { label: "Postgres connection URL", regex: /postgres(?:ql)?:\/\/[^\s"'`]+/gi },
  { label: "private key", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { label: "Resend API key", regex: /\bre_[A-Za-z0-9_-]{20,}\b/g },
];
const textExtensions = new Set([".js", ".mjs", ".cjs", ".json", ".map", ".txt"]);
const findings = [];
let bytes = 0;

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(file);
      continue;
    }
    const stat = fs.statSync(file);
    bytes += stat.size;
    if (!textExtensions.has(path.extname(entry.name))) continue;
    const contents = fs.readFileSync(file, "utf8");
    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0;
      if (pattern.regex.test(contents)) findings.push(`${pattern.label}: ${file}`);
    }
    if (app === "website" && /\bBUCKET\b/.test(contents)) {
      findings.push(`public website bundle contains forbidden KYC BUCKET capability: ${file}`);
    }
  }
}

walk(root);
const maxBytes = 25 * 1024 * 1024;
if (bytes > maxBytes) findings.push(`bundle is ${bytes} bytes; budget is ${maxBytes} bytes`);
if (findings.length > 0) {
  throw new Error(`Worker bundle verification failed:\n${findings.join("\n")}`);
}
console.log(`✓ ${app} upload bundle verified (${bytes} bytes)`);
