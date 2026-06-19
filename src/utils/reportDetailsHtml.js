import translate from '../i18n/translate';
import { safeHtml, REPORT_STYLES } from './schoolReportHtml';
import { formatVisitRatingLabel } from './visitRating';
import { prepPeriodLabel, formatDailyLogSubjects } from './reportLabels';
import { attendanceStatusLabel } from './attendanceStatus';
import { villageReportFromStored, villageReportHasContent } from './villageReportFields';

export { REPORT_STYLES };

const lbl = (t, key, fallback) => t(`utils.reportDetailsHtml.${key}`, fallback);

function weeklyActivityLabels(t) {
  return {
    fridaySermon: lbl(t, 'خطبة_الجمعة', 'خطبة الجمعة'),
    dawah: lbl(t, 'دعوة_غير_المسلمين', 'دعوة غير المسلمين'),
    adultEducation: lbl(t, 'تعليم_الكبار', 'تعليم الكبار'),
    mosqueLesson: lbl(t, 'دروس_أسبوعية_في_المسجد', 'دروس أسبوعية في المسجد'),
    marriageContract: lbl(t, 'عقود_الزواج', 'عقود الزواج'),
    others: lbl(t, 'أعمال_وأنشطة_أخرى', 'أعمال وأنشطة أخرى'),
  };
}

function isYesValue(val, t) {
  return val === 'نعم' || val === lbl(t, 'نعم', 'نعم');
}

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

function stringListRows(items, emptyLabel) {
  const list = (items || []).map((item) => String(item ?? '').trim()).filter(Boolean);
  if (!list.length) return `<tr><td colspan="2">${safeHtml(emptyLabel)}</td></tr>`;
  return list
    .map((item, idx) => `<tr><td>${idx + 1}</td><td>${safeHtml(item)}</td></tr>`)
    .join('');
}

