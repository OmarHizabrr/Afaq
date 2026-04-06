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
  const usesUseState = content.includes('useState');
  const usesUseEffect = content.includes('useEffect');
  
  if (!usesUseState && !usesUseEffect) return;

  const hasUseStateImport = content.match(/import.*\{.*useState.*\}.*react/);
  const hasUseEffectImport = content.match(/import.*\{.*useEffect.*\}.*react/);
  const hasReactImport = content.match(/import.*React.*from.*react/);

  let missing = [];
  if (usesUseState && !hasUseStateImport && !hasReactImport) missing.push('useState');
  if (usesUseEffect && !hasUseEffectImport && !hasReactImport) missing.push('useEffect');

  if (missing.length > 0) {
    console.log(`BROKEN: ${file} (Missing ${missing.join(', ')})`);
  }
});
