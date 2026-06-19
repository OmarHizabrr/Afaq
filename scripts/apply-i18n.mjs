/**
 * يستبدل النصوص العربية بأمان عبر تحليل حدود النصوص الحرفية فقط.
 */
import fs from 'fs';
import path from 'path';

const textToKey = JSON.parse(fs.readFileSync('scripts/text-to-key.json', 'utf8'));
const sortedTexts = Object.entries(textToKey).sort((a, b) => b[0].length - a[0].length);

function walk(dir, files = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory() && f !== 'i18n') walk(p, files);
    else if (/\.(jsx?)$/.test(f) && !p.includes('i18n')) files.push(p);
  }
  return files;
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

function hasArabic(s) {
  return /[\u0600-\u06FF]/.test(s);
}

function replaceLiterals(content) {
  const literals = findStringLiterals(content);
  if (!literals.length) return { content, changed: false };

  let result = content;
  let offset = 0;
  let changed = false;

  for (const lit of literals) {
    const { value } = lit;
    if (!hasArabic(value)) continue;
    if (value.includes('${')) continue; // template expressions — skip for safety

    const key = textToKey[value];
    if (!key) continue;

    const esc = escapeForJs(value);
    const replacement = `t('${key}', '${esc}')`;

    const start = lit.start + offset;
    const end = lit.end + offset;
    const before = result.slice(0, start);
    const after = result.slice(end);

    // JSX attribute: name="value" or name='value' -> name={t(...)}
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

function replaceJsxText(content) {
  let changed = false;
  let result = content;

  // >نص عربي< (not already expression)
  result = result.replace(/>([^<>{}\n]+)</g, (match, text) => {
    const trimmed = text.trim();
    if (!trimmed || !hasArabic(trimmed)) return match;
    if (trimmed.includes('{')) return match;
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

function addHookImport(content, file) {
  const relDepth = file.replace(/\\/g, '/').split('/').length - 2;
  const hookPath = `${'../'.repeat(relDepth)}hooks/useAppTranslation`;

  if (content.includes('useAppTranslation')) return content;

  const importLine = `import useAppTranslation from '${hookPath}';\n`;
  if (content.includes("import React")) {
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

function addI18nImportForJs(content, file) {
  if (content.includes("from '../i18n") || content.includes('from "../i18n')) return content;
  const relDepth = file.replace(/\\/g, '/').split('/').length - 2;
  const i18nPath = `${'../'.repeat(relDepth)}i18n`;
  return `import i18n from '${i18nPath}';\nconst t = (key, fb = '') => { const v = i18n.t(key); return v && v !== key ? v : fb; };\n\n` + content;
}

const files = walk('src');
let updated = 0;

for (const file of files) {
  const isJsx = file.endsWith('.jsx');
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  let { content: c1, changed: ch1 } = replaceLiterals(content);
  let { content: c2, changed: ch2 } = replaceJsxText(c1);
  content = c2;

  if (!ch1 && !ch2) continue;

  const usesT = content.includes("t('");
  const isReactFile = isJsx || /import React/.test(content);

  if (usesT && isReactFile) {
    content = addHookImport(content, file);
    content = addHookUsage(content);
  } else if (usesT && !isReactFile) {
    content = addI18nImportForJs(content, file);
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    updated++;
  }
}

console.log('Updated files:', updated);
