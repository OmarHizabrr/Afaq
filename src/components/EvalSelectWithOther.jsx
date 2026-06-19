import React from 'react';
import AppSelect from './AppSelect';
import { EVAL_OTHER_VALUE } from '../utils/reportEvalOptions';
import useAppTranslation from '../hooks/useAppTranslation';


/**
 * قائمة تقييم مع خيار «أخرى» يفتح حقل نص حر.
 */
export default function EvalSelectWithOther({
  label,
  value,
  otherValue,
  onChange,
  onOtherChange,
  options,
  searchable = true,
  placeholder,
}) {
  const { t } = useAppTranslation();
  const resolvedPlaceholder = placeholder ?? t('components.EvalSelectWithOther.اكتب_التقييم_أو_الملاحظة', 'اكتب التقييم أو الملاحظة...');
  const isOther = value === EVAL_OTHER_VALUE;

  return (
    <div className="eval-select-with-other">
      {label && <span className="report-field__label">{label}</span>}
      <AppSelect
        searchable={searchable}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="eval-select-with-other__select"
      >
        <option value="">{t('components.EvalSelectWithOther.اختر', '— اختر —')}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </AppSelect>
      {isOther && (
        <input
          type="text"
          className="app-input eval-select-with-other__custom"
          value={otherValue}
          onChange={(e) => onOtherChange(e.target.value)}
          placeholder={resolvedPlaceholder}
        />
      )}
    </div>
  );
}
