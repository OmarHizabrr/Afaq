import fs from 'fs';

const files = process.argv.slice(2);
const re = /t\('([^']+)',\s*t\('\1',\s*'((?:\\'|[^'])*)'\)\)/g;

for (const f of files) {
  let c = fs.readFileSync(f, 'utf8');
  const orig = c;
  let prev;
  do {
    prev = c;
    c = c.replace(re, "t('$1', '$2')");
  } while (c !== prev);
  if (c !== orig) {
    fs.writeFileSync(f, c);
    console.log('fixed', f);
  }
}
