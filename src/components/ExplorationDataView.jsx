import React, { useMemo } from 'react';
import {
  normalizeSchemaFields,
  formatFieldValueForDisplay,
} from '../utils/explorationDynamicFields';
import { useExplorationTypesCache } from '../hooks/useExplorationTypesCache';
import useAppTranslation from '../hooks/useAppTranslation';

/**
 * عرض قراءة فقط لقيم حقول نموذج الاستكشاف لسجل تم إنشاؤه عبر نموذج استكشاف.
 * يبحث عن مخطط النوع من الكاش الجلوبال للتسميات؛ وإن لم يجده يعرض المفاتيح الخام.
 *
 * @param {{
 *   explorationTypeId?: string,
 *   explorationTypeName?: string,
 *   explorationFieldValues?: Record<string, any>,
 *   compact?: boolean,
 * }} props
 */
const ExplorationDataView = ({
  explorationTypeId,
  explorationTypeName,
  explorationFieldValues,
  compact = false,
}) => {
  const { t } = useAppTranslation();
  const { getById, loading } = useExplorationTypesCache(true);
  const type = explorationTypeId ? getById(explorationTypeId) : null;

  const schemaFields = useMemo(
    () => normalizeSchemaFields(type?.schemaFields || type?.fields || []),
    [type]
  );

  const values = explorationFieldValues && typeof explorationFieldValues === 'object'
    ? explorationFieldValues
    : {};
  const keys = Object.keys(values);
  const hasAny = keys.length > 0 || schemaFields.length > 0;

  const displayTypeName = type?.name || explorationTypeName || '';

  if (!explorationTypeId && !hasAny) {
    return (
      <div className="exploration-data-view exploration-data-view--empty">
        لا توجد بيانات نموذج استكشاف لهذا السجل.
      </div>
    );
  }

  return (
    <div className={`exploration-data-view ${compact ? 'exploration-data-view--compact' : ''}`.trim()}>
      {displayTypeName && (
        <div className="exploration-data-view__type">
          <span className="exploration-data-view__type-label">{t('utils.schoolReportExport.النوع', 'النوع')}</span>
          <span className="exploration-data-view__type-name">{displayTypeName}</span>
        </div>
      )}
      {loading && !type && (
        <div className="exploration-data-view__loading">{t('components.ExplorationDataView.جاري_تحميل_بنية_النموذج', 'جاري تحميل بنية النموذج…')}</div>
      )}
      <dl className="exploration-data-view__list">
        {schemaFields.length > 0
          ? schemaFields.map((f) => (
              <div key={f.id} className="exploration-data-view__row">
                <dt className="exploration-data-view__label">{f.label}</dt>
                <dd className="exploration-data-view__value">
                  {formatFieldValueForDisplay(f, values[f.id])}
                </dd>
              </div>
            ))
          : keys.map((k) => (
              <div key={k} className="exploration-data-view__row">
                <dt className="exploration-data-view__label">{k}</dt>
                <dd className="exploration-data-view__value">
                  {formatFieldValueForDisplay({ fieldType: 'text' }, values[k])}
                </dd>
              </div>
            ))}
      </dl>
    </div>
  );
};

export default ExplorationDataView;
