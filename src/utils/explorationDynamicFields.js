/**
 * حقول الاستكشاف الديناميكية — تعريف الحقول لكل نوع وحفظ القيم في `fieldValues`.
 */
import translate from '../i18n/translate';

const FIELD_TYPE_DEFS = [
  { value: 'text', labelKey: 'utils.explorationDynamicFields.نص_قصير', labelFallback: 'نص قصير' },
  { value: 'textarea', labelKey: 'utils.explorationDynamicFields.نص_طويل', labelFallback: 'نص طويل' },
  { value: 'email', labelKey: 'utils.explorationDynamicFields.بريد_إلكتروني', labelFallback: 'بريد إلكتروني' },
  { value: 'password', labelKey: 'utils.explorationDynamicFields.كلمة_مرور', labelFallback: 'كلمة مرور' },
  { value: 'url', labelKey: 'utils.explorationDynamicFields.رابط_إلكتروني', labelFallback: 'رابط إلكتروني' },
  { value: 'search', labelKey: 'utils.explorationDynamicFields.بحث', labelFallback: 'بحث' },
  { value: 'tel', labelKey: 'utils.explorationDynamicFields.رقم_هاتف', labelFallback: 'رقم هاتف' },
  { value: 'number', labelKey: 'utils.explorationDynamicFields.رقم', labelFallback: 'رقم' },
  { value: 'currency', labelKey: 'utils.explorationDynamicFields.عملة_رقم_عشري', labelFallback: 'عملة (رقم عشري)' },
  { value: 'percentage', labelKey: 'utils.explorationDynamicFields.نسبة_مئوية', labelFallback: 'نسبة مئوية' },
  { value: 'range', labelKey: 'utils.explorationDynamicFields.منزلق_Range', labelFallback: 'منزلق (Range)' },
  { value: 'date', labelKey: 'utils.explorationDynamicFields.تاريخ', labelFallback: 'تاريخ' },
  { value: 'date_range', labelKey: 'utils.explorationDynamicFields.تاريخ_من_إلى', labelFallback: 'تاريخ من — إلى' },
  { value: 'time', labelKey: 'utils.explorationDynamicFields.وقت', labelFallback: 'وقت' },
  { value: 'datetime-local', labelKey: 'utils.explorationDynamicFields.تاريخ_ووقت', labelFallback: 'تاريخ ووقت' },
  { value: 'month', labelKey: 'utils.explorationDynamicFields.شهر', labelFallback: 'شهر' },
  { value: 'week', labelKey: 'utils.explorationDynamicFields.أسبوع', labelFallback: 'أسبوع' },
  { value: 'dropdown', labelKey: 'utils.explorationDynamicFields.قائمة_منسدلة', labelFallback: 'قائمة منسدلة' },
  { value: 'multi_select', labelKey: 'utils.explorationDynamicFields.اختيار_متعدد', labelFallback: 'اختيار متعدد' },
  { value: 'yes_no', labelKey: 'utils.explorationDynamicFields.نعم_لا', labelFallback: 'نعم / لا' },
  { value: 'checkbox', labelKey: 'utils.explorationDynamicFields.مربع_اختيار', labelFallback: 'مربع اختيار' },
  { value: 'radio', labelKey: 'utils.explorationDynamicFields.زر_اختيار_Radio', labelFallback: 'زر اختيار (Radio)' },
  { value: 'switch', labelKey: 'utils.explorationDynamicFields.مفتاح_تبديل_Switch', labelFallback: 'مفتاح تبديل (Switch)' },
  { value: 'file', labelKey: 'utils.explorationDynamicFields.رفع_ملف', labelFallback: 'رفع ملف' },
  { value: 'image', labelKey: 'utils.explorationDynamicFields.رفع_صورة', labelFallback: 'رفع صورة' },
  { value: 'video', labelKey: 'utils.explorationDynamicFields.رفع_فيديو', labelFallback: 'رفع فيديو' },
  { value: 'audio', labelKey: 'utils.explorationDynamicFields.رفع_ملف_صوتي', labelFallback: 'رفع ملف صوتي' },
  { value: 'color', labelKey: 'utils.explorationDynamicFields.منتقي_الألوان', labelFallback: 'منتقي الألوان' },
  { value: 'location', labelKey: 'utils.explorationDynamicFields.موقع_جغرافي_إحداثيات', labelFallback: 'موقع جغرافي (إحداثيات)' },
  { value: 'signature', labelKey: 'utils.explorationDynamicFields.توقيع_إلكتروني', labelFallback: 'توقيع إلكتروني' },
  { value: 'rating', labelKey: 'utils.explorationDynamicFields.تقييم_Stars', labelFallback: 'تقييم (Stars)' },
  { value: 'rich_text', labelKey: 'utils.explorationDynamicFields.نص_منسق_Editor', labelFallback: 'نص منسق (Editor)' },
  { value: 'tag', labelKey: 'utils.explorationDynamicFields.وسوم_Tags', labelFallback: 'وسوم (Tags)' },
  { value: 'hidden', labelKey: 'utils.explorationDynamicFields.حقل_مخفي', labelFallback: 'حقل مخفي' },
];

