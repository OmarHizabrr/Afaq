import * as XLSX from 'xlsx';
import { downloadHtmlBodyAsPdf } from './arabicPdfExport';
import { buildSchoolReportBodyHtml, buildComprehensiveReportBodyHtml } from './schoolReportHtml';

const safe = (v) => String(v ?? '-');

function reportRows(rep) {
  const teachers = (rep.teachers || []).map((t) => `${t.teacherName || '-'} (${t.phone || '-'})`).join('؛ ');
  const absent = (rep.absentStudents || []).map((s) => s.studentName).join('، ');
  const curriculum = (rep.curriculumItems || [])
    .map((c) => `${c.subjectName}: ${c.content || '-'}`)
    .join(' | ');
  return [
    ['عنوان التقرير', safe(rep.reportTitle)],
    ['المدرسة', safe(rep.schoolName)],
    ['القرية', safe(rep.villageName)],
    ['التاريخ', safe(rep.date || rep.timestamp?.split('T')[0])],
    ['اليوم', safe(rep.dayName)],
    ['المشرف', safe(rep.supervisorName)],
    ['وقت الحضور', safe(rep.arrivalTime)],
    ['وقت المغادرة', safe(rep.departureTime)],
    ['الطلاب المسجلون', safe(rep.totalStudents)],
    ['الحضور', safe(rep.presentCount)],
    ['مراجعة الغياب', safe(rep.absenceReview)],
    ['المعلمون', teachers || '-'],
    ['الغائبون', absent || 'لا يوجد'],
    ['المنهج', curriculum || '-'],
    ['تقييم المدرسة', safe(rep.schoolEvaluation)],
    ['تقييم المعلم', safe(rep.teacherEvaluation)],
    ['ملاحظات', safe(rep.notes)],
  ];
}

export async function exportSchoolReportPdf(rep, filename = 'school-report.pdf') {
  await downloadHtmlBodyAsPdf(buildSchoolReportBodyHtml(rep), filename);
}

export function exportSchoolReportExcel(rep, filename = 'school-report.xlsx') {
  const wb = XLSX.utils.book_new();
  const main = XLSX.utils.aoa_to_sheet([
    ['تقرير إشراف مدرسة'],
    [],
    ...reportRows(rep),
  ]);
  XLSX.utils.book_append_sheet(wb, main, 'التقرير');

  const progress = rep.curriculumProgressSummary || [];
  if (progress.length > 0) {
    const progSheet = XLSX.utils.aoa_to_sheet([
      ['المادة', 'الأسبوع المتوقع', 'الأسبوع المُبلّغ', 'الحالة', 'الفجوة'],
      ...progress.map((p) => [
        p.subjectName,
        p.expectedWeek,
        p.reportedWeek || '',
        p.label,
        p.gapWeeks ?? '',
      ]),
    ]);
    XLSX.utils.book_append_sheet(wb, progSheet, 'متابعة المنهج');
  }

  const teachers = rep.teachers || [];
  if (teachers.length > 0) {
    const tSheet = XLSX.utils.aoa_to_sheet([
      ['#', 'المعلم', 'الهاتف'],
      ...teachers.map((t, i) => [i + 1, t.teacherName, t.phone]),
    ]);
    XLSX.utils.book_append_sheet(wb, tSheet, 'المعلمون');
  }

  XLSX.writeFile(wb, filename);
}

export function exportComprehensiveExcel(data, filename = 'comprehensive-school-report.xlsx') {
  const wb = XLSX.utils.book_new();

  const summary = XLSX.utils.aoa_to_sheet([
    ['تقرير شامل عن المدرسة'],
    ['المدرسة', data.schoolName || ''],
    ['القرية', data.villageName || ''],
    ['تاريخ التصدير', new Date().toISOString().split('T')[0]],
    [],
    ['عدد تقارير الإشراف', data.schoolReports?.length || 0],
    ['عدد الزيارات الميدانية', data.fieldVisits?.length || 0],
    ['عدد سجلات التحضير', data.dailyLogs?.length || 0],
    ['المهتدون الجدد (قرية)', data.newConvertsCount ?? 0],
  ]);
  XLSX.utils.book_append_sheet(wb, summary, 'ملخص');

  const addListSheet = (name, rows, headers) => {
    if (!rows?.length) return;
    const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, sheet, name.slice(0, 31));
  };

  addListSheet(
    'تقارير الإشراف',
    (data.schoolReports || []).map((r) => [
      r.date || r.timestamp?.split('T')[0],
      r.supervisorName,
      r.presentCount,
      r.totalStudents,
      r.absenceReview,
    ]),
    ['التاريخ', 'المشرف', 'الحضور', 'المسجلون', 'مراجعة الغياب']
  );

  addListSheet(
    'الزيارات',
    (data.fieldVisits || []).map((r) => [
      r.timestamp?.split('T')[0],
      r.supervisorName,
      r.subjectName,
      r.week,
    ]),
    ['التاريخ', 'المشرف', 'المادة', 'الأسبوع']
  );

  addListSheet(
    'التحضير',
    (data.dailyLogs || []).map((r) => [
      r.date,
      r.subjectName,
      r.week,
      r.totalPresent,
      r.totalStudents,
      r.prepPeriod || 'يومي',
    ]),
    ['التاريخ', 'المادة', 'الأسبوع', 'الحاضرون', 'الإجمالي', 'الفترة']
  );

  XLSX.writeFile(wb, filename);
}

export async function exportComprehensivePdf(data, filename = 'comprehensive-school-report.pdf') {
  await downloadHtmlBodyAsPdf(buildComprehensiveReportBodyHtml(data), filename);
}

export { buildSchoolReportBodyHtml, buildComprehensiveReportBodyHtml };
