/**
 * يصلح t(t('x', 'key'), t('key', 'fallback')) الناتج عن التطبيق المزدوج.
 */
import fs from 'fs';
import path from 'path';

function walk(dir, files = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory() && f !== 'node_modules') walk(p, files);
    else if (/\.(jsx?)$/.test(f)) files.push(p);
  }
  return files;
}

// t(t('long', 'key'), t('key', 'fallback'))
const reNestedT =
  /\bt\(\s*t\(\s*'[^']*'\s*,\s*'([^']+)'\s*\)\s*,\s*t\(\s*'[^']*'\s*,\s*('(?:\\'|[^'])*')\s*\)\s*\)/g;
// t(t('long', 'key'), 'fallback')
const reNestedStr =
  /\bt\(\s*t\(\s*'[^']*'\s*,\s*'([^']+)'\s*\)\s*,\s*('(?:\\'|[^'])*')\s*\)/g;

let total = 0;
for (const file of walk('src')) {
  let content = fs.readFileSync(file, 'utf8');
  let n = 0;
  content = content.replace(reNestedT, (_, key, quotedFallback) => {
    n++;
    return `t('${key}', ${quotedFallback})`;
  });
  content = content.replace(reNestedStr, (_, key, quotedFallback) => {
    n++;
    return `t('${key}', ${quotedFallback})`;
  });
  if (n > 0) {
    fs.writeFileSync(file, content, 'utf8');
    total += n;
    console.log(file, n);
  }
}
console.log('Fixed', total, 'double-wrapped t() calls');
