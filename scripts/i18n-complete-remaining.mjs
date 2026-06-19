/**
 * 1) يضيف نصوص عربية متبقية إلى text-to-key.json
 * 2) يطبّق t() على كل ملفات jsx في src
 */
import fs from 'fs';
import path from 'path';

const SKIP_FILES = new Set([
  'I18nDirectionSync.jsx',
  'LanguageSwitcher.jsx',
  'LanguageMenuButton.jsx',
]);

const SKIP_DIRS = new Set(['i18n', 'node_modules']);

const textToKey = JSON.parse(fs.readFileSync('scripts/text-to-key.json', 'utf8'));

function walk(dir, files = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      if (!SKIP_DIRS.has(f)) walk(p, files);
    } else if (f.endsWith('.jsx') && !SKIP_FILES.has(f)) {
      files.push(p);
    }
  }
  return files;
}

function hasArabic(s) {
  return /[\u0600-\u06FF]/.test(s);
}

function scopeFromFile(file) {
  const norm = file.replace(/\\/g, '/');
  const mPage = norm.match(/src\/pages\/(?:admin|teacher|student|supervisor|common|print)\/([^/]+)\.jsx$/);
  if (mPage) return `pages.${mPage[1].replace('.jsx', '')}`;
  const mComp = norm.match(/src\/components\/([^/]+)\.jsx$/);
  if (mComp) return `components.${mComp[1].replace('.jsx', '')}`;
  const mLayout = norm.match(/src\/layouts\/([^/]+)\.jsx$/);
  if (mLayout) return `layouts.${mLayout[1].replace('.jsx', '')}`;
  return 'common';
}

function keySuffix(text) {
  const base = text
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, ' ')
    .trim()
    .slice(0, 55)
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
  return base || 'text';
}

function findStringLiterals(content) {
  const literals = [];
  let i = 0;
  while (i < content.length) {
    const ch = content[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      let j = i + 1;
      while (j < content.length) {
        if (content[j] === '\\') {
          j += 2;
          continue;
        }
        if (content[j] === quote) break;
        j++;
      }
      if (j < content.length) {
        const raw = content.slice(i, j + 1);
        const value = raw.slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, '\n');
        literals.push({ start: i, end: j + 1, quote, value, raw });
        i = j + 1;
        continue;
      }
    }
    i++;
  }
  return literals;
}

function escapeForJs(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isInsideTCall(content, pos) {
  const before = content.slice(0, pos);
  const lastT = Math.max(before.lastIndexOf("t('"), before.lastIndexOf('t("'));
  if (lastT === -1) return false;
  let depth = 0;
  for (let i = lastT; i < pos; i++) {
    if (content[i] === '(') depth++;
    else if (content[i] === ')') depth--;
  }
  return depth > 0;
}

function uniqueKey(scope, text, used) {
  let suffix = keySuffix(text);
  let full = `${scope}.${suffix}`;
  let n = 2;
  while (used.has(full) && textToKey[text] !== full) {
    full = `${scope}.${suffix}_${n}`;
    n++;
  }
  used.add(full);
  return full;
}

// --- Phase 1: extend text-to-key ---
const files = walk('src');
const usedKeys = new Set(Object.values(textToKey));
let newKeys = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const scope = scopeFromFile(file);

  for (const lit of findStringLiterals(content)) {
    if (!hasArabic(lit.value) || lit.value.includes('${')) continue;
    if (isInsideTCall(content, lit.start)) continue;
    if (textToKey[lit.value]) continue;
    textToKey[lit.value] = uniqueKey(scope, lit.value, usedKeys);
    newKeys++;
  }

  content.replace(/>([^<>{}\n]+)</g, (_, text) => {
    const trimmed = text.trim();
    if (!trimmed || !hasArabic(trimmed) || trimmed.includes('{')) return _;
    if (textToKey[trimmed]) return _;
    textToKey[trimmed] = uniqueKey(scope, trimmed, usedKeys);
    newKeys++;
    return _;
  });
}

fs.writeFileSync('scripts/text-to-key.json', JSON.stringify(textToKey, null, 2), 'utf8');
console.log('Added', newKeys, 'new keys to text-to-key.json (total', Object.keys(textToKey).length, ')');

// --- Phase 2: apply replacements (longest first) ---
const entries = Object.entries(textToKey)
  .filter(([text]) => hasArabic(text) && !text.includes('${'))
  .sort((a, b) => b[0].length - a[0].length);

function tCall(text, key) {
  return `t('${key}', '${escapeForJs(text)}')`;
}

function addHookImport(content, file) {
  const relDepth = file.replace(/\\/g, '/').split('/').length - 2;
  const hookPath = `${'../'.repeat(relDepth)}hooks/useAppTranslation`;
  if (content.includes('useAppTranslation')) return content;
  const importLine = `import useAppTranslation from '${hookPath}';\n`;
  const importBlockEnd = content.lastIndexOf('\nimport ');
  if (importBlockEnd === -1) return importLine + content;
  const nextLine = content.indexOf('\n', importBlockEnd + 1);
  const insertAt = nextLine === -1 ? content.length : nextLine + 1;
  return content.slice(0, insertAt) + importLine + content.slice(insertAt);
}

function addHookUsage(content) {
  if (/const\s*\{\s*t\s*\}\s*=\s*useAppTranslation/.test(content)) return content;

  const patterns = [
    /export default function \w+\([^)]*\)\s*\{/,
    /const \w+ = \(\{[^}]*\}\) => \{/,
    /const \w+ = \([^)]*\) => \{/,
    /function \w+\([^)]*\)\s*\{/,
  ];
  for (const re of patterns) {
    const m = content.match(re);
    if (m) {
      return content.replace(re, (match) => `${match}\n  const { t } = useAppTranslation();`);
    }
  }
  return content;
}

let updated = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  let changed = false;

  for (const [text, key] of entries) {
    const call = tCall(text, key);
    const re = escapeRegex(text);

    const attrRe = new RegExp(`(\\w+)=("|')${re}\\2`, 'g');
    const next1 = content.replace(attrRe, (m, attr) => {
      if (m.includes('{')) return m;
      changed = true;
      return `${attr}={${call}}`;
    });
    content = next1;

    const jsxRe = new RegExp(`>(\\s*)${re}(\\s*)<`, 'g');
    content = content.replace(jsxRe, (m, lead, trail) => {
      if (m.includes('{')) return m;
      changed = true;
      return `>${lead}{${call}}${trail}<`;
    });

    const litRe = new RegExp(`(?<![\\w.])("|')${re}\\1`, 'g');
    content = content.replace(litRe, (m) => {
      const idx = content.indexOf(m);
      if (isInsideTCall(content, idx)) return m;
      changed = true;
      return call;
    });
  }

  if (changed && content.includes("t('")) {
    content = addHookImport(content, file);
    content = addHookUsage(content);
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    updated++;
    console.log('Updated', file);
  }
}

console.log('Updated', updated, 'files');
