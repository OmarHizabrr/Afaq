export const ATTENDANCE_STATUSES = [
  { value: 'present', label: 'حاضر', present: true },
  { value: 'late', label: 'متأخر', present: true },
  { value: 'excused', label: 'مستأذن', present: false },
  { value: 'absent', label: 'غائب', present: false },
  { value: 'sick', label: 'مريض', present: false },
  { value: 'traveling', label: 'مسافر', present: false },
];

const STATUS_MAP = Object.fromEntries(ATTENDANCE_STATUSES.map((s) => [s.value, s]));

export function normalizeAttendanceStatus(record) {
  if (record?.attendanceStatus && STATUS_MAP[record.attendanceStatus]) {
    return record.attendanceStatus;
  }
  if (record?.isPresent === false) return 'absent';
  return 'present';
}

export function isAttendancePresent(record) {
  const status = normalizeAttendanceStatus(record);
  return STATUS_MAP[status]?.present ?? false;
}

export function attendanceStatusLabel(record) {
  const status = normalizeAttendanceStatus(record);
  return STATUS_MAP[status]?.label || status;
}

export function countByAttendanceStatus(records = []) {
  const counts = Object.fromEntries(ATTENDANCE_STATUSES.map((s) => [s.value, 0]));
  records.forEach((r) => {
    const st = normalizeAttendanceStatus(r);
    counts[st] = (counts[st] || 0) + 1;
  });
  return counts;
}

export function attendanceSummaryText(records = []) {
  const counts = countByAttendanceStatus(records);
  return ATTENDANCE_STATUSES.filter((s) => counts[s.value] > 0)
    .map((s) => `${s.label}: ${counts[s.value]}`)
    .join(' • ');
}

export function applyAttendanceStatus(record, status) {
  const def = STATUS_MAP[status] || STATUS_MAP.present;
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
