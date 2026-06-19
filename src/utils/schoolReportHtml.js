import translate from '../i18n/translate';
import { formatVisitRatingLabel } from './visitRating';
import { prepPeriodLabel, schoolReportPeriodLabel } from './reportLabels';

const REPORT_STYLES = `
  body { font-family: 'Noto Sans Arabic', Tahoma, Arial, sans-serif; margin: 24px; color: #111827; direction: rtl; }
  h1, h2, h3 { margin: 0 0 10px; }
  .title { text-align: center; margin-bottom: 18px; }
  .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 14px; margin-bottom: 16px; }
  .item { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 10px; }
  .label { font-size: 12px; color: #6b7280; margin-bottom: 3px; }
  .value { font-size: 14px; font-weight: 600; }
  .section { margin-top: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 13px; text-align: right; vertical-align: top; }
  th { background: #f3f4f6; }
  .notes { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; min-height: 64px; white-space: pre-wrap; }
`;

export const safeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export { REPORT_STYLES };

const lbl = (t, key, fallback) => t(`utils.schoolReportHtml.${key}`, fallback);

function isYesValue(val, t) {
  return val === 'نعم' || val === lbl(t, 'نعم', 'نعم');
}

function formatStarsValue(stars) {
  const n = Number(stars);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return formatVisitRatingLabel(n);
}

function teachersRows(teachers, t) {
  if (!teachers?.length) {
    return `<tr><td colspan="4">${safeHtml(lbl(t, 'لا_يوجد_معلمون', 'لا يوجد معلمون محددون'))}</td></tr>`;
  }
  return teachers
    .map(
      (teacher, idx) =>
        `<tr><td>${idx + 1}</td><td>${safeHtml(teacher.teacherName || '-')}</td><td>${safeHtml(teacher.phone || '-')}</td><td>${safeHtml(formatStarsValue(teacher.stars))}</td></tr>`
    )
    .join('');
}

function absentRows(absentStudents, t) {
  if (!absentStudents?.length) {
    return `<tr><td colspan="2">${safeHtml(lbl(t, 'لا_يوجد_غياب', 'لا يوجد غياب محدد'))}</td></tr>`;
  }
  return absentStudents
    .map((s, idx) => `<tr><td>${idx + 1}</td><td>${safeHtml(s.studentName || '-')}</td></tr>`)
    .join('');
}

function starsRows(starAwards, t) {
  if (!starAwards?.length) {
    return `<tr><td colspan="3">${safeHtml(lbl(t, 'لا_تقييمات_نجوم', 'لا توجد تقييمات نجوم للطلاب'))}</td></tr>`;
  }
  return starAwards
    .map(
      (s, idx) =>
        `<tr><td>${idx + 1}</td><td>${safeHtml(s.name || '-')}</td><td>${safeHtml(formatStarsValue(s.stars))}</td></tr>`
    )
    .join('');
}

function stringListRows(items, emptyLabel) {
  const list = (items || []).map((item) => String(item ?? '').trim()).filter(Boolean);
  if (!list.length) return `<tr><td colspan="2">${safeHtml(emptyLabel)}</td></tr>`;
  return list
    .map((item, idx) => `<tr><td>${idx + 1}</td><td>${safeHtml(item)}</td></tr>`)
    .join('');
}

function stringListSection(title, items, emptyLabel, t) {
  const resolvedEmpty = emptyLabel ?? lbl(t, 'لا_يوجد', 'لا يوجد');
  return `
  <div class="section">
    <h3>${safeHtml(title)}</h3>
    <table><thead><tr><th>#</th><th>${safeHtml(lbl(t, 'البيان', 'البيان'))}</th></tr></thead><tbody>${stringListRows(items, resolvedEmpty)}</tbody></table>
  </div>`;
}

function curriculumRows(rep, t) {
  const lessons = rep.lessonCoverage || {};
  const curriculumItems = Array.isArray(rep.curriculumItems)
    ? rep.curriculumItems
    : Object.entries(lessons).map(([subjectName, content], idx) => ({
        subjectId: String(idx),
        subjectName,
        content,
      }));
  if (!curriculumItems.length) {
    return `<tr><td colspan="2">${safeHtml(lbl(t, 'لا_مواد', 'لا توجد مواد مضافة'))}</td></tr>`;
  }
  return curriculumItems
    .map(
      (it) =>
        `<tr><th>${safeHtml(it.subjectName || '-')}</th><td>${safeHtml(it.content || '-')}</td></tr>`
    )
    .join('');
}

