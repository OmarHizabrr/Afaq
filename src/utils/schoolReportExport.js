import * as XLSX from 'xlsx';
import { downloadHtmlBodyAsPdf } from './arabicPdfExport';
import { buildSchoolReportBodyHtml, buildComprehensiveReportBodyHtml } from './schoolReportHtml';
import { formatVisitRatingLabel } from './visitRating';
import { normalizeSchoolReportForDisplay, teacherRatingsFromReport } from './schoolReportStars';

function formatTeacherStars(stars) {
  const n = Number(stars);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return formatVisitRatingLabel(n);
}

const safe = (v) => String(v ?? '-');

function reportRows(rep) {
  const teachers = (rep.teachers || []).map((t) => `${t.teacherName || '-'} (${t.phone || '-'})`).join('؛ ');
  const absent = (rep.absentStudents || []).map((s) => s.studentName).join('، ');
  const curriculum = (rep.curriculumItems || [])
    .map((c) => `${c.subjectName}: ${c.content || '-'}`)
    .join(' | ');
  return [
    ['عنوان التقرير', safe(rep.reportTitle)],
    ['نوع التقرير', safe(rep.reportPeriod === 'monthly' ? 'شهري' : rep.reportPeriod === 'weekly' ? 'أسبوعي' : rep.reportPeriod === 'visit' ? 'زيارة' : rep.reportPeriod)],
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
    ['تقييم المعلم (نجوم)', safe(rep.teacherEvaluation)],
    ['متوسط تقييم الطلاب', safe(rep.studentLevel)],
    ['الطلاب المتفوقون', (rep.outstandingStudents || []).join('، ') || '-'],
    ['أنشطة المعلم في القرية', (rep.teacherVillageActivities || []).join('؛ ') || '-'],
    ['أنشطة المؤسسة في القرية', (rep.institutionVillageActivities || []).join('؛ ') || '-'],
    ['خطب الجمعة في القرية', (rep.fridaySermons || []).join('؛ ') || '-'],
    ['عدد من دخل الإسلام جديداً', safe(rep.newConvertsCount ?? 0)],
    ['مشاريع المؤسسة بالقرية', safe(rep.hasInstitutionProjects || '-')],
    ['حالة مشاريع المؤسسة', safe(rep.institutionProjectsStatus || '-')],
    ['ملاحظات إضافية', safe(rep.notes || rep.villageNotes)],
  ];
}

export async function exportSchoolReportPdf(rep, filename = 'school-report.pdf') {
  const normalized = normalizeSchoolReportForDisplay(rep);
  await downloadHtmlBodyAsPdf(buildSchoolReportBodyHtml(normalized), filename);
}

