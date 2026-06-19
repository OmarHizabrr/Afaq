/**
 * يكتشف ثوابت UPPER_CASE مستخدمة في JSX/JS بدون import أو تعريف محلي.
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

const BUILTIN = new Set(['Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date', 'Promise', 'Map', 'Set', 'Error', 'RegExp', 'Intl', 'console', 'window', 'document', 'navigator', 'localStorage', 'sessionStorage', 'URL', 'File', 'Blob', 'FormData', 'Headers', 'Request', 'Response', 'AbortController', 'Event', 'CustomEvent', 'Image', 'HTMLElement', 'Node', 'React', 'Firebase', 'Firestore', 'PERMISSION_PAGE_IDS', 'DATA_SCOPE_MEMBERSHIP', 'MOBILE_QUERY']);

const issues = [];

for (const file of walk('src')) {
  const rel = file.replace(/\\/g, '/');
  if (rel.includes('i18n/')) continue;

  const content = fs.readFileSync(file, 'utf8');
  const imported = new Set();
  for (const m of content.matchAll(/import\s+(?:\{([^}]+)\}|(\w+))\s+from/g)) {
    if (m[1]) {
      m[1].split(',').forEach((part) => {
        const name = part.trim().split(/\s+as\s+/)[0].trim();
        if (name) imported.add(name);
      });
    }
    if (m[2]) imported.add(m[2]);
  }

  const localDefs = new Set();
  for (const m of content.matchAll(/(?:const|let|var|function|class)\s+([A-Z][A-Z0-9_]*)\b/g)) {
    localDefs.add(m[1]);
  }
  for (const m of content.matchAll(/export\s+(?:const|function|class)\s+([A-Z][A-Z0-9_]*)\b/g)) {
    localDefs.add(m[1]);
  }

  const used = new Set();
  for (const m of content.matchAll(/\b([A-Z][A-Z0-9_]{2,})\b/g)) {
    const name = m[1];
    if (BUILTIN.has(name)) continue;
    if (imported.has(name) || localDefs.has(name)) continue;
    used.add(name);
  }

  if (used.size) {
    issues.push({ file: rel, names: [...used].sort() });
  }
}

for (const { file, names } of issues.sort((a, b) => a.file.localeCompare(b.file))) {
  console.log(file, '→', names.join(', '));
}
console.log('files:', issues.length);