export function getExplorationFieldTypes(t = translate) {
  return FIELD_TYPE_DEFS.map(({ value, labelKey, labelFallback }) => ({
    value,
    label: t(labelKey, labelFallback),
  }));
}

/** @deprecated prefer getExplorationFieldTypes(t) */
export const EXPLORATION_FIELD_TYPES = getExplorationFieldTypes();

export const FIELD_TYPE_VALUES = EXPLORATION_FIELD_TYPES.map((t) => t.value);

const ALLOWED_TYPES = new Set(FIELD_TYPE_VALUES);

/** أنواع تحتاج خياراتاً (سطر لكل خيار في المحرر) */
export const FIELD_TYPES_WITH_OPTIONS = new Set(['dropdown', 'multi_select', 'radio']);

const FIELD_TYPE_GROUP_DEFS = [
  { labelKey: 'utils.explorationDynamicFields.الحقول_النصية', labelFallback: 'الحقول النصية', values: ['text', 'textarea', 'email', 'password', 'url', 'search', 'tel'] },
  { labelKey: 'utils.explorationDynamicFields.الرقمية_والمالية', labelFallback: 'الرقمية والمالية', values: ['number', 'currency', 'percentage', 'range'] },
  { labelKey: 'utils.explorationDynamicFields.التاريخ_والوقت', labelFallback: 'التاريخ والوقت', values: ['date', 'date_range', 'time', 'datetime-local', 'month', 'week'] },
  { labelKey: 'utils.explorationDynamicFields.الاختيار_والقوائم', labelFallback: 'الاختيار والقوائم', values: ['dropdown', 'multi_select', 'yes_no', 'checkbox', 'radio', 'switch'] },
  { labelKey: 'utils.explorationDynamicFields.الوسائط_والملفات', labelFallback: 'الوسائط والملفات', values: ['file', 'image', 'video', 'audio'] },
  { labelKey: 'utils.explorationDynamicFields.متخصصة', labelFallback: 'متخصصة', values: ['color', 'location', 'signature', 'rating', 'rich_text', 'tag', 'hidden'] },
];

export function getExplorationFieldTypeGroups(t = translate) {
  return FIELD_TYPE_GROUP_DEFS.map(({ labelKey, labelFallback, values }) => ({
    label: t(labelKey, labelFallback),
    values,
  }));
}

/** @deprecated prefer getExplorationFieldTypeGroups(t) */
export const EXPLORATION_FIELD_TYPE_GROUPS = getExplorationFieldTypeGroups();

export function getExplorationFieldTypeLabelMap(t = translate) {
  return new Map(getExplorationFieldTypes(t).map((row) => [row.value, row.label]));
}

