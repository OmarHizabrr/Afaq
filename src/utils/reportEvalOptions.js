import translate from '../i18n/translate';

/** قيمة مخزّنة — تبقى عربية للتوافق مع البيانات المحفوظة */
export const EVAL_OTHER_VALUE = 'أخرى';

const EVAL_QUALITY_VALUES = [
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

const EVAL_YES_NO_VALUES = ['نعم', 'لا', 'جزئياً', 'لا ينطبق', EVAL_OTHER_VALUE];

function evalOptionKey(value) {
  return String(value).replace(/\s+/g, '_');
}

export function evalOptionLabel(value, t = translate) {
  if (!value) return '';
  return t(`utils.reportEvalOptions.${evalOptionKey(value)}`, value);
}

export function getEvalQualityOptions(t = translate) {
  return EVAL_QUALITY_VALUES.map((value) => evalOptionLabel(value, t));
}

export function getEvalYesNoOptions(t = translate) {
  return EVAL_YES_NO_VALUES.map((value) => evalOptionLabel(value, t));
}

/** @deprecated prefer getEvalQualityOptions(t) — Arabic values for storage matching */
export const EVAL_QUALITY_OPTIONS = [...EVAL_QUALITY_VALUES];

/** @deprecated prefer getEvalYesNoOptions(t) */
export const EVAL_YES_NO_OPTIONS = [...EVAL_YES_NO_VALUES];

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

const SCHOOL_REPORT_PERIOD_DEFS = [
  { value: 'monthly', labelKey: 'utils.reportLabels.شهري', labelFallback: 'شهري' },
  { value: 'weekly', labelKey: 'utils.reportLabels.أسبوعي', labelFallback: 'أسبوعي' },
  { value: 'visit', labelKey: 'utils.reportLabels.زيارة_ميدانية', labelFallback: 'زيارة ميدانية' },
];

export function getSchoolReportPeriodOptions(t = translate) {
  return SCHOOL_REPORT_PERIOD_DEFS.map(({ value, labelKey, labelFallback }) => ({
    value,
    label: t(labelKey, labelFallback),
  }));
}

/** @deprecated prefer getSchoolReportPeriodOptions(t) */
export const SCHOOL_REPORT_PERIOD_OPTIONS = getSchoolReportPeriodOptions();

export function getSchoolEvalFields(t = translate) {
  return [
    { key: 'curriculumProgress', label: t('utils.reportEvalOptions.السير_على_المنهج', 'السير على المنهج') },
    { key: 'schoolEvaluation', label: t('utils.reportEvalOptions.تقييم_المدرسة', 'تقييم المدرسة') },
  ];
}

/** @deprecated prefer getSchoolEvalFields(t) */
export const SCHOOL_EVAL_FIELDS = getSchoolEvalFields();

export function getDefaultSchoolMonthlyReportTitle(t = translate) {
  return t('utils.reportEvalOptions.التقرير_الشهري_عن_المدرسة', 'التقرير الشهري عن المدرسة');
}

/** @deprecated prefer getDefaultSchoolMonthlyReportTitle(t) */
export const DEFAULT_SCHOOL_MONTHLY_REPORT_TITLE = getDefaultSchoolMonthlyReportTitle();
