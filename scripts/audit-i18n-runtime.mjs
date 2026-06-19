/**
 * يكتشف t() قبل useAppTranslation أو بدون استيراد الـ hook.
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
  const rel = file.replace(/\\/g, '/');
  if (rel.includes('i18n/') || rel.includes('hooks/useAppTranslation')) continue;

  const content = fs.readFileSync(file, 'utf8');
  const usesT = /\bt\s*\(\s*['"]/.test(content);
  if (!usesT) continue;

  const hasHookImport = /import useAppTranslation/.test(content);
  const hasHookCall = /useAppTranslation\s*\(\s*\)/.test(content);
  const hasTranslateImport = /import translate/.test(content);

  const lines = content.split('\n');
  const hookLine = lines.findIndex((l) => /useAppTranslation\s*\(\s*\)/.test(l));
  const firstTLine = lines.findIndex(
    (l, i) =>
      /\bt\s*\(\s*['"]/.test(l) &&
      !/get\w+\s*\(\s*t\s*\)/.test(l) &&
      !/^\s*\/\//.test(l.trim()) &&
      !/\blbl\s*\(/.test(l),
  );

  const compLine = lines.findIndex((l) =>
    /^(export default )?(const|function) \w+/.test(l.trim()) &&
    !/^const get\w+ = \(t\)/.test(l.trim()),
  );

  const head = compLine > 0 ? lines.slice(0, compLine).join('\n') : '';
  const moduleLevelT =
    /^const \w+ = \{[^]*?\bt\s*\(/m.test(head) ||
    /^const \w+ = \[[^]*?\bt\s*\(/m.test(head) ||
    /^const \w+ = \([^)]*\)\s*=>\s*\[[^]*?\bt\s*\(/m.test(head);

  const badDefault =
    /= t\s*\(\s*['"]/.test(content) &&
    /^\s*\w+\s*=\s*t\s*\(\s*['"]/.test(
      content.match(/\(\s*\{[^}]*=\s*t\s*\(\s*['"]/s)?.[0] || '',
    );

  if (usesT && !hasHookImport && !hasTranslateImport && !/\(t\s*=\s*translate\)/.test(content)) {
    issues.push({ file: rel, kind: 'missing-hook-import' });
    continue;
  }

  if (moduleLevelT) {
    issues.push({ file: rel, kind: 'module-level-t', line: firstTLine + 1 });
    continue;
  }

  if (hasHookCall && firstTLine >= 0 && hookLine >= 0 && firstTLine < hookLine) {
    issues.push({ file: rel, kind: 't-before-hook', line: firstTLine + 1 });
  }

  if (badDefault && rel.includes('components/')) {
    issues.push({ file: rel, kind: 'default-param-t' });
  }
}

for (const i of issues) {
  console.log(i.kind, i.file, i.line ? `:${i.line}` : '');
}
console.log('total:', issues.length);
