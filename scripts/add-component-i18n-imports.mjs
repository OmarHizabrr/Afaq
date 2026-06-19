/**
 * Adds missing useAppTranslation imports to components.
 */
import fs from 'fs';
import path from 'path';

function walk(dir, files = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (f.endsWith('.jsx')) files.push(p);
  }
  return files;
}

let fixed = 0;
for (const file of walk('src/components')) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('useAppTranslation()')) continue;
  if (/import\s+useAppTranslation\s+from/.test(content)) continue;

  const importLine = `import useAppTranslation from '../hooks/useAppTranslation';\n`;
  if (content.includes('import React')) {
    content = content.replace(/import React[^;]+;\n/, (m) => m + importLine);
  } else {
    content = importLine + content;
  }
  fs.writeFileSync(file, content, 'utf8');
  fixed++;
  console.log('import added', file);
}
console.log('Total:', fixed);
