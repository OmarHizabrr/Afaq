export const EVAL_OTHER_VALUE = 'أخرى';

export const EVAL_QUALITY_OPTIONS = [
  'ممتاز',
  'جيد جدا',
  'جيد',
  'متوسط',
  'مقبول',
  'ضعيف',
  'يحتاج تحسين',
  'لا ينطبق',
  EVAL_OTHER_VALUE,
];

export const EVAL_YES_NO_OPTIONS = ['نعم', 'لا', 'جزئياً', 'لا ينطبق', EVAL_OTHER_VALUE];

export function resolveEvalValue(value, otherText) {
  if (value === EVAL_OTHER_VALUE) return String(otherText || '').trim() || EVAL_OTHER_VALUE;
  return value || '';
}

export function parseEvalFromStored(stored, options = EVAL_QUALITY_OPTIONS) {
  const v = String(stored ?? '').trim();
  if (!v) return { value: '', other: '' };
  if (options.includes(v)) return { value: v, other: '' };
  return { value: EVAL_OTHER_VALUE, other: v };
}

export const SCHOOL_EVAL_FIELDS = [
  { key: 'studentLevel', label: 'مستوى الطلاب' },
  { key: 'curriculumProgress', label: 'السير على المنهج' },
  { key: 'schoolEvaluation', label: 'تقييم المدرسة' },
  { key: 'teacherEvaluation', label: 'تقييم المدرس' },
];
