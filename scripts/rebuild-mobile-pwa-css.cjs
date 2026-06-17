const fs = require('fs');

const transcript =
  'C:/Users/Owner/.cursor/projects/e-AlMosawaNew-Afaq/agent-transcripts/8b67d2cd-04ac-44d7-b522-14c1918b1765/8b67d2cd-04ac-44d7-b522-14c1918b1765.jsonl';
const lines = fs.readFileSync(transcript, 'utf8').split('\n');
let additions = '';

for (const line of lines) {
  if (!line.includes('index.css')) continue;
  try {
    const j = JSON.parse(line);
    for (const c of j.message?.content || []) {
      if (c.type !== 'tool_use') continue;
      if (!(c.input?.path || '').includes('index.css')) continue;
      if (c.name === 'StrReplace' && c.input.new_string) {
        additions += `${c.input.new_string}\n`;
      }
    }
  } catch {
    /* skip malformed lines */
  }
}

const current = fs.readFileSync('e:/AlMosawaNew/Afaq/src/index.css', 'utf8');

function extractBlocks(text) {
  const blocks = [];
  let i = 0;
  while (i < text.length) {
    while (i < text.length && !'@.#:abcdefghijklmnopqrstuvwxyz-['.includes(text[i])) i += 1;
    if (i >= text.length) break;
    const start = i;
    const brace = text.indexOf('{', i);
    if (brace === -1) {
      i += 1;
      continue;
    }
    let depth = 0;
    let j = brace;
    for (; j < text.length; j += 1) {
      if (text[j] === '{') depth += 1;
      else if (text[j] === '}') {
        depth -= 1;
        if (depth === 0) {
          j += 1;
          break;
        }
      }
    }
    if (depth !== 0) {
      i = brace + 1;
      continue;
    }
    blocks.push(text.slice(start, j).trim());
    i = j;
  }
  return blocks;
}

const blocks = extractBlocks(additions);
const seen = new Set();
const out = [];

for (const block of blocks) {
  const key = block.split('{')[0].trim();
  if (seen.has(key)) continue;
  seen.add(key);
  if (current.includes(key.split(',')[0].trim())) continue;
  out.push(block);
}

const tail = fs.readFileSync('e:/AlMosawaNew/Afaq/scripts/mobilePwa.tail.css', 'utf8');
const css = `/* Recovered mobile/PWA styles */\n\n${out.join('\n\n')}\n\n${tail}`;
fs.writeFileSync('e:/AlMosawaNew/Afaq/src/styles/mobilePwa.css', css);

let balance = 0;
for (const ch of css) {
  if (ch === '{') balance += 1;
  if (ch === '}') balance -= 1;
}
console.log(`blocks=${out.length} chars=${css.length} balance=${balance}`);
