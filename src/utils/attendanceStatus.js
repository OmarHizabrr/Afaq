import translate from '../i18n/translate';

const STATUS_DEFS = [
  { value: 'present', labelKey: 'utils.attendanceStatus.حاضر', labelFallback: 'حاضر', present: true },
  { value: 'late', labelKey: 'utils.attendanceStatus.متأخر', labelFallback: 'متأخر', present: true },
  { value: 'excused', labelKey: 'utils.attendanceStatus.مستأذن', labelFallback: 'مستأذن', present: false },
  { value: 'absent', labelKey: 'utils.attendanceStatus.غائب', labelFallback: 'غائب', present: false },
  { value: 'sick', labelKey: 'utils.attendanceStatus.مريض', labelFallback: 'مريض', present: false },
  { value: 'traveling', labelKey: 'utils.attendanceStatus.مسافر', labelFallback: 'مسافر', present: false },
];

export function getAttendanceStatuses(t = translate) {
  return STATUS_DEFS.map(({ value, labelKey, labelFallback, present }) => ({
    value,
    label: t(labelKey, labelFallback),
    present,
  }));
}

/** @deprecated prefer getAttendanceStatuses(t) for reactive language */
export const ATTENDANCE_STATUSES = getAttendanceStatuses();

function statusMap(t = translate) {
  return Object.fromEntries(getAttendanceStatuses(t).map((s) => [s.value, s]));
}

export function normalizeAttendanceStatus(record) {
  const values = STATUS_DEFS.map((s) => s.value);
  if (record?.attendanceStatus && values.includes(record.attendanceStatus)) {
    return record.attendanceStatus;
  }
  if (record?.isPresent === false) return 'absent';
  return 'present';
}

export function isAttendancePresent(record) {
  const status = normalizeAttendanceStatus(record);
  const def = STATUS_DEFS.find((s) => s.value === status);
  return def?.present ?? false;
}

export function attendanceStatusLabel(record, t = translate) {
  const status = normalizeAttendanceStatus(record);
  return statusMap(t)[status]?.label || status;
}

export function countByAttendanceStatus(records = []) {
  const counts = Object.fromEntries(STATUS_DEFS.map((s) => [s.value, 0]));
  records.forEach((r) => {
    const st = normalizeAttendanceStatus(r);
    counts[st] = (counts[st] || 0) + 1;
  });
  return counts;
}

export function attendanceSummaryText(records = [], t = translate) {
  const counts = countByAttendanceStatus(records);
  return getAttendanceStatuses(t)
    .filter((s) => counts[s.value] > 0)
    .map((s) => `${s.label}: ${counts[s.value]}`)
    .join(' • ');
}

export function applyAttendanceStatus(record, status) {
  const def = STATUS_DEFS.find((s) => s.value === status) || STATUS_DEFS[0];
  const present = def.present;
  return {
    ...record,
    attendanceStatus: status,
    isPresent: present,
    memorization: present ? record.memorization || '' : '',
    review: present ? record.review || '' : '',
  };
}

export function defaultAttendanceRecord(base) {
  return applyAttendanceStatus(
    {
      memorization: '',
      review: '',
      note: '',
      ...base,
    },
    'present'
  );
}
