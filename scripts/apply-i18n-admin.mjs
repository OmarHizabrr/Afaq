/**
 * Apply i18n to src/pages/admin/*.jsx — literal-based, skips strings inside t().
 */
import fs from 'fs';
import path from 'path';

const ADMIN_DIR = 'src/pages/admin';
const textToKey = JSON.parse(fs.readFileSync('scripts/text-to-key.json', 'utf8'));

function hasArabic(s) {
  return /[\u0600-\u06FF]/.test(s);
}

function escapeForJs(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
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

function isInsideTCall(content, pos) {
  const before = content.slice(0, pos);
  const lastT = Math.max(before.lastIndexOf("t('"), before.lastIndexOf('t("'));
  if (lastT === -1) return false;
  let depth = 0;
  for (let i = lastT; i < pos; i++) {
    const c = content[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
  }
  return depth > 0;
}

function replaceLiterals(content) {
  const literals = findStringLiterals(content);
  let result = content;
  let changed = false;

  // End-to-start avoids offset corruption when lengths change.
  for (const lit of [...literals].reverse()) {
    const { value, quote } = lit;
    if (!hasArabic(value) || value.includes('${')) continue;
    if (isInsideTCall(result, lit.start)) continue;

    const key = textToKey[value];
    if (!key) continue;

    const esc = escapeForJs(value);
    const replacement = `t('${key}', '${esc}')`;
    const start = lit.start;
    const end = lit.end;
    const before = result.slice(0, start);
    const after = result.slice(end);

    const attrMatch = before.match(/(\w+)=$/);
    if (attrMatch && (quote === '"' || quote === "'")) {
      const attrStart = before.lastIndexOf(attrMatch[1] + '=');
      const newBefore = before.slice(0, attrStart) + attrMatch[1] + '={';
      result = newBefore + replacement + '}' + after;
      changed = true;
      continue;
    }

    result = before + replacement + after;
    changed = true;
  }
  return { content: result, changed };
}

function replaceJsxText(content) {
  let changed = false;
  const result = content.replace(/>([^<>{}\n]+)</g, (match, text) => {
    const trimmed = text.trim();
    if (!trimmed || !hasArabic(trimmed) || trimmed.includes('{')) return match;
    const key = textToKey[trimmed];
    if (!key) return match;
    const esc = escapeForJs(trimmed);
    const leading = text.match(/^\s*/)[0];
    const trailing = text.match(/\s*$/)[0];
    changed = true;
    return `>${leading}{t('${key}', '${esc}')}${trailing}<`;
  });
  return { content: result, changed };
}

function addHookImport(content) {
  if (content.includes("from '../../hooks/useAppTranslation'")) return content;
  const importLine = `import useAppTranslation from '../../hooks/useAppTranslation';\n`;
  if (content.includes('import React')) {
    return content.replace(/import React[^;]+;\n/, (m) => m + importLine);
  }
  return importLine + content;
}

function addHookUsage(content) {
  if (content.includes('const { t }') || content.includes('const {t}')) return content;
  const patterns = [
    /export default function \w+\([^)]*\)\s*\{/,
    /const \w+ = \(\{[^}]*\}\) => \{/,
    /const \w+ = \([^)]*\) => \{/,
    /function \w+\([^)]*\)\s*\{/,
  ];
  for (const re of patterns) {
    if (re.test(content)) {
      return content.replace(re, (m) => `${m}\n  const { t } = useAppTranslation();`);
    }
  }
  return content;
}

const files = fs
  .readdirSync(ADMIN_DIR)
  .filter((f) => f.endsWith('.jsx'))
  .map((f) => path.join(ADMIN_DIR, f));

const updated = [];
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  let { content: c1, changed: ch1 } = replaceLiterals(content);
  let { content: c2, changed: ch2 } = replaceJsxText(c1);
  content = c2;
  if (!ch1 && !ch2) continue;
  if (content.includes("t('")) {
    content = addHookImport(content);
    content = addHookUsage(content);
  }
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    updated.push(file);
  }
}

console.log('Updated admin files:', updated.length);
updated.forEach((f) => console.log(' ', f));