export function exportSchoolReportExcel(rep, filename = 'school-report.xlsx') {
  const normalized = normalizeSchoolReportForDisplay(rep);
  const wb = XLSX.utils.book_new();
  const main = XLSX.utils.aoa_to_sheet([
    ['تقرير إشراف مدرسة'],
    [],
    ...reportRows(normalized),
  ]);
  XLSX.utils.book_append_sheet(wb, main, 'التقرير');

  const progress = normalized.curriculumProgressSummary || [];
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

  const teachers = normalized.teachers || [];
  if (teachers.length > 0) {
    const teacherRatings = teacherRatingsFromReport(normalized, teachers.map((t) => t.teacherId).filter(Boolean));
    const tSheet = XLSX.utils.aoa_to_sheet([
      ['#', 'المعلم', 'الهاتف', 'التقييم (نجوم)'],
      ...teachers.map((t, i) => [
        i + 1,
        t.teacherName,
        t.phone,
        formatTeacherStars(t.stars ?? teacherRatings[t.teacherId]),
      ]),
    ]);
    XLSX.utils.book_append_sheet(wb, tSheet, 'المعلمون');
  }

  const starAwards = (normalized.starAwards || []).filter((s) => Number(s.stars) > 0);
  if (starAwards.length > 0) {
    const starsSheet = XLSX.utils.aoa_to_sheet([
      ['#', 'الطالب', 'التقييم (نجوم)'],
      ...starAwards.map((s, i) => [i + 1, s.name || '-', formatTeacherStars(s.stars)]),
    ]);
    XLSX.utils.book_append_sheet(wb, starsSheet, 'تقييم الطلاب');
  }

  const outstanding = (normalized.outstandingStudents || []).filter(Boolean);
  if (outstanding.length > 0) {
    const outSheet = XLSX.utils.aoa_to_sheet([
      ['#', 'الطالب المتفوق'],
      ...outstanding.map((name, i) => [i + 1, name]),
    ]);
    XLSX.utils.book_append_sheet(wb, outSheet, 'المتفوقون');
  }

  const villageRows = (items, title) =>
    (items || []).filter(Boolean).map((text, i) => [i + 1, text]);

  const teacherActs = villageRows(normalized.teacherVillageActivities);
  if (teacherActs.length) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([['#', 'نشاط المعلم في القرية'], ...teacherActs]),
      'أنشطة المعلم'
    );
  }
  const instActs = villageRows(normalized.institutionVillageActivities);
  if (instActs.length) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([['#', 'نشاط المؤسسة في القرية'], ...instActs]),
      'أنشطة المؤسسة'
    );
  }
  const sermons = villageRows(normalized.fridaySermons);
  if (sermons.length) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([['#', 'خطبة الجمعة'], ...sermons]),
      'خطب الجمعة'
    );
  }

  XLSX.writeFile(wb, filename);
}

export function exportComprehensiveExcel(data, filename = 'comprehensive-school-report.xlsx') {
  const normalizedReports = (data.schoolReports || []).map(normalizeSchoolReportForDisplay);
  const wb = XLSX.utils.book_new();

  const summary = XLSX.utils.aoa_to_sheet([
    ['تقرير شامل عن المدرسة'],
    ['المدرسة', data.schoolName || ''],
    ['القرية', data.villageName || ''],
    ['تاريخ التصدير', new Date().toISOString().split('T')[0]],
    [],
    ['عدد تقارير الإشراف', normalizedReports.length],
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
    normalizedReports.map((r) => [
      r.date || r.timestamp?.split('T')[0],
      r.reportTitle || 'تقرير إشراف',
      r.reportPeriod === 'monthly' ? 'شهري' : r.reportPeriod === 'weekly' ? 'أسبوعي' : r.reportPeriod === 'visit' ? 'زيارة' : r.reportPeriod || '',
      r.supervisorName,
      r.presentCount,
      r.totalStudents,
      r.teacherEvaluation || '—',
      r.studentLevel || '—',
      r.absenceReview,
    ]),
    ['التاريخ', 'العنوان', 'النوع', 'المشرف', 'الحضور', 'المسجلون', 'تقييم المعلم', 'تقييم الطلاب', 'مراجعة الغياب']
  );

  const allStarRows = [];
  normalizedReports.forEach((r) => {
    const date = r.date || r.timestamp?.split('T')[0] || '';
    (r.starAwards || [])
      .filter((s) => Number(s.stars) > 0)
      .forEach((s) => {
        allStarRows.push([date, r.reportTitle || 'تقرير إشراف', s.name || '-', formatTeacherStars(s.stars)]);
      });
  });
  addListSheet(
    'نجوم الطلاب',
    allStarRows,
    ['تاريخ التقرير', 'عنوان التقرير', 'الطالب', 'التقييم']
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
  const normalized = {
    ...data,
    schoolReports: (data.schoolReports || []).map(normalizeSchoolReportForDisplay),
  };
  await downloadHtmlBodyAsPdf(buildComprehensiveReportBodyHtml(normalized), filename);
}

export { buildSchoolReportBodyHtml, buildComprehensiveReportBodyHtml };
