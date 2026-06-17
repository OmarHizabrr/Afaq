import { clampVisitRatingSave, formatVisitRatingLabel, toStarDisplayValue } from './visitRating';

export function mergeStarAwardsForStudents(students, existing = []) {
  const byId = new Map((existing || []).map((row) => [row.studentId, row]));
  return (students || []).map((s) => {
    const prev = byId.get(s.id);
    const stars = prev?.stars != null ? Math.min(5, Math.max(0, Math.round(Number(prev.stars)))) : 0;
    return {
      studentId: s.id,
      name: s.displayName || prev?.name || '',
      stars,
    };
  });
}

export function teacherRatingsFromReport(rep, teacherIds = []) {
  if (rep?.teacherRatings && typeof rep.teacherRatings === 'object') {
    const out = {};
    teacherIds.forEach((id) => {
      if (rep.teacherRatings[id] != null) {
        out[id] = toStarDisplayValue(rep.teacherRatings[id]);
      }
    });
    if (Object.keys(out).length) return out;
  }
  const fromTeachers = {};
  (rep?.teachers || []).forEach((t) => {
    if (t.teacherId && t.stars != null) {
      fromTeachers[t.teacherId] = toStarDisplayValue(t.stars);
    }
  });
  if (Object.keys(fromTeachers).length) return fromTeachers;
  const fallback = toStarDisplayValue(rep?.teacherRating);
  if (teacherIds[0] && fallback > 0) {
    return { [teacherIds[0]]: fallback };
  }
  return {};
}

export function primaryTeacherRating(teacherRatings, teacherIds) {
  const firstId = teacherIds?.find((id) => teacherRatings?.[id] > 0);
  if (firstId) return clampVisitRatingSave(teacherRatings[firstId]);
  const any = Object.values(teacherRatings || {}).find((n) => Number(n) > 0);
  return any ? clampVisitRatingSave(any) : 0;
}

export function teacherEvaluationLabelFromRatings(teacherRatings, teacherIds) {
  const rating = primaryTeacherRating(teacherRatings, teacherIds);
  return rating > 0 ? formatVisitRatingLabel(rating) : '—';
}

export function studentLevelSummaryFromStars(starAwards) {
  const rated = (starAwards || []).filter((s) => Number(s.stars) > 0);
  if (!rated.length) return '—';
  const avg = rated.reduce((sum, s) => sum + Number(s.stars), 0) / rated.length;
  return formatVisitRatingLabel(avg);
}

/** تجهيز تقرير محفوظ للمعاينة/PDF مع نجوم المعلمين والطلاب */
export function normalizeSchoolReportForDisplay(rep) {
  if (!rep) return rep;
  const teacherIds = (rep.teachers || []).map((t) => t.teacherId).filter(Boolean);
  const teacherRatings = teacherRatingsFromReport(rep, teacherIds);
  const teachers = (rep.teachers || []).map((t) => ({
    ...t,
    stars:
      t.stars != null
        ? toStarDisplayValue(t.stars)
        : teacherRatings[t.teacherId] || 0,
  }));

  return {
    ...rep,
    reportPeriod: rep.reportPeriod || 'monthly',
    teachers,
    teacherEvaluation:
      rep.teacherEvaluation || teacherEvaluationLabelFromRatings(teacherRatings, teacherIds),
    studentLevel: rep.studentLevel || studentLevelSummaryFromStars(rep.starAwards),
    starAwards: rep.starAwards || [],
  };
}