function progressRows(summary, t) {
  if (!summary?.length) return '';
  return `
    <div class="section">
      <h3>${safeHtml(lbl(t, 'متابعة_المنهج', 'متابعة المنهج'))}</h3>
      <table>
        <thead><tr><th>${safeHtml(lbl(t, 'المادة', 'المادة'))}</th><th>${safeHtml(lbl(t, 'المتوقع', 'المتوقع'))}</th><th>${safeHtml(lbl(t, 'المُبلّغ', 'المُبلّغ'))}</th><th>${safeHtml(lbl(t, 'الحالة', 'الحالة'))}</th></tr></thead>
        <tbody>
          ${summary
            .map(
              (p) =>
                `<tr><td>${safeHtml(p.subjectName)}</td><td>${safeHtml(p.expectedWeek)}</td><td>${safeHtml(p.reportedWeek || '-')}</td><td>${safeHtml(p.label)}</td></tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>`;
}

function metaItem(label, value) {
  return `<div class="item"><div class="label">${safeHtml(label)}</div><div class="value">${safeHtml(value ?? '-')}</div></div>`;
}

export function buildSchoolReportBodyHtml(rep, t = translate) {
  const periodLabel = schoolReportPeriodLabel(rep.reportPeriod, t);
  const defaultTitle = lbl(t, 'التقرير_الشهري', 'التقرير الشهري عن المدرسة');
  return `
  <div class="title">
    <h1>${safeHtml(rep.reportTitle || defaultTitle)}</h1>
    <div>${safeHtml(rep.schoolName || '-')}${periodLabel ? ` — ${periodLabel}` : ''}</div>
  </div>
  <div class="grid">
    ${metaItem(lbl(t, 'المدرسة', 'المدرسة'), rep.schoolName)}
    ${metaItem(lbl(t, 'القرية', 'القرية'), rep.villageName)}
    ${metaItem(lbl(t, 'نوع_التقرير', 'نوع التقرير'), periodLabel || '-')}
    ${metaItem(lbl(t, 'اليوم', 'اليوم'), rep.dayName)}
    ${metaItem(lbl(t, 'التاريخ', 'التاريخ'), rep.date || rep.timestamp?.split('T')[0])}
    ${metaItem(lbl(t, 'المحافظة', 'المحافظة'), rep.governorate)}
    ${metaItem(lbl(t, 'الدولة', 'الدولة'), rep.country)}
    ${metaItem(lbl(t, 'وقت_الحضور', 'وقت الحضور'), rep.arrivalTime)}
    ${metaItem(lbl(t, 'وقت_المغادرة', 'وقت المغادرة'), rep.departureTime)}
    ${metaItem(lbl(t, 'عدد_الطلاب_المسجلين', 'عدد الطلاب المسجلين'), rep.totalStudents)}
    ${metaItem(lbl(t, 'عدد_الحضور', 'عدد الحضور'), rep.presentCount)}
    ${metaItem(lbl(t, 'مراجعة_الغياب', 'مراجعة الغياب'), rep.absenceReview)}
    ${metaItem(lbl(t, 'المشرف', 'المشرف'), rep.supervisorName)}
    ${metaItem(lbl(t, 'مسؤول_المشاريع', 'مسؤول المشاريع'), rep.projectsOfficerName)}
    ${metaItem(lbl(t, 'تعمل_السوق', 'تعمل السوق'), rep.marketDone)}
    ${metaItem(lbl(t, 'عدد_الوجبات', 'عدد الوجبات'), rep.mealsCount)}
    ${metaItem(lbl(t, 'متوسط_تقييم_الطلاب', 'متوسط تقييم الطلاب'), rep.studentLevel)}
    ${metaItem(lbl(t, 'نسبة_السير_على_المنهج', 'نسبة السير على المنهج'), rep.curriculumProgress)}
    ${metaItem(lbl(t, 'تقييم_المدرسة', 'تقييم المدرسة'), rep.schoolEvaluation)}
    ${metaItem(lbl(t, 'تقييم_المعلم_نجوم', 'تقييم المعلم (نجوم)'), rep.teacherEvaluation)}
  </div>
  <div class="section">
    <h3>${safeHtml(lbl(t, 'المعلمون_وتقييمهم', 'المعلمون وتقييمهم'))}</h3>
    <table><thead><tr><th>#</th><th>${safeHtml(lbl(t, 'اسم_المعلم', 'اسم المعلم'))}</th><th>${safeHtml(lbl(t, 'رقم_الهاتف', 'رقم الهاتف'))}</th><th>${safeHtml(lbl(t, 'التقييم', 'التقييم'))}</th></tr></thead><tbody>${teachersRows(rep.teachers, t)}</tbody></table>
  </div>
  <div class="section">
    <h3>${safeHtml(lbl(t, 'تقييم_الطلاب_بالنجوم', 'تقييم الطلاب بالنجوم'))}</h3>
    <table><thead><tr><th>#</th><th>${safeHtml(lbl(t, 'الطالب', 'الطالب'))}</th><th>${safeHtml(lbl(t, 'التقييم', 'التقييم'))}</th></tr></thead><tbody>${starsRows(rep.starAwards, t)}</tbody></table>
  </div>
  ${stringListSection(lbl(t, 'الطلاب_المتفوقون', 'الطلاب المتفوقون'), rep.outstandingStudents, lbl(t, 'لا_طلاب_متفوقون', 'لا يوجد طلاب متفوقون'), t)}
  <div class="section">
    <h3>${safeHtml(lbl(t, 'القرية_والنشاطات', 'القرية والنشاطات'))}</h3>
    <div class="grid">
      ${metaItem(lbl(t, 'عدد_من_دخل_الإسلام', 'عدد من دخل الإسلام جديداً'), rep.newConvertsCount ?? 0)}
      ${metaItem(lbl(t, 'مشاريع_المؤسسة_بالقرية', 'مشاريع المؤسسة بالقرية'), rep.hasInstitutionProjects)}
      ${
        isYesValue(rep.hasInstitutionProjects, t)
          ? metaItem(lbl(t, 'حالة_المشاريع', 'حالة المشاريع'), rep.institutionProjectsStatus)
          : ''
      }
    </div>
  </div>
  ${stringListSection(lbl(t, 'أنشطة_المعلم_في_القرية', 'أنشطة المعلم في القرية'), rep.teacherVillageActivities, null, t)}
  ${stringListSection(lbl(t, 'أنشطة_المؤسسة_في_القرية', 'أنشطة المؤسسة في القرية'), rep.institutionVillageActivities, null, t)}
  ${stringListSection(lbl(t, 'خطب_الجمعة_في_القرية', 'خطب الجمعة في القرية'), rep.fridaySermons, null, t)}
  <div class="section">
    <h3>${safeHtml(lbl(t, 'ملاحظات_إضافية', 'ملاحظات إضافية'))}</h3>
    <div class="notes">${safeHtml(rep.notes || rep.villageNotes || '-')}</div>
  </div>
  <div class="section">
    <h3>${safeHtml(lbl(t, 'الطلاب_الغائبون', 'الطلاب الغائبون'))}</h3>
    <table><thead><tr><th>#</th><th>${safeHtml(lbl(t, 'اسم_الطالب', 'اسم الطالب'))}</th></tr></thead><tbody>${absentRows(rep.absentStudents, t)}</tbody></table>
  </div>
  <div class="section">
    <h3>${safeHtml(lbl(t, 'المقررات_والمتابعة', 'المقررات والمتابعة العلمية'))}</h3>
    <table><tbody>${curriculumRows(rep, t)}</tbody></table>
  </div>
  ${progressRows(rep.curriculumProgressSummary, t)}`;
}

export function buildSchoolReportPrintDocument(rep, { autoPrint = true, t = translate } = {}) {
  const printScript = autoPrint
    ? `<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),200);}</script>`
    : '';
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${safeHtml(rep.reportTitle || lbl(t, 'تقرير_إشراف_مدرسة', 'تقرير إشراف مدرسة'))}</title>
  <style>${REPORT_STYLES} @media print { body { margin: 10mm; } }</style>
</head>
<body>
  ${buildSchoolReportBodyHtml(rep, t)}
  ${printScript}
</body>
</html>`;
}