/** @deprecated prefer getExplorationFieldTypeLabelMap(t) */
export const EXPLORATION_FIELD_TYPE_LABEL_MAP = getExplorationFieldTypeLabelMap();

const STRING_LIKE = new Set([
  'text',
  'textarea',
  'email',
  'password',
  'url',
  'search',
  'tel',
  'rich_text',
  'file',
  'image',
  'video',
  'audio',
  'signature',
]);

const NUMERIC_LIKE = new Set(['number', 'currency', 'percentage', 'range']);

const DATE_LIKE = new Set(['date', 'time', 'datetime-local', 'month', 'week']);

function parseOptionsList(f) {
  if (Array.isArray(f?.options)) {
    return f.options.map((o) => String(o ?? '').trim()).filter(Boolean);
  }
  if (typeof f?.optionsText === 'string') {
    return f.optionsText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  }
  return [];
}

const OPTION_SOURCE_IDS = new Set([
  'manual',
  'governorates',
  'regions',
  'villages',
  'schools',
  'students',
  'curriculum',
  'exploration_types',
  'new_muslims',
  'permission_profiles',
  'users',
]);
const VALUE_SOURCE_IDS = new Set(['', 'current_user_id', 'current_user_display']);

const VALUE_SOURCE_DEFS = [
  { id: '', labelKey: 'utils.explorationDynamicFields.بدون_إدخال_يدوي', labelFallback: 'بدون — إدخال يدوي' },
  { id: 'current_user_id', labelKey: 'utils.explorationDynamicFields.من_المستخدم_الحالي_المعرف', labelFallback: 'من المستخدم الحالي — المعرف' },
  { id: 'current_user_display', labelKey: 'utils.explorationDynamicFields.من_المستخدم_الحالي_الاسم_المعروض', labelFallback: 'من المستخدم الحالي — الاسم المعروض' },
];

export function getExplorationValueSources(t = translate) {
  return VALUE_SOURCE_DEFS.map(({ id, labelKey, labelFallback }) => ({
    id,
    label: t(labelKey, labelFallback),
  }));
}

/** @deprecated prefer getExplorationValueSources(t) */
export const EXPLORATION_VALUE_SOURCES = getExplorationValueSources();

function normalizeOptionSourceId(v) {
  return OPTION_SOURCE_IDS.has(v) ? v : 'manual';
}

function normalizeValueSourceId(v) {
  const s = v == null ? '' : String(v);
  return VALUE_SOURCE_IDS.has(s) ? s : '';
}

export { normalizeOptionSourceId, normalizeValueSourceId };

export function normalizeSchemaFields(raw, t = translate) {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((f, index) => {
      const id = String(f?.id || '').trim() || `field_${index}`;
      const fieldType = ALLOWED_TYPES.has(f?.fieldType) ? f.fieldType : 'text';
      const options = FIELD_TYPES_WITH_OPTIONS.has(fieldType) ? parseOptionsList(f) : [];
      const minRaw = f?.min === '' || f?.min == null ? null : Number(f.min);
      const maxRaw = f?.max === '' || f?.max == null ? null : Number(f.max);
      return {
        id,
        label: String(f?.label ?? '').trim() || t('utils.explorationDynamicFields.حقل_index_1', `حقل ${index + 1}`),
        fieldType,
        required: Boolean(f?.required),
        placeholder: String(f?.placeholder ?? '').trim(),
        options,
        min: minRaw != null && Number.isFinite(minRaw) ? minRaw : null,
        max: maxRaw != null && Number.isFinite(maxRaw) ? maxRaw : null,
        defaultValue:
          f?.defaultValue === undefined || f?.defaultValue === null ? '' : String(f.defaultValue),
        optionSource: normalizeOptionSourceId(f?.optionSource),
        dependsOnFieldId: String(f?.dependsOnFieldId ?? '').trim(),
        userRoleFilter: String(f?.userRoleFilter ?? 'all') || 'all',
        valueSource: normalizeValueSourceId(f?.valueSource),
      };
    })
    .filter((f) => f.label.length > 0);
}

