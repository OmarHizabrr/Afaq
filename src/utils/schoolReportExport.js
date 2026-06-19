import * as XLSX from 'xlsx';
import translate from '../i18n/translate';
import { downloadHtmlBodyAsPdf } from './arabicPdfExport';
import { buildSchoolReportBodyHtml, buildComprehensiveReportBodyHtml } from './schoolReportHtml';
import { formatVisitRatingLabel } from './visitRating';
import { prepPeriodLabel, schoolReportPeriodLabel } from './reportLabels';
import { normalizeSchoolReportForDisplay, teacherRatingsFromReport } from './schoolReportStars';

const lbl = (t, key, fallback) => t(`utils.schoolReportExport.${key}`, fallback);

function formatTeacherStars(stars) {
  const n = Number(stars);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return formatVisitRatingLabel(n);
}

const safe = (v) => String(v ?? '-');

function reportRows(rep, t = translate) {
  const teachers = (rep.teachers || []).map((teacher) => `${teacher.teacherName || '-'} (${teacher.phone || '-'})`).join('؛ ');
  const absent = (rep.absentStudents || []).map((s) => s.studentName).join('، ');
  const curriculum = (rep.curriculumItems || [])
    .map((c) => `${c.subjectName}: ${c.content || '-'}`)
    .join(' | ');
  return [
    [lbl(t, 'العنوان', 'عنوان التقرير'), safe(rep.reportTitle)],
    [lbl(t, 'النوع', 'نوع التقرير'), safe(schoolReportPeriodLabel(rep.reportPeriod, t) || rep.reportPeriod)],
    [lbl(t, 'المدرسة', 'المدرسة'), safe(rep.schoolName)],
    [lbl(t, 'القرية', 'القرية'), safe(rep.villageName)],
    [lbl(t, 'التاريخ', 'التاريخ'), safe(rep.date || rep.timestamp?.split('T')[0])],
    [lbl(t, 'اليوم', 'اليوم'), safe(rep.dayName)],
    [lbl(t, 'المشرف', 'المشرف'), safe(rep.supervisorName)],
    [lbl(t, 'وقت_الحضور', 'وقت الحضور'), safe(rep.arrivalTime)],
    [lbl(t, 'وقت_المغادرة', 'وقت المغادرة'), safe(rep.departureTime)],
    [lbl(t, 'الطلاب_المسجلون', 'الطلاب المسجلون'), safe(rep.totalStudents)],
    [lbl(t, 'الحضور', 'الحضور'), safe(rep.presentCount)],
    [lbl(t, 'مراجعة_الغياب', 'مراجعة الغياب'), safe(rep.absenceReview)],
    [lbl(t, 'المعلمون', 'المعلمون'), teachers || '-'],
    [lbl(t, 'الغائبون', 'الغائبون'), absent || lbl(t, 'لا_يوجد', 'لا يوجد')],
    [lbl(t, 'المنهج', 'المنهج'), curriculum || '-'],
    [lbl(t, 'تقييم_المدرسة', 'تقييم المدرسة'), safe(rep.schoolEvaluation)],
    [lbl(t, 'تقييم_المعلم_نجوم', 'تقييم المعلم (نجوم)'), safe(rep.teacherEvaluation)],
    [lbl(t, 'متوسط_تقييم_الطلاب', 'متوسط تقييم الطلاب'), safe(rep.studentLevel)],
    [lbl(t, 'الطلاب_المتفوقون', 'الطلاب المتفوقون'), (rep.outstandingStudents || []).join('، ') || '-'],
    [lbl(t, 'أنشطة_المعلم_في_القرية', 'أنشطة المعلم في القرية'), (rep.teacherVillageActivities || []).join('؛ ') || '-'],
    [lbl(t, 'أنشطة_المؤسسة_في_القرية', 'أنشطة المؤسسة في القرية'), (rep.institutionVillageActivities || []).join('؛ ') || '-'],
    [lbl(t, 'خطب_الجمعة_في_القرية', 'خطب الجمعة في القرية'), (rep.fridaySermons || []).join('؛ ') || '-'],
    [lbl(t, 'عدد_من_دخل_الإسلام', 'عدد من دخل الإسلام جديداً'), safe(rep.newConvertsCount ?? 0)],
    [lbl(t, 'مشاريع_المؤسسة_بالقرية', 'مشاريع المؤسسة بالقرية'), safe(rep.hasInstitutionProjects || '-')],
    [lbl(t, 'حالة_مشاريع_المؤسسة', 'حالة مشاريع المؤسسة'), safe(rep.institutionProjectsStatus || '-')],
    [lbl(t, 'ملاحظات_إضافية', 'ملاحظات إضافية'), safe(rep.notes || rep.villageNotes)],
  ];
}

export async function exportSchoolReportPdf(rep, filename = 'school-report.pdf', t = translate) {
  const normalized = normalizeSchoolReportForDisplay(rep);
  await downloadHtmlBodyAsPdf(buildSchoolReportBodyHtml(normalized, t), filename);
}

