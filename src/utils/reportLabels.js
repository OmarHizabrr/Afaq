export function prepPeriodLabel(prepPeriod) {
  if (prepPeriod === 'weekly') return 'أسبوعي';
  if (prepPeriod === 'monthly') return 'شهري';
  return 'يومي';
}

export function isSchoolSupervisionReport(report) {
  return report?.reportType === 'school_supervision';
}

export function activityTypeForReport(data) {
  if (isSchoolSupervisionReport(data)) return 'school';
  if (data?.subjectId || data?.teacherRating != null) return 'visit';
  return 'visit';
}

export function activityBadgeLabel(type, data = {}) {
  if (type === 'school') return 'تقرير مدرسة';
  if (type === 'daily') {
    const period = prepPeriodLabel(data.prepPeriod);
    return data.prepPeriod && data.prepPeriod !== 'daily' ? `تحضير ${period}` : 'تحضير يومي';
  }
  return 'زيارة ميدانية';
}

export function schoolReportViewPath(report) {
  if (!report?.schoolId || !report?.id) return null;
  const ownerId = report._ownerId || report.ownerId || report.supervisorId || '';
  return `/schools/${report.schoolId}/report/${report.id}${ownerId ? `?ownerId=${ownerId}` : ''}`;
}
