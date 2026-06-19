/**
 * يبني ar.json من استدعاءات t('key', 'fallback') والنصوص العربية المتبقية.
 */
import fs from 'fs';
import path from 'path';

const SRC = 'src';
const tree = {};

function setNested(parts, value) {
  let cur = tree;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]]) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function walk(dir, files = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory() && f !== 'node_modules') walk(p, files);
    else if (/\.(jsx?)$/.test(f)) files.push(p);
  }
  return files;
}

function unescapeJs(s) {
  return s.replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\"/g, '"');
}

const tCallRe = /t\(\s*'([^']+)'\s*,\s*'((?:\\'|[^'])*)'\s*\)/g;
const tCallRe2 = /t\(\s*"([^"]+)"\s*,\s*"((?:\\"|[^"])*)"\s*\)/g;

for (const file of walk(SRC)) {
  const content = fs.readFileSync(file, 'utf8');
  for (const re of [tCallRe, tCallRe2]) {
    let m;
    while ((m = re.exec(content)) !== null) {
      const key = m[1];
      const fallback = unescapeJs(m[2]);
      if (/[\u0600-\u06FF]/.test(fallback) || fallback.includes('${')) {
        setNested(key.split('.'), fallback);
      }
    }
  }
}

// Settings keys used by LanguageSwitcher
setNested(['settings', 'language_title'], 'لغة الواجهة');
setNested(['settings', 'language_hint'], 'اختر لغة عرض المنصة — العربية، الإنجليزية، أو الشيشو (ChiShona).');
setNested(['settings', 'language_label'], 'اللغة');

function count(o) {
  let n = 0;
  for (const v of Object.values(o)) {
    if (typeof v === 'string') n++;
    else n += count(v);
  }
  return n;
}

fs.mkdirSync('assets/lang', { recursive: true });
fs.writeFileSync('assets/lang/ar.json', JSON.stringify(tree, null, 2), 'utf8');
console.log('Built ar.json with', count(tree), 'keys');
