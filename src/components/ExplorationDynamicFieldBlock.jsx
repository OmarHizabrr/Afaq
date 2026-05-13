import React, { useCallback, useEffect, useRef } from 'react';
import AppSelect from './AppSelect';

const yesNo = [
  { value: '', label: 'غير محدد' },
  { value: 'yes', label: 'نعم' },
  { value: 'no', label: 'لا' },
];

const FILE_MAX_BYTES = 650_000;

const acceptForType = (t) => {
  if (t === 'image') return 'image/*';
  if (t === 'video') return 'video/*';
  if (t === 'audio') return 'audio/*';
  return '*/*';
};

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(new Error('read'));
    r.readAsDataURL(file);
  });
}

function SignatureCanvas({ value, onChange, disabled }) {
  const ref = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);

  const drawLine = useCallback((x0, y0, x1, y1) => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }, []);

  const pos = (e) => {
    const c = ref.current;
    const r = c.getBoundingClientRect();
    const x = (e.clientX ?? e.touches?.[0]?.clientX) - r.left;
    const y = (e.clientY ?? e.touches?.[0]?.clientY) - r.top;
    return { x, y };
  };

  const toData = useCallback(() => {
    const c = ref.current;
    if (!c) return '';
    try {
      return c.toDataURL('image/png');
    } catch {
      return '';
    }
  }, []);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    if (value && String(value).startsWith('data:image')) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, c.width, c.height);
      img.src = value;
    }
  }, [value]);

  const start = (e) => {
    if (disabled) return;
    e.preventDefault();
    drawing.current = true;
    last.current = pos(e);
  };

  const move = (e) => {
    if (!drawing.current || disabled) return;
    e.preventDefault();
    const p = pos(e);
    const prev = last.current;
    if (prev) drawLine(prev.x, prev.y, p.x, p.y);
    last.current = p;
  };

  const end = () => {
    if (drawing.current) {
      drawing.current = false;
      last.current = null;
      onChange(toData());
    }
  };

  return (
    <div className="exploration-signature-wrap">
      <canvas
        ref={ref}
        width={360}
        height={140}
        className="exploration-signature-canvas"
        style={{ width: '100%', maxWidth: 420, height: 140, touchAction: 'none', borderRadius: 8, border: '1px solid var(--border-color)' }}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <button type="button" className="google-btn" style={{ width: 'auto', marginTop: 8 }} onClick={() => onChange('')} disabled={disabled}>
        مسح التوقيع
      </button>
    </div>
  );
}