/**
 * تحويل صفوف محرّر نوع الاستكشاف (optionsText، min/max كنص) إلى حقول مخطط للمعاينة أو الحفظ.
 * @param {Array<object>} rows
 * @param {{ ensureId?: (index: number, row: object) => string }=} opts
 */
export function editorSchemaRowsToFields(rows, opts) {
  const ensureId = opts?.ensureId;
  const t = opts?.t || translate;
  const list = Array.isArray(rows) ? rows : [];
  return list.map((r, i) => {
    const ft = ALLOWED_TYPES.has(r?.fieldType) ? r.fieldType : 'text';
    const options = FIELD_TYPES_WITH_OPTIONS.has(ft)
      ? String(r?.optionsText ?? '')
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean)
      : [];
    const minRaw = r?.min === '' || r?.min == null ? null : Number(r.min);
    const maxRaw = r?.max === '' || r?.max == null ? null : Number(r.max);
    let id;
    if (typeof ensureId === 'function') {
      id = String(ensureId(i, r) || '').trim() || `field_${i}`;
    } else {
      id = String(r?.id || '').trim() || `preview_field_${i}`;
    }
    const field = {
      id,
      label: String(r?.label ?? '').trim() || t('utils.explorationDynamicFields.حقل_i_1', `حقل ${i + 1}`),
      fieldType: ft,
      required: Boolean(r?.required),
      placeholder: String(r?.placeholder ?? '').trim(),
      options,
      min: minRaw != null && Number.isFinite(minRaw) ? minRaw : null,
      max: maxRaw != null && Number.isFinite(maxRaw) ? maxRaw : null,
    };
    if (ft === 'hidden') {
      field.defaultValue = String(r?.defaultValue ?? '').trim();
    }
    field.optionSource = normalizeOptionSourceId(r?.optionSource);
    field.dependsOnFieldId = String(r?.dependsOnFieldId ?? '').trim();
    field.userRoleFilter = String(r?.userRoleFilter ?? 'all') || 'all';
    field.valueSource = normalizeValueSourceId(r?.valueSource);
    return field;
  });
}

export function emptyValueForField(f) {
  const t = f.fieldType;
  if (t === 'date_range') return { from: '', to: '' };
  if (t === 'location') return { lat: '', lng: '' };
  if (t === 'multi_select' || t === 'tag') return [];
  if (t === 'checkbox' || t === 'switch') return false;
  if (t === 'yes_no') return '';
  if (t === 'range') {
    const lo = f.min != null && Number.isFinite(f.min) ? f.min : 0;
    return lo;
  }
  if (t === 'rating') return '';
  if (NUMERIC_LIKE.has(t)) return '';
  if (t === 'hidden') return f.defaultValue != null ? String(f.defaultValue) : '';
  if (t === 'color') return '#000000';
  return '';
}

