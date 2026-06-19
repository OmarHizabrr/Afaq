import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import useAppTranslation from '../hooks/useAppTranslation';


const ReportTextList = ({
  label,
  items = [],
  onChange,
  placeholder,
  addLabel,
  emptyHint,
  suggestions = [],
  readOnly = false,
}) => {
  const { t } = useAppTranslation();
  const resolvedPlaceholder = placeholder ?? t('components.ReportTextList.اكتب_النص_هنا', 'اكتب النص هنا...');
  const resolvedAddLabel = addLabel ?? t('components.ReportTextList.إضافة', 'إضافة');
  const resolvedEmptyHint =
    emptyHint ?? t('components.ReportTextList.لم_تُضف_عناصر_بعد', 'لم تُضف عناصر بعد. اضغط «إضافة» لإضافة عنصر جديد.');
  const [draft, setDraft] = useState('');

  const addItem = (value) => {
    const text = String(value ?? draft).trim();
    if (!text) return;
    if (items.includes(text)) {
      setDraft('');
      return;
    }
    onChange([...items, text]);
    setDraft('');
  };

  const removeItem = (index) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, value) => {
    onChange(items.map((item, i) => (i === index ? value : item)));
  };

  const unusedSuggestions = suggestions.filter((s) => s && !items.includes(s));

  if (readOnly) {
    return (
      <div className="report-text-list report-text-list--readonly">
        {label && <span className="report-text-list__label">{label}</span>}
        {items.length === 0 ? (
          <p className="report-text-list__empty">—</p>
        ) : (
          <ol className="report-text-list__items report-text-list__items--readonly">
            {items.map((item, index) => (
              <li key={`${index}-${item}`}>{item}</li>
            ))}
          </ol>
        )}
      </div>
    );
  }

  return (
    <div className="report-text-list">
      {label && <span className="report-text-list__label">{label}</span>}
      <div className="report-text-list__add">
        <input
          className="app-input"
          value={draft}
          placeholder={resolvedPlaceholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem();
            }
          }}
        />
        <button type="button" className="google-btn report-text-list__add-btn" onClick={() => addItem()}>
          <Plus size={16} /> {resolvedAddLabel}
        </button>
      </div>
      {unusedSuggestions.length > 0 && (
        <div className="report-text-list__suggestions">
          {unusedSuggestions.map((name) => (
            <button key={name} type="button" className="report-text-list__suggestion" onClick={() => addItem(name)}>
              <Plus size={12} /> {name}
            </button>
          ))}
        </div>
      )}
      {items.length === 0 ? (
        <p className="report-text-list__empty">{resolvedEmptyHint}</p>
      ) : (
        <ul className="report-text-list__items">
          {items.map((item, index) => (
            <li key={`${index}-${item}`} className="report-text-list__item">
              <span className="report-text-list__index">{index + 1}</span>
              <input
                className="app-input report-text-list__input"
                value={item}
                onChange={(e) => updateItem(index, e.target.value)}
              />
              <button
                type="button"
                className="icon-btn"
                title={t('components.ReportTextList.حذف', 'حذف')}
                onClick={() => removeItem(index)}
              >
                <Trash2 size={16} color="var(--danger-color)" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ReportTextList;
