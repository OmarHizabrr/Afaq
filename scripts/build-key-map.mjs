/**
 * يبني خريطة نص عربي → مفتاح i18n من ar.json
 */
import fs from 'fs';

const ar = JSON.parse(fs.readFileSync('assets/lang/ar.json', 'utf8'));
const textToKey = new Map();

function walk(obj, path = []) {
  for (const [k, v] of Object.entries(obj)) {
    const p = [...path, k];
    if (typeof v === 'string') {
      const key = p.join('.');
      if (!textToKey.has(v)) textToKey.set(v, key);
    } else {
      walk(v, p);
    }
  }
}

walk(ar);

const entries = [...textToKey.entries()].sort((a, b) => b[0].length - a[0].length);
fs.writeFileSync('scripts/text-to-key.json', JSON.stringify(Object.fromEntries(entries), null, 2), 'utf8');
console.log('mapped', entries.length, 'strings');
