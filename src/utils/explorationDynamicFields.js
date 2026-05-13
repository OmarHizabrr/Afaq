/**
 * حقول الاستكشاف الديناميكية — تعريف الحقول لكل نوع وحفظ القيم في `fieldValues`.
 */

// مصفوفة أنواع حقول الإدخال الشاملة لجميع أنواع البيانات
export const EXPLORATION_FIELD_TYPES = [
  // الحقول النصية
  { value: 'text', label: 'نص قصير' },
  { value: 'textarea', label: 'نص طويل' },
  { value: 'email', label: 'بريد إلكتروني' },
  { value: 'password', label: 'كلمة مرور' },
  { value: 'url', label: 'رابط إلكتروني' },
  { value: 'search', label: 'بحث' },
  { value: 'tel', label: 'رقم هاتف' },

  // الحقول الرقمية والمالية
  { value: 'number', label: 'رقم' },
  { value: 'currency', label: 'عملة (رقم عشري)' },
  { value: 'percentage', label: 'نسبة مئوية' },
  { value: 'range', label: 'منزلق (Range)' },

  // حقول التاريخ والوقت
  { value: 'date', label: 'تاريخ' },
  { value: 'date_range', label: 'تاريخ من — إلى' },
  { value: 'time', label: 'وقت' },
  { value: 'datetime-local', label: 'تاريخ ووقت' },
  { value: 'month', label: 'شهر' },
  { value: 'week', label: 'أسبوع' },

  // حقول الاختيار والقوائم
  { value: 'dropdown', label: 'قائمة منسدلة' },
  { value: 'multi_select', label: 'اختيار متعدد' },
  { value: 'yes_no', label: 'نعم / لا' },
  { value: 'checkbox', label: 'مربع اختيار' },
  { value: 'radio', label: 'زر اختيار (Radio)' },
  { value: 'switch', label: 'مفتاح تبديل (Switch)' },

  // حقول الوسائط والملفات
  { value: 'file', label: 'رفع ملف' },
  { value: 'image', label: 'رفع صورة' },
  { value: 'video', label: 'رفع فيديو' },
  { value: 'audio', label: 'رفع ملف صوتي' },

  // حقول متخصصة
  { value: 'color', label: 'منتقي الألوان' },
  { value: 'location', label: 'موقع جغرافي (إحداثيات)' },
  { value: 'signature', label: 'توقيع إلكتروني' },
  { value: 'rating', label: 'تقييم (Stars)' },
  { value: 'rich_text', label: 'نص منسق (Editor)' },
  { value: 'tag', label: 'وسوم (Tags)' },
  { value: 'hidden', label: 'حقل مخفي' },
];

export const FIELD_TYPE_VALUES = EXPLORATION_FIELD_TYPES.map((t) => t.value);

const ALLOWED_TYPES = new Set(FIELD_TYPE_VALUES);

/** أنواع تحتاج خياراتاً (سطر لكل خيار في المحرر) */
export const FIELD_TYPES_WITH_OPTIONS = new Set(['dropdown', 'multi_select', 'radio']);

/** تجميع أنواع الحقول لقائمة الاختيار في محرر النوع */
export const EXPLORATION_FIELD_TYPE_GROUPS = [
  { label: 'الحقول النصية', values: ['text', 'textarea', 'email', 'password', 'url', 'search', 'tel'] },
  { label: 'الرقمية والمالية', values: ['number', 'currency', 'percentage', 'range'] },
  { label: 'التاريخ والوقت', values: ['date', 'date_range', 'time', 'datetime-local', 'month', 'week'] },
  { label: 'الاختيار والقوائم', values: ['dropdown', 'multi_select', 'yes_no', 'checkbox', 'radio', 'switch'] },
  { label: 'الوسائط والملفات', values: ['file', 'image', 'video', 'audio'] },
  { label: 'متخصصة', values: ['color', 'location', 'signature', 'rating', 'rich_text', 'tag', 'hidden'] },
];

export const EXPLORATION_FIELD_TYPE_LABEL_MAP = new Map(EXPLORATION_FIELD_TYPES.map((t) => [t.value, t.label]));

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

export function normalizeSchemaFields(raw) {
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
        label: String(f?.label ?? '').trim() || `حقل ${index + 1}`,
        fieldType,
        required: Boolean(f?.required),
        placeholder: String(f?.placeholder ?? '').trim(),
        options,
        min: minRaw != null && Number.isFinite(minRaw) ? minRaw : null,
        max: maxRaw != null && Number.isFinite(maxRaw) ? maxRaw : null,
        defaultValue:
          f?.defaultValue === undefined || f?.defaultValue === null ? '' : String(f.defaultValue),
      };
    })
    .filter((f) => f.label.length > 0);
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

export function validateFieldValues(schemaFields, fieldValues) {
  const errs = [];
  for (const f of schemaFields) {
    if (!f.required || f.fieldType === 'hidden') continue;
    const v = fieldValues?.[f.id];

    if (STRING_LIKE.has(f.fieldType)) {
      if (!String(v ?? '').trim()) errs.push(f.label);
      else if (f.fieldType === 'email' && !EMAIL_RE.test(String(v).trim())) errs.push(`${f.label} (بريد غير صالح)`);
      else if (f.fieldType === 'url' && !isValidUrl(String(v).trim())) errs.push(`${f.label} (رابط غير صالح)`);
      else if (f.fieldType === 'tel' && String(v).trim().length < 3) errs.push(f.label);
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
          if (f.min != null && Number.isFinite(f.min) && n < f.min) errs.push(`${f.label} (أقل من الحد الأدنى)`);
          if (f.max != null && Number.isFinite(f.max) && n > f.max) errs.push(`${f.label} (أكبر من الحد الأقصى)`);
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
