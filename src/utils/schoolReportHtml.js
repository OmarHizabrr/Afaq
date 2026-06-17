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

import { formatVisitRatingLabel } from './visitRating';
import { schoolReportPeriodLabel } from './reportLabels';

function formatStarsValue(stars) {
  const n = Number(stars);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return formatVisitRatingLabel(n);
}

function teachersRows(teachers) {
  if (!teachers?.length) return '<tr><td colspan="4">لا يوجد معلمون محددون</td></tr>';
  return teachers
    .map(
      (t, idx) =>
        `<tr><td>${idx + 1}</td><td>${safeHtml(t.teacherName || '-')}</td><td>${safeHtml(t.phone || '-')}</td><td>${safeHtml(formatStarsValue(t.stars))}</td></tr>`
    )
    .join('');
}

function absentRows(absentStudents) {
  if (!absentStudents?.length) return '<tr><td colspan="2">لا يوجد غياب محدد</td></tr>';
  return absentStudents
    .map((s, idx) => `<tr><td>${idx + 1}</td><td>${safeHtml(s.studentName || '-')}</td></tr>`)
    .join('');
}

function starsRows(starAwards) {
  if (!starAwards?.length) return '<tr><td colspan="3">لا توجد تقييمات نجوم للطلاب</td></tr>';
  return starAwards
    .map(
      (s, idx) =>
        `<tr><td>${idx + 1}</td><td>${safeHtml(s.name || '-')}</td><td>${safeHtml(formatStarsValue(s.stars))}</td></tr>`
    )
    .join('');
}

function curriculumRows(rep) {
  const lessons = rep.lessonCoverage || {};
  const curriculumItems = Array.isArray(rep.curriculumItems)
    ? rep.curriculumItems
    : Object.entries(lessons).map(([subjectName, content], idx) => ({
        subjectId: String(idx),
        subjectName,
        content,
      }));
  if (!curriculumItems.length) return '<tr><td colspan="2">لا توجد مواد مضافة</td></tr>';
  return curriculumItems
    .map(
      (it) =>
        `<tr><th>${safeHtml(it.subjectName || '-')}</th><td>${safeHtml(it.content || '-')}</td></tr>`
    )
    .join('');
}

function progressRows(summary) {
  if (!summary?.length) return '';
  return `
    <div class="section">
      <h3>متابعة المنهج</h3>
      <table>
        <thead><tr><th>المادة</th><th>المتوقع</th><th>المُبلّغ</th><th>الحالة</th></tr></thead>
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

export function buildSchoolReportBodyHtml(rep) {
  const periodLabel =
    rep.reportPeriod === 'monthly' ? 'شهري' : rep.reportPeriod === 'weekly' ? 'أسبوعي' : rep.reportPeriod === 'visit' ? 'زيارة ميدانية' : '';
  return `
  <div class="title">
    <h1>${safeHtml(rep.reportTitle || 'التقرير الشهري عن المدرسة')}</h1>
    <div>${safeHtml(rep.schoolName || '-')}${periodLabel ? ` — ${periodLabel}` : ''}</div>
  </div>
  <div class="grid">
    <div class="item"><div class="label">المدرسة</div><div class="value">${safeHtml(rep.schoolName || '-')}</div></div>
    <div class="item"><div class="label">القرية</div><div class="value">${safeHtml(rep.villageName || '-')}</div></div>
    <div class="item"><div class="label">نوع التقرير</div><div class="value">${safeHtml(periodLabel || '-')}</div></div>
    <div class="item"><div class="label">اليوم</div><div class="value">${safeHtml(rep.dayName || '-')}</div></div>
    <div class="item"><div class="label">التاريخ</div><div class="value">${safeHtml(rep.date || rep.timestamp?.split('T')[0] || '-')}</div></div>
    <div class="item"><div class="label">المحافظة</div><div class="value">${safeHtml(rep.governorate || '-')}</div></div>
    <div class="item"><div class="label">الدولة</div><div class="value">${safeHtml(rep.country || '-')}</div></div>
    <div class="item"><div class="label">وقت الحضور</div><div class="value">${safeHtml(rep.arrivalTime || '-')}</div></div>
    <div class="item"><div class="label">وقت المغادرة</div><div class="value">${safeHtml(rep.departureTime || '-')}</div></div>
    <div class="item"><div class="label">عدد الطلاب المسجلين</div><div class="value">${safeHtml(rep.totalStudents ?? '-')}</div></div>
    <div class="item"><div class="label">عدد الحضور</div><div class="value">${safeHtml(rep.presentCount ?? '-')}</div></div>
    <div class="item"><div class="label">مراجعة الغياب</div><div class="value">${safeHtml(rep.absenceReview || '-')}</div></div>
    <div class="item"><div class="label">المشرف</div><div class="value">${safeHtml(rep.supervisorName || '-')}</div></div>
    <div class="item"><div class="label">مسؤول المشاريع</div><div class="value">${safeHtml(rep.projectsOfficerName || '-')}</div></div>
    <div class="item"><div class="label">تعمل السوق</div><div class="value">${safeHtml(rep.marketDone || '-')}</div></div>
    <div class="item"><div class="label">عدد الوجبات</div><div class="value">${safeHtml(rep.mealsCount ?? '-')}</div></div>
    <div class="item"><div class="label">متوسط تقييم الطلاب</div><div class="value">${safeHtml(rep.studentLevel || '-')}</div></div>
    <div class="item"><div class="label">نسبة السير على المنهج</div><div class="value">${safeHtml(rep.curriculumProgress || '-')}</div></div>
    <div class="item"><div class="label">تقييم المدرسة</div><div class="value">${safeHtml(rep.schoolEvaluation || '-')}</div></div>
    <div class="item"><div class="label">تقييم المعلم (نجوم)</div><div class="value">${safeHtml(rep.teacherEvaluation || '-')}</div></div>
  </div>
  <div class="section">
    <h3>المعلمون وتقييمهم</h3>
    <table><thead><tr><th>#</th><th>اسم المعلم</th><th>رقم الهاتف</th><th>التقييم</th></tr></thead><tbody>${teachersRows(rep.teachers)}</tbody></table>
  </div>
  <div class="section">
    <h3>المقررات والمتابعة العلمية</h3>
    <table><tbody>${curriculumRows(rep)}</tbody></table>
  </div>
  ${progressRows(rep.curriculumProgressSummary)}
  <div class="section">
    <h3>الطلاب الغائبون</h3>
    <table><thead><tr><th>#</th><th>اسم الطالب</th></tr></thead><tbody>${absentRows(rep.absentStudents)}</tbody></table>
  </div>
  <div class="section">
    <h3>تقييم الطلاب بالنجوم</h3>
    <table><thead><tr><th>#</th><th>الطالب</th><th>التقييم</th></tr></thead><tbody>${starsRows(rep.starAwards)}</tbody></table>
  </div>
  <div class="section">
    <h3>ملاحظات</h3>
    <div class="notes">${safeHtml(rep.notes || '-')}</div>
  </div>`;
}

export function buildSchoolReportPrintDocument(rep, { autoPrint = true } = {}) {
  const printScript = autoPrint
    ? `<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),200);}</script>`
    : '';
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${safeHtml(rep.reportTitle || 'تقرير إشراف مدرسة')}</title>
  <style>${REPORT_STYLES} @media print { body { margin: 10mm; } }</style>
</head>
<body>
  ${buildSchoolReportBodyHtml(rep)}
  ${printScript}
</body>
</html>`;
}

