import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Edit2, Trash2, Tags, X, Save, GripVertical, ArrowUp, ArrowDown, Eye, LayoutList, MapPin } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import FirestoreApi from '../../services/firestoreApi';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormModal from '../../components/FormModal';
import BusyButton from '../../components/BusyButton';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';
import ExplorationDynamicFieldBlock from '../../components/ExplorationDynamicFieldBlock';
import ExplorationTargetPagesPicker from '../../components/ExplorationTargetPagesPicker';
import ExplorationTypePreviewModal from '../../components/ExplorationTypePreviewModal';
import {
  EXPLORATION_FIELD_TYPE_GROUPS,
  EXPLORATION_FIELD_TYPE_LABEL_MAP,
  EXPLORATION_VALUE_SOURCES,
  FIELD_TYPES_WITH_OPTIONS,
  editorSchemaRowsToFields,
  emptyValueForField,
  initialFieldValues,
  normalizeSchemaFields,
} from '../../utils/explorationDynamicFields';
import { EXPLORATION_OPTION_SOURCES, EXPLORATION_USER_ROLE_FILTERS, EXPLORATION_OPTION_SOURCE_SUPPORTS_DEPENDS } from '../../services/explorationFieldOptions';
import { useExplorationOptionCaches } from '../../hooks/useExplorationOptionCaches';
import { invalidateExplorationTypesCache } from '../../hooks/useExplorationTypesCache';
import {
  formatAllowedPagesSummary,
  getTargetPageLabel,
  normalizeAllowedPageIds,
} from '../../utils/explorationTargetPages';
import './ExplorationTypesPage.css';

const emptySchemaRow = (api) => ({
  id: api.getNewId('expl_field'),
  label: '',
  fieldType: 'text',
  required: false,
  placeholder: '',
  optionsText: '',
  min: '',
  max: '',
  defaultValue: '',
  optionSource: 'manual',
  dependsOnFieldId: '',
  userRoleFilter: 'all',
  valueSource: '',
});

