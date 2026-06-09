#!/usr/bin/env node
/**
 * Validates that every static next-intl key used in src/ exists in locale JSON files.
 * Dynamic keys (permission ids, role names, etc.) are excluded.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const srcDir = path.join(webRoot, "src");

const locales = {
  "pt-BR": JSON.parse(
    fs.readFileSync(path.join(webRoot, "messages/pt-BR.json"), "utf8"),
  ),
  en: JSON.parse(fs.readFileSync(path.join(webRoot, "messages/en.json"), "utf8")),
};

const dynamicPrefixes = [
  "workspace.permissions.keys.",
  "workspace.permissions.groups.",
  "workspace.permissions.systemRoles.",
  "platformAdmin.roles.",
];

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, files);
    else if (/\.(tsx?|jsx?)$/.test(ent.name)) files.push(full);
  }
  return files;
}

function getByPath(obj, dotPath) {
  return dotPath
    .split(".")
    .reduce(
      (acc, key) => (acc && typeof acc === "object" ? acc[key] : undefined),
      obj,
    );
}

function collectLeafPaths(obj, prefix = "") {
  const paths = [];
  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") paths.push(...collectLeafPaths(value, next));
    else paths.push(next);
  }
  return paths;
}

function analyzeFile(content, file) {
  const lines = content.split("\n");
  const declarations = [];
  const calls = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const decl = line.match(
      /(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*["']([^"']+)["']\s*\)/,
    );
    if (decl) {
      declarations.push({ line: i + 1, varName: decl[1], ns: decl[2] });
    }

    const callRe =
      /\b(\w+)\(\s*["']([a-zA-Z0-9_.]+)["']/g;
    let m;
    while ((m = callRe.exec(line))) {
      calls.push({ line: i + 1, varName: m[1], key: m[2] });
    }
  }

  const refs = [];
  for (const call of calls) {
    const decl = [...declarations]
      .filter((d) => d.varName === call.varName && d.line <= call.line)
      .sort((a, b) => b.line - a.line)[0];
    if (!decl) continue;

    refs.push({
      file,
      line: call.line,
      ns: decl.ns,
      key: call.key,
      full: `${decl.ns}.${call.key}`,
    });
  }

  return refs;
}

function uniqByFull(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.full)) return false;
    seen.add(item.full);
    return true;
  });
}

const files = walk(srcDir);
const missing = { "pt-BR": [], en: [] };
const allRefs = [];

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  allRefs.push(...analyzeFile(content, path.relative(webRoot, file)));
}

for (const ref of uniqByFull(allRefs)) {
  if (dynamicPrefixes.some((prefix) => ref.full.startsWith(prefix))) continue;

  for (const locale of Object.keys(locales)) {
    const val = getByPath(locales[locale], ref.full);
    if (typeof val !== "string") {
      missing[locale].push(ref);
    }
  }
}

const ptLeaves = new Set(collectLeafPaths(locales["pt-BR"]));
const enLeaves = new Set(collectLeafPaths(locales.en));
const onlyPt = [...ptLeaves].filter((k) => !enLeaves.has(k)).sort();
const onlyEn = [...enLeaves].filter((k) => !ptLeaves.has(k)).sort();

let exitCode = 0;

for (const locale of Object.keys(missing)) {
  missing[locale].sort((a, b) => a.full.localeCompare(b.full));
  console.log(`\n=== Missing in ${locale} (${missing[locale].length}) ===`);
  for (const item of missing[locale]) {
    console.log(`${item.full} <- ${item.file}:${item.line}`);
  }
  if (missing[locale].length > 0) exitCode = 1;
}

console.log(`\n=== Locale parity ===`);
console.log(`Only in pt-BR: ${onlyPt.length}`);
for (const key of onlyPt) console.log(`  ${key}`);

console.log(`Only in en: ${onlyEn.length}`);
for (const key of onlyEn) console.log(`  ${key}`);

if (onlyPt.length || onlyEn.length) exitCode = 1;

if (exitCode === 0) {
  console.log("\nAll static i18n keys are present and locales are in parity.");
}

process.exit(exitCode);
