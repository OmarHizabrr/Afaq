import React from 'react';

const VillageSchoolCheckboxGroup = ({ schools = [], selectedIds = [], onToggle, disabled = false }) => {
  if (!schools.length) return null;

  return (
    <div className="villages-school-checks" role="group" aria-label="اختيار المدارس">
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