export function exportSchoolReportExcel(rep, filename = 'school-report.xlsx', t = translate) {
  const normalized = normalizeSchoolReportForDisplay(rep);
  const wb = XLSX.utils.book_new();
  const main = XLSX.utils.aoa_to_sheet([
    [lbl(t, 'تقرير_إشراف_مدرسة', 'تقرير إشراف مدرسة')],
    [],
    ...reportRows(normalized, t),
  ]);
  XLSX.utils.book_append_sheet(wb, main, lbl(t, 'التقرير', 'التقرير').slice(0, 31));

  const progress = normalized.curriculumProgressSummary || [];
  if (progress.length > 0) {
    const progSheet = XLSX.utils.aoa_to_sheet([
      [
        lbl(t, 'المادة', 'المادة'),
        lbl(t, 'الأسبوع_المتوقع', 'الأسبوع المتوقع'),
        lbl(t, 'الأسبوع_المُبلّغ', 'الأسبوع المُبلّغ'),
        lbl(t, 'الحالة', 'الحالة'),
        lbl(t, 'الفجوة', 'الفجوة'),
      ],
      ...progress.map((p) => [
        p.subjectName,
        p.expectedWeek,
        p.reportedWeek || '',
        p.label,
        p.gapWeeks ?? '',
      ]),
    ]);
    XLSX.utils.book_append_sheet(wb, progSheet, lbl(t, 'متابعة_المنهج', 'متابعة المنهج').slice(0, 31));
  }

  const teachers = normalized.teachers || [];
  if (teachers.length > 0) {
    const teacherRatings = teacherRatingsFromReport(normalized, teachers.map((teacher) => teacher.teacherId).filter(Boolean));
    const tSheet = XLSX.utils.aoa_to_sheet([
      ['#', lbl(t, 'المعلم', 'المعلم'), lbl(t, 'الهاتف', 'الهاتف'), lbl(t, 'التقييم_نجوم', 'التقييم (نجوم)')],
      ...teachers.map((teacher, i) => [
        i + 1,
        teacher.teacherName,
        teacher.phone,
        formatTeacherStars(teacher.stars ?? teacherRatings[teacher.teacherId]),
      ]),
    ]);
    XLSX.utils.book_append_sheet(wb, tSheet, lbl(t, 'المعلمون', 'المعلمون').slice(0, 31));
  }

  const starAwards = (normalized.starAwards || []).filter((s) => Number(s.stars) > 0);
  if (starAwards.length > 0) {
    const starsSheet = XLSX.utils.aoa_to_sheet([
      ['#', lbl(t, 'الطالب', 'الطالب'), lbl(t, 'التقييم_نجوم', 'التقييم (نجوم)')],
      ...starAwards.map((s, i) => [i + 1, s.name || '-', formatTeacherStars(s.stars)]),
    ]);
    XLSX.utils.book_append_sheet(wb, starsSheet, lbl(t, 'تقييم_الطلاب', 'تقييم الطلاب').slice(0, 31));
  }

  const outstanding = (normalized.outstandingStudents || []).filter(Boolean);
  if (outstanding.length > 0) {
    const outSheet = XLSX.utils.aoa_to_sheet([
      ['#', lbl(t, 'الطالب_المتفوق', 'الطالب المتفوق')],
      ...outstanding.map((name, i) => [i + 1, name]),
    ]);
    XLSX.utils.book_append_sheet(wb, outSheet, lbl(t, 'المتفوقون', 'المتفوقون').slice(0, 31));
  }

  const villageRows = (items) => (items || []).filter(Boolean).map((text, i) => [i + 1, text]);

  const teacherActs = villageRows(normalized.teacherVillageActivities);
  if (teacherActs.length) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([['#', lbl(t, 'نشاط_المعلم_في_القرية', 'نشاط المعلم في القرية')], ...teacherActs]),
      lbl(t, 'أنشطة_المعلم', 'أنشطة المعلم').slice(0, 31)
    );
  }
  const instActs = villageRows(normalized.institutionVillageActivities);
  if (instActs.length) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([['#', lbl(t, 'نشاط_المؤسسة_في_القرية', 'نشاط المؤسسة في القرية')], ...instActs]),
      lbl(t, 'أنشطة_المؤسسة', 'أنشطة المؤسسة').slice(0, 31)
    );
  }
  const sermons = villageRows(normalized.fridaySermons);
  if (sermons.length) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([['#', lbl(t, 'خطبة_الجمعة', 'خطبة الجمعة')], ...sermons]),
      lbl(t, 'خطب_الجمعة', 'خطب الجمعة').slice(0, 31)
    );
  }

  XLSX.writeFile(wb, filename);
}

