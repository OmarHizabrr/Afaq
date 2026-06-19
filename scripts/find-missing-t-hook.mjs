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

function extractExportDefaultBody(src) {
  const patterns = [
    /export default function (\w+)\s*\([^)]*\)\s*\{/,
    /const (\w+) = \(\) => \{/,
    /const (\w+) = \(\{[\s\S]*?\}\) => \{/,
  ];

  let match = null;
  let patternIndex = -1;
  for (let i = 0; i < patterns.length; i++) {
    const m = src.match(patterns[i]);
    if (m && (!match || m.index > match.index)) {
      match = m;
      patternIndex = i;
    }
  }

  if (!match) return null;

  const exportIdx = src.lastIndexOf('export default');
  if (match.index < exportIdx - 200) {
    const tail = src.slice(exportIdx);
    for (let i = 0; i < patterns.length; i++) {
      const m = tail.match(patterns[i]);
      if (m) {
        match = { ...m, index: exportIdx + m.index };
        break;
      }
    }
  }

  const bodyStart = src.indexOf('{', match.index);
  if (bodyStart < 0) return null;

  let depth = 0;
  for (let i = bodyStart; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(bodyStart, i + 1);
    }
  }
  return null;
}

const issues = [];

for (const file of walk('src')) {
  const src = fs.readFileSync(file, 'utf8');
  if (!/import useAppTranslation/.test(src) || !/\bt\s*\(['"]/.test(src)) continue;

  const body = extractExportDefaultBody(src);
  if (!body) continue;

  const usesT = /\bt\s*\(['"]/.test(body);
  const hasHook = /const\s*\{[^}]*\bt\b[^}]*\}\s*=\s*useAppTranslation\s*\(\s*\)/.test(body);

  if (usesT && !hasHook) {
    issues.push(file.replace(/\\/g, '/'));
  }
}

console.log(issues.length ? issues.join('\n') : 'none');
