/**
 * Safe regex-based i18n — avoids offset bugs from duplicate attr names.
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

const entries = Object.entries(textToKey)
  .filter(([text]) => /[\u0600-\u06FF]/.test(text) && !text.includes('${'))
  .sort((a, b) => b[0].length - a[0].length);

function escapeForJs(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function tCall(text, key) {
  return `t('${key}', '${escapeForJs(text)}')`;
}

function applyFile(content) {
  let changed = false;
  for (const [text, key] of entries) {
    const call = tCall(text, key);
    const re = escapeRegex(text);

    const attrRe = new RegExp(`(\\w+)=("|')${re}\\2`, 'g');
    const next1 = content.replace(attrRe, `$1={${call}}`);
    if (next1 !== content) { content = next1; changed = true; }

    const jsxRe = new RegExp(`>(\\s*)${re}(\\s*)<`, 'g');
    const next2 = content.replace(jsxRe, (m, lead, trail) => {
      if (m.includes('{')) return m;
      changed = true;
      return `>${lead}{${call}}${trail}<`;
    });
    content = next2;

    const litRe = new RegExp(`(?<!t\\()("|')${re}\\1`, 'g');
    const next3 = content.replace(litRe, call);
    if (next3 !== content) { content = next3; changed = true; }
  }
  return { content, changed };
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
  ({ content } = applyFile(content));
  if (content.includes("t('") && content !== original) {
    content = addHookImport(content, file);
    content = addHookUsage(content, file);
  }
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    updated.push(file);
  }
}
console.log(JSON.stringify(updated, null, 2));
