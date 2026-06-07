import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Edit2, Trash2, Eye, LayoutList } from 'lucide-react';
import FormModal from './FormModal';
import ExplorationDynamicFieldBlock from './ExplorationDynamicFieldBlock';
import {
  EXPLORATION_FIELD_TYPE_LABEL_MAP,
  initialFieldValues,
  normalizeSchemaFields,
} from '../utils/explorationDynamicFields';
import {
  formatAllowedPagesSummary,
  getTargetPageLabel,
  normalizeAllowedPageIds,
} from '../utils/explorationTargetPages';
import { useExplorationOptionCaches } from '../hooks/useExplorationOptionCaches';
import './ExplorationTypePreviewModal.css';

/**
 * معاينة نوع استكشاف: بنية الحقول + نموذج تفاعلي + اختصار للتعديل/الحذف.
 */
const ExplorationTypePreviewModal = ({
  open,
  type,
  onClose,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false,
  actorUser,
  storageUserId,
}) => {
  const schemaFields = useMemo(
    () => normalizeSchemaFields(type?.schemaFields || type?.fields || []),
    [type]
  );

  const visibleFields = useMemo(
    () => schemaFields.filter((f) => f.fieldType !== 'hidden'),
    [schemaFields]
  );

  const [previewValues, setPreviewValues] = useState({});
  const structureKeyRef = useRef('');

  const structureKey = useMemo(
    () =>
      JSON.stringify(
        schemaFields.map((f) => ({
          id: f.id,
          fieldType: f.fieldType,
          optionSource: f.optionSource,
          dependsOnFieldId: f.dependsOnFieldId,
        }))
      ),
    [schemaFields]
  );

  useEffect(() => {
    if (!open) {
      structureKeyRef.current = '';
      setPreviewValues({});
      return;
    }
    if (structureKeyRef.current !== structureKey) {
      structureKeyRef.current = structureKey;
      setPreviewValues(initialFieldValues(schemaFields, {}));
      return;
    }
    setPreviewValues((prev) => initialFieldValues(schemaFields, prev));
  }, [open, schemaFields, structureKey]);

  const { mergeFields, loading: optionCachesLoading } = useExplorationOptionCaches(open);

  const mergedFields = useMemo(
    () => mergeFields(visibleFields, previewValues, actorUser),
    [mergeFields, visibleFields, previewValues, actorUser]
  );

  const setPreviewFieldValue = useCallback((id, val) => {
    setPreviewValues((prev) => ({ ...prev, [id]: val }));
  }, []);

  if (!type) return null;

  const pageIds = normalizeAllowedPageIds(type.allowedPageIds);
  const pagesSummary = formatAllowedPagesSummary(type);
  const usesDefaultForm = schemaFields.length === 0;

  return (
    <FormModal
      open={open}
      onClose={onClose}
      size="lg"
      title={`معاينة — ${type.name || 'نوع استكشاف'}`}
      className="exploration-type-preview-modal"
    >
      {type.description && (
        <p className="exploration-type-preview__desc">{type.description}</p>
      )}

      <div className="exploration-type-preview__meta-row">
        <span className="exploration-type-preview__meta-pill">{pagesSummary}</span>
        <span className="exploration-type-preview__meta-pill exploration-type-preview__meta-pill--muted">
          {usesDefaultForm ? 'النموذج الافتراضي الكامل' : `${schemaFields.length} حقل`}
        </span>
      </div>

      {pageIds.length > 0 && (
        <div className="exploration-type-preview__page-chips">
          {pageIds.map((pid) => (
            <span key={pid} className="exploration-type-preview__page-chip">
              {getTargetPageLabel(pid)}
            </span>
          ))}
        </div>
      )}

      {usesDefaultForm ? (
        <div className="exploration-type-preview__default-note">
          <Eye size={18} aria-hidden />
          <p>
            هذا النوع لا يحتوي حقولاً مخصصة. عند استخدامه في «قسم الاستكشاف» يُعرض النموذج الافتراضي
            الكامل (الموقع، الديموغرافيا، الخدمات…).
          </p>
        </div>
      ) : (
        <>
          <section className="exploration-type-preview__schema" aria-labelledby="exploration-type-preview-schema-title">
            <h4 id="exploration-type-preview-schema-title" className="exploration-type-preview__section-title">
              بنية الحقول
            </h4>
            <ul className="exploration-type-preview__schema-list">
              {schemaFields.map((f) => (
                <li key={f.id} className="exploration-type-preview__schema-item">
                  <div className="exploration-type-preview__schema-item-head">
                    <span className="exploration-type-preview__schema-label">{f.label}</span>
                    {f.required && (
                      <span className="exploration-type-preview__required-badge">مطلوب</span>
                    )}
                    {f.fieldType === 'hidden' && (
                      <span className="exploration-type-preview__hidden-badge">مخفي</span>
                    )}
                  </div>
                  <div className="exploration-type-preview__schema-meta">
                    <span>{EXPLORATION_FIELD_TYPE_LABEL_MAP.get(f.fieldType) || f.fieldType}</span>
                    {f.optionSource && f.optionSource !== 'manual' && (
                      <span> · مصدر: {f.optionSource}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="exploration-type-preview__live" aria-labelledby="exploration-type-preview-live-title">
            <h4 id="exploration-type-preview-live-title" className="exploration-type-preview__section-title">
              <LayoutList size={18} aria-hidden />
              معاينة النموذج (تفاعلية)
            </h4>
            {optionCachesLoading && (
              <div className="exploration-type-preview__loading" role="status">
                جاري تحميل قوائم البيانات…
              </div>
            )}
            <div className="exploration-modal-flow exploration-type-preview__form-shell">
              <ExplorationDynamicFieldBlock
                variant="sheet"
                fields={mergedFields}
                values={previewValues}
                onChange={setPreviewFieldValue}
                storageUserId={storageUserId}
                actorUser={actorUser}
              />
            </div>
          </section>
        </>
      )}

      <div className="exploration-type-preview__footer">
        <button type="button" className="google-btn" style={{ width: 'auto' }} onClick={onClose}>
          إغلاق
        </button>
        <div className="exploration-type-preview__footer-actions">
          {canEdit && onEdit && (
            <button
              type="button"
              className="google-btn google-btn--toolbar"
              style={{ width: 'auto' }}
              onClick={onEdit}
            >
              <Edit2 size={16} aria-hidden />
              <span>تعديل</span>
            </button>
          )}
          {canDelete && onDelete && (
            <button
              type="button"
              className="google-btn"
              style={{ width: 'auto', color: 'var(--danger-color)' }}
              onClick={onDelete}
            >
              <Trash2 size={16} aria-hidden />
              <span>حذف</span>
            </button>
          )}
        </div>
      </div>
    </FormModal>
  );
};

export default ExplorationTypePreviewModal;
