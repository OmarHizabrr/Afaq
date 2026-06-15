import React from 'react';

const YesNoRadio = ({ label, name, value, onChange, required = false }) => (
  <fieldset className="yes-no-radio">
    {label && <legend className="yes-no-radio__legend">{label}</legend>}
    <div className="yes-no-radio__options" role="radiogroup" aria-label={label}>
      {[
        { val: 'نعم', id: `${name}-yes` },
        { val: 'لا', id: `${name}-no` },
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

export default YesNoRadio;
