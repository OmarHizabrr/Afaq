import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Edit2, Trash2, Tags, X, Save, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import FirestoreApi from '../../services/firestoreApi';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormModal from '../../components/FormModal';
import BusyButton from '../../components/BusyButton';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';
import ExplorationDynamicFieldBlock from '../../components/ExplorationDynamicFieldBlock';
import {
  EXPLORATION_FIELD_TYPE_GROUPS,
  EXPLORATION_FIELD_TYPE_LABEL_MAP,
  FIELD_TYPES_WITH_OPTIONS,
  editorSchemaRowsToFields,
  emptyValueForField,
  initialFieldValues,
  normalizeSchemaFields,
} from '../../utils/explorationDynamicFields';

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
});

const ExplorationTypesPage = () => {
  const { can, actorUser } = usePermissions();
  const storageUserId = actorUser?.uid || actorUser?.id || '';
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [typeName, setTypeName] = useState('');
  const [description, setDescription] = useState('');
  const [schemaFields, setSchemaFields] = useState([]);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewValues, setPreviewValues] = useState({});

  const previewFields = useMemo(() => editorSchemaRowsToFields(schemaFields), [schemaFields]);

  const previewMergeKey = useMemo(
    () =>
      JSON.stringify(
        previewFields.map((f) => ({
          id: f.id,
          fieldType: f.fieldType,
          options: f.options,
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
      setError('تعذر جلب أنواع الاستكشاف.');
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

    if (schemaFieldsToSave.some((f) => FIELD_TYPES_WITH_OPTIONS.has(f.fieldType) && f.options.length === 0)) {
      setError('أي حقل من نوع «قائمة منسدلة / اختيار متعدد / راديو» يجب أن يحتوي سطراً واحداً على الأقل في الخيارات.');
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
            schemaFields: schemaFieldsToSave,
          },
        });
        setSuccess('تم تحديث نوع الاستكشاف.');
      } else {
        const id = api.getNewId('exploration_types');
        await api.setData({
          docRef: api.getExplorationTypeDoc(id),
          data: {
            name: typeName.trim(),
            description: description.trim(),
            schemaFields: schemaFieldsToSave,
          },
        });
        setSuccess('تمت إضافة نوع استكشاف جديد.');
      }
      clearForm();
      setError('');
      fetchTypes();
    } catch (err) {
      console.error(err);
      setError('تعذر حفظ نوع الاستكشاف.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    try {
      const api = FirestoreApi.Api;
      await api.deleteData(api.getExplorationTypeDoc(id));
      setSuccess('تم حذف نوع الاستكشاف.');
      setError('');
      fetchTypes();
    } catch (err) {
      console.error(err);
      setError('تعذر حذف نوع الاستكشاف.');
    }
  };

  const startEdit = (item) => {
    setIsEditing(item);
    setIsAdding(false);
    setTypeName(item.name || '');
    setDescription(item.description || '');
    const raw = item.schemaFields || item.fields || [];
    const normalized = normalizeSchemaFields(raw);
    setSchemaFields(
      normalized.map((f) => ({
        ...f,
        optionsText: Array.isArray(f.options) ? f.options.join('\n') : '',
        min: f.min == null ? '' : String(f.min),
        max: f.max == null ? '' : String(f.max),
        defaultValue: f.defaultValue != null ? String(f.defaultValue) : '',
      }))
    );
  };

  return (
    <div>
      <PageHeader icon={Tags} title="إدارة أنواع الاستكشاف">
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
            <span>إضافة نوع</span>
          </button>
        )}
      </PageHeader>

      {error && <div className="app-alert app-alert--error">{error}</div>}
      {success && <div className="app-alert app-alert--success">{success}</div>}

      <FormModal
        open={isAdding || !!isEditing}
        title={isEditing ? 'تعديل نوع الاستكشاف' : 'إضافة نوع استكشاف'}
        onClose={clearForm}
        size="lg"
      >
        <form onSubmit={onSave}>
          <label className="app-label">الاسم (مطلوب)</label>
          <input
            className="app-input"
            value={typeName}
            onChange={(e) => setTypeName(e.target.value)}
            placeholder="مثال: استكشاف بئر"
            required
            style={{ marginBottom: '0.75rem' }}
          />
          <label className="app-label">وصف مختصر</label>
          <textarea
            className="app-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="تفاصيل إضافية عن النوع (اختياري)"
            style={{ minHeight: '72px', marginBottom: '0.75rem' }}
          />

          <div
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: 10,
              padding: '0.75rem',
              marginBottom: '0.75rem',
              maxHeight: 'min(52vh, 420px)',
              overflow: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong>حقول النموذج لهذا النوع</strong>
              {(can(PERMISSION_PAGE_IDS.exploration_types, 'exploration_type_add') ||
                can(PERMISSION_PAGE_IDS.exploration_types, 'exploration_type_edit')) && (
                <button type="button" className="google-btn" style={{ width: 'auto', marginTop: 0 }} onClick={addSchemaRow}>
                  <Plus size={16} style={{ marginLeft: 6 }} />
                  إضافة حقل
                </button>
              )}
            </div>
            <p style={{ margin: '0 0 10px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              إذا لم تضف أي حقول هنا، سيُستخدم النموذج الكامل الافتراضي عند إدخال استكشاف من هذا النوع. عند وجود حقول، يظهر
              للمستخدم فقط موقع القرية ثم هذه الحقول.
            </p>
            {schemaFields.length === 0 ? (
              <div className="empty-state" style={{ padding: '1rem' }}>
                لا توجد حقول مخصصة بعد. اضغط «إضافة حقل» أو احفظ النوع بلا حقول لاستخدام النموذج الافتراضي.
              </div>
            ) : (
              <>
                {schemaFields.map((row, index) => (
                <div
                  key={row.id}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: 8,
                    padding: '0.65rem',
                    marginBottom: 8,
                    background: 'color-mix(in srgb, var(--bg-color) 92%, var(--panel-color))',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                    <GripVertical size={18} style={{ marginTop: 6, opacity: 0.35, flexShrink: 0 }} aria-hidden />
                    <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                      <label className="app-label">عنوان الحقل</label>
                      <input
                        className="app-input"
                        value={row.label}
                        onChange={(e) => updateSchemaRow(index, { label: e.target.value })}
                        placeholder="مثال: عدد الأسر"
                      />
                    </div>
                    <div style={{ flex: '1 1 140px', minWidth: 0 }}>
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
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 28,
                        whiteSpace: 'nowrap',
                        fontSize: '0.9rem',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={row.required}
                        onChange={(e) => updateSchemaRow(index, { required: e.target.checked })}
                      />
                      مطلوب
                    </label>
                    <div style={{ display: 'flex', gap: 4, marginTop: 22, flexShrink: 0 }}>
                      <button type="button" className="icon-btn" title="أعلى" onClick={() => moveSchemaRow(index, -1)}>
                        <ArrowUp size={16} />
                      </button>
                      <button type="button" className="icon-btn" title="أسفل" onClick={() => moveSchemaRow(index, 1)}>
                        <ArrowDown size={16} />
                      </button>
                      <button type="button" className="icon-btn" title="حذف الحقل" onClick={() => removeSchemaRow(index)}>
                        <Trash2 size={16} color="var(--danger-color)" />
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, marginTop: 8 }}>
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
                    <div style={{ marginTop: 8 }}>
                      <label className="app-label">الخيارات (سطر لكل خيار)</label>
                      <textarea
                        className="app-input"
                        style={{ minHeight: 88 }}
                        value={row.optionsText}
                        onChange={(e) => updateSchemaRow(index, { optionsText: e.target.value })}
                        placeholder={'الخيار الأول\nالخيار الثاني'}
                      />
                    </div>
                  )}
                  {row.fieldType === 'hidden' && (
                    <div style={{ marginTop: 8 }}>
                      <label className="app-label">القيمة المحفوظة (لا تظهر في نموذج الاستكشاف)</label>
                      <input
                        className="app-input"
                        value={row.defaultValue}
                        onChange={(e) => updateSchemaRow(index, { defaultValue: e.target.value })}
                        placeholder="مثال: draft أو معرف داخلي"
                      />
                    </div>
                  )}
                  {previewFields[index] && previewFields[index].fieldType !== 'hidden' && (
                    <div
                      style={{
                        marginTop: 12,
                        paddingTop: 10,
                        borderTop: '1px dashed color-mix(in srgb, var(--border-color) 80%, transparent)',
                      }}
                    >
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>
                        معاينة هذا الحقل (يتغيّر حسب النوع)
                      </div>
                      <div className="exploration-form-grid" style={{ gridTemplateColumns: '1fr', maxWidth: 560 }}>
                        <ExplorationDynamicFieldBlock
                          key={`${previewFields[index].id}-${previewFields[index].fieldType}`}
                          fields={[previewFields[index]]}
                          values={{
                            [previewFields[index].id]:
                              previewValues[previewFields[index].id] ?? emptyValueForField(previewFields[index]),
                          }}
                          onChange={setPreviewFieldValue}
                          storageUserId={storageUserId}
                        />
                      </div>
                    </div>
                  )}
                </div>
                ))}
                {previewFields.length > 0 && (
                  <div
                    style={{
                      marginTop: 14,
                      padding: '0.75rem',
                      borderRadius: 8,
                      border: '1px solid color-mix(in srgb, var(--accent-color) 35%, var(--border-color))',
                      background: 'color-mix(in srgb, var(--panel-color) 88%, var(--bg-color))',
                    }}
                  >
                    <strong style={{ display: 'block', marginBottom: 4 }}>معاينة النموذج كاملاً</strong>
                    <p style={{ margin: '0 0 10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      هكذا تظهر الحقول للمستخدم عند إدخال استكشاف من هذا النوع (بعد اختيار القرية). الحقول المخفية لا
                      تظهر هنا.
                    </p>
                    <div className="exploration-form-grid">
                      <ExplorationDynamicFieldBlock
                        fields={previewFields.filter((f) => f.fieldType !== 'hidden')}
                        values={previewValues}
                        onChange={setPreviewFieldValue}
                        storageUserId={storageUserId}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="google-btn" style={{ width: 'auto' }} onClick={clearForm}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <X size={14} /> إلغاء
              </span>
            </button>
            <BusyButton type="submit" busy={saving} className="google-btn google-btn--filled" style={{ width: 'auto' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Save size={14} /> حفظ
              </span>
            </BusyButton>
          </div>
        </form>
      </FormModal>

      {loading ? (
        <div className="loading-spinner" style={{ margin: '2rem auto' }} />
      ) : types.length === 0 ? (
        <div className="empty-state">لا توجد أنواع استكشاف مضافة حتى الآن.</div>
      ) : (
        <div className="entity-grid entity-grid--md">
          {types.map((item) => {
            const n = normalizeSchemaFields(item.schemaFields || item.fields || []).length;
            return (
              <div key={item.id} className="surface-card surface-card--entity">
                <div>
                  <h3 style={{ margin: 0 }}>{item.name || 'بدون اسم'}</h3>
                  <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {item.description || 'بدون وصف'}
                  </p>
                  <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {n === 0 ? 'يستخدم النموذج الافتراضي الكامل' : `${n} حقل مخصص في النموذج`}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {can(PERMISSION_PAGE_IDS.exploration_types, 'exploration_type_edit') && (
                    <button type="button" className="icon-btn" title="تعديل" onClick={() => startEdit(item)}>
                      <Edit2 size={16} />
                    </button>
                  )}
                  {can(PERMISSION_PAGE_IDS.exploration_types, 'exploration_type_delete') && (
                    <button
                      type="button"
                      className="icon-btn"
                      title="حذف"
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

      <ConfirmDialog
        open={!!pendingDelete}
        title="تأكيد حذف نوع الاستكشاف"
        message={`سيتم حذف النوع "${pendingDelete?.name || ''}" نهائياً.`}
        danger
        confirmLabel="حذف نهائي"
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