export function buildComprehensiveReportBodyHtml(data, t = translate) {
  const supervisionFallback = lbl(t, 'تقرير_إشراف', 'تقرير إشراف');
  const schoolReportRows = (data.schoolReports || [])
    .slice(0, 40)
    .map(
      (r) =>
        `<tr><td>${safeHtml(r.date || r.timestamp?.split('T')[0] || '-')}</td><td>${safeHtml(r.reportTitle || supervisionFallback)}</td><td>${safeHtml(schoolReportPeriodLabel(r.reportPeriod, t) || '-')}</td><td>${safeHtml(r.supervisorName || '-')}</td><td>${safeHtml(r.presentCount)}/${safeHtml(r.totalStudents)}</td><td>${safeHtml(r.teacherEvaluation || '-')}</td><td>${safeHtml(r.studentLevel || '-')}</td></tr>`
    )
    .join('');

  const visitRows = (data.fieldVisits || [])
    .slice(0, 40)
    .map(
      (v) =>
        `<tr><td>${safeHtml(v.timestamp?.split('T')[0] || '-')}</td><td>${safeHtml(v.supervisorName || '-')}</td><td>${safeHtml(v.subjectName || '-')}</td><td>${safeHtml(v.week || '-')}</td></tr>`
    )
    .join('');

  const prepRows = (data.dailyLogs || [])
    .slice(0, 40)
    .map((l) => {
      const subjects =
        Array.isArray(l.curriculumEntries) && l.curriculumEntries.length > 0
          ? l.curriculumEntries.map((e) => e.subjectName).join('، ')
          : l.subjectName || '-';
      return `<tr><td>${safeHtml(l.date)}</td><td>${safeHtml(subjects)}</td><td>${safeHtml(prepPeriodLabel(l.prepPeriod, t) || '-')}</td><td>${safeHtml(l.totalPresent)}/${safeHtml(l.totalStudents)}</td></tr>`;
    })
    .join('');

  return `
  <div class="title">
    <h1>${safeHtml(lbl(t, 'تقرير_شامل', 'تقرير شامل عن المدرسة'))}</h1>
    <div>${safeHtml(data.schoolName || '-')}</div>
    <div style="font-size:13px;color:#6b7280;margin-top:4px">${safeHtml(data.villageName || '')}</div>
  </div>
  <div class="grid">
    ${metaItem(lbl(t, 'تقارير_الإشراف', 'تقارير الإشراف'), data.schoolReports?.length ?? 0)}
    ${metaItem(lbl(t, 'الزيارات_الميدانية', 'الزيارات الميدانية'), data.fieldVisits?.length ?? 0)}
    ${metaItem(lbl(t, 'سجلات_التحضير', 'سجلات التحضير'), data.dailyLogs?.length ?? 0)}
    ${metaItem(lbl(t, 'المهتدون_الجدد', 'المهتدون الجدد'), data.newConvertsCount ?? 0)}
  </div>
  ${
    schoolReportRows
      ? `<div class="section"><h3>${safeHtml(lbl(t, 'تقارير_إشراف_المدرسة', 'تقارير إشراف المدرسة'))}</h3><table><thead><tr><th>${safeHtml(lbl(t, 'التاريخ', 'التاريخ'))}</th><th>${safeHtml(lbl(t, 'العنوان', 'العنوان'))}</th><th>${safeHtml(lbl(t, 'النوع', 'النوع'))}</th><th>${safeHtml(lbl(t, 'المشرف', 'المشرف'))}</th><th>${safeHtml(lbl(t, 'الحضور', 'الحضور'))}</th><th>${safeHtml(lbl(t, 'تقييم_المعلم', 'تقييم المعلم'))}</th><th>${safeHtml(lbl(t, 'تقييم_الطلاب', 'تقييم الطلاب'))}</th></tr></thead><tbody>${schoolReportRows}</tbody></table></div>`
      : ''
  }
  ${
    visitRows
      ? `<div class="section"><h3>${safeHtml(lbl(t, 'الزيارات_الميدانية', 'الزيارات الميدانية'))}</h3><table><thead><tr><th>${safeHtml(lbl(t, 'التاريخ', 'التاريخ'))}</th><th>${safeHtml(lbl(t, 'المشرف', 'المشرف'))}</th><th>${safeHtml(lbl(t, 'المادة', 'المادة'))}</th><th>${safeHtml(lbl(t, 'الأسبوع', 'الأسبوع'))}</th></tr></thead><tbody>${visitRows}</tbody></table></div>`
      : ''
  }
  ${
    prepRows
      ? `<div class="section"><h3>${safeHtml(lbl(t, 'سجلات_التحضير', 'سجلات التحضير'))}</h3><table><thead><tr><th>${safeHtml(lbl(t, 'التاريخ', 'التاريخ'))}</th><th>${safeHtml(lbl(t, 'المادة', 'المادة'))}</th><th>${safeHtml(lbl(t, 'الفترة', 'الفترة'))}</th><th>${safeHtml(lbl(t, 'الحضور', 'الحضور'))}</th></tr></thead><tbody>${prepRows}</tbody></table></div>`
      : ''
  }`;
}
