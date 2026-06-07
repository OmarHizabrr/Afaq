import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FirestoreApi from '../services/firestoreApi';
import {
  normalizeSchemaFields,
  initialFieldValues,
  validateFieldValues,
  sanitizeFieldValuesForSave,
} from '../utils/explorationDynamicFields';
import { filterExplorationTypesForPage } from '../utils/explorationTargetPages';
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
 * @param {boolean} open
 * @param {{ uid?: string, id?: string }} [actorUser]
 * @param {{ typeId?: string, values?: Record<string, any> } | null} [seed]
 * @param {string | null} [pageId] — عند التمرير تُعرض فقط الأنواع المسموح بها لهذه الصفحة
 */
export function useExplorationForm(open, actorUser, seed = null, pageId = null) {
  const [explorationTypes, setExplorationTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [fieldValues, setFieldValues] = useState({});
  const pendingSeedRef = useRef(null);

  const visibleExplorationTypes = useMemo(
    () =>
      filterExplorationTypesForPage(explorationTypes, pageId, {
        alwaysIncludeIds: seed?.typeId ? [seed.typeId] : [],
      }),
    [explorationTypes, pageId, seed?.typeId]
  );

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
    } finally {
      setTypesLoading(false);
    }
  }, [explorationTypes.length, typesLoading]);

  useEffect(() => {
    if (!open) {
      pendingSeedRef.current = null;
      return;
    }
    pendingSeedRef.current = seed ? { ...seed } : null;
    if (seed?.typeId) {
      setSelectedTypeId(seed.typeId);
    }
    loadTypesOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loadTypesOnce]);

  useEffect(() => {
    if (!open || typesLoading || explorationTypes.length === 0) return;
    if (seed?.typeId) return;
    const visible = filterExplorationTypesForPage(explorationTypes, pageId);
    if (visible.length === 0) {
      if (selectedTypeId) setSelectedTypeId('');
      return;
    }
    if (!selectedTypeId || !visible.some((t) => t.id === selectedTypeId)) {
      setSelectedTypeId(visible[0].id);
    }
  }, [open, typesLoading, explorationTypes, pageId, selectedTypeId, seed?.typeId]);

  useEffect(() => {
    if (!open) return;
    if (schemaFields.length === 0) {
      setFieldValues({});
      return;
    }
    const pending = pendingSeedRef.current;
    if (pending && pending.values && pending.typeId === selectedTypeId) {
      setFieldValues(initialFieldValues(schemaFields, pending.values));
      pendingSeedRef.current = null;
      return;
    }
    setFieldValues((prev) => initialFieldValues(schemaFields, prev || {}));
  }, [open, schemaFields, selectedTypeId]);

  const setDynamicValue = useCallback((fieldId, value) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const reset = useCallback(() => {
    setFieldValues({});
    const visible = filterExplorationTypesForPage(explorationTypes, pageId);
    setSelectedTypeId(visible[0]?.id || '');
  }, [explorationTypes, pageId]);

  const validate = useCallback(
    () => validateFieldValues(schemaFields, fieldValues),
    [schemaFields, fieldValues]
  );

  const sanitize = useCallback(
    () => (schemaFields.length > 0 ? sanitizeFieldValuesForSave(schemaFields, fieldValues) : {}),
    [schemaFields, fieldValues]
  );

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
    visibleExplorationTypes,
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
    pageId,
  };
}
