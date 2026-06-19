import translate from '../i18n/translate';
import { formatVisitRatingLabel } from './visitRating';
import {
  studentLevelSummaryFromStars,
  teacherEvaluationLabelFromRatings,
} from './schoolReportStars';
import { villageReportHasContent } from './villageReportFields';

export function schoolReportPeriodLabel(reportPeriod, t = translate) {
  if (reportPeriod === 'monthly') return t('utils.reportLabels.شهري', 'شهري');
  if (reportPeriod === 'weekly') return t('utils.reportLabels.أسبوعي', 'أسبوعي');
  if (reportPeriod === 'visit') return t('utils.reportLabels.زيارة_ميدانية', 'زيارة ميدانية');
  return '';
}

/** سطر ملخص لبطاقة تقرير المدرسة في القوائم */
export function schoolReportSummaryLine(rep, t = translate) {
  if (!rep) return '';
  const parts = [];
  const period = schoolReportPeriodLabel(rep.reportPeriod, t);
  if (period) parts.push(period);
  parts.push(
    t(
      'utils.reportLabels.حضور_rep_presentCount_rep_totalStudents',
      `حضور ${rep.presentCount ?? '-'}/${rep.totalStudents ?? '-'}`
    )
  );

  const teacherLabel =
    rep.teacherEvaluation ||
    (rep.teacherRating != null ? formatVisitRatingLabel(rep.teacherRating) : '') ||
    teacherEvaluationLabelFromRatings(rep.teacherRatings, (rep.teachers || []).map((te) => te.teacherId).filter(Boolean));
  if (teacherLabel && teacherLabel !== '—') {
    parts.push(t('utils.reportLabels.تقييم_المعلم_teacherLabel', `تقييم المعلم: ${teacherLabel}`));
  }

  const ratedStudents = (rep.starAwards || []).filter((s) => Number(s.stars) > 0).length;
  if (ratedStudents > 0) {
    parts.push(t('utils.reportLabels.طلاب_مُقيَّمون_ratedStudents', `طلاب مُقيَّمون: ${ratedStudents}`));
  } else {
    const studentSummary = rep.studentLevel || studentLevelSummaryFromStars(rep.starAwards);
    if (studentSummary && studentSummary !== '—') {
      parts.push(t('utils.reportLabels.الطلاب_studentSummary', `الطلاب: ${studentSummary}`));
    }
  }

  const outstanding = (rep.outstandingStudents || []).filter(Boolean).length;
  if (outstanding > 0) {
    parts.push(t('utils.reportLabels.متفوقون_outstanding', `متفوقون: ${outstanding}`));
  }

  if (villageReportHasContent(rep)) {
    const activityCount =
      (rep.teacherVillageActivities || []).length +
      (rep.institutionVillageActivities || []).length +
      (rep.fridaySermons || []).length;
    if (activityCount > 0) {
      parts.push(t('utils.reportLabels.نشاطات_قرية_activityCount', `نشاطات قرية: ${activityCount}`));
    }
    if (Number(rep.newConvertsCount) > 0) {
      parts.push(t('utils.reportLabels.مهتدون_rep_newConvertsCount', `مهتدون: ${rep.newConvertsCount}`));
    }
  }

  return parts.join(' • ');
}

export function prepPeriodLabel(prepPeriod, t = translate) {
  if (prepPeriod === 'weekly') return t('utils.reportLabels.أسبوعي', 'أسبوعي');
  if (prepPeriod === 'monthly') return t('utils.reportLabels.شهري', 'شهري');
  return t('utils.reportLabels.يومي', 'يومي');
}

export function isSchoolSupervisionReport(report) {
  return report?.reportType === 'school_supervision';
}

export function activityTypeForReport(data) {
  if (isSchoolSupervisionReport(data)) return 'school';
  if (data?.subjectId || data?.teacherRating != null) return 'visit';
  return 'visit';
}

export function activityBadgeLabel(type, data = {}, t = translate) {
  if (type === 'school') return t('utils.reportLabels.تقرير_مدرسة', 'تقرير مدرسة');
  if (type === 'daily') {
    const period = prepPeriodLabel(data.prepPeriod, t);
    if (data.prepPeriod && data.prepPeriod !== 'daily') {
      return t('utils.reportLabels.تحضير_period', `تحضير ${period}`);
    }
    return t('pages.ReportDetailsPage.تحضير_يومي', 'تحضير يومي');
  }
  return t('utils.reportLabels.زيارة_ميدانية', 'زيارة ميدانية');
}

export function schoolReportViewPath(report, { view = false } = {}) {
  if (!report?.schoolId || !report?.id) return null;
  const ownerId = report._ownerId || report.ownerId || report.supervisorId || '';
  const params = new URLSearchParams();
  if (ownerId) params.set('ownerId', ownerId);
  if (view) params.set('view', '1');
  const qs = params.toString();
  return `/schools/${report.schoolId}/report/${report.id}${qs ? `?${qs}` : ''}`;
}

/** عرض مواد التحضير (متعدد أو مفرد) */
export function formatDailyLogSubjects(log, t = translate) {
  if (!log) return '';
  if (Array.isArray(log.curriculumEntries) && log.curriculumEntries.length > 0) {
    return log.curriculumEntries
      .map((e) => {
        const weeks = (e.selectedWeeks || []).join('، ');
        return weeks
          ? t('utils.reportLabels.e_subjectName_أسبوع_weeks', `${e.subjectName} (أسبوع ${weeks})`)
          : e.subjectName;
      })
      .join(' | ');
  }
  if (log.subjectName) {
    const parts = [log.subjectName];
    if (log.week) {
      parts.push(t('utils.reportLabels.أسبوع_log_week', `أسبوع ${log.week}`));
    }
    if (log.lessonName) parts.push(log.lessonName);
    return parts.join(' • ');
  }
  return '';
}
