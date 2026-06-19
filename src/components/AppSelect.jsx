import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import useAppTranslation from '../hooks/useAppTranslation';

const AppSelect = ({ className = '', children, searchable = false, placeholder, ...props }) => {
  const { t } = useAppTranslation();
  const searchPlaceholder = placeholder ?? t('components.AppSelect.ابحث', 'ابحث...');
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
  const menuRef = useRef(null);
  const [query, setQuery] = useState(selectedOption?.label || '');
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);

  useLayoutEffect(() => {
    if (!searchable) return undefined;
    const onDocClick = (evt) => {
      const clickedInput = wrapperRef.current?.contains(evt.target);
      const clickedMenu = menuRef.current?.contains(evt.target);
      if (!clickedInput && !clickedMenu) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [searchable]);

  useEffect(() => {
    if (!searchable || !open) return undefined;

    const updateMenuPosition = () => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;

      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      const gap = 6;
      const margin = 10;
      const below = Math.max(0, viewportHeight - rect.bottom - gap - margin);
      const above = Math.max(0, rect.top - gap - margin);
      const placeAbove = below < 180 && above > below;
      const maxHeight = Math.max(120, Math.min(240, placeAbove ? above : below));

      setMenuStyle({
        position: 'fixed',
        top: placeAbove ? 'auto' : rect.bottom + gap,
        bottom: placeAbove ? viewportHeight - rect.top + gap : 'auto',
        left: rect.left,
        width: rect.width,
        maxHeight,
      });
    };

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [searchable, open]);

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

  const menu =
    open && !disabled
      ? createPortal(
          <div
            ref={menuRef}
            className="app-select-search__menu app-select-search__menu--portal"
            role="listbox"
            style={menuStyle || undefined}
          >
            {filteredOptions.length === 0 ? (
              <div className="app-select-search__empty">{t('components.AppSelect.لا_توجد_نتائج', 'لا توجد نتائج')}</div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`app-select-search__option ${opt.value === selectedValue ? 'app-select-search__option--active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
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
          </div>,
          document.body
        )
      : null;

  return (
    <div className="app-select-wrap app-select-search" ref={wrapperRef}>
      <input
        type="text"
        className={mergedClassName}
        value={open ? query : selectedOption?.label || ''}
        placeholder={searchPlaceholder}
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
      {menu}
    </div>
  );
};

export default AppSelect;
