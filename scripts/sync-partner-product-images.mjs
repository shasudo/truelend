import { cpSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = resolve(root, "apps/website/public/images/products");
const target = resolve(root, "apps/partners/public/images/products");
const names = readdirSync(source)
  .filter((name) => name.endsWith(".avif"))
  .sort();
const sourceNames = new Set(names);

mkdirSync(target, { recursive: true });
const removed = readdirSync(target).filter(
  (name) => name.endsWith(".avif") && !sourceNames.has(name),
);
for (const name of removed) unlinkSync(resolve(target, name));
for (const name of names) cpSync(resolve(source, name), resolve(target, name));

console.log(
  `Synchronized ${names.length} website-owned product image(s) to the partner Worker; removed ${removed.length} stale image(s).`,
);
