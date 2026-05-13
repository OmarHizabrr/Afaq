import React from 'react';
import AppSelect from './AppSelect';
import ExplorationDynamicFieldBlock from './ExplorationDynamicFieldBlock';

/**
 * قسم قابل لإعادة الاستخدام داخل أي مودال «إضافة من نموذج الاستكشاف»:
 * - منتقي نوع الاستكشاف
 * - بطاقة الحقول الديناميكية (variant=sheet) مع دعم الخيارات من بيانات المنصة
 *
 * يستلم controller الناتج من `useExplorationForm`.
 */
const ExplorationFormSection = ({
  controller,
  actorUser,
  storageUserId,
  className,
  heading = 'حقول النموذج',
  hideTypeSelect = false,
}) => {
  const {
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
  } = controller;

  return (
    <div className={`exploration-form-section ${className || ''}`.trim()}>
      {!hideTypeSelect && (
        <>
          {typesLoading ? (
            <div className="app-alert app-alert--info" style={{ marginBottom: '0.75rem' }}>
              جاري تحميل أنواع الاستكشاف…
            </div>
          ) : explorationTypes.length === 0 ? (
            <div className="app-alert app-alert--warning" style={{ marginBottom: '0.75rem' }}>
              لا توجد أنواع استكشاف معرَّفة. أضف نوعاً من «أنواع الاستكشاف» قبل استخدام هذا النموذج.
            </div>
          ) : (
            <div className="app-field app-field--grow" style={{ marginBottom: '0.85rem' }}>
              <label className="app-label">نوع الاستكشاف</label>
              <AppSelect
                searchable
                value={selectedTypeId}
                onChange={(e) => setSelectedTypeId(e.target.value)}
              >
                {explorationTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name || t.id}
                  </option>
                ))}
              </AppSelect>
              {selectedType?.description && (
                <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {selectedType.description}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {schemaFields.length > 0 && (
        <>
          {heading && (
            <h3 className="exploration-form-section__heading" style={{ margin: '0 0 0.5rem' }}>
              {heading}
            </h3>
          )}
          {optionCachesLoading && (
            <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              جاري تحميل قوائم البيانات من المنصة…
            </p>
          )}
          <div className="exploration-modal-flow">
            <ExplorationDynamicFieldBlock
              variant="sheet"
              fields={mergedFields}
              values={fieldValues}
              onChange={setDynamicValue}
              storageUserId={storageUserId}
              actorUser={actorUser}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ExplorationFormSection;
