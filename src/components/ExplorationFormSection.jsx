import React from 'react';
import { Compass } from 'lucide-react';
import AppSelect from './AppSelect';
import ExplorationDynamicFieldBlock from './ExplorationDynamicFieldBlock';
import { getTargetPageLabel } from '../utils/explorationTargetPages';
import './ExplorationFormSection.css';
import useAppTranslation from '../hooks/useAppTranslation';

const TYPE_CARD_THRESHOLD = 8;

/**
 * قسم قابل لإعادة الاستخدام داخل أي مودال «إضافة من نموذج الاستكشاف»:
 * - منتقي نوع الاستكشاف (بطاقات على الشاشات الصغيرة أو قائمة عند كثرة الأنواع)
 * - بطاقة الحقول الديناميكية (variant=sheet)
 *
 * يستلم controller الناتج من `useExplorationForm`.
 */
const ExplorationFormSection = ({
  controller,
  actorUser,
  storageUserId,
  className,
  heading,
  hideTypeSelect = false,
  currentPageId = null,
}) => {
  const { t } = useAppTranslation();
  const resolvedHeading = heading ?? t('components.ExplorationFormSection.حقول_النموذج', 'حقول النموذج');
  const {
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
  } = controller;

  const useTypeCards = visibleExplorationTypes.length > 0 && visibleExplorationTypes.length <= TYPE_CARD_THRESHOLD;
  const pageHint = currentPageId ? getTargetPageLabel(currentPageId) : '';

  return (
    <div className={`exploration-form-section ${className || ''}`.trim()}>
      {!hideTypeSelect && (
        <>
          {typesLoading ? (
            <div className="app-alert app-alert--info exploration-form-section__alert">
              جاري تحميل أنواع الاستكشاف…
            </div>
          ) : visibleExplorationTypes.length === 0 ? (
            <div className="exploration-form-section__empty">
              <p className="exploration-form-section__empty-title">{t('components.ExplorationFormSection.لا_توجد_أنواع_متاحة_لهذه_الصفحة', 'لا توجد أنواع متاحة لهذه الصفحة')}</p>
              <p className="exploration-form-section__empty-text">
                {pageHint
                  ? `لا يوجد نموذج استكشاف مخصّص لصفحة «${pageHint}». راجع «أنواع الاستكشاف» وحدّد الصفحات المسموحة للنموذج، أو أنشئ نوعاً جديداً.`
                  : t('components.ExplorationFormSection.لا_توجد_أنواع_استكشاف_معرَّفة_أضف_نوعاً_من_أنواع_الاستكشاف_ق', 'لا توجد أنواع استكشاف معرَّفة. أضف نوعاً من «أنواع الاستكشاف» قبل استخدام هذا النموذج.')}
              </p>
            </div>
          ) : useTypeCards ? (
            <div className="app-field app-field--grow exploration-form-section__type-field">
              <label className="app-label">{t('components.ExplorationFormSection.نوع_الاستكشاف', 'نوع الاستكشاف')}</label>
              <div className="exploration-form-section__type-grid" role="listbox" aria-label={t('components.ExplorationFormSection.نوع_الاستكشاف', 'نوع الاستكشاف')}>
                {visibleExplorationTypes.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="option"
                    aria-selected={selectedTypeId === t.id}
                    className={`exploration-form-section__type-card ${selectedTypeId === t.id ? 'exploration-form-section__type-card--active' : ''}`}
                    onClick={() => setSelectedTypeId(t.id)}
                  >
                    <Compass size={18} aria-hidden />
                    <span>{t.name || t.id}</span>
                  </button>
                ))}
              </div>
              {selectedType?.description && (
                <p className="exploration-form-section__type-desc">{selectedType.description}</p>
              )}
            </div>
          ) : (
            <div className="app-field app-field--grow exploration-form-section__type-field">
              <label className="app-label">{t('components.ExplorationFormSection.نوع_الاستكشاف', 'نوع الاستكشاف')}</label>
              <AppSelect
                searchable
                value={selectedTypeId}
                onChange={(e) => setSelectedTypeId(e.target.value)}
              >
                {visibleExplorationTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name || t.id}
                  </option>
                ))}
              </AppSelect>
              {selectedType?.description && (
                <p className="exploration-form-section__type-desc">{selectedType.description}</p>
              )}
            </div>
          )}
        </>
      )}

      {schemaFields.length > 0 && (
        <>
          {resolvedHeading && <h3 className="exploration-form-section__heading">{resolvedHeading}</h3>}
          {optionCachesLoading && (
            <p className="exploration-form-section__loading-hint">
              {t('pages.ExplorationsPage.جاري_تحميل_قوائم_البيانات_من_المنصة', 'جاري تحميل قوائم البيانات من المنصة…')}
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
