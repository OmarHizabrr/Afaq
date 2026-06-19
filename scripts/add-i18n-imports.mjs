import fs from 'fs';

const files = [
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

for (const file of files) {
  let c = fs.readFileSync(file, 'utf8');
  if (!c.includes('useAppTranslation') || c.includes('import useAppTranslation')) continue;
  const relDepth = file.split('/').length - 2;
  const hookPath = `${'../'.repeat(relDepth)}hooks/useAppTranslation`;
  const importLine = `import useAppTranslation from '${hookPath}';\n`;
  if (c.includes('import React')) {
    c = c.replace(/import React[^;]+;\n/, (m) => m + importLine);
  } else {
    c = importLine + c;
  }
  fs.writeFileSync(file, c);
  console.log('import added', file);
}
