/**
 * Safe i18n apply for src/components — skips parameter lists, no offset corruption.
 */
import fs from 'fs';
import path from 'path';

const SKIP = new Set(['I18nDirectionSync.jsx', 'LanguageSwitcher.jsx']);
const componentsDir = 'src/components';

const textToKey = JSON.parse(fs.readFileSync('scripts/text-to-key.json', 'utf8'));
const enLang = JSON.parse(fs.readFileSync('assets/lang/en.json', 'utf8'));

for (const [comp, keys] of Object.entries(enLang.components || {})) {
  for (const [keySuffix, arabic] of Object.entries(keys)) {
    if (typeof arabic === 'string' && /[\u0600-\u06FF]/.test(arabic)) {
      textToKey[arabic] = `components.${comp}.${keySuffix}`;
    }
  }
}

function walk(dir, files = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (f.endsWith('.jsx') && !SKIP.has(f)) files.push(p);
  }
  return files;
}

function escapeForJs(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

function hasArabic(s) {
  return /[\u0600-\u06FF]/.test(s);
}

/** Index ranges that are inside a function/component parameter list. */
function getParamListRanges(content) {
  const ranges = [];
  const patterns = [
    /export\s+default\s+function\s+\w+\s*\(/g,
    /export\s+function\s+\w+\s*\(/g,
    /function\s+\w+\s*\(/g,
    /const\s+\w+\s*=\s*\([^)]*\)\s*=>/g,
    /const\s+\w+\s*=\s*\(\{[^}]*\}\)\s*=>/g,
    /const\s+\w+\s*=\s*\(\{/g,
  ];

  for (const re of patterns) {
    let m;
    while ((m = re.exec(content)) !== null) {
      const open = content.indexOf('(', m.index);
      if (open === -1) continue;
      let depth = 0;
      let i = open;
      for (; i < content.length; i++) {
        const c = content[i];
        if (c === '(') depth++;
        else if (c === ')') {
          depth--;
          if (depth === 0) {
            ranges.push([open, i + 1]);
            break;
          }
        }
      }
    }
  }
  return ranges;
}

function inRanges(pos, ranges) {
  return ranges.some(([s, e]) => pos >= s && pos < e);
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

function replaceLiterals(content, paramRanges) {
  const literals = findStringLiterals(content);
  if (!literals.length) return { content, changed: false };

  let result = content;
  let changed = false;

  for (const lit of [...literals].reverse()) {
    const { value, quote } = lit;
    if (!hasArabic(value) || value.includes('${')) continue;
    if (inRanges(lit.start, paramRanges)) continue;
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

function addHookImport(content, file) {
  const relDepth = file.replace(/\\/g, '/').split('/').length - 2;
  const hookPath = `${'../'.repeat(relDepth)}hooks/useAppTranslation`;
  if (content.includes('useAppTranslation')) return content;
  const importLine = `import useAppTranslation from '${hookPath}';\n`;
  if (content.includes('import React')) {
    return content.replace(/import React[^;]+;\n/, (m) => m + importLine);
  }
  return importLine + content;
}

function addHookUsage(content) {
  if (content.includes('const { t }') || content.includes('const {t}')) return content;

  // Arrow component: const X = (...) => (
  if (/const \w+ = \([^)]*\) => \([\s\S]/.test(content)) {
    return content.replace(/(const \w+ = \([^)]*\) => )\(/, '$1{\n  const { t } = useAppTranslation();\n  return (');
  }
  if (/const \w+ = \(\{[^}]*\}\) => \([\s\S]/.test(content)) {
    return content.replace(/(const \w+ = \(\{[^}]*\}\) => )\(/, '$1{\n  const { t } = useAppTranslation();\n  return (');
  }

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

function fixArrowImplicitReturn(content) {
  // const X = (...) => ( ... );  — if we added { return ( we need closing ); -> }); 
  return content;
}

function fixDefaultParams(content, file) {
  const comp = path.basename(file, '.jsx');
  const paramRanges = getParamListRanges(content);
  let changed = false;
  let result = content;

  for (const [start, end] of paramRanges) {
    const paramSection = content.slice(start, end);
    const literals = findStringLiterals(paramSection);
    for (const lit of literals) {
      if (!hasArabic(lit.value) || lit.value.includes('${')) continue;
      const key = textToKey[lit.value];
      if (!key) continue;
      // Remove default from params — use undefined default, resolve in body
      const esc = escapeForJs(lit.value);
      const fullStart = start + lit.start;
      const fullEnd = start + lit.end;
      const before = result.slice(0, fullStart);
      const after = result.slice(fullEnd);
      // param = 'arabic' -> param
      const paramNameMatch = before.match(/(\w+)\s*=\s*$/);
      if (!paramNameMatch) continue;
      const paramName = paramNameMatch[1];
      const paramAssignStart = before.lastIndexOf(paramName);
      result = before.slice(0, paramAssignStart) + paramName + after;
      changed = true;
    }
  }

  return { content: result, changed };
}

const files = walk(componentsDir);
let updated = 0;
const updatedFiles = [];
const stillArabic = [];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  const paramRanges = getParamListRanges(content);

  let { content: c1, changed: ch1 } = replaceLiterals(content, paramRanges);
  let { content: c2, changed: ch2 } = replaceJsxText(c1);
  content = c2;

  if (!ch1 && !ch2) {
    // still check if needs hook for manual strings
  } else if (content.includes("t('")) {
    content = addHookImport(content, file);
    content = addHookUsage(content);
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    updated++;
    updatedFiles.push(file);
  }
}

console.log('Updated files:', updated);
updatedFiles.forEach((f) => console.log('  ' + f));

// Report remaining Arabic string literals outside t() calls
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  for (const lit of findStringLiterals(content)) {
    if (hasArabic(lit.value) && !lit.value.includes('${')) {
      const ctx = content.slice(Math.max(0, lit.start - 20), lit.end + 20);
      if (!ctx.includes(`t('`) || ctx.indexOf(lit.raw) < ctx.indexOf("t('")) {
        if (!textToKey[lit.value]) stillArabic.push(`${file}: "${lit.value.slice(0, 60)}"`);
      }
    }
  }
}
if (stillArabic.length) {
  console.log(`\nUnmapped Arabic (${stillArabic.length}):`);
  stillArabic.slice(0, 40).forEach((s) => console.log('  -', s));
}
