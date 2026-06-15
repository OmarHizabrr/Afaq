import {
  ATTENDANCE_STATUSES,
  attendanceSummaryText,
  isAttendancePresent,
} from './attendanceStatus';
import { entriesToLegacyItems, summarizeCurriculumProgress } from './curriculumProgress';
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

export const PREP_PERIOD_OPTIONS = [
  { value: 'weekly', label: 'أسبوعي', hint: 'الافتراضي — تسجيل أسبوع كامل', Icon: CalendarDays },
  { value: 'daily', label: 'يومي', hint: 'تحضير يوم واحد', Icon: Calendar },
  { value: 'monthly', label: 'شهري', hint: 'ملخص الشهر', Icon: CalendarRange },
];

export const periodSaveLabel = (period) => {
  if (period === 'weekly') return 'الأسبوعي';
  if (period === 'monthly') return 'الشهري';
  return 'اليومي';
};

export const prepDateFieldLabel = (prepPeriod) => {
  if (prepPeriod === 'daily') return 'تاريخ اليوم';
  if (prepPeriod === 'weekly') return 'مرجع الأسبوع';
  return 'مرجع الشهر';
};

export const curriculumSectionTitle = (prepPeriod) => {
  if (prepPeriod === 'weekly') return 'مواد الأسبوع من المناهج';
  if (prepPeriod === 'monthly') return 'مواد الشهر';
  return 'مواد اليوم';
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
}) {
  const periodRange = getPeriodRange(prepPeriod, prepDate ? new Date(prepDate) : new Date());
  const normalizedRecords = records.map((r) => ({
    ...r,
    attendanceStatus: r.attendanceStatus || (r.isPresent ? 'present' : 'absent'),
    isPresent: isAttendancePresent(r),
  }));
  const totalPresent = normalizedRecords.filter((r) => isAttendancePresent(r)).length;
  const progressSummary = summarizeCurriculumProgress(curriculumEntries, prepDate);
  const primary = progressSummary[0] || {};
  const allLessons = curriculumEntries.flatMap((e) =>
    (e.lessons || []).map((l) => `${e.subjectName}: أسبوع ${l.week}${l.lesson ? ` (${l.lesson})` : ''}`)
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
    curriculumItems: entriesToLegacyItems(curriculumEntries),
    subjectId: primary.subjectId || curriculumEntries[0]?.subjectId || '',
    subjectName: curriculumEntries.map((e) => e.subjectName).join('، '),
    week: primary.reportedWeek || curriculumEntries[0]?.selectedWeeks?.[0] || '',
    lessonName: allLessons.join(' | '),
    totalStudents: normalizedRecords.length,
    totalPresent,
    totalAbsent: normalizedRecords.length - totalPresent,
    attendanceSummary: attendanceSummaryText(normalizedRecords),
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
export function mergeStudentRecords(existingRecords, students) {
  const byId = Object.fromEntries((existingRecords || []).map((r) => [r.studentId, r]));
  return students.map((s) => {
    const name = s.displayName || s.studentName || s.name || 'طالب';
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

export { ATTENDANCE_STATUSES };