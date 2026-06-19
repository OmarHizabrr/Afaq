/**
 * Adds missing useAppTranslation imports and fixes arrow-component braces.
 */
import fs from 'fs';
import path from 'path';

const COMPONENTS_DIR = 'src/components';

function walk(dir, files = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (f.endsWith('.jsx')) files.push(p);
  }
  return files;
}

function addImport(content, file) {
  if (!content.includes('useAppTranslation()')) return content;
  if (content.includes('import useAppTranslation')) return content;
  const importLine = `import useAppTranslation from '../hooks/useAppTranslation';\n`;
  if (content.includes('import React')) {
    return content.replace(/import React[^;]+;\n/, (m) => m + importLine);
  }
  return importLine + content;
}

function fixArrowBraces(content) {
  // `=> {` with `return (` but closed with `);` instead of `); };`
  return content.replace(
    /(const \w+ = \([^)]*\) => \{\s*\n\s*const \{ t \} = useAppTranslation\(\);\s*\n\s*return \(\s*[\s\S]*?\n\);\s*\n)(export default)/,
    '$1};\n\n$2',
  );
}

let fixed = 0;
for (const file of walk(COMPONENTS_DIR)) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  content = addImport(content, file);
  content = fixArrowBraces(content);
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    fixed++;
    console.log('fixed', file);
  }
}
console.log('Total fixed:', fixed);
