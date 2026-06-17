import { safeHtml, REPORT_STYLES } from './schoolReportHtml';
import { formatVisitRatingLabel } from './visitRating';
import { prepPeriodLabel, formatDailyLogSubjects } from './reportLabels';
import { attendanceStatusLabel } from './attendanceStatus';
import { villageReportFromStored, villageReportHasContent } from './villageReportFields';

export { REPORT_STYLES };

const WEEKLY_ACTIVITY_LABELS = {
  fridaySermon: 'خطبة الجمعة',
  dawah: 'دعوة غير المسلمين',
  adultEducation: 'تعليم الكبار',
  mosqueLesson: 'دروس أسبوعية في المسجد',
  marriageContract: 'عقود الزواج',
  others: 'أعمال وأنشطة أخرى',
};

function metaItem(label, value) {
  return `<div class="item"><div class="label">${safeHtml(label)}</div><div class="value">${safeHtml(value || '—')}</div></div>`;
}

function metaGrid(items) {
  return `<div class="grid">${items.map(([l, v]) => metaItem(l, v)).join('')}</div>`;
}

function notesSection(title, text) {
  const body = String(text ?? '').trim() || '—';
  return `
  <div class="section">
    <h3>${safeHtml(title)}</h3>
    <div class="notes">${safeHtml(body)}</div>
  </div>`;
}

function stringListRows(items, emptyLabel = 'لا يوجد') {
  const list = (items || []).map((item) => String(item ?? '').trim()).filter(Boolean);
  if (!list.length) return `<tr><td colspan="2">${safeHtml(emptyLabel)}</td></tr>`;
  return list
    .map((item, idx) => `<tr><td>${idx + 1}</td><td>${safeHtml(item)}</td></tr>`)
    .join('');
}

function stringListSection(title, items, emptyLabel) {
  return `
  <div class="section">
    <h3>${safeHtml(title)}</h3>
    <table><thead><tr><th>#</th><th>البيان</th></tr></thead><tbody>${stringListRows(items, emptyLabel)}</tbody></table>
  </div>`;
}

function reportDateDisplay(report) {
  if (report.type === 'daily' && report.periodLabel) return report.periodLabel;
  return (
    report.timestamp?.split('T')[0] ||
    report.date ||
    (report.submissionDate && String(report.submissionDate).split('T')[0]) ||
    '—'
  );
}

function villageReportHtml(report) {
  if (!villageReportHasContent(report)) return '';
  const v = villageReportFromStored(report);
  const parts = ['<div class="section"><h3>تقرير القرية</h3>'];
  if (Number(v.newConvertsCount) > 0) {
    parts.push(metaGrid([['دخل الإسلام جديداً', String(v.newConvertsCount)]]));
  }
  if (v.hasInstitutionProjects) {
    parts.push(metaGrid([['مشاريع المؤسسة', v.hasInstitutionProjects]]));
    if (v.hasInstitutionProjects === 'نعم' && v.institutionProjectsStatus) {
      parts.push(notesSection('حالة المشاريع', v.institutionProjectsStatus));
    }
  }
  parts.push(stringListSection('أنشطة المعلم في القرية', v.teacherVillageActivities));
  parts.push(stringListSection('أنشطة المؤسسة في القرية', v.institutionVillageActivities));
  parts.push(stringListSection('خطب الجمعة في القرية', v.fridaySermons));
  const extraNotes = report.notes || v.villageNotes;
  if (extraNotes) parts.push(notesSection('ملاحظات إضافية', extraNotes));
  parts.push('</div>');
  return parts.join('');
}

function studentsTrackingRows(students) {
  if (!students?.length) return '<tr><td colspan="5">لا يوجد تتبع للطلاب</td></tr>';
  return students
    .map(
      (st, idx) =>
        `<tr>
          <td>${idx + 1}</td>
          <td>${safeHtml(st.name || '—')}</td>
          <td>${st.isPresent ? 'حاضر' : 'غائب'}</td>
          <td>${safeHtml(String(st.points ?? 0))}</td>
          <td>${safeHtml(st.note || '—')}</td>
        </tr>`
    )
    .join('');
}

export function buildVisitReportBodyHtml(report) {
  const date = reportDateDisplay(report);
  return `
  <div class="title">
    <h1>تقرير زيارة ميدانية</h1>
    <p>${safeHtml(report.schoolName || '')}${report.villageName ? ` — ${safeHtml(report.villageName)}` : ''}</p>
  </div>
  ${metaGrid([
    ['المشرف', report.supervisorName],
    ['المدرسة', report.schoolName],
    ['القرية', report.villageName],
    ['التاريخ', date],
    ['المادة', report.subjectName],
    ['الأسبوع / الدرس', report.week],
  ])}
  ${metaGrid([
    ['تقييم المعلم', formatVisitRatingLabel(report.teacherRating)],
    ['تقييم القرية / الموقع', formatVisitRatingLabel(report.villageRating)],
  ])}
  ${notesSection('ملاحظات وتوجيهات عن الزيارة المدرسية', report.generalNotes || 'لا توجد ملاحظات عامة مسجلة لهذه الزيارة.')}
  ${villageReportHtml(report)}
  <div class="section">
    <h3>تتبع أداء الطلاب أثناء الزيارة</h3>
    <table>
      <thead><tr><th>#</th><th>اسم الطالب</th><th>الحالة</th><th>النقاط</th><th>ملاحظة</th></tr></thead>
      <tbody>${studentsTrackingRows(report.studentsTracking)}</tbody>
    </table>
  </div>
  ${
    report.gpsLocation?.lat != null && report.gpsLocation?.lng != null
      ? notesSection(
          'الموقع الجغرافي',
          `${report.gpsLocation.lat}, ${report.gpsLocation.lng}`
        )
      : ''
  }`;
}