function stringListSection(title, items, emptyLabel, t) {
  return `
  <div class="section">
    <h3>${safeHtml(title)}</h3>
    <table><thead><tr><th>#</th><th>${safeHtml(lbl(t, 'البيان', 'البيان'))}</th></tr></thead><tbody>${stringListRows(items, emptyLabel ?? lbl(t, 'لا_يوجد', 'لا يوجد'))}</tbody></table>
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

function villageReportHtml(report, t) {
  if (!villageReportHasContent(report)) return '';
  const v = villageReportFromStored(report);
  const parts = [`<div class="section"><h3>${safeHtml(lbl(t, 'تقرير_القرية', 'تقرير القرية'))}</h3>`];
  if (Number(v.newConvertsCount) > 0) {
    parts.push(metaGrid([[lbl(t, 'دخل_الإسلام_جديداً', 'دخل الإسلام جديداً'), String(v.newConvertsCount)]]));
  }
  if (v.hasInstitutionProjects) {
    parts.push(metaGrid([[lbl(t, 'مشاريع_المؤسسة', 'مشاريع المؤسسة'), v.hasInstitutionProjects]]));
    if (isYesValue(v.hasInstitutionProjects, t) && v.institutionProjectsStatus) {
      parts.push(notesSection(lbl(t, 'حالة_المشاريع', 'حالة المشاريع'), v.institutionProjectsStatus));
    }
  }
  parts.push(stringListSection(lbl(t, 'أنشطة_المعلم_في_القرية', 'أنشطة المعلم في القرية'), v.teacherVillageActivities, null, t));
  parts.push(stringListSection(lbl(t, 'أنشطة_المؤسسة_في_القرية', 'أنشطة المؤسسة في القرية'), v.institutionVillageActivities, null, t));
  parts.push(stringListSection(lbl(t, 'خطب_الجمعة_في_القرية', 'خطب الجمعة في القرية'), v.fridaySermons, null, t));
  const extraNotes = report.notes || v.villageNotes;
  if (extraNotes) parts.push(notesSection(lbl(t, 'ملاحظات_إضافية', 'ملاحظات إضافية'), extraNotes));
  parts.push('</div>');
  return parts.join('');
}

function studentsTrackingRows(students, t) {
  if (!students?.length) {
    return `<tr><td colspan="5">${safeHtml(lbl(t, 'لا_تتبع_للطلاب', 'لا يوجد تتبع للطلاب'))}</td></tr>`;
  }
  const presentLabel = lbl(t, 'حاضر', 'حاضر');
  const absentLabel = lbl(t, 'غائب', 'غائب');
  return students
    .map(
      (st, idx) =>
        `<tr>
          <td>${idx + 1}</td>
          <td>${safeHtml(st.name || '—')}</td>
          <td>${st.isPresent ? presentLabel : absentLabel}</td>
          <td>${safeHtml(String(st.points ?? 0))}</td>
          <td>${safeHtml(st.note || '—')}</td>
        </tr>`
    )
    .join('');
}

export function buildVisitReportBodyHtml(report, t = translate) {
  const date = reportDateDisplay(report);
  return `
  <div class="title">
    <h1>${safeHtml(lbl(t, 'تقرير_زيارة_ميدانية', 'تقرير زيارة ميدانية'))}</h1>
    <p>${safeHtml(report.schoolName || '')}${report.villageName ? ` — ${safeHtml(report.villageName)}` : ''}</p>
  </div>
  ${metaGrid([
    [lbl(t, 'المشرف', 'المشرف'), report.supervisorName],
    [lbl(t, 'المدرسة', 'المدرسة'), report.schoolName],
    [lbl(t, 'القرية', 'القرية'), report.villageName],
    [lbl(t, 'التاريخ', 'التاريخ'), date],
    [lbl(t, 'المادة', 'المادة'), report.subjectName],
    [lbl(t, 'الأسبوع_الدرس', 'الأسبوع / الدرس'), report.week],
  ])}
  ${metaGrid([
    [lbl(t, 'تقييم_المعلم', 'تقييم المعلم'), formatVisitRatingLabel(report.teacherRating)],
    [lbl(t, 'تقييم_القرية_الموقع', 'تقييم القرية / الموقع'), formatVisitRatingLabel(report.villageRating)],
  ])}
  ${notesSection(
    lbl(t, 'ملاحظات_عن_الزيارة', 'ملاحظات وتوجيهات عن الزيارة المدرسية'),
    report.generalNotes || lbl(t, 'لا_ملاحظات_عامة', 'لا توجد ملاحظات عامة مسجلة لهذه الزيارة.')
  )}
  ${villageReportHtml(report, t)}
  <div class="section">
    <h3>${safeHtml(lbl(t, 'تتبع_أداء_الطلاب', 'تتبع أداء الطلاب أثناء الزيارة'))}</h3>
    <table>
      <thead><tr><th>#</th><th>${safeHtml(lbl(t, 'اسم_الطالب', 'اسم الطالب'))}</th><th>${safeHtml(lbl(t, 'الحالة', 'الحالة'))}</th><th>${safeHtml(lbl(t, 'النقاط', 'النقاط'))}</th><th>${safeHtml(lbl(t, 'ملاحظة', 'ملاحظة'))}</th></tr></thead>
      <tbody>${studentsTrackingRows(report.studentsTracking, t)}</tbody>
    </table>
  </div>
  ${
    report.gpsLocation?.lat != null && report.gpsLocation?.lng != null
      ? notesSection(lbl(t, 'الموقع_الجغرافي', 'الموقع الجغرافي'), `${report.gpsLocation.lat}, ${report.gpsLocation.lng}`)
      : ''
  }`;
}

function dailyRecordsRows(records, t) {
  if (!records?.length) {
    return `<tr><td colspan="5">${safeHtml(lbl(t, 'لا_سجلات_طلاب', 'لا توجد سجلات طلاب'))}</td></tr>`;
  }
  return records
    .map(
      (r) =>
        `<tr>
          <td>${safeHtml(r.name || '—')}</td>
          <td>${safeHtml(attendanceStatusLabel(r, t))}</td>
          <td>${safeHtml(r.memorization || '—')}</td>
          <td>${safeHtml(r.review || '—')}</td>
          <td>${safeHtml(r.note || '—')}</td>
        </tr>`
    )
    .join('');
}

function curriculumProgressHtml(summary, t) {
  if (!summary?.length) return '';
  const rows = summary
    .map((p) => `<tr><th>${safeHtml(p.subjectName || '—')}</th><td>${safeHtml(p.label || '—')}</td></tr>`)
    .join('');
  return `
  <div class="section">
    <h3>${safeHtml(lbl(t, 'متابعة_المنهج', 'متابعة المنهج'))}</h3>
    <table><tbody>${rows}</tbody></table>
  </div>`;
}

export function buildDailyPrepReportBodyHtml(report, t = translate) {
  const date = reportDateDisplay(report);
  const subjects = formatDailyLogSubjects(report, t);
  const periodLine =
    report.periodStart && report.periodEnd && report.periodStart !== report.periodEnd
      ? `${report.periodStart} — ${report.periodEnd}`
      : '';

  return `
  <div class="title">
    <h1>${safeHtml(lbl(t, 'سجل_التحضير', `سجل التحضير (${prepPeriodLabel(report.prepPeriod, t)})`))}</h1>
    <p>${safeHtml(report.schoolName || '')}</p>
  </div>
  ${metaGrid([
    [lbl(t, 'المعلم', 'المعلم'), report.teacherName],
    [lbl(t, 'المدرسة', 'المدرسة'), report.schoolName],
    [lbl(t, 'التاريخ', 'التاريخ'), date],
    [lbl(t, 'المواد', 'المواد'), subjects],
    [lbl(t, 'الفترة', 'الفترة'), periodLine],
    [lbl(t, 'ملخص_الحضور', 'ملخص الحضور'), report.attendanceSummary],
  ])}
  ${report.prepNotes ? notesSection(lbl(t, 'ملاحظات_التحضير', 'ملاحظات التحضير'), report.prepNotes) : ''}
  ${curriculumProgressHtml(report.curriculumProgressSummary, t)}
  <div class="section">
    <h3>${safeHtml(lbl(t, 'سجل_الطلاب', 'سجل الطلاب'))}</h3>
    <table>
      <thead><tr><th>${safeHtml(lbl(t, 'اسم_الطالب', 'اسم الطالب'))}</th><th>${safeHtml(lbl(t, 'الحالة', 'الحالة'))}</th><th>${safeHtml(lbl(t, 'الحفظ', 'الحفظ'))}</th><th>${safeHtml(lbl(t, 'المراجعة', 'المراجعة'))}</th><th>${safeHtml(lbl(t, 'ملاحظة', 'ملاحظة'))}</th></tr></thead>
      <tbody>${dailyRecordsRows(report.records, t)}</tbody>
    </table>
  </div>`;
}

function weeklyStatusLabel(val, t) {
  if (val === true || val === 'isActive') return lbl(t, 'نعم', 'نعم');
  return lbl(t, 'لا', 'لا');
}

export function buildWeeklyReportBodyHtml(report, t = translate) {
  const date = reportDateDisplay(report);
  const activities = report.reportData || {};
  const labels = weeklyActivityLabels(t);
  const activityRows = Object.entries(activities)
    .map(([key, val]) => {
      const title = labels[key] || key;
      return `<tr>
        <th>${safeHtml(title)}</th>
        <td>${safeHtml(weeklyStatusLabel(val?.isActive, t))}</td>
        <td>${safeHtml(val?.details || lbl(t, 'لا_ملاحظات_إضافية', 'لا توجد ملاحظات إضافية'))}</td>
      </tr>`;
    })
    .join('');

  return `
  <div class="title">
    <h1>${safeHtml(lbl(t, 'تقرير_أسبوعي', 'تقرير أسبوعي'))}</h1>
    <p>${safeHtml(report.schoolName || '')}</p>
  </div>
  ${metaGrid([
    [lbl(t, 'المعلم', 'المعلم'), report.teacherName],
    [lbl(t, 'المدرسة', 'المدرسة'), report.schoolName],
    [lbl(t, 'تاريخ_الإرسال', 'تاريخ الإرسال'), date],
    [lbl(t, 'الأسبوع', 'الأسبوع'), report.week],
  ])}
  <div class="section">
    <h3>${safeHtml(lbl(t, 'أنشطة_الأسبوع', 'أنشطة الأسبوع'))}</h3>
    <table>
      <thead><tr><th>${safeHtml(lbl(t, 'النشاط', 'النشاط'))}</th><th>${safeHtml(lbl(t, 'مفعّل', 'مفعّل'))}</th><th>${safeHtml(lbl(t, 'التفاصيل', 'التفاصيل'))}</th></tr></thead>
      <tbody>${activityRows || `<tr><td colspan="3">${safeHtml(lbl(t, 'لا_أنشطة', 'لا توجد أنشطة مسجلة'))}</td></tr>`}</tbody>
    </table>
  </div>`;
}

export function buildReportDetailsBodyHtml(report, t = translate) {
  if (!report) return '';
  if (report.type === 'visit') return buildVisitReportBodyHtml(report, t);
  if (report.type === 'daily') return buildDailyPrepReportBodyHtml(report, t);
  if (report.type === 'weekly') return buildWeeklyReportBodyHtml(report, t);
  return '';
}

export function reportDetailsPreviewTitle(report, t = translate) {
  if (!report) return lbl(t, 'معاينة_التقرير', 'معاينة التقرير');
  if (report.type === 'visit') return lbl(t, 'معاينة_الزيارة', 'معاينة الزيارة الميدانية');
  if (report.type === 'daily') {
    return lbl(t, 'معاينة_سجل_التحضير', `معاينة سجل التحضير (${prepPeriodLabel(report.prepPeriod, t)})`);
  }
  if (report.type === 'weekly') return lbl(t, 'معاينة_التقرير_الأسبوعي', 'معاينة التقرير الأسبوعي');
  return lbl(t, 'معاينة_التقرير', 'معاينة التقرير');
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
