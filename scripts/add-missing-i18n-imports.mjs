/**
 * Adds missing useAppTranslation imports across src/.
 */
import fs from 'fs';
import path from 'path';

const HOOK = path.join('src', 'hooks', 'useAppTranslation.js');

function walk(dir, files = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      if (f === 'node_modules') continue;
      walk(p, files);
    } else if (/\.(jsx|js)$/.test(f)) {
      files.push(p);
    }
  }
  return files;
}

function hookImportPath(file) {
  const rel = path.relative(path.dirname(file), HOOK).replace(/\\/g, '/');
  return rel.startsWith('.') ? rel : `./${rel}`;
}

function insertImport(content, importLine) {
  const lines = content.split('\n');
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import\s/.test(lines[i])) lastImportIdx = i;
    else if (lastImportIdx >= 0 && lines[i].trim() !== '' && !/^\s*import\s/.test(lines[i])) break;
  }
  if (lastImportIdx >= 0) {
    lines.splice(lastImportIdx + 1, 0, importLine.trimEnd());
    return lines.join('\n');
  }
  return `${importLine}${content}`;
}

let fixed = 0;
for (const file of walk('src')) {
  if (file.replace(/\\/g, '/') === HOOK.replace(/\\/g, '/')) continue;
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('useAppTranslation()')) continue;
  if (/import\s+useAppTranslation\s+from/.test(content)) continue;

  const importLine = `import useAppTranslation from '${hookImportPath(file)}';\n`;
  content = insertImport(content, importLine);
  fs.writeFileSync(file, content, 'utf8');
  fixed++;
  console.log('import added', file);
}
console.log('Total:', fixed);
