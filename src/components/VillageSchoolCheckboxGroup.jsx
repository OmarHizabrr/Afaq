import React from 'react';
import useAppTranslation from '../hooks/useAppTranslation';

const VillageSchoolCheckboxGroup = ({ schools = [], selectedIds = [], onToggle, disabled = false }) => {
  const { t } = useAppTranslation();
  if (!schools.length) return null;

  return (
    <div className="villages-school-checks" role="group" aria-label={t('components.VillageSchoolCheckboxGroup.اختيار_المدارس', 'اختيار المدارس')}>
      {schools.map((sch) => (
        <label key={sch.id} className="villages-school-checks__item">
          <input
            type="checkbox"
            checked={selectedIds.includes(sch.id)}
            onChange={() => onToggle(sch.id)}
            disabled={disabled}
          />
          <span>{sch.name}</span>
        </label>
      ))}
    </div>
  );
};

export default VillageSchoolCheckboxGroup;
