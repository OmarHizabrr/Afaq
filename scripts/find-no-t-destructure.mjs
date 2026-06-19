import fs from 'fs';
import path from 'path';

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (/\.jsx$/.test(name)) files.push(p);
  }
  return files;
}

const bad = [];
for (const file of walk('src')) {
  const c = fs.readFileSync(file, 'utf8');
  if (!/import useAppTranslation/.test(c)) continue;
  if (!/t\s*\(['"]/.test(c)) continue;
  if (!/const\s*\{[^}]*\bt\b/.test(c)) bad.push(file.replace(/\\/g, '/'));
}

console.log(bad.length ? bad.join('\n') : 'none');