export function exportComprehensiveExcel(data, filename = 'comprehensive-school-report.xlsx', t = translate) {
  const normalizedReports = (data.schoolReports || []).map(normalizeSchoolReportForDisplay);
  const wb = XLSX.utils.book_new();
  const supervisionFallback = lbl(t, 'تقرير_إشراف', 'تقرير إشراف');

  const summary = XLSX.utils.aoa_to_sheet([
    [lbl(t, 'تقرير_شامل', 'تقرير شامل عن المدرسة')],
    [lbl(t, 'المدرسة', 'المدرسة'), data.schoolName || ''],
    [lbl(t, 'القرية', 'القرية'), data.villageName || ''],
    [lbl(t, 'تاريخ_التصدير', 'تاريخ التصدير'), new Date().toISOString().split('T')[0]],
    [],
    [lbl(t, 'عدد_تقارير_الإشراف', 'عدد تقارير الإشراف'), normalizedReports.length],
    [lbl(t, 'عدد_الزيارات_الميدانية', 'عدد الزيارات الميدانية'), data.fieldVisits?.length || 0],
    [lbl(t, 'عدد_سجلات_التحضير', 'عدد سجلات التحضير'), data.dailyLogs?.length || 0],
    [lbl(t, 'المهتدون_الجدد', 'المهتدون الجدد (قرية)'), data.newConvertsCount ?? 0],
  ]);
  XLSX.utils.book_append_sheet(wb, summary, lbl(t, 'ملخص', 'ملخص').slice(0, 31));

  const addListSheet = (name, rows, headers) => {
    if (!rows?.length) return;
    const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, sheet, name.slice(0, 31));
  };

  addListSheet(
    lbl(t, 'تقارير_الإشراف', 'تقارير الإشراف'),
    normalizedReports.map((r) => [
      r.date || r.timestamp?.split('T')[0],
      r.reportTitle || supervisionFallback,
      schoolReportPeriodLabel(r.reportPeriod, t) || r.reportPeriod || '',
      r.supervisorName,
      r.presentCount,
      r.totalStudents,
      r.teacherEvaluation || '—',
      r.studentLevel || '—',
      r.absenceReview,
    ]),
    [
      lbl(t, 'التاريخ', 'التاريخ'),
      lbl(t, 'العنوان', 'العنوان'),
      lbl(t, 'النوع', 'النوع'),
      lbl(t, 'المشرف', 'المشرف'),
      lbl(t, 'الحضور', 'الحضور'),
      lbl(t, 'المسجلون', 'المسجلون'),
      lbl(t, 'تقييم_المعلم', 'تقييم المعلم'),
      lbl(t, 'تقييم_الطلاب', 'تقييم الطلاب'),
      lbl(t, 'مراجعة_الغياب', 'مراجعة الغياب'),
    ]
  );

  const allStarRows = [];
  normalizedReports.forEach((r) => {
    const date = r.date || r.timestamp?.split('T')[0] || '';
    (r.starAwards || [])
      .filter((s) => Number(s.stars) > 0)
      .forEach((s) => {
        allStarRows.push([date, r.reportTitle || supervisionFallback, s.name || '-', formatTeacherStars(s.stars)]);
      });
  });
  addListSheet(
    lbl(t, 'نجوم_الطلاب', 'نجوم الطلاب'),
    allStarRows,
    [
      lbl(t, 'تاريخ_التقرير', 'تاريخ التقرير'),
      lbl(t, 'عنوان_التقرير', 'عنوان التقرير'),
      lbl(t, 'الطالب', 'الطالب'),
      lbl(t, 'التقييم', 'التقييم'),
    ]
  );

  addListSheet(
    lbl(t, 'الزيارات', 'الزيارات'),
    (data.fieldVisits || []).map((r) => [
      r.timestamp?.split('T')[0],
      r.supervisorName,
      r.subjectName,
      r.week,
    ]),
    [lbl(t, 'التاريخ', 'التاريخ'), lbl(t, 'المشرف', 'المشرف'), lbl(t, 'المادة', 'المادة'), lbl(t, 'الأسبوع', 'الأسبوع')]
  );

  addListSheet(
    lbl(t, 'التحضير', 'التحضير'),
    (data.dailyLogs || []).map((r) => [
      r.date,
      r.subjectName,
      r.week,
      r.totalPresent,
      r.totalStudents,
      prepPeriodLabel(r.prepPeriod, t) || r.prepPeriod || lbl(t, 'يومي', 'يومي'),
    ]),
    [
      lbl(t, 'التاريخ', 'التاريخ'),
      lbl(t, 'المادة', 'المادة'),
      lbl(t, 'الأسبوع', 'الأسبوع'),
      lbl(t, 'الحاضرون', 'الحاضرون'),
      lbl(t, 'الإجمالي', 'الإجمالي'),
      lbl(t, 'الفترة', 'الفترة'),
    ]
  );

  XLSX.writeFile(wb, filename);
}

export async function exportComprehensivePdf(data, filename = 'comprehensive-school-report.pdf', t = translate) {
  const normalized = {
    ...data,
    schoolReports: (data.schoolReports || []).map(normalizeSchoolReportForDisplay),
  };
  await downloadHtmlBodyAsPdf(buildComprehensiveReportBodyHtml(normalized, t), filename);
}

export { buildSchoolReportBodyHtml, buildComprehensiveReportBodyHtml };
