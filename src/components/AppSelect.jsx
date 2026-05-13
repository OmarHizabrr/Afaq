import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const AppSelect = ({ className = '', children, searchable = false, placeholder = 'ابحث...', ...props }) => {
  const mergedClassName = ['app-select', 'app-select--enhanced', className].filter(Boolean).join(' ');
  const {
    value,
    onChange,
    disabled,
    name,
    required,
    ...restProps
  } = props;

  const options = useMemo(
    () =>
      React.Children.toArray(children)
        .filter((child) => React.isValidElement(child) && child.type === 'option')
        .map((child) => ({
          value: String(child.props.value ?? ''),
          label: String(child.props.children ?? ''),
          disabled: Boolean(child.props.disabled),
        })),
    [children]
  );

  const selectedValue = String(value ?? '');
  const selectedOption = options.find((opt) => opt.value === selectedValue);
  const wrapperRef = useRef(null);
  const [query, setQuery] = useState(selectedOption?.label || '');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!searchable) return undefined;
    const onDocClick = (evt) => {
      if (!wrapperRef.current?.contains(evt.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [searchable]);

  const filteredOptions = options.filter((opt) => {
    if (!query.trim()) return true;
    return opt.label.toLowerCase().includes(query.trim().toLowerCase());
  });

  const commitValue = (nextValue) => {
    onChange?.({
      target: {
        value: nextValue,
        name: name || '',
      },
    });
  };

  if (!searchable) {
    return (
      <div className="app-select-wrap">
        <select {...props} className={mergedClassName}>
          {children}
        </select>
        <ChevronDown size={16} className="app-select-wrap__icon" aria-hidden />
      </div>
    );
  }

  return (
    <div className="app-select-wrap app-select-search" ref={wrapperRef}>
      <input
        type="text"
        className={mergedClassName}
        value={open ? query : selectedOption?.label || ''}
        placeholder={placeholder}
        onFocus={() => {
          if (disabled) return;
          // Open with full list visible; filtering starts only after typing.
          setQuery('');
          setOpen(true);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!disabled) setOpen(true);
        }}
        disabled={disabled}
        required={required}
        name={name}
        autoComplete="off"
        {...restProps}
      />
      <ChevronDown size={16} className="app-select-wrap__icon" aria-hidden />
      {open && !disabled && (
        <div className="app-select-search__menu" role="listbox">
          {filteredOptions.length === 0 ? (
            <div className="app-select-search__empty">لا توجد نتائج</div>
          ) : (
            filteredOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`app-select-search__option ${opt.value === selectedValue ? 'app-select-search__option--active' : ''}`}
                onClick={() => {
                  if (opt.disabled) return;
                  commitValue(opt.value);
                  setQuery(opt.label);
                  setOpen(false);
                }}
                disabled={opt.disabled}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AppSelect;