const ExplorationTypesPage = () => {
  const { t } = useAppTranslation();
  const { can, actorUser } = usePermissions();
  const storageUserId = actorUser?.uid || actorUser?.id || '';
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [typeName, setTypeName] = useState('');
  const [description, setDescription] = useState('');
  const [allowedPageIds, setAllowedPageIds] = useState([]);
  const [schemaFields, setSchemaFields] = useState([]);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [viewingType, setViewingType] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewValues, setPreviewValues] = useState({});

  const previewFields = useMemo(() => editorSchemaRowsToFields(schemaFields), [schemaFields]);

  const { mergeFields, loading: optionCachesLoading } = useExplorationOptionCaches(Boolean(isAdding || isEditing));

  const mergedPreviewFields = useMemo(
    () => mergeFields(previewFields, previewValues, actorUser),
    [mergeFields, previewFields, previewValues, actorUser]
  );

  const previewMergeKey = useMemo(
    () =>
      JSON.stringify(
        previewFields.map((f) => ({
          id: f.id,
          fieldType: f.fieldType,
          options: f.options,
          optionSource: f.optionSource,
          dependsOnFieldId: f.dependsOnFieldId,
          userRoleFilter: f.userRoleFilter,
          valueSource: f.valueSource,
          min: f.min,
          max: f.max,
          required: f.required,
          defaultValue: f.defaultValue,
        }))
      ),
    [previewFields]
  );

  const previewStructureKeyRef = useRef('');

  useEffect(() => {
    if (previewStructureKeyRef.current !== previewMergeKey) {
      previewStructureKeyRef.current = previewMergeKey;
      setPreviewValues(initialFieldValues(previewFields, {}));
      return;
    }
    setPreviewValues((prev) => initialFieldValues(previewFields, prev));
  }, [previewFields, previewMergeKey]);

  const setPreviewFieldValue = useCallback((id, val) => {
    setPreviewValues((prev) => ({ ...prev, [id]: val }));
  }, []);

  const fetchTypes = useCallback(async () => {
    setLoading(true);
    try {
      const api = FirestoreApi.Api;
      const docs = await api.getDocuments(api.getExplorationTypesCollection());
      const rows = docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar'));
      setTypes(rows);
    } catch (err) {
      console.error(err);
      setError(t('pages.ExplorationTypesPage.تعذر_جلب_أنواع_الاستكشاف', 'تعذر جلب أنواع الاستكشاف.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 5000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 3500);
    return () => clearTimeout(t);
  }, [success]);

  const clearForm = () => {
    previewStructureKeyRef.current = '';
    setTypeName('');
    setDescription('');
    setAllowedPageIds([]);
    setSchemaFields([]);
    setIsAdding(false);
    setIsEditing(null);
  };

  const addSchemaRow = () => {
    const api = FirestoreApi.Api;
    setSchemaFields((prev) => [...prev, emptySchemaRow(api)]);
  };

  const updateSchemaRow = (index, patch) => {
    setSchemaFields((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeSchemaRow = (index) => {
    setSchemaFields((prev) => prev.filter((_, i) => i !== index));
  };

  const moveSchemaRow = (index, dir) => {
    setSchemaFields((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const onSave = async (e) => {
    e.preventDefault();
    if (!typeName.trim() || saving) return;

    const api = FirestoreApi.Api;
    const schemaFieldsToSave = editorSchemaRowsToFields(schemaFields, {
      ensureId: (i, row) => String(row.id || '').trim() || api.getNewId('expl_field'),
    });

    if (
      schemaFieldsToSave.some((f) => {
        if (!FIELD_TYPES_WITH_OPTIONS.has(f.fieldType)) return false;
        if ((f.optionSource || 'manual') !== 'manual') return false;
        return f.options.length === 0;
      })
    ) {
      setError(t('pages.ExplorationTypesPage.أي_حقل_يدوي_من_نوع_قائمة_منسدلة_اختيار_متعدد_راديو_يجب_أن_يح', 'أي حقل يدوي من نوع «قائمة منسدلة / اختيار متعدد / راديو» يجب أن يحتوي سطراً واحداً على الأقل في الخيارات، أو اختر مصدر بيانات من المنصة.'));
      return;
    }

    try {
      setSaving(true);
      if (isEditing) {
        await api.updateData({
          docRef: api.getExplorationTypeDoc(isEditing.id),
          data: {
            name: typeName.trim(),
            description: description.trim(),
            allowedPageIds: normalizeAllowedPageIds(allowedPageIds),
            schemaFields: schemaFieldsToSave,
          },
        });
        setSuccess(t('pages.ExplorationTypesPage.تم_تحديث_نوع_الاستكشاف', 'تم تحديث نوع الاستكشاف.'));
      } else {
        const id = api.getNewId('exploration_types');
        await api.setData({
          docRef: api.getExplorationTypeDoc(id),
          data: {
            name: typeName.trim(),
            description: description.trim(),
            allowedPageIds: normalizeAllowedPageIds(allowedPageIds),
            schemaFields: schemaFieldsToSave,
          },
        });
        setSuccess(t('pages.ExplorationTypesPage.تمت_إضافة_نوع_استكشاف_جديد', 'تمت إضافة نوع استكشاف جديد.'));
      }
      invalidateExplorationTypesCache();
      clearForm();
      setError('');
      fetchTypes();
    } catch (err) {
      console.error(err);
      setError(t('pages.ExplorationTypesPage.تعذر_حفظ_نوع_الاستكشاف', 'تعذر حفظ نوع الاستكشاف.'));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    try {
      const api = FirestoreApi.Api;
      await api.deleteData(api.getExplorationTypeDoc(id));
      invalidateExplorationTypesCache();
      setSuccess(t('pages.ExplorationTypesPage.تم_حذف_نوع_الاستكشاف', 'تم حذف نوع الاستكشاف.'));
      setError('');
      fetchTypes();
    } catch (err) {
      console.error(err);
      setError(t('pages.ExplorationTypesPage.تعذر_حذف_نوع_الاستكشاف', 'تعذر حذف نوع الاستكشاف.'));
    }
  };

  const startEdit = (item) => {
    setIsEditing(item);
    setIsAdding(false);
    setTypeName(item.name || '');
    setDescription(item.description || '');
    setAllowedPageIds(normalizeAllowedPageIds(item.allowedPageIds));
    const raw = item.schemaFields || item.fields || [];
    const normalized = normalizeSchemaFields(raw);
    setSchemaFields(
      normalized.map((f) => ({
        ...f,
        optionsText: Array.isArray(f.options) ? f.options.join('\n') : '',
        min: f.min == null ? '' : String(f.min),
        max: f.max == null ? '' : String(f.max),
        defaultValue: f.defaultValue != null ? String(f.defaultValue) : '',
        optionSource: f.optionSource || 'manual',
        dependsOnFieldId: f.dependsOnFieldId || '',
        userRoleFilter: f.userRoleFilter || 'all',
        valueSource: f.valueSource || '',
      }))
    );
  };

  return (
    <div className="exploration-types-page">
      <PageHeader icon={Tags} title={t('pages.ExplorationTypesPage.إدارة_أنواع_الاستكشاف', 'إدارة أنواع الاستكشاف')}>
        {can(PERMISSION_PAGE_IDS.exploration_types, 'exploration_type_add') && (
          <button
            type="button"
            className="google-btn google-btn--toolbar"
            onClick={() => {
              clearForm();
              setIsAdding(true);
            }}
          >
            <Plus size={18} />
            <span className="exploration-types-toolbar__long">إضافة نوع</span>
            <span className="exploration-types-toolbar__short">{t('components.ReportTextList.إضافة', 'إضافة')}</span>
          </button>
        )}
      </PageHeader>

      {error && <div className="app-alert app-alert--error exploration-types-alert">{error}</div>}
      {success && <div className="app-alert app-alert--success exploration-types-alert">{success}</div>}

      <FormModal
        open={isAdding || !!isEditing}
        title={isEditing ? t('pages.ExplorationTypesPage.تعديل_نوع_الاستكشاف', 'تعديل نوع الاستكشاف') : t('config.permissionRegistry.إضافة_نوع_استكشاف', 'إضافة نوع استكشاف')}
        onClose={clearForm}
        size="lg"
        className="exploration-type-modal"
      >
        <form className="exploration-type-form" onSubmit={onSave}>
          <label className="app-label">الاسم (مطلوب)</label>
          <input
            className="app-input"
            value={typeName}
            onChange={(e) => setTypeName(e.target.value)}
            placeholder={t('pages.ExplorationTypesPage.مثال_استكشاف_بئر', 'مثال: استكشاف بئر')}
            required
          />
          <label className="app-label">وصف مختصر</label>
          <textarea
            className="app-input exploration-type-form__textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('pages.ExplorationTypesPage.تفاصيل_إضافية_عن_النوع_اختياري', 'تفاصيل إضافية عن النوع (اختياري)')}
          />

          <ExplorationTargetPagesPicker value={allowedPageIds} onChange={setAllowedPageIds} />

          <div className="exploration-type-editor__schema-panel">
            <div className="exploration-type-editor__schema-head">
              <div className="exploration-type-editor__schema-title-wrap">
                <h4 className="exploration-type-editor__schema-title">حقول النموذج لهذا النوع</h4>
                <p className="exploration-type-editor__schema-lead">
                  إذا لم تُضف حقول، يُستخدم النموذج الافتراضي الكامل عند إدخال استكشاف من هذا النوع. عند وجود حقول، يظهر
                  للمستخدم موقع القرية ثم هذه الحقول.
                </p>
              </div>
              {(can(PERMISSION_PAGE_IDS.exploration_types, 'exploration_type_add') ||
                can(PERMISSION_PAGE_IDS.exploration_types, 'exploration_type_edit')) && (
                <button type="button" className="google-btn google-btn--toolbar" onClick={addSchemaRow}>
                  <Plus size={16} />
                  <span>إضافة حقل</span>
                </button>
              )}
            </div>
            {schemaFields.length === 0 ? (
              <div className="empty-state exploration-type-editor__empty">
                لا توجد حقول مخصصة بعد. اضغط «إضافة حقل» أو احفظ النوع بلا حقول لاستخدام النموذج الافتراضي.
              </div>
            ) : (
              <>
                {schemaFields.map((row, index) => (
                <div key={row.id} className="exploration-type-editor__field-card">
                  <div className="exploration-type-editor__field-row">
                    <GripVertical size={18} className="exploration-type-editor__grip" aria-hidden />
                    <div className="exploration-type-editor__field-grow">
                      <label className="app-label">عنوان الحقل</label>
                      <input
                        className="app-input"
                        value={row.label}
                        onChange={(e) => updateSchemaRow(index, { label: e.target.value })}
                        placeholder={t('pages.ExplorationTypesPage.مثال_عدد_الأسر', 'مثال: عدد الأسر')}
                      />
                    </div>
                    <div className="exploration-type-editor__field-type">
                      <label className="app-label">نوع الإدخال</label>
                      <select
                        className="app-input"
                        value={row.fieldType}
                        onChange={(e) => updateSchemaRow(index, { fieldType: e.target.value })}
                      >
                        {EXPLORATION_FIELD_TYPE_GROUPS.map((g) => (
                          <optgroup key={g.label} label={g.label}>
                            {g.values.map((val) => (
                              <option key={val} value={val}>
                                {EXPLORATION_FIELD_TYPE_LABEL_MAP.get(val) || val}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    <label className="exploration-type-editor__required">
                      <input
                        type="checkbox"
                        checked={row.required}
                        onChange={(e) => updateSchemaRow(index, { required: e.target.checked })}
                      />
                      مطلوب
                    </label>
                    <div className="exploration-type-editor__row-actions">
                      <button type="button" className="icon-btn" title={t('pages.ExplorationTypesPage.أعلى', 'أعلى')} onClick={() => moveSchemaRow(index, -1)}>
                        <ArrowUp size={16} />
                      </button>
                      <button type="button" className="icon-btn" title={t('pages.ExplorationTypesPage.أسفل', 'أسفل')} onClick={() => moveSchemaRow(index, 1)}>
                        <ArrowDown size={16} />
                      </button>
                      <button type="button" className="icon-btn" title={t('pages.ExplorationTypesPage.حذف_الحقل', 'حذف الحقل')} onClick={() => removeSchemaRow(index)}>
                        <Trash2 size={16} color="var(--danger-color)" />
                      </button>
                    </div>
                  </div>
                  <div className="exploration-type-editor__grid-2">
                    {row.fieldType !== 'hidden' && (
                      <div>
                        <label className="app-label">نص توضيحي (placeholder)</label>
                        <input
                          className="app-input"
                          value={row.placeholder}
                          onChange={(e) => updateSchemaRow(index, { placeholder: e.target.value })}
                        />
                      </div>
                    )}
                    {(row.fieldType === 'number' ||
                      row.fieldType === 'currency' ||
                      row.fieldType === 'percentage' ||
                      row.fieldType === 'range' ||
                      row.fieldType === 'rating') && (
                      <>
                        <div>
                          <label className="app-label">حد أدنى</label>
                          <input
                            className="app-input"
                            inputMode="decimal"
                            value={row.min}
                            onChange={(e) => updateSchemaRow(index, { min: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="app-label">حد أقصى</label>
                          <input
                            className="app-input"
                            inputMode="decimal"
                            value={row.max}
                            onChange={(e) => updateSchemaRow(index, { max: e.target.value })}
                          />
                        </div>
                      </>
                    )}
                  </div>
                  {FIELD_TYPES_WITH_OPTIONS.has(row.fieldType) && (
                    <div className="exploration-type-editor__options-block">
                      <div>
                        <label className="app-label">مصدر الخيارات</label>
                        <select
                          className="app-input"
                          value={row.optionSource || 'manual'}
                          onChange={(e) => updateSchemaRow(index, { optionSource: e.target.value })}
                        >
                          {EXPLORATION_OPTION_SOURCES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {EXPLORATION_OPTION_SOURCE_SUPPORTS_DEPENDS.has(row.optionSource) && (
                        <div>
                          <label className="app-label">يعتمد على حقل (اختياري)</label>
                          <select
                            className="app-input"
                            value={row.dependsOnFieldId || ''}
                            onChange={(e) => updateSchemaRow(index, { dependsOnFieldId: e.target.value })}
                          >
                            <option value="">— مستقل (عرض الكل) —</option>
                            {schemaFields
                              .filter((_, i) => i !== index)
                              .map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.label || r.id} ({EXPLORATION_FIELD_TYPE_LABEL_MAP.get(r.fieldType) || r.fieldType})
                                </option>
                              ))}
                          </select>
                          <p className="exploration-type-editor__hint">
                            المناطق: اربط بحقل محافظات. القرى: بحقل مناطق. المدارس: بحقل قرية أو منطقة. طلاب المدرسة: بحقل
                            مدرسة. المهتدون: بحقل قرية.
                          </p>
                        </div>
                      )}
                      {row.optionSource === 'users' && (
                        <div>
                          <label className="app-label">تصفية المستخدمين</label>
                          <select
                            className="app-input"
                            value={row.userRoleFilter || 'all'}
                            onChange={(e) => updateSchemaRow(index, { userRoleFilter: e.target.value })}
                          >
                            {EXPLORATION_USER_ROLE_FILTERS.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {(row.optionSource || 'manual') === 'manual' && (
                        <div className="exploration-type-editor__options-span">
                          <label className="app-label">الخيارات (سطر لكل خيار)</label>
                          <textarea
                            className="app-input exploration-type-editor__options-textarea"
                            value={row.optionsText}
                            onChange={(e) => updateSchemaRow(index, { optionsText: e.target.value })}
                            placeholder={'الخيار الأول\nالخيار الثاني'}
                          />
                        </div>
                      )}
                      {(row.optionSource || 'manual') !== 'manual' && (
                        <p className="exploration-type-editor__hint--muted exploration-type-editor__options-span">
                          تُحمَّل الخيارات من بيانات المنصة عند المعاينة والاستكشاف. جرّب المعاينة الكاملة واختر قيمة الحقل
                          الأم أولاً عند استخدام الربط التسلسلي.
                        </p>
                      )}
                    </div>
                  )}
                  {(row.fieldType === 'text' || row.fieldType === 'email' || row.fieldType === 'tel') && (
                    <div className="exploration-type-editor__section-divider">
                      <label className="app-label">قيمة من المستخدم الحالي (اختياري)</label>
                      <select
                        className="app-input"
                        value={row.valueSource || ''}
                        onChange={(e) => updateSchemaRow(index, { valueSource: e.target.value })}
                      >
                        {EXPLORATION_VALUE_SOURCES.map((s) => (
                          <option key={s.id === '' ? '_none' : s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {row.fieldType === 'hidden' && (
                    <div className="exploration-type-editor__section-divider">
                      <label className="app-label">القيمة المحفوظة (لا تظهر في نموذج الاستكشاف)</label>
                      <input
                        className="app-input"
                        value={row.defaultValue}
                        onChange={(e) => updateSchemaRow(index, { defaultValue: e.target.value })}
                        placeholder={t('pages.ExplorationTypesPage.مثال_draft_أو_معرف_داخلي', 'مثال: draft أو معرف داخلي')}
                      />
                    </div>
                  )}
                  {mergedPreviewFields[index] && mergedPreviewFields[index].fieldType !== 'hidden' && (
                    <div className="exploration-type-editor__preview-band">
                      <div className="exploration-type-editor__preview-label">
                        <Eye size={15} aria-hidden />
                        معاينة هذا الحقل
                      </div>
                      <div className="exploration-type-editor__preview-shell exploration-modal-flow">
                        <ExplorationDynamicFieldBlock
                          key={`${mergedPreviewFields[index].id}-${mergedPreviewFields[index].fieldType}-${mergedPreviewFields[index].optionSource || 'manual'}`}
                          variant="sheet"
                          fields={[mergedPreviewFields[index]]}
                          values={{
                            [mergedPreviewFields[index].id]:
                              previewValues[mergedPreviewFields[index].id] ?? emptyValueForField(mergedPreviewFields[index]),
                          }}
                          onChange={setPreviewFieldValue}
                          storageUserId={storageUserId}
                          actorUser={actorUser}
                        />
                      </div>
                    </div>
                  )}
                </div>
                ))}
                {mergedPreviewFields.length > 0 && (
                  <div className="exploration-type-editor__preview-full">
                    <div className="exploration-type-editor__preview-full-head">
                      <div>
                        <h4 className="exploration-type-editor__preview-full-title">
                          <LayoutList size={20} aria-hidden />
                          معاينة النموذج كاملاً
                        </h4>
                        <p className="exploration-type-editor__preview-full-desc">
                          كما يظهر للمستخدم عند إدخال استكشاف من هذا النوع. الحقول المخفية لا تُعرض. عند ربط قائمة بحقل
                          آخر، اختر قيمة الحقل الأم في المعاينة لتتحدث القائمة الفرعية.
                        </p>
                      </div>
                    </div>
                    {optionCachesLoading && (
                      <div className="exploration-type-editor__loading-pill" role="status">
                        جاري تحميل بيانات المنصة للقوائم…
                      </div>
                    )}
                    <div className="exploration-modal-flow">
                      <ExplorationDynamicFieldBlock
                        variant="sheet"
                        fields={mergedPreviewFields.filter((f) => f.fieldType !== 'hidden')}
                        values={previewValues}
                        onChange={setPreviewFieldValue}
                        storageUserId={storageUserId}
                        actorUser={actorUser}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="exploration-type-editor__actions">
            <button type="button" className="google-btn exploration-type-editor__action-btn" onClick={clearForm}>
              <span className="exploration-type-editor__btn-inner">
                <X size={14} aria-hidden /> إلغاء
              </span>
            </button>
            <BusyButton type="submit" busy={saving} className="google-btn google-btn--filled exploration-type-editor__action-btn">
              <span className="exploration-type-editor__btn-inner">
                <Save size={14} aria-hidden /> حفظ
              </span>
            </BusyButton>
          </div>
        </form>
      </FormModal>

      {loading ? (
        <div className="loading-spinner page-loading" />
      ) : types.length === 0 ? (
        <div className="empty-state">لا توجد أنواع استكشاف مضافة حتى الآن.</div>
      ) : (
        <div className="entity-grid entity-grid--md exploration-types-grid">
          {types.map((item) => {
            const n = normalizeSchemaFields(item.schemaFields || item.fields || []).length;
            const pagesSummary = formatAllowedPagesSummary(item);
            const pageIds = normalizeAllowedPageIds(item.allowedPageIds);
            return (
              <div key={item.id} className="surface-card surface-card--entity exploration-type-card">
                <div className="exploration-type-card__body">
                  <h3 className="exploration-type-card__title">{item.name || t('components.StudentManagementStudentCard.بدون_اسم', 'بدون اسم')}</h3>
                  <p className="exploration-type-card__desc">{item.description || t('pages.ExplorationTypesPage.بدون_وصف', 'بدون وصف')}</p>
                  <p className="exploration-type-card__meta">
                    {n === 0 ? t('pages.ExplorationTypesPage.يستخدم_النموذج_الافتراضي_الكامل', 'يستخدم النموذج الافتراضي الكامل') : `${n} حقل مخصص في النموذج`}
                  </p>
                  <div className="exploration-type-card__pages" title={pagesSummary}>
                    <MapPin size={13} aria-hidden />
                    <span>{pagesSummary}</span>
                  </div>
                  {pageIds.length > 0 && pageIds.length <= 4 && (
                    <div className="exploration-type-card__page-chips">
                      {pageIds.map((pid) => (
                        <span key={pid} className="exploration-type-card__page-chip">
                          {getTargetPageLabel(pid)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="exploration-type-card__actions">
                  <button
                    type="button"
                    className="icon-btn"
                    title={t('pages.ExplorationTypesPage.معاينة_الحقول', 'معاينة الحقول')}
                    onClick={() => setViewingType(item)}
                  >
                    <Eye size={16} color="var(--accent-color)" />
                  </button>
                  {can(PERMISSION_PAGE_IDS.exploration_types, 'exploration_type_edit') && (
                    <button type="button" className="icon-btn" title={t('components.ExplorationListCard.تعديل', 'تعديل')} onClick={() => startEdit(item)}>
                      <Edit2 size={16} />
                    </button>
                  )}
                  {can(PERMISSION_PAGE_IDS.exploration_types, 'exploration_type_delete') && (
                    <button
                      type="button"
                      className="icon-btn"
                      title={t('components.ExplorationListCard.حذف', 'حذف')}
                      onClick={() => setPendingDelete({ id: item.id, name: item.name })}
                    >
                      <Trash2 size={16} color="var(--danger-color)" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ExplorationTypePreviewModal
        open={!!viewingType}
        type={viewingType}
        onClose={() => setViewingType(null)}
        actorUser={actorUser}
        storageUserId={storageUserId}
        canEdit={can(PERMISSION_PAGE_IDS.exploration_types, 'exploration_type_edit')}
        canDelete={can(PERMISSION_PAGE_IDS.exploration_types, 'exploration_type_delete')}
        onEdit={() => {
          const item = viewingType;
          setViewingType(null);
          if (item) startEdit(item);
        }}
        onDelete={() => {
          const item = viewingType;
          setViewingType(null);
          if (item) setPendingDelete({ id: item.id, name: item.name });
        }}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title={t('pages.ExplorationTypesPage.تأكيد_حذف_نوع_الاستكشاف', 'تأكيد حذف نوع الاستكشاف')}
        message={`سيتم حذف النوع "${pendingDelete?.name || ''}" نهائياً.`}
        danger
        confirmLabel={t('pages.CurriculumPage.حذف_نهائي', 'حذف نهائي')}
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          const item = pendingDelete;
          setPendingDelete(null);
          if (item) await onDelete(item.id);
        }}
      />
    </div>
  );
};

export default ExplorationTypesPage;
