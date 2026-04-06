const fs = require('fs');
const path = require('path');

function getAllFiles(dir, allFiles = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      getAllFiles(name, allFiles);
    } else if (file.endsWith('.jsx')) {
      allFiles.push(name);
    }
  });
  return allFiles;
}

const files = getAllFiles('./src');
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  // Simple check: if useState or useEffect is used as a standalone word (not .useState)
  const usesState = /\buseState\b/.test(content);
  const usesEffect = /\buseEffect\b/.test(content);
  
  if (!usesState && !usesEffect) return;

  // Check if they are imported from 'react'
  // Looking for imports that contain 'react' and the specific hook
  const lines = content.split('\n');
  const reactImportLines = lines.filter(l => l.includes("'react'") || l.includes('"react"'));
  const reactImportText = reactImportLines.join(' ');

  const missingState = usesState && !reactImportText.includes('useState');
  const missingEffect = usesEffect && !reactImportText.includes('useEffect');

  if (missingState || missingEffect) {
    console.log(`FILE: ${file}`);
    if (missingState) console.log('  - Missing useState');
    if (missingEffect) console.log('  - Missing useEffect');
  }
});
