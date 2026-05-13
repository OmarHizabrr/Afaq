import { useCallback, useEffect, useMemo, useState } from 'react';
import FirestoreApi from '../services/firestoreApi';
import {
  normalizeSchemaFields,
  initialFieldValues,
  validateFieldValues,
  sanitizeFieldValuesForSave,
} from '../utils/explorationDynamicFields';
import { useExplorationOptionCaches } from './useExplorationOptionCaches';

/** أنواع الحقول النصية التي تعتبر "اسم/قيمة قابلة للعرض" */
const TEXT_LIKE_TYPES = new Set([
  'text',
  'textarea',
  'search',
  'rich_text',
  'tag',
]);

/** كلمات دلالية للبحث عن حقل يمثل "اسماً" داخل المخطط */
const NAME_HINT_RE = /(اسم|الاسم|name|title|عنوان|displayname)/i;

/**
 * يدير حالة "الإضافة من نموذج الاستكشاف" داخل صفحات قوائم البيانات:
 * - يحمّل أنواع الاستكشاف عند فتح المودال أول مرة
 * - يدير النوع المختار وقيم الحقول الديناميكية
 * - يدمج خيارات القوائم من بيانات المنصة
 * - يوفر دوال التحقق والتنظيف قبل الحفظ
 *
 * @param {boolean} open — هل المودال مفتوح حالياً (لتفعيل التحميل والكاش)
 * @param {{ uid?: string, id?: string }} [actorUser]
 */
export function useExplorationForm(open, actorUser) {
  const [explorationTypes, setExplorationTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [fieldValues, setFieldValues] = useState({});

  const selectedType = useMemo(
    () => explorationTypes.find((t) => t.id === selectedTypeId) || null,
    [explorationTypes, selectedTypeId]
  );

  const schemaFields = useMemo(
    () => normalizeSchemaFields(selectedType?.schemaFields || selectedType?.fields || []),
    [selectedType]
  );

  const { mergeFields, loading: optionCachesLoading } = useExplorationOptionCaches(open);

  const mergedFields = useMemo(
    () => mergeFields(schemaFields, fieldValues, actorUser),
    [mergeFields, schemaFields, fieldValues, actorUser]
  );

  const loadTypesOnce = useCallback(async () => {
    if (explorationTypes.length > 0 || typesLoading) return;
    setTypesLoading(true);
    try {
      const api = FirestoreApi.Api;
      const docs = await api.getDocuments(api.getExplorationTypesCollection());
      const rows = docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar'));
      setExplorationTypes(rows);
      if (rows.length > 0) {
        setSelectedTypeId((curr) => curr || rows[0].id);
      }
    } finally {
      setTypesLoading(false);
    }
  }, [explorationTypes.length, typesLoading]);

  useEffect(() => {
    if (!open) return;
    loadTypesOnce();
  }, [open, loadTypesOnce]);

  useEffect(() => {
    if (!open) return;
    if (schemaFields.length === 0) {
      setFieldValues({});
      return;
    }
    setFieldValues((prev) => initialFieldValues(schemaFields, prev || {}));
  }, [open, schemaFields]);

  const setDynamicValue = useCallback((fieldId, value) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const reset = useCallback(() => {
    setFieldValues({});
  }, []);

  const validate = useCallback(
    () => validateFieldValues(schemaFields, fieldValues),
    [schemaFields, fieldValues]
  );

  const sanitize = useCallback(
    () => (schemaFields.length > 0 ? sanitizeFieldValuesForSave(schemaFields, fieldValues) : {}),
    [schemaFields, fieldValues]
  );

  /**
   * يرجع قيمة أول حقل في المخطط مصدره من مجموعة بيانات المنصة المحددة
   * (مثل 'governorates' أو 'regions'... إلخ). يعيد سلسلة فارغة إن لم يوجد.
   */
  const getValueBySource = useCallback(
    (sourceId) => {
      if (!sourceId) return '';
      const field = schemaFields.find((f) => f.optionSource === sourceId);
      if (!field) return '';
      const raw = fieldValues?.[field.id];
      if (Array.isArray(raw)) return raw.length ? String(raw[0]) : '';
      return raw == null ? '' : String(raw).trim();
    },
    [schemaFields, fieldValues]
  );

  /**
   * يرجع قيمة أول حقل من نوع معيّن (text, email, tel, password, number...).
   */
  const getValueByType = useCallback(
    (fieldType) => {
      if (!fieldType) return '';
      const field = schemaFields.find((f) => f.fieldType === fieldType);
      if (!field) return '';
      const raw = fieldValues?.[field.id];
      return raw == null ? '' : String(raw);
    },
    [schemaFields, fieldValues]
  );

  /**
   * يحاول استخراج اسم عرض ملائم من حقول الاستكشاف:
   * 1) أول حقل نصي ملصقه/معرّفه يحتوي إحدى كلمات الاسم
   * 2) أول حقل نصي به قيمة
   * 3) قيمة احتياطية (مثلاً اسم نوع الاستكشاف)
   */
  const deriveDisplayName = useCallback(
    (fallback = '') => {
      const matched = schemaFields.find(
        (f) =>
          TEXT_LIKE_TYPES.has(f.fieldType) &&
          (NAME_HINT_RE.test(String(f.label || '')) || NAME_HINT_RE.test(String(f.id || '')))
      );
      if (matched) {
        const v = String(fieldValues?.[matched.id] ?? '').trim();
        if (v) return v;
      }
      const firstText = schemaFields.find(
        (f) => TEXT_LIKE_TYPES.has(f.fieldType) && String(fieldValues?.[f.id] ?? '').trim()
      );
      if (firstText) return String(fieldValues[firstText.id]).trim();
      return String(fallback || '').trim();
    },
    [schemaFields, fieldValues]
  );

  return {
    explorationTypes,
    typesLoading,
    selectedTypeId,
    setSelectedTypeId,
    selectedType,
    schemaFields,
    mergedFields,
    optionCachesLoading,
    fieldValues,
    setDynamicValue,
    reset,
    validate,
    sanitize,
    getValueBySource,
    getValueByType,
    deriveDisplayName,
  };
}
