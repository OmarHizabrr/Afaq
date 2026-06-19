/**
 * Fix admin i18n: ensure imports, dedupe hooks, second-pass Arabic replacement.
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

function slugify(text) {
  return (
    text
      .replace(/[^\u0600-\u06FFa-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60) || 'text'
  );
}

function lookupKey(file, text) {
  return textToKey[text] || `pages.${path.basename(file, '.jsx')}.${slugify(text)}`;
}

function ensureImport(content) {
  if (content.includes("from '../../hooks/useAppTranslation'")) return content;
  const importLine = `import useAppTranslation from '../../hooks/useAppTranslation';\n`;
  const reactMatch = content.match(/^import React[^\n]+;\n/m);
  if (reactMatch) {
    const idx = content.indexOf(reactMatch[0]) + reactMatch[0].length;
    return content.slice(0, idx) + importLine + content.slice(idx);
  }
  return importLine + content;
}

function dedupeHooks(content) {
  return content.replace(/\n\s*const \{ t \} = useAppTranslation\(\);/g, (match, offset) => {
    const before = content.slice(0, offset);
    const opens = (before.match(/\nconst \w+ = /g) || []).length + (before.match(/\nfunction \w+/g) || []).length;
    const closes = (before.match(/\n\};/g) || []).length;
    // keep first hook in each function body; heuristic: if we already have one since last `=> {` or `function X() {`
    const lastBrace = Math.max(before.lastIndexOf('=> {'), before.lastIndexOf(') {'));
    const since = content.slice(lastBrace, offset);
    if (since.includes('useAppTranslation()')) return '';
    return match;
  });
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

function replaceLiterals(content, file) {
  const literals = findStringLiterals(content);
  let result = content;
  let offset = 0;
  let changed = false;

  for (const lit of literals) {
    const { value } = lit;
    if (!hasArabic(value)) continue;
    if (value.includes('${')) continue;
    if (result.slice(lit.start + offset - 3, lit.start + offset).includes("t('")) continue;

    const key = lookupKey(file, value);
    const esc = escapeForJs(value);
    const replacement = `t('${key}', '${esc}')`;

    const start = lit.start + offset;
    const end = lit.end + offset;
    const before = result.slice(0, start);
    const after = result.slice(end);

    const attrMatch = before.match(/(\w+)=$/);
    if (attrMatch && (lit.quote === '"' || lit.quote === "'")) {
      const attrStart = before.lastIndexOf(attrMatch[1] + '=');
      const newBefore = before.slice(0, attrStart) + attrMatch[1] + '={';
      result = newBefore + replacement + '}' + after;
      offset += newBefore.length + replacement.length + 1 - (end - start);
      changed = true;
      continue;
    }

    result = before + replacement + after;
    offset += replacement.length - (end - start);
    changed = true;
  }

  return { content: result, changed };
}

function replaceJsxText(content, file) {
  let changed = false;
  let result = content;

  result = result.replace(/>([^<>{}\n]+)</g, (match, text) => {
    const trimmed = text.trim();
    if (!trimmed || !hasArabic(trimmed)) return match;
    if (trimmed.includes('{') || trimmed.includes('t(')) return match;
    const key = lookupKey(file, trimmed);
    const esc = escapeForJs(trimmed);
    const leading = text.match(/^\s*/)[0];
    const trailing = text.match(/\s*$/)[0];
    changed = true;
    return `>${leading}{t('${key}', '${esc}')}${trailing}<`;
  });

  return { content: result, changed };
}

const files = fs
  .readdirSync(ADMIN_DIR)
  .filter((f) => f.endsWith('.jsx'))
  .map((f) => path.join(ADMIN_DIR, f));

let fixed = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  if (content.includes("t('")) {
    content = ensureImport(content);
    content = dedupeHooks(content);
  }

  let { content: c1 } = replaceLiterals(content, file);
  let { content: c2 } = replaceJsxText(c1, file);
  content = c2;

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    fixed++;
    console.log('Fixed:', file);
  }
}

console.log('Fixed files:', fixed);