export function initialFieldValues(schemaFields, existing = {}) {
  const out = { ...(existing && typeof existing === 'object' ? existing : {}) };
  for (const f of schemaFields) {
    if (out[f.id] === undefined) {
      out[f.id] = emptyValueForField(f);
      continue;
    }
    if (f.fieldType === 'date_range' && (typeof out[f.id] !== 'object' || out[f.id] === null)) {
      out[f.id] = { from: '', to: '' };
    } else if (f.fieldType === 'location' && (typeof out[f.id] !== 'object' || out[f.id] === null)) {
      out[f.id] = { lat: '', lng: '' };
    } else if ((f.fieldType === 'multi_select' || f.fieldType === 'tag') && !Array.isArray(out[f.id])) {
      if (typeof out[f.id] === 'string' && out[f.id].trim()) {
        out[f.id] = out[f.id]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      } else {
        out[f.id] = [];
      }
    } else if ((f.fieldType === 'checkbox' || f.fieldType === 'switch') && typeof out[f.id] !== 'boolean') {
      out[f.id] = Boolean(out[f.id]);
    }
  }
  return out;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidUrl(s) {
  const t = String(s).trim();
  if (!t) return false;
  try {
    const u = new URL(t.includes('://') ? t : `https://${t}`);
    return Boolean(u.hostname);
  } catch {
    return false;
  }
}

export function validateFieldValues(schemaFields, fieldValues, t = translate) {
  const errs = [];
  for (const f of schemaFields) {
    if (!f.required || f.fieldType === 'hidden') continue;
    const v = fieldValues?.[f.id];

    if (STRING_LIKE.has(f.fieldType)) {
      if (!String(v ?? '').trim()) errs.push(f.label);
      else if (f.fieldType === 'email' && !EMAIL_RE.test(String(v).trim())) {
        errs.push(t('utils.explorationDynamicFields.f_label_بريد_غير_صالح', `${f.label} (بريد غير صالح)`));
      } else if (f.fieldType === 'url' && !isValidUrl(String(v).trim())) {
        errs.push(t('utils.explorationDynamicFields.f_label_رابط_غير_صالح', `${f.label} (رابط غير صالح)`));
      } else if (f.fieldType === 'tel' && String(v).trim().length < 3) errs.push(f.label);
    } else if (f.fieldType === 'rating') {
      if (v === '' || v == null) errs.push(f.label);
      else {
        const n = Number(v);
        if (!Number.isFinite(n)) errs.push(f.label);
        else {
          const lo = f.min != null && Number.isFinite(f.min) ? f.min : 1;
          const hi = f.max != null && Number.isFinite(f.max) ? f.max : 5;
          if (n < lo || n > hi) errs.push(f.label);
        }
      }
    } else if (NUMERIC_LIKE.has(f.fieldType)) {
      if (v === '' || v == null) errs.push(f.label);
      else {
        const n = Number(v);
        if (!Number.isFinite(n)) {
          errs.push(f.label);
        } else if (f.fieldType === 'percentage' && (n < 0 || n > 100)) {
          errs.push(`${f.label} (0–100)`);
        } else {
          if (f.min != null && Number.isFinite(f.min) && n < f.min) {
            errs.push(t('utils.explorationDynamicFields.f_label_أقل_من_الحد_الأدنى', `${f.label} (أقل من الحد الأدنى)`));
          }
          if (f.max != null && Number.isFinite(f.max) && n > f.max) {
            errs.push(t('utils.explorationDynamicFields.f_label_أكبر_من_الحد_الأقصى', `${f.label} (أكبر من الحد الأقصى)`));
          }
        }
      }
    } else if (DATE_LIKE.has(f.fieldType)) {
      if (!String(v ?? '').trim()) errs.push(f.label);
    } else if (f.fieldType === 'date_range') {
      const from = String(v?.from ?? '').trim();
      const to = String(v?.to ?? '').trim();
      if (!from || !to) errs.push(f.label);
    } else if (f.fieldType === 'yes_no') {
      if (v !== 'yes' && v !== 'no') errs.push(f.label);
    } else if (f.fieldType === 'dropdown' || f.fieldType === 'radio') {
      if (!String(v ?? '').trim()) errs.push(f.label);
    } else if (f.fieldType === 'multi_select' || f.fieldType === 'tag') {
      if (!Array.isArray(v) || v.length === 0) errs.push(f.label);
    } else if (f.fieldType === 'checkbox' || f.fieldType === 'switch') {
      if (v !== true) errs.push(f.label);
    } else if (f.fieldType === 'location') {
      const lat = Number(v?.lat);
      const lng = Number(v?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) errs.push(f.label);
    } else if (f.fieldType === 'color') {
      if (!String(v ?? '').trim()) errs.push(f.label);
    }
  }
  return errs;
}

const MEDIA_LIKE = new Set(['file', 'image', 'video', 'audio', 'signature']);

/**
 * تنسيق قيمة حقل لعرضها للمستخدم بشكل مقروء (قراءة فقط).
 * يعيد سلسلة نصية ملائمة لجميع أنواع الحقول، أو الرمز '—' عند الفراغ.
 */
export function formatFieldValueForDisplay(field, value, t = translate) {
  const ft = field?.fieldType || 'text';
  const yes = t('components.ExplorationDynamicFieldBlock.نعم', 'نعم');
  const no = t('components.ExplorationDynamicFieldBlock.لا', 'لا');

  if (ft === 'date_range') {
    const from = String(value?.from ?? '').trim();
    const to = String(value?.to ?? '').trim();
    if (!from && !to) return '—';
    return `${from || '…'} ← ${to || '…'}`;
  }
  if (ft === 'location') {
    const lat = String(value?.lat ?? '').trim();
    const lng = String(value?.lng ?? '').trim();
    if (!lat && !lng) return '—';
    return `(${lat || '—'}, ${lng || '—'})`;
  }
  if (ft === 'multi_select' || ft === 'tag') {
    return Array.isArray(value) && value.length > 0 ? value.join('، ') : '—';
  }
  if (ft === 'checkbox' || ft === 'switch') {
    return value === true ? yes : no;
  }
  if (ft === 'yes_no') {
    if (value === 'yes') return yes;
    if (value === 'no') return no;
    return '—';
  }
  if (ft === 'password') {
    return value ? '••••••' : '—';
  }
  if (ft === 'color') {
    const v = String(value ?? '').trim();
    return v || '—';
  }
  if (ft === 'rating') {
    if (value === '' || value == null) return '—';
    const n = Number(value);
    return Number.isFinite(n) ? `${n} / ${field?.max ?? 5}` : '—';
  }
  if (ft === 'percentage') {
    if (value === '' || value == null) return '—';
    const n = Number(value);
    return Number.isFinite(n) ? `${n}%` : '—';
  }
  if (MEDIA_LIKE.has(ft)) {
    const v = String(value ?? '').trim();
    return v || '—';
  }
  if (value == null || value === '') return '—';
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch { return '—'; }
  }
  return String(value);
}

