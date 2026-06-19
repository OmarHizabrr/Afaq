/**
 * يترجم ar.json إلى en.json و sn.json عبر MyMemory API (مجاني).
 * يحافظ على الترجمات اليدية الموجودة و placeholders مثل ${var}.
 */
import fs from 'fs';

const ar = JSON.parse(fs.readFileSync('assets/lang/ar.json', 'utf8'));
let en = {};
let sn = {};
try {
  en = JSON.parse(fs.readFileSync('assets/lang/en.json', 'utf8'));
} catch {
  /* fresh */
}
try {
  sn = JSON.parse(fs.readFileSync('assets/lang/sn.json', 'utf8'));
} catch {
  /* fresh */
}

const cacheEn = new Map();
const cacheSn = new Map();

function collectStrings(obj, path = [], out = []) {
  for (const [k, v] of Object.entries(obj)) {
    const p = [...path, k];
    if (typeof v === 'string') out.push({ path: p.join('.'), text: v });
    else collectStrings(v, p, out);
  }
  return out;
}

function getNested(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

function setNested(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]]) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

async function translateText(text, langpair) {
  if (!text || !/[\u0600-\u06FF]/.test(text)) return text;
  const cache = langpair === 'ar|en' ? cacheEn : cacheSn;
  if (cache.has(text)) return cache.get(text);

  // Preserve interpolation tokens
  const placeholders = [];
  let work = text.replace(/\$\{[^}]+\}/g, (m) => {
    const token = `__PH${placeholders.length}__`;
    placeholders.push(m);
    return token;
  });

  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(work)}&langpair=${langpair}`;
  const res = await fetch(url);
  const data = await res.json();
  let translated = data?.responseData?.translatedText || work;

  placeholders.forEach((ph, i) => {
    translated = translated.replace(`__PH${i}__`, ph);
  });

  cache.set(text, translated);
  await new Promise((r) => setTimeout(r, 150));
  return translated;
}

const entries = collectStrings(ar);
const outEn = structuredClone(ar);
const outSn = structuredClone(ar);

let done = 0;
for (const { path, text } of entries) {
  const existingEn = getNested(en, path);
  const existingSn = getNested(sn, path);

  const needsEn =
    !existingEn || existingEn === text || /[\u0600-\u06FF]/.test(existingEn);
  const needsSn =
    !existingSn || existingSn === text || /[\u0600-\u06FF]/.test(existingSn);

  if (needsEn) {
    const tr = await translateText(text, 'ar|en');
    setNested(outEn, path, tr);
  } else {
    setNested(outEn, path, existingEn);
  }

  if (needsSn) {
    const tr = await translateText(text, 'ar|sn');
    setNested(outSn, path, tr);
  } else {
    setNested(outSn, path, existingSn);
  }

  done++;
  if (done % 25 === 0) console.log(`Translated ${done}/${entries.length}...`);
}

fs.writeFileSync('assets/lang/en.json', JSON.stringify(outEn, null, 2), 'utf8');
fs.writeFileSync('assets/lang/sn.json', JSON.stringify(outSn, null, 2), 'utf8');
console.log(`Done. ${entries.length} keys written.`);
