import fs from 'fs';
import path from 'path';

const SRC = 'src';
const arabicRe = /[\u0600-\u06FF]/;

function walk(dir, files = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (/\.(jsx?|tsx?)$/.test(f)) files.push(p);
  }
  return files;
}

function extractStrings(content) {
  const found = new Set();
  const patterns = [
    /'([^'\\]*(?:\\.[^'\\]*)*)'/g,
    /"([^"\\]*(?:\\.[^"\\]*)*)"/g,
    /`([^`\\]*(?:\\.[^`\\]*)*)`/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(content))) {
      const s = m[1];
      if (arabicRe.test(s) && s.length >= 2 && s.length < 300) found.add(s);
    }
  }
  return found;
}

function slugify(text) {
  return (
    text
      .replace(/[^\u0600-\u06FFa-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60) || 'text'
  );
}

const all = new Map();
const files = walk(SRC);
for (const file of files) {
  const rel = file.replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');
  for (const s of extractStrings(content)) {
    if (!all.has(s)) all.set(s, rel);
  }
}

const tree = {};
const usedKeys = new Set();

function setNested(obj, parts, value) {
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!cur[p]) cur[p] = {};
    cur = cur[p];
  }
  const last = parts[parts.length - 1];
  let key = last;
  let n = 2;
  while (usedKeys.has(`${parts.slice(0, -1).join('.')}.${key}`)) {
    key = `${last}_${n++}`;
  }
  usedKeys.add(`${parts.slice(0, -1).join('.')}.${key}`);
  cur[key] = value;
}

for (const [text, file] of all) {
  const parts = file.replace(/^src\//, '').replace(/\.(jsx?|tsx?)$/, '').split('/');
  const section = parts[0] || 'common';
  const base = parts[parts.length - 1] || 'misc';
  const slug = slugify(text);
  setNested(tree, [section, base, slug], text);
}

fs.mkdirSync('assets/lang', { recursive: true });
fs.writeFileSync('assets/lang/ar.json', JSON.stringify(tree, null, 2), 'utf8');
console.log('strings:', all.size, 'sections:', Object.keys(tree).length);