/** تنظيف القيم قبل الحفظ (إزالة حقول لم تعد في المخطط) */
export function sanitizeFieldValuesForSave(schemaFields, fieldValues) {
  const allowed = new Set(schemaFields.map((x) => x.id));
  const out = {};
  for (const id of allowed) {
    const f = schemaFields.find((x) => x.id === id);
    let v = fieldValues?.[id];

    if (f.fieldType === 'hidden') {
      out[id] = f.defaultValue != null && f.defaultValue !== '' ? f.defaultValue : String(v ?? '');
      continue;
    }

    if (NUMERIC_LIKE.has(f.fieldType) || f.fieldType === 'rating') {
      if (v === '' || v == null) {
        out[id] = null;
      } else {
        const n = Number(v);
        out[id] = Number.isFinite(n) ? n : null;
      }
    } else if (f.fieldType === 'date_range' && v && typeof v === 'object') {
      out[id] = { from: String(v.from || '').trim(), to: String(v.to || '').trim() };
    } else if (f.fieldType === 'location' && v && typeof v === 'object') {
      out[id] = {
        lat: String(v.lat ?? '').trim(),
        lng: String(v.lng ?? '').trim(),
      };
    } else if (f.fieldType === 'yes_no') {
      out[id] = v === 'yes' || v === 'no' ? v : '';
    } else if (f.fieldType === 'checkbox' || f.fieldType === 'switch') {
      out[id] = Boolean(v);
    } else if (f.fieldType === 'multi_select' || f.fieldType === 'tag') {
      out[id] = Array.isArray(v) ? v.map((x) => String(x ?? '').trim()).filter(Boolean) : [];
    } else {
      out[id] = v;
    }
  }
  return out;
}