export function buildComprehensiveReportBodyHtml(data) {
  const schoolReportRows = (data.schoolReports || [])
    .slice(0, 40)
    .map(
      (r) =>
        `<tr><td>${safeHtml(r.date || r.timestamp?.split('T')[0] || '-')}</td><td>${safeHtml(r.reportTitle || 'تقرير إشراف')}</td><td>${safeHtml(schoolReportPeriodLabel(r.reportPeriod) || '-')}</td><td>${safeHtml(r.supervisorName || '-')}</td><td>${safeHtml(r.presentCount)}/${safeHtml(r.totalStudents)}</td><td>${safeHtml(r.teacherEvaluation || '-')}</td><td>${safeHtml(r.studentLevel || '-')}</td></tr>`
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
      return `<tr><td>${safeHtml(l.date)}</td><td>${safeHtml(subjects)}</td><td>${safeHtml(l.prepPeriod === 'weekly' ? 'أسبوعي' : l.prepPeriod === 'monthly' ? 'شهري' : 'يومي')}</td><td>${safeHtml(l.totalPresent)}/${safeHtml(l.totalStudents)}</td></tr>`;
    })
    .join('');

  return `
  <div class="title">
    <h1>تقرير شامل عن المدرسة</h1>
    <div>${safeHtml(data.schoolName || '-')}</div>
    <div style="font-size:13px;color:#6b7280;margin-top:4px">${safeHtml(data.villageName || '')}</div>
  </div>
  <div class="grid">
    <div class="item"><div class="label">تقارير الإشراف</div><div class="value">${safeHtml(data.schoolReports?.length ?? 0)}</div></div>
    <div class="item"><div class="label">الزيارات الميدانية</div><div class="value">${safeHtml(data.fieldVisits?.length ?? 0)}</div></div>
    <div class="item"><div class="label">سجلات التحضير</div><div class="value">${safeHtml(data.dailyLogs?.length ?? 0)}</div></div>
    <div class="item"><div class="label">المهتدون الجدد</div><div class="value">${safeHtml(data.newConvertsCount ?? 0)}</div></div>
  </div>
  ${
    schoolReportRows
      ? `<div class="section"><h3>تقارير إشراف المدرسة</h3><table><thead><tr><th>التاريخ</th><th>العنوان</th><th>النوع</th><th>المشرف</th><th>الحضور</th><th>تقييم المعلم</th><th>تقييم الطلاب</th></tr></thead><tbody>${schoolReportRows}</tbody></table></div>`
      : ''
  }
  ${
    visitRows
      ? `<div class="section"><h3>الزيارات الميدانية</h3><table><thead><tr><th>التاريخ</th><th>المشرف</th><th>المادة</th><th>الأسبوع</th></tr></thead><tbody>${visitRows}</tbody></table></div>`
      : ''
  }
  ${
    prepRows
      ? `<div class="section"><h3>سجلات التحضير</h3><table><thead><tr><th>التاريخ</th><th>المادة</th><th>الفترة</th><th>الحضور</th></tr></thead><tbody>${prepRows}</tbody></table></div>`
      : ''
  }`;
}
