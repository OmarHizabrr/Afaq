import {
  getAttendanceStatuses,
  attendanceSummaryText,
  isAttendancePresent,
} from './attendanceStatus';
import { entriesToLegacyItems, summarizeCurriculumProgress } from './curriculumProgress';
import translate from '../i18n/translate';
import { Calendar, CalendarDays, CalendarRange } from 'lucide-react';

export const formatDateInput = (d = new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const getPeriodRange = (period, referenceDate = new Date()) => {
  const d = new Date(referenceDate);
  if (period === 'daily') {
    const date = formatDateInput(d);
    return { start: date, end: date, label: date };
  }
  if (period === 'weekly') {
    const day = d.getDay();
    const start = new Date(d);
    start.setDate(d.getDate() - day);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const startStr = formatDateInput(start);
    const endStr = formatDateInput(end);
    return { start: startStr, end: endStr, label: `${startStr} — ${endStr}` };
  }
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const startStr = formatDateInput(start);
  const endStr = formatDateInput(end);
  return { start: startStr, end: endStr, label: `${startStr} — ${endStr}` };
};

const PREP_PERIOD_DEFS = [
  {
    value: 'weekly',
    labelKey: 'utils.dailyPrepForm.أسبوعي',
    labelFallback: 'أسبوعي',
    hintKey: 'utils.dailyPrepForm.الافتراضي_تسجيل_أسبوع_كامل',
    hintFallback: 'الافتراضي — تسجيل أسبوع كامل',
    Icon: CalendarDays,
  },
  {
    value: 'daily',
    labelKey: 'utils.dailyPrepForm.يومي',
    labelFallback: 'يومي',
    hintKey: 'utils.dailyPrepForm.تحضير_يوم_واحد',
    hintFallback: 'تحضير يوم واحد',
    Icon: Calendar,
  },
  {
    value: 'monthly',
    labelKey: 'utils.dailyPrepForm.شهري',
    labelFallback: 'شهري',
    hintKey: 'utils.dailyPrepForm.ملخص_الشهر',
    hintFallback: 'ملخص الشهر',
    Icon: CalendarRange,
  },
];

export function getPrepPeriodOptions(t = translate) {
  return PREP_PERIOD_DEFS.map(({ value, labelKey, labelFallback, hintKey, hintFallback, Icon }) => ({
    value,
    label: t(labelKey, labelFallback),
    hint: t(hintKey, hintFallback),
    Icon,
  }));
}

/** @deprecated prefer getPrepPeriodOptions(t) */
export const PREP_PERIOD_OPTIONS = getPrepPeriodOptions();

export const periodSaveLabel = (period, t = translate) => {
  if (period === 'weekly') return t('utils.dailyPrepForm.الأسبوعي', 'الأسبوعي');
  if (period === 'monthly') return t('utils.dailyPrepForm.الشهري', 'الشهري');
  return t('utils.dailyPrepForm.اليومي', 'اليومي');
};

export const prepDateFieldLabel = (prepPeriod, t = translate) => {
  if (prepPeriod === 'daily') return t('utils.dailyPrepForm.تاريخ_اليوم', 'تاريخ اليوم');
  if (prepPeriod === 'weekly') return t('utils.dailyPrepForm.مرجع_الأسبوع', 'مرجع الأسبوع');
  return t('utils.dailyPrepForm.مرجع_الشهر', 'مرجع الشهر');
};

export const curriculumSectionTitle = (prepPeriod, t = translate) => {
  if (prepPeriod === 'weekly') return t('utils.dailyPrepForm.مواد_الأسبوع_من_المناهج', 'مواد الأسبوع من المناهج');
  if (prepPeriod === 'monthly') return t('utils.dailyPrepForm.مواد_الشهر', 'مواد الشهر');
  return t('utils.dailyPrepForm.مواد_اليوم', 'مواد اليوم');
};

/** بناء حمولة الحفظ الموحّدة لسجل التحضير */
export function buildDailyPrepSavePayload({
  schoolId,
  schoolName,
  teacherId = '',
  teacherName = '',
  prepPeriod,
  prepDate,
  curriculumEntries = [],
  records = [],
  prepNotes = '',
  timestamp,
  t = translate,
}) {
  const periodRange = getPeriodRange(prepPeriod, prepDate ? new Date(prepDate) : new Date());
  const normalizedRecords = records.map((r) => ({
    ...r,
    attendanceStatus: r.attendanceStatus || (r.isPresent ? 'present' : 'absent'),
    isPresent: isAttendancePresent(r),
  }));
  const totalPresent = normalizedRecords.filter((r) => isAttendancePresent(r)).length;
  const progressSummary = summarizeCurriculumProgress(curriculumEntries, prepDate, t);
  const primary = progressSummary[0] || {};
  const allLessons = curriculumEntries.flatMap((e) =>
    (e.lessons || []).map((l) =>
      t('utils.dailyPrepForm.subjectName_أسبوع_week', `${e.subjectName}: أسبوع ${l.week}${l.lesson ? ` (${l.lesson})` : ''}`)
    )
  );

  const payload = {
    schoolId,
    schoolName: schoolName || '',
    teacherId,
    teacherName,
    date: periodRange.end,
    periodStart: periodRange.start,
    periodEnd: periodRange.end,
    periodLabel: periodRange.label,
    prepPeriod,
    curriculumEntries,
    curriculumProgressSummary: progressSummary,
    curriculumItems: entriesToLegacyItems(curriculumEntries, t),
    subjectId: primary.subjectId || curriculumEntries[0]?.subjectId || '',
    subjectName: curriculumEntries.map((e) => e.subjectName).join('، '),
    week: primary.reportedWeek || curriculumEntries[0]?.selectedWeeks?.[0] || '',
    lessonName: allLessons.join(' | '),
    totalStudents: normalizedRecords.length,
    totalPresent,
    totalAbsent: normalizedRecords.length - totalPresent,
    attendanceSummary: attendanceSummaryText(normalizedRecords, t),
    prepNotes: (prepNotes || '').trim(),
    records: normalizedRecords,
  };

  if (timestamp) payload.timestamp = timestamp;
  return payload;
}

export async function loadAllSchoolOptions(api) {
  const docs = await api.getCollectionGroupDocuments('schools');
  return docs
    .map((s) => ({
      id: s.id,
      name: (s.data()?.name || '').trim() || s.id,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}

export async function loadCurriculumList(api) {
  const docs = await api.getDocuments(api.getCurriculumCollection());
  return docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** دمج سجلات الطلاب عند تغيير المدرسة */
export function mergeStudentRecords(existingRecords, students, t = translate) {
  const byId = Object.fromEntries((existingRecords || []).map((r) => [r.studentId, r]));
  const defaultName = t('utils.dailyPrepForm.طالب', 'طالب');
  return students.map((s) => {
    const name = s.displayName || s.studentName || s.name || defaultName;
    const prev = byId[s.id];
    if (prev) return { ...prev, name };
    return {
      studentId: s.id,
      name,
      attendanceStatus: 'present',
      isPresent: true,
      memorization: '',
      review: '',
      note: '',
    };
  });
}

export { getAttendanceStatuses };
