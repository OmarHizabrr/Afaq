import React from 'react';
import useAppTranslation from '../hooks/useAppTranslation';

const YesNoRadio = ({ label, name, value, onChange, required = false }) => {
  const { t } = useAppTranslation();
  return (
  <fieldset className="yes-no-radio">
    {label && <legend className="yes-no-radio__legend">{label}</legend>}
    <div className="yes-no-radio__options" role="radiogroup" aria-label={label}>
      {[
        { val: t('components.ExplorationDynamicFieldBlock.نعم', 'نعم'), id: `${name}-yes` },
        { val: t('components.ExplorationDynamicFieldBlock.لا', 'لا'), id: `${name}-no` },
      ].map(({ val, id }) => (
        <label key={val} className={`yes-no-radio__option ${value === val ? 'yes-no-radio__option--active' : ''}`}>
          <input
            type="radio"
            name={name}
            id={id}
            value={val}
            checked={value === val}
            onChange={() => onChange(val)}
            required={required}
          />
          <span>{val}</span>
        </label>
      ))}
    </div>
  </fieldset>
);

};

export default YesNoRadio;
