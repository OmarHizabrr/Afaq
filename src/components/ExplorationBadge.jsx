import React from 'react';
import { Compass } from 'lucide-react';
import { useExplorationTypesCache } from '../hooks/useExplorationTypesCache';

/**
 * شريحة صغيرة تُظهر أن السجل أُنشئ من نموذج استكشاف، مع اسم النوع وأيقونة
 * للنقر لعرض القيم. تُخفى تلقائياً إن لم يكن للسجل بيانات استكشاف.
 *
 * @param {{
 *   record?: { explorationTypeId?: string, explorationTypeName?: string, explorationFieldValues?: Record<string, any> } | null,
 *   onClick?: () => void,
 *   className?: string,
 *   showLabel?: boolean,
 * }} props
 */
const ExplorationBadge = ({ record, onClick, className, showLabel = true }) => {
  const { t } = useAppTranslation();
  const typeId = record?.explorationTypeId;
  const hasValues =
    record?.explorationFieldValues &&
    typeof record.explorationFieldValues === 'object' &&
    Object.keys(record.explorationFieldValues).length > 0;
  const { getById } = useExplorationTypesCache(Boolean(typeId));

  if (!typeId && !hasValues) return null;

  const type = typeId ? getById(typeId) : null;
  const typeName = type?.name || record?.explorationTypeName || t('components.ExplorationBadge.نموذج_الاستكشاف', 'نموذج الاستكشاف');

  const handleClick = (e) => {
    if (onClick) {
      e.stopPropagation();
      onClick();
    }
  };

  return (
    <button
      type="button"
      className={`exploration-badge ${className || ''}`.trim()}
      onClick={handleClick}
      title={t('components.ExplorationBadge.عرض_حقول_نموذج_الاستكشاف', 'عرض حقول نموذج الاستكشاف')}
    >
      <Compass size={13} aria-hidden />
      {showLabel && <span className="exploration-badge__text">{typeName}</span>}
    </button>
  );
};

export default ExplorationBadge;