export default function ExplorationDynamicFieldBlock({ fields, values, onChange }) {
  return (
    <>
      {fields.map((f) => {
        const v = values[f.id];
        const commonLabel = (
          <label className="app-label">
            {f.label}
            {f.required ? ' *' : ''}
          </label>
        );

        if (f.fieldType === 'hidden') {
          return null;
        }

        if (f.fieldType === 'textarea' || f.fieldType === 'rich_text') {
          return (
            <React.Fragment key={f.id}>
              {commonLabel}
              <textarea
                className="app-input exploration-form-grid__full"
                style={{ minHeight: f.fieldType === 'rich_text' ? 120 : 72 }}
                placeholder={f.placeholder || ''}
                value={v ?? ''}
                onChange={(e) => onChange(f.id, e.target.value)}
              />
            </React.Fragment>
          );
        }

        if (f.fieldType === 'number' || f.fieldType === 'currency' || f.fieldType === 'percentage') {
          const step = f.fieldType === 'currency' ? '0.01' : f.fieldType === 'percentage' ? '0.1' : 'any';
          return (
            <React.Fragment key={f.id}>
              {commonLabel}
              <input
                className="app-input"
                inputMode="decimal"
                step={step}
                placeholder={f.placeholder || ''}
                value={v ?? ''}
                min={f.min != null ? f.min : undefined}
                max={f.max != null ? f.max : undefined}
                onChange={(e) => onChange(f.id, e.target.value.replace(/[^\d.-]/g, ''))}
              />
            </React.Fragment>
          );
        }

        if (f.fieldType === 'range') {
          const lo = f.min != null && Number.isFinite(f.min) ? f.min : 0;
          const hi = f.max != null && Number.isFinite(f.max) ? f.max : 100;
          const n = Number(v);
          const cur = Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
          return (
            <React.Fragment key={f.id}>
              {commonLabel}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="range"
                  min={lo}
                  max={hi}
                  value={cur}
                  onChange={(e) => onChange(f.id, Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ minWidth: 36, fontVariantNumeric: 'tabular-nums' }}>{cur}</span>
              </div>
            </React.Fragment>
          );
        }

        if (f.fieldType === 'rating') {
          const lo = f.min != null && Number.isFinite(f.min) ? Math.max(1, f.min) : 1;
          const hi = f.max != null && Number.isFinite(f.max) ? Math.min(10, f.max) : 5;
          const n = Number(v);
          const cur = Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : null;
          return (
            <React.Fragment key={f.id}>
              {commonLabel}
              <div className="exploration-form-grid__full" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                {Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`exploration-rating-star ${cur != null && cur >= star ? 'exploration-rating-star--on' : ''}`}
                    onClick={() => onChange(f.id, star)}
                    aria-label={`${star}`}
                  >
                    ★
                  </button>
                ))}
                <button type="button" className="google-btn" style={{ width: 'auto', marginTop: 0 }} onClick={() => onChange(f.id, '')}>
                  إلغاء التقييم
                </button>
              </div>
            </React.Fragment>
          );
        }

        if (f.fieldType === 'date' || f.fieldType === 'time' || f.fieldType === 'datetime-local' || f.fieldType === 'month' || f.fieldType === 'week') {
          return (
            <React.Fragment key={f.id}>
              {commonLabel}
              <input className="app-input" type={f.fieldType} value={v ?? ''} onChange={(e) => onChange(f.id, e.target.value)} />
            </React.Fragment>
          );
        }

        if (f.fieldType === 'date_range') {
          const pair = v && typeof v === 'object' ? v : { from: '', to: '' };
          return (
            <React.Fragment key={f.id}>
              <div className="exploration-form-grid__full" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label className="app-label">
                    {f.label} — من{f.required ? ' *' : ''}
                  </label>
                  <input
                    className="app-input"
                    type="date"
                    value={pair.from || ''}
                    onChange={(e) => onChange(f.id, { ...pair, from: e.target.value })}
                  />
                </div>
                <div>
                  <label className="app-label">
                    {f.label} — إلى{f.required ? ' *' : ''}
                  </label>
                  <input
                    className="app-input"
                    type="date"
                    value={pair.to || ''}
                    onChange={(e) => onChange(f.id, { ...pair, to: e.target.value })}
                  />
                </div>
              </div>
            </React.Fragment>
          );
        }

        if (f.fieldType === 'dropdown') {
          return (
            <React.Fragment key={f.id}>
              {commonLabel}
              <AppSelect searchable value={v ?? ''} onChange={(e) => onChange(f.id, e.target.value)}>
                <option value="">-- اختر --</option>
                {(f.options || []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </AppSelect>
            </React.Fragment>
          );
        }

        if (f.fieldType === 'radio') {
          return (
            <React.Fragment key={f.id}>
              {commonLabel}
              <div className="exploration-form-grid__full" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 16px' }}>
                {(f.options || []).map((opt) => (
                  <label key={opt} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="radio" name={`dyn-${f.id}`} checked={v === opt} onChange={() => onChange(f.id, opt)} />
                    {opt}
                  </label>
                ))}
              </div>
            </React.Fragment>
          );
        }

        if (f.fieldType === 'multi_select') {
          const arr = Array.isArray(v) ? v : [];
          return (
            <React.Fragment key={f.id}>
              {commonLabel}
              <div className="exploration-form-grid__full" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(f.options || []).map((opt) => (
                  <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={arr.includes(opt)}
                      onChange={() => {
                        const next = arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt];
                        onChange(f.id, next);
                      }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </React.Fragment>
          );
        }

        if (f.fieldType === 'yes_no') {
          return (
            <React.Fragment key={f.id}>
              {commonLabel}
              <AppSelect value={v ?? ''} onChange={(e) => onChange(f.id, e.target.value)}>
                {yesNo.map((i) => (
                  <option key={i.value} value={i.value}>
                    {i.label}
                  </option>
                ))}
              </AppSelect>
            </React.Fragment>
          );
        }

        if (f.fieldType === 'checkbox') {
          return (
            <React.Fragment key={f.id}>
              <label className="app-label exploration-form-grid__full" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={Boolean(v)} onChange={(e) => onChange(f.id, e.target.checked)} />
                {f.label}
                {f.required ? ' *' : ''}
              </label>
            </React.Fragment>
          );
        }

        if (f.fieldType === 'switch') {
          return (
            <React.Fragment key={f.id}>
              <div className="exploration-form-grid__full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span className="app-label" style={{ margin: 0 }}>
                  {f.label}
                  {f.required ? ' *' : ''}
                </span>
                <label className="exploration-switch">
                  <input type="checkbox" checked={Boolean(v)} onChange={(e) => onChange(f.id, e.target.checked)} />
                  <span className="exploration-switch__slider" />
                </label>
              </div>
            </React.Fragment>
          );
        }

        if (f.fieldType === 'file' || f.fieldType === 'image' || f.fieldType === 'video' || f.fieldType === 'audio') {
          return (
            <React.Fragment key={f.id}>
              {commonLabel}
              <input
                className="app-input"
                type="file"
                accept={acceptForType(f.fieldType)}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) {
                    onChange(f.id, '');
                    return;
                  }
                  if (file.size > FILE_MAX_BYTES) {
                    window.alert(`حجم الملف يتجاوز الحد (${Math.round(FILE_MAX_BYTES / 1000)} كيلوبايت تقريباً). اختر ملفاً أصغر أو ارفع رابطاً في حقل نصي.`);
                    return;
                  }
                  try {
                    const data = await readFileAsDataUrl(file);
                    onChange(f.id, data);
                  } catch {
                    window.alert('تعذر قراءة الملف.');
                  }
                }}
              />
              {String(v || '').startsWith('data:') && (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>تم اختيار ملف (مخزن كنص ضمن السجل).</p>
              )}
            </React.Fragment>
          );
        }

        if (f.fieldType === 'color') {
          return (
            <React.Fragment key={f.id}>
              {commonLabel}
              <input className="app-input" type="color" value={v || '#000000'} onChange={(e) => onChange(f.id, e.target.value)} style={{ height: 44, padding: 4 }} />
            </React.Fragment>
          );
        }

        if (f.fieldType === 'location') {
          const pair = v && typeof v === 'object' ? v : { lat: '', lng: '' };
          return (
            <React.Fragment key={f.id}>
              <div className="exploration-form-grid__full" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label className="app-label">خط العرض (Lat){f.required ? ' *' : ''}</label>
                  <input
                    className="app-input"
                    inputMode="decimal"
                    placeholder="-13.254"
                    value={pair.lat ?? ''}
                    onChange={(e) => onChange(f.id, { ...pair, lat: e.target.value })}
                  />
                </div>
                <div>
                  <label className="app-label">خط الطول (Lng){f.required ? ' *' : ''}</label>
                  <input
                    className="app-input"
                    inputMode="decimal"
                    placeholder="34.301"
                    value={pair.lng ?? ''}
                    onChange={(e) => onChange(f.id, { ...pair, lng: e.target.value })}
                  />
                </div>
              </div>
            </React.Fragment>
          );
        }

        if (f.fieldType === 'signature') {
          return (
            <React.Fragment key={f.id}>
              {commonLabel}
              <div className="exploration-form-grid__full">
                <SignatureCanvas value={v} onChange={(data) => onChange(f.id, data)} />
              </div>
            </React.Fragment>
          );
        }

        if (f.fieldType === 'tag') {
          const str = Array.isArray(v) ? v.join('، ') : '';
          return (
            <React.Fragment key={f.id}>
              {commonLabel}
              <input
                className="app-input"
                placeholder={f.placeholder || 'وسم1، وسم2'}
                value={str}
                onChange={(e) =>
                  onChange(
                    f.id,
                    e.target.value
                      .split(/[,،]/)
                      .map((s) => s.trim())
                      .filter(Boolean)
                  )
                }
              />
            </React.Fragment>
          );
        }

        const inputType =
          f.fieldType === 'email'
            ? 'email'
            : f.fieldType === 'password'
              ? 'password'
              : f.fieldType === 'url'
                ? 'url'
                : f.fieldType === 'search'
                  ? 'search'
                  : f.fieldType === 'tel'
                    ? 'tel'
                    : 'text';

        return (
          <React.Fragment key={f.id}>
            {commonLabel}
            <input
              className="app-input"
              type={inputType}
              autoComplete={f.fieldType === 'password' ? 'new-password' : undefined}
              placeholder={f.placeholder || ''}
              value={v ?? ''}
              onChange={(e) => onChange(f.id, e.target.value)}
            />
          </React.Fragment>
        );
      })}
    </>
  );
}
