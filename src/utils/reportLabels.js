import { formatVisitRatingLabel } from './visitRating';
import {
  studentLevelSummaryFromStars,
  teacherEvaluationLabelFromRatings,
} from './schoolReportStars';

export function schoolReportPeriodLabel(reportPeriod) {
  if (reportPeriod === 'monthly') return 'شهري';
  if (reportPeriod === 'weekly') return 'أسبوعي';
  if (reportPeriod === 'visit') return 'زيارة ميدانية';
  return '';
}

/** سطر ملخص لبطاقة تقرير المدرسة في القوائم */
export function schoolReportSummaryLine(rep) {
  if (!rep) return '';
  const parts = [];
  const period = schoolReportPeriodLabel(rep.reportPeriod);
  if (period) parts.push(period);
  parts.push(`حضور ${rep.presentCount ?? '-'}/${rep.totalStudents ?? '-'}`);

  const teacherLabel =
    rep.teacherEvaluation ||
    (rep.teacherRating != null ? formatVisitRatingLabel(rep.teacherRating) : '') ||
    teacherEvaluationLabelFromRatings(rep.teacherRatings, (rep.teachers || []).map((t) => t.teacherId).filter(Boolean));
  if (teacherLabel && teacherLabel !== '—') parts.push(`تقييم المعلم: ${teacherLabel}`);

  const ratedStudents = (rep.starAwards || []).filter((s) => Number(s.stars) > 0).length;
  if (ratedStudents > 0) {
    parts.push(`طلاب مُقيَّمون: ${ratedStudents}`);
  } else {
    const studentSummary = rep.studentLevel || studentLevelSummaryFromStars(rep.starAwards);
    if (studentSummary && studentSummary !== '—') parts.push(`الطلاب: ${studentSummary}`);
  }

  return parts.join(' • ');
}

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

/** عرض مواد التحضير (متعدد أو مفرد) */
export function formatDailyLogSubjects(log) {
  if (!log) return '';
  if (Array.isArray(log.curriculumEntries) && log.curriculumEntries.length > 0) {
    return log.curriculumEntries
      .map((e) => {
        const weeks = (e.selectedWeeks || []).join('، ');
        return weeks ? `${e.subjectName} (أسبوع ${weeks})` : e.subjectName;
      })
      .join(' | ');
  }
  if (log.subjectName) {
    const parts = [log.subjectName];
    if (log.week) parts.push(`أسبوع ${log.week}`);
    if (log.lessonName) parts.push(log.lessonName);
    return parts.join(' • ');
  }
  return '';
}
