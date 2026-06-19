/**
 * يكتشف t() على مستوى الملف (خارج المكوّن) أو في default params قبل useAppTranslation.
 */
import fs from 'fs';
import path from 'path';

function walk(dir, files = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory() && f !== 'node_modules') walk(p, files);
    else if (/\.(jsx|js)$/.test(f)) files.push(p);
  }
  return files;
}

const issues = [];
for (const file of walk('src')) {
  const content = fs.readFileSync(file, 'utf8');
  if (!/\bt\s*\(\s*['"]/.test(content)) continue;

  const lines = content.split('\n');
  const compIdx = lines.findIndex((l) =>
    /^(export default )?(const|function) \w+/.test(l.trim()) &&
    !/^const get\w+ = \(t\)/.test(l.trim()) &&
    (l.includes('=>') || l.includes('function')),
  );
  const head = compIdx > 0 ? lines.slice(0, compIdx).join('\n') : '';

  const moduleT =
    /^const \w+ = \{[^]*?\bt\s*\(/m.test(head) ||
    /^const \w+ = \[[^]*?\bt\s*\(/m.test(head);

  const defaultParam = /=\s*t\s*\(\s*['"]/.test(
    content.replace(/^[\s\S]*?(const \w+ = \(|function \w+\()/m, ''),
  );

  const badDefaultInSig = /\{\s*[^}]*=\s*t\s*\(\s*['"]/.test(content);

  if (moduleT || badDefaultInSig) {
    issues.push({ file, moduleT, badDefaultInSig });
  }
}

for (const i of issues) {
  console.log(i.file, i.moduleT ? 'module-level' : '', i.badDefaultInSig ? 'default-param' : '');
}
console.log('total:', issues.length);
