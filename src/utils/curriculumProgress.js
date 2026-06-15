/** بداية العام الدراسي الافتراضية (1 سبتمبر) */
const ACADEMIC_YEAR_START_MONTH = 8; // سبتمبر (0-indexed)
const ACADEMIC_YEAR_START_DAY = 1;
const TOTAL_WEEKS = 50;

export function getAcademicYearStart(referenceDate = new Date()) {
  const d = new Date(referenceDate);
  const year = d.getMonth() >= ACADEMIC_YEAR_START_MONTH ? d.getFullYear() : d.getFullYear() - 1;
  return new Date(year, ACADEMIC_YEAR_START_MONTH, ACADEMIC_YEAR_START_DAY);
}

/** الأسبوع المتوقع حسب تاريخ التقرير (1–50) */
export function getExpectedWeekForDate(referenceDate = new Date()) {
  const start = getAcademicYearStart(referenceDate);
  const ref = new Date(referenceDate);
  const diffMs = ref.getTime() - start.getTime();
  if (diffMs < 0) return 1;
  const week = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
  return Math.min(TOTAL_WEEKS, Math.max(1, week));
}

export function getLessonForWeek(curriculum, weekNum) {
  const weeks = curriculum?.weeks || [];
  const row = weeks.find((w) => Number(w.week) === Number(weekNum));
  return row?.lesson || '';
}

export function buildCurriculumEntry(subject, selectedWeeks = []) {
  const weeks = (selectedWeeks || [])
    .map((w) => Number(w))
    .filter((w) => w >= 1 && w <= TOTAL_WEEKS)
    .sort((a, b) => a - b);
  const unique = [...new Set(weeks)];
  return {
    subjectId: subject.id,
    subjectName: subject.name || subject.id,
    selectedWeeks: unique,
    lessons: unique.map((week) => ({
      week,
      lesson: getLessonForWeek(subject, week),
    })),
  };
}

export function computeProgressStatus(reportedWeek, expectedWeek) {
  const reported = Number(reportedWeek) || 0;
  const expected = Number(expectedWeek) || 1;
  if (!reported) return { status: 'unknown', gapWeeks: 0, label: 'لم يُحدد بعد' };
  const gap = reported - expected;
  if (gap > 0) return { status: 'ahead', gapWeeks: gap, label: `متقدم ${gap} أسبوع` };
  if (gap < 0) return { status: 'behind', gapWeeks: gap, label: `متأخر ${Math.abs(gap)} أسبوع` };
  return { status: 'on_track', gapWeeks: 0, label: 'حسب الخطة' };
}

export function summarizeCurriculumProgress(entries, referenceDate = new Date()) {
  const expectedWeek = getExpectedWeekForDate(referenceDate);
  return (entries || []).map((entry) => {
    const reportedWeek = entry.selectedWeeks?.length
      ? Math.max(...entry.selectedWeeks.map(Number))
      : 0;
    const progress = computeProgressStatus(reportedWeek, expectedWeek);
    return {
      subjectId: entry.subjectId,
      subjectName: entry.subjectName,
      expectedWeek,
      reportedWeek,
      selectedWeeks: entry.selectedWeeks || [],
      lessons: entry.lessons || [],
      ...progress,
    };
  });
}

export function entriesToLegacyItems(entries) {
  return (entries || []).map((e) => ({
    subjectId: e.subjectId,
    subjectName: e.subjectName,
    content: (e.lessons || [])
      .map((l) => `أسبوع ${l.week}: ${l.lesson || '—'}`)
      .join(' | '),
    selectedWeeks: e.selectedWeeks || [],
    lessons: e.lessons || [],
  }));
}

export function parseLegacyToEntries(report, curriculumList = []) {
  if (Array.isArray(report?.curriculumEntries) && report.curriculumEntries.length > 0) {
    return report.curriculumEntries;
  }
  const items = report?.curriculumItems || [];
  if (items.length > 0) {
    return items.map((it) => {
      const subj = curriculumList.find((c) => c.id === it.subjectId);
      const weeks = Array.isArray(it.selectedWeeks) ? it.selectedWeeks : [];
      if (weeks.length > 0 && subj) return buildCurriculumEntry(subj, weeks);
      return {
        subjectId: it.subjectId,
        subjectName: it.subjectName,
        selectedWeeks: [],
        lessons: [],
        legacyContent: it.content || '',
      };
    });
  }
  return [];
}

export { TOTAL_WEEKS };
