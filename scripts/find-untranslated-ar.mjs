import fs from 'fs';
import path from 'path';

const arRe = /[\u0600-\u06FF]{2,}/;

function walk(d, files = []) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) {
      if (f !== 'node_modules' && f !== 'i18n') walk(p, files);
    } else if (/\.(jsx?)$/.test(f)) files.push(p);
  }
  return files;
}

function isInTCall(content, startIdx) {
  const before = content.slice(Math.max(0, startIdx - 200), startIdx);
  const tIdx = before.lastIndexOf('t(');
  if (tIdx === -1) return false;
  const slice = before.slice(tIdx);
  const opens = (slice.match(/\(/g) || []).length;
  const closes = (slice.match(/\)/g) || []).length;
  return opens > closes;
}

function findArabicLiterals(content) {
  const results = [];
  const patterns = [
    /'([^'\\]*(?:\\.[^'\\]*)*)'/g,
    /"([^"\\]*(?:\\.[^"\\]*)*)"/g,
    />([^<>{}\n]{2,80})</g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(content)) !== null) {
      const s = m[1].trim();
      if (!arRe.test(s)) continue;
      if (s.includes('${')) continue;
      if (isInTCall(content, m.index)) continue;
      results.push(s.slice(0, 60));
    }
  }
  return [...new Set(results)];
}

const needs = [];
for (const f of walk('src')) {
  const c = fs.readFileSync(f, 'utf8');
  if (!arRe.test(c)) continue;
  const literals = findArabicLiterals(c);
  if (literals.length === 0) continue;
  const hasI18n =
    c.includes('useAppTranslation') ||
    c.includes("from '../i18n/translate") ||
    c.includes('from "../i18n/translate') ||
    c.includes("from '../../i18n/translate");
  needs.push({ f, count: literals.length, hasI18n, samples: literals.slice(0, 5) });
}

needs.sort((a, b) => b.count - a.count);
for (const x of needs) {
  console.log(`${x.count}\t${x.hasI18n ? 'i18n' : 'NO-i18n'}\t${x.f}`);
  x.samples.forEach((s) => console.log(`    → ${s}`));
}
console.log('\ntotal:', needs.length);