function dailyRecordsRows(records) {
  if (!records?.length) return '<tr><td colspan="5">لا توجد سجلات طلاب</td></tr>';
  return records
    .map(
      (r) =>
        `<tr>
          <td>${safeHtml(r.name || '—')}</td>
          <td>${safeHtml(attendanceStatusLabel(r))}</td>
          <td>${safeHtml(r.memorization || '—')}</td>
          <td>${safeHtml(r.review || '—')}</td>
          <td>${safeHtml(r.note || '—')}</td>
        </tr>`
    )
    .join('');
}

function curriculumProgressHtml(summary) {
  if (!summary?.length) return '';
  const rows = summary
    .map((p) => `<tr><th>${safeHtml(p.subjectName || '—')}</th><td>${safeHtml(p.label || '—')}</td></tr>`)
    .join('');
  return `
  <div class="section">
    <h3>متابعة المنهج</h3>
    <table><tbody>${rows}</tbody></table>
  </div>`;
}

export function buildDailyPrepReportBodyHtml(report) {
  const date = reportDateDisplay(report);
  const subjects = formatDailyLogSubjects(report);
  const periodLine =
    report.periodStart && report.periodEnd && report.periodStart !== report.periodEnd
      ? `${report.periodStart} — ${report.periodEnd}`
      : '';

  return `
  <div class="title">
    <h1>سجل التحضير (${safeHtml(prepPeriodLabel(report.prepPeriod))})</h1>
    <p>${safeHtml(report.schoolName || '')}</p>
  </div>
  ${metaGrid([
    ['المعلم', report.teacherName],
    ['المدرسة', report.schoolName],
    ['التاريخ', date],
    ['المواد', subjects],
    ['الفترة', periodLine],
    ['ملخص الحضور', report.attendanceSummary],
  ])}
  ${report.prepNotes ? notesSection('ملاحظات التحضير', report.prepNotes) : ''}
  ${curriculumProgressHtml(report.curriculumProgressSummary)}
  <div class="section">
    <h3>سجل الطلاب</h3>
    <table>
      <thead><tr><th>اسم الطالب</th><th>الحالة</th><th>الحفظ</th><th>المراجعة</th><th>ملاحظة</th></tr></thead>
      <tbody>${dailyRecordsRows(report.records)}</tbody>
    </table>
  </div>`;
}

function weeklyStatusLabel(val) {
  if (val === true || val === 'isActive') return 'نعم';
  return 'لا';
}

export function buildWeeklyReportBodyHtml(report) {
  const date = reportDateDisplay(report);
  const activities = report.reportData || {};
  const activityRows = Object.entries(activities)
    .map(([key, val]) => {
      const title = WEEKLY_ACTIVITY_LABELS[key] || key;
      return `<tr>
        <th>${safeHtml(title)}</th>
        <td>${safeHtml(weeklyStatusLabel(val?.isActive))}</td>
        <td>${safeHtml(val?.details || 'لا توجد ملاحظات إضافية')}</td>
      </tr>`;
    })
    .join('');

  return `
  <div class="title">
    <h1>تقرير أسبوعي</h1>
    <p>${safeHtml(report.schoolName || '')}</p>
  </div>
  ${metaGrid([
    ['المعلم', report.teacherName],
    ['المدرسة', report.schoolName],
    ['تاريخ الإرسال', date],
    ['الأسبوع', report.week],
  ])}
  <div class="section">
    <h3>أنشطة الأسبوع</h3>
    <table>
      <thead><tr><th>النشاط</th><th>مفعّل</th><th>التفاصيل</th></tr></thead>
      <tbody>${activityRows || '<tr><td colspan="3">لا توجد أنشطة مسجلة</td></tr>'}</tbody>
    </table>
  </div>`;
}

export function buildReportDetailsBodyHtml(report) {
  if (!report) return '';
  if (report.type === 'visit') return buildVisitReportBodyHtml(report);
  if (report.type === 'daily') return buildDailyPrepReportBodyHtml(report);
  if (report.type === 'weekly') return buildWeeklyReportBodyHtml(report);
  return '';
}

export function reportDetailsPreviewTitle(report) {
  if (!report) return 'معاينة التقرير';
  if (report.type === 'visit') return 'معاينة الزيارة الميدانية';
  if (report.type === 'daily') return `معاينة سجل التحضير (${prepPeriodLabel(report.prepPeriod)})`;
  if (report.type === 'weekly') return 'معاينة التقرير الأسبوعي';
  return 'معاينة التقرير';
}

export function reportDetailsPdfFilename(report) {
  const date =
    reportDateDisplay(report).replace(/[^\d-]/g, '') || new Date().toISOString().slice(0, 10);
  const id = String(report.id || 'report').slice(0, 8);
  if (report.type === 'visit') return `visit-report-${id}-${date}.pdf`;
  if (report.type === 'daily') return `daily-prep-${id}-${date}.pdf`;
  if (report.type === 'weekly') return `weekly-report-${id}-${date}.pdf`;
  return `report-${id}-${date}.pdf`;
}
