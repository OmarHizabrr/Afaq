/**
 * Apply i18n safely — skips attr rewrite inside JSX expressions.
 */
import fs from 'fs';

const textToKey = JSON.parse(fs.readFileSync('scripts/text-to-key.json', 'utf8'));

const TARGETS = [
  'src/layouts/AdminLayout.jsx',
  'src/layouts/TeacherLayout.jsx',
  'src/layouts/StudentLayout.jsx',
  'src/layouts/SupervisorLayout.jsx',
  'src/pages/LoginPage.jsx',
  'src/pages/common/SettingsPage.jsx',
  'src/pages/common/NotificationsPage.jsx',
  'src/pages/common/NoPermissionsPage.jsx',
  'src/pages/teacher/TeacherDashboardPage.jsx',
  'src/pages/teacher/TeacherDailyLogPage.jsx',
  'src/pages/teacher/TeacherStudentsPage.jsx',
  'src/pages/teacher/TeacherStudentDetailPage.jsx',
  'src/pages/teacher/TeacherWeeklyReportPage.jsx',
  'src/pages/student/StudentDashboardPage.jsx',
  'src/pages/student/StudentProfilePage.jsx',
  'src/pages/student/StudentResultsPage.jsx',
  'src/pages/supervisor/SupervisorDashboardPage.jsx',
  'src/pages/supervisor/SupervisorHistoryPage.jsx',
  'src/pages/supervisor/SupervisorVisitPage.jsx',
  'src/pages/print/CurriculumPrintPage.jsx',
];

function escapeForJs(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

function findStringLiterals(content) {
  const literals = [];
  let i = 0;
  while (i < content.length) {
    const ch = content[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      let j = i + 1;
      while (j < content.length) {
        if (content[j] === '\\') { j += 2; continue; }
        if (content[j] === quote) break;
        j++;
      }
      if (j < content.length) {
        const raw = content.slice(i, j + 1);
        const value = raw.slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, '\n');
        literals.push({ start: i, end: j + 1, quote, value });
        i = j + 1;
        continue;
      }
    }
    i++;
  }
  return literals;
}

function hasArabic(s) {
  return /[\u0600-\u06FF]/.test(s);
}

function replaceLiterals(content) {
  const literals = findStringLiterals(content);
  let result = content;
  let offset = 0;
  let changed = false;

  for (const lit of literals) {
    const { value } = lit;
    if (!hasArabic(value)) continue;
    if (value.includes('${')) continue;
    const key = textToKey[value];
    if (!key) continue;

    const esc = escapeForJs(value);
    const replacement = `t('${key}', '${esc}')`;
    const start = lit.start + offset;
    const end = lit.end + offset;
    const before = result.slice(0, start);
    const after = result.slice(end);

    const attrNameMatch = before.match(/(\w+)=$/);
    const attrMatch = attrNameMatch && !before.slice(before.lastIndexOf(attrNameMatch[1] + '=')).includes('{');
    if (attrMatch && (lit.quote === '"' || lit.quote === "'")) {
      const attrStart = before.lastIndexOf(attrNameMatch[1] + '=');
      const newBefore = before.slice(0, attrStart) + attrNameMatch[1] + '={';
      result = newBefore + replacement + '}' + after;
      offset += newBefore.length + replacement.length + 1 - (end - start);
      changed = true;
      continue;
    }

    result = before + replacement + after;
    offset += replacement.length - (end - start);
    changed = true;
  }
  return { content: result, changed };
}

function replaceJsxText(content) {
  let changed = false;
  const result = content.replace(/>([^<>{}\n]+)</g, (match, text) => {
    const trimmed = text.trim();
    if (!trimmed || !hasArabic(trimmed) || trimmed.includes('{')) return match;
    const key = textToKey[trimmed];
    if (!key) return match;
    const esc = escapeForJs(trimmed);
    const leading = text.match(/^\s*/)[0];
    const trailing = text.match(/\s*$/)[0];
    changed = true;
    return `>${leading}{t('${key}', '${esc}')}${trailing}<`;
  });
  return { content: result, changed };
}

function addHookImport(content, file) {
  const relDepth = file.replace(/\\/g, '/').split('/').length - 2;
  const hookPath = `${'../'.repeat(relDepth)}hooks/useAppTranslation`;
  if (content.includes('useAppTranslation')) return content;
  const importLine = `import useAppTranslation from '${hookPath}';\n`;
  if (content.includes('import React')) {
    return content.replace(/import React[^;]+;\n/, (m) => m + importLine);
  }
  return importLine + content;
}

function addHookUsage(content) {
  if (content.includes('const { t }') || content.includes('const {t}')) return content;
  const patterns = [
    /export default function \w+\([^)]*\)\s*\{/,
    /const \w+ = \(\{[^}]*\}\) => \{/,
    /const \w+ = \([^)]*\) => \{/,
    /function \w+\([^)]*\)\s*\{/,
  ];
  for (const re of patterns) {
    if (re.test(content)) {
      return content.replace(re, (m) => `${m}\n  const { t } = useAppTranslation();`);
    }
  }
  return content;
}

const updated = [];
for (const file of TARGETS) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  let { content: c1, changed: ch1 } = replaceLiterals(content);
  let { content: c2, changed: ch2 } = replaceJsxText(c1);
  content = c2;
  if (!ch1 && !ch2) continue;
  if (content.includes("t('")) {
    content = addHookImport(content, file);
    content = addHookUsage(content, file);
  }
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    updated.push(file);
  }
}
console.log(JSON.stringify(updated, null, 2));
