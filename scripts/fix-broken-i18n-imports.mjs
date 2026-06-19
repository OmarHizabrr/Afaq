/**
 * Ensures exactly one valid useAppTranslation import per file (after all imports).
 */
import fs from 'fs';
import path from 'path';

const HOOK = path.join('src', 'hooks', 'useAppTranslation.js');

function walk(dir, files = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      if (f !== 'node_modules') walk(p, files);
    } else if (/\.(jsx|js)$/.test(f)) files.push(p);
  }
  return files;
}

function hookImportPath(file) {
  const rel = path.relative(path.dirname(file), HOOK).replace(/\\/g, '/').replace(/\.js$/, '');
  return rel.startsWith('.') ? rel : `./${rel}`;
}

function lastImportLineIndex(lines) {
  let last = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/^\s*import\s/.test(line)) continue;
    last = i;
    if (line.includes('{') && !/\sfrom\s['"]/.test(line)) {
      while (last < lines.length - 1 && !/\sfrom\s['"]/.test(lines[last])) {
        last += 1;
      }
    }
  }
  return last;
}

function fixFile(content, file) {
  if (!content.includes('useAppTranslation()')) return content;

  const hookLine = `import useAppTranslation from '${hookImportPath(file)}';`;
  const lines = content.split('\n').filter((line) => !/^import useAppTranslation from ['"]/.test(line));

  const insertAt = lastImportLineIndex(lines) + 1;
  const next = [...lines];
  next.splice(insertAt, 0, hookLine);
  return next.join('\n');
}

let n = 0;
for (const file of walk('src')) {
  if (file.replace(/\\/g, '/') === HOOK.replace(/\\/g, '/')) continue;
  const before = fs.readFileSync(file, 'utf8');
  const after = fixFile(before, file);
  if (after !== before) {
    fs.writeFileSync(file, after, 'utf8');
    n++;
    console.log('fixed', file);
  }
}
console.log('total', n);
