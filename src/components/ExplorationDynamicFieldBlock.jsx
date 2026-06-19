import React, { useCallback, useEffect, useRef, useState } from 'react';
import AppSelect from './AppSelect';
import { uploadExplorationFieldFile } from '../services/storageApi';
import useAppTranslation from '../hooks/useAppTranslation';

const getYesNoOptions = (t) => [
  { value: '', label: t('components.ExplorationDynamicFieldBlock.غير_محدد', 'غير محدد') },
  { value: 'yes', label: t('components.ExplorationDynamicFieldBlock.نعم', 'نعم') },
  { value: 'no', label: t('components.ExplorationDynamicFieldBlock.لا', 'لا') },
];

function maxBytesForFieldType(t) {
  if (t === 'image') return 12 * 1024 * 1024;
  if (t === 'video') return 45 * 1024 * 1024;
  if (t === 'audio') return 25 * 1024 * 1024;
  return 20 * 1024 * 1024;
}

const acceptForType = (t) => {
  if (t === 'image') return 'image/*';
  if (t === 'video') return 'video/*';
  if (t === 'audio') return 'audio/*';
  return '*/*';
};

function SignatureCanvas({ value, onChange, disabled = false, storageUserId, fieldId }) {
  const ref = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);
  const [uploading, setUploading] = useState(false);

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

  const paintValueOnCanvas = useCallback(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    const val = String(value || '').trim();
    if (!val) return;
    if (val.startsWith('data:image')) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, c.width, c.height);
      img.src = val;
      return;
    }
    if (val.startsWith('http://') || val.startsWith('https://')) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => ctx.drawImage(img, 0, 0, c.width, c.height);
      img.onerror = () => {};
      img.src = val;
    }
  }, [value]);

  useEffect(() => {
    paintValueOnCanvas();
  }, [value, paintValueOnCanvas]);

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
    }
  };

  const clearCanvas = () => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    onChange('');
  };

  const handleUploadSignature = async () => {
    const c = ref.current;
    if (!c || disabled) return;
    const blob = await new Promise((resolve) => {
      c.toBlob((b) => resolve(b), 'image/png', 0.92);
    });
    if (!blob || blob.size < 80) {
      window.alert('ارسم التوقيع أولاً ثم اضغط «رفع التوقيع».');
      return;
    }
    if (!storageUserId) {
      onChange(toData());
      return;
    }
    setUploading(true);
    try {
      const file = new File([blob], `signature_${fieldId}.png`, { type: 'image/png' });
      const url = await uploadExplorationFieldFile(file, { userId: storageUserId, fieldId: `${fieldId}_sig` });
      onChange(url);
    } catch (err) {
      console.error(err);
      window.alert('تعذر رفع التوقيع إلى التخزين. تحقق من قواعد Firebase Storage والصلاحيات.');
      onChange(toData());
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="exploration-signature-wrap">
      <canvas
        ref={ref}
        width={360}
        height={140}
        className="exploration-signature-canvas"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <div className="exploration-signature-actions">
        <button type="button" className="google-btn google-btn--inline" onClick={clearCanvas} disabled={disabled || uploading}>
          مسح اللوحة
        </button>
        <button type="button" className="google-btn google-btn--filled google-btn--inline" onClick={handleUploadSignature} disabled={disabled || uploading}>
          {uploading ? 'جاري الرفع…' : storageUserId ? 'رفع التوقيع إلى التخزين' : 'حفظ التوقيع (محلي)'}
        </button>
      </div>
      {String(value || '').startsWith('http') && (
        <p className="exploration-signature-saved">
          رابط محفوظ: <a href={value} target="_blank" rel="noreferrer">{t('components.ExplorationDynamicFieldBlock.فتح', 'فتح')}</a>
        </p>
      )}
    </div>
  );
}

export default function ExplorationDynamicFieldBlock({ fields, values, onChange, storageUserId, variant = 'default', actorUser = null }) {
  const { t } = useAppTranslation();
  const yesNo = getYesNoOptions(t);
  const [uploadingFieldId, setUploadingFieldId] = useState(null);

  useEffect(() => {
    if (!actorUser || !onChange) return;
    for (const f of fields) {
      if (!['text', 'email', 'tel'].includes(f.fieldType)) continue;
      const vs = f.valueSource;
      if (!vs) continue;
      const cur = values[f.id];
      if (cur !== undefined && cur !== null && String(cur).trim() !== '') continue;
      let next = '';
      if (vs === 'current_user_id') next = String(actorUser.uid || actorUser.id || '');
      else if (vs === 'current_user_display') next = String(actorUser.displayName || actorUser.email || '');
      if (next) onChange(f.id, next);
    }
  }, [fields, values, actorUser, onChange]);

  const cells = fields.map((f) => {
    const listPairs = () => {
      if (Array.isArray(f.optionPairs) && f.optionPairs.length) return f.optionPairs;
      return (f.options || []).map((o) => ({ value: String(o), label: String(o) }));
    };

    const wrap = (inner) =>
      variant === 'sheet' ? (
        <div key={f.id} className="exploration-field-sheet__row">
          {inner}
        </div>
      ) : (
        <React.Fragment key={f.id}>{inner}</React.Fragment>
      );

    const v = values[f.id];
    const commonLabel = (
      <label className={`app-label${variant === 'sheet' ? ' exploration-field-sheet__label' : ''}`}>
        {f.label}
        {f.required ? ' *' : ''}
      </label>
    );

    if (f.fieldType === 'hidden') {
      return null;
    }

    if (f.fieldType === 'textarea' || f.fieldType === 'rich_text') {
      return wrap(
        <>
          {commonLabel}
          <textarea
            className={`app-input ${
              variant === 'sheet'
                ? `exploration-field-sheet__input exploration-field-sheet__input--multiline${
                    f.fieldType === 'rich_text' ? ' exploration-field-sheet__input--multiline-rich' : ''
                  }`
                : `exploration-form-grid__full exploration-form-textarea--${
                    f.fieldType === 'rich_text' ? 'rich' : 'md'
                  }`
            }`}
            placeholder={f.placeholder || ''}
            value={v ?? ''}
            onChange={(e) => onChange(f.id, e.target.value)}
          />
        </>
      );
    }

        if (f.fieldType === 'number' || f.fieldType === 'currency' || f.fieldType === 'percentage') {
          const step = f.fieldType === 'currency' ? '0.01' : f.fieldType === 'percentage' ? '0.1' : 'any';
          return wrap(
            <>
              {commonLabel}
              <input
                className={`app-input${variant === 'sheet' ? ' exploration-field-sheet__input' : ''}`}
                inputMode="decimal"
                step={step}
                placeholder={f.placeholder || ''}
                value={v ?? ''}
                min={f.min != null ? f.min : undefined}
                max={f.max != null ? f.max : undefined}
                onChange={(e) => onChange(f.id, e.target.value.replace(/[^\d.-]/g, ''))}
              />
            </>
          );
        }

        if (f.fieldType === 'range') {
          const lo = f.min != null && Number.isFinite(f.min) ? f.min : 0;
          const hi = f.max != null && Number.isFinite(f.max) ? f.max : 100;
          const n = Number(v);
          const cur = Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
          return wrap(
            <>
              {commonLabel}
              <div className="exploration-field-sheet__range">
                <input
                  type="range"
                  className="exploration-field-sheet__range-input"
                  min={lo}
                  max={hi}
                  value={cur}
                  onChange={(e) => onChange(f.id, Number(e.target.value))}
                />
                <span className="exploration-field-sheet__range-value">{cur}</span>
              </div>
            </>
          );
        }

        if (f.fieldType === 'rating') {
          const lo = f.min != null && Number.isFinite(f.min) ? Math.max(1, f.min) : 1;
          const hi = f.max != null && Number.isFinite(f.max) ? Math.min(10, f.max) : 5;
          const n = Number(v);
          const cur = Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : null;
          return wrap(
            <>
              {commonLabel}
              <div className={`${variant === 'sheet' ? 'exploration-field-sheet__control-block' : 'exploration-form-grid__full'} exploration-field-sheet__control-block--row`}>
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
                <button type="button" className="google-btn google-btn--inline" onClick={() => onChange(f.id, '')}>
                  إلغاء التقييم
                </button>
              </div>
            </>
          );
        }

        if (f.fieldType === 'date' || f.fieldType === 'time' || f.fieldType === 'datetime-local' || f.fieldType === 'month' || f.fieldType === 'week') {
          return wrap(
            <>
              {commonLabel}
              <input className={`app-input${variant === 'sheet' ? ' exploration-field-sheet__input' : ''}`} type={f.fieldType} value={v ?? ''} onChange={(e) => onChange(f.id, e.target.value)} />
            </>
          );
        }

        if (f.fieldType === 'date_range') {
          const pair = v && typeof v === 'object' ? v : { from: '', to: '' };
          return wrap(
            <div className={variant === 'sheet' ? 'exploration-field-sheet__subgrid' : 'exploration-form-grid__subgrid'}>
              <div>
                <label className={`app-label${variant === 'sheet' ? ' exploration-field-sheet__sublabel' : ''}`}>
                  {f.label} — من{f.required ? ' *' : ''}
                </label>
                <input
                  className={`app-input${variant === 'sheet' ? ' exploration-field-sheet__input' : ''}`}
                  type="date"
                  value={pair.from || ''}
                  onChange={(e) => onChange(f.id, { ...pair, from: e.target.value })}
                />
              </div>
              <div>
                <label className={`app-label${variant === 'sheet' ? ' exploration-field-sheet__sublabel' : ''}`}>
                  {f.label} — إلى{f.required ? ' *' : ''}
                </label>
                <input
                  className={`app-input${variant === 'sheet' ? ' exploration-field-sheet__input' : ''}`}
                  type="date"
                  value={pair.to || ''}
                  onChange={(e) => onChange(f.id, { ...pair, to: e.target.value })}
                />
              </div>
            </div>
          );
        }

        if (f.fieldType === 'dropdown') {
          const pairs = listPairs();
          return wrap(
            <>
              {commonLabel}
              <AppSelect searchable className={variant === 'sheet' ? 'exploration-field-sheet__select' : ''} value={v ?? ''} onChange={(e) => onChange(f.id, e.target.value)}>
                <option value="">{t('components.ExplorationDynamicFieldBlock.اختر', '-- اختر --')}</option>
                {pairs.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </AppSelect>
            </>
          );
        }

        if (f.fieldType === 'radio') {
          const pairs = listPairs();
          return wrap(
            <>
              {commonLabel}
              <div className={`${variant === 'sheet' ? 'exploration-field-sheet__control-block' : 'exploration-form-grid__full'} exploration-field-sheet__control-block--radio`}>
                {pairs.map((opt) => (
                  <label key={opt.value} className="exploration-field-sheet__choice">
                    <input type="radio" name={`dyn-${f.id}`} checked={v === opt.value} onChange={() => onChange(f.id, opt.value)} />
                    {opt.label}
                  </label>
                ))}
              </div>
            </>
          );
        }

        if (f.fieldType === 'multi_select') {
          const arr = Array.isArray(v) ? v : [];
          const pairs = listPairs();
          return wrap(
            <>
              {commonLabel}
              <div className={`${variant === 'sheet' ? 'exploration-field-sheet__control-block' : 'exploration-form-grid__full'} exploration-field-sheet__control-block--stack`}>
                {pairs.map((opt) => (
                  <label key={opt.value} className="exploration-field-sheet__choice exploration-field-sheet__choice--stack">
                    <input
                      type="checkbox"
                      checked={arr.includes(opt.value)}
                      onChange={() => {
                        const next = arr.includes(opt.value) ? arr.filter((x) => x !== opt.value) : [...arr, opt.value];
                        onChange(f.id, next);
                      }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </>
          );
        }

        if (f.fieldType === 'yes_no') {
          return wrap(
            <>
              {commonLabel}
              <AppSelect className={variant === 'sheet' ? 'exploration-field-sheet__select' : ''} value={v ?? ''} onChange={(e) => onChange(f.id, e.target.value)}>
                {yesNo.map((i) => (
                  <option key={i.value} value={i.value}>
                    {i.label}
                  </option>
                ))}
              </AppSelect>
            </>
          );
        }

        if (f.fieldType === 'checkbox') {
          return wrap(
            <label className={`app-label exploration-form-grid__full exploration-field-sheet__checkbox-label${variant === 'sheet' ? ' exploration-field-sheet__row--toggle' : ''}`}>
              <input type="checkbox" checked={Boolean(v)} onChange={(e) => onChange(f.id, e.target.checked)} />
              {f.label}
              {f.required ? ' *' : ''}
            </label>
          );
        }

        if (f.fieldType === 'switch') {
          return wrap(
            <div className={`exploration-form-grid__full exploration-field-sheet__switch-row${variant === 'sheet' ? ' exploration-field-sheet__row--toggle' : ''}`}>
              <span className={`app-label${variant === 'sheet' ? ' exploration-field-sheet__label exploration-field-sheet__label--inline' : ''}`}>
                {f.label}
                {f.required ? ' *' : ''}
              </span>
              <label className="exploration-switch">
                <input type="checkbox" checked={Boolean(v)} onChange={(e) => onChange(f.id, e.target.checked)} />
                <span className="exploration-switch__slider" />
              </label>
            </div>
          );
        }

        if (f.fieldType === 'file' || f.fieldType === 'image' || f.fieldType === 'video' || f.fieldType === 'audio') {
          const maxB = maxBytesForFieldType(f.fieldType);
          const strVal = String(v || '').trim();
          const isHttp = strVal.startsWith('http://') || strVal.startsWith('https://');
          const isLegacyData = strVal.startsWith('data:');
          return wrap(
            <>
              {commonLabel}
              <input
                className={`app-input${variant === 'sheet' ? ' exploration-field-sheet__input exploration-field-sheet__input--file' : ''}`}
                type="file"
                accept={acceptForType(f.fieldType)}
                disabled={Boolean(uploadingFieldId) || !storageUserId}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) {
                    onChange(f.id, '');
                    return;
                  }
                  if (!storageUserId) {
                    window.alert('يجب تسجيل الدخول لرفع الملفات إلى التخزين.');
                    return;
                  }
                  if (file.size > maxB) {
                    window.alert(
                      `حجم الملف يتجاوز الحد المسموح (${Math.round(maxB / (1024 * 1024))} ميجابايت لهذا النوع).`
                    );
                    return;
                  }
                  setUploadingFieldId(f.id);
                  try {
                    const url = await uploadExplorationFieldFile(file, { userId: storageUserId, fieldId: f.id });
                    onChange(f.id, url);
                  } catch (err) {
                    console.error(err);
                    window.alert('تعذر رفع الملف. تحقق من قواعد Firebase Storage والصلاحيات.');
                  } finally {
                    setUploadingFieldId(null);
                  }
                }}
              />
              {!storageUserId && (
                <p className="exploration-field-hint exploration-field-hint--danger">{t('components.ExplorationDynamicFieldBlock.تسجيل_الدخول_مطلوب_لرفع_الملفات', 'تسجيل الدخول مطلوب لرفع الملفات.')}</p>
              )}
              {uploadingFieldId === f.id && (
                <p className="exploration-field-hint exploration-field-hint--upload">{t('components.ExplorationDynamicFieldBlock.جاري_الرفع_إلى_Firebase_Storage', 'جاري الرفع إلى Firebase Storage…')}</p>
              )}
              {isHttp && (
                <div className={`exploration-field-media ${variant === 'sheet' ? 'exploration-field-sheet__media' : 'exploration-form-grid__full'}`}>
                  {f.fieldType === 'image' && (
                    <img src={strVal} alt="" className="exploration-field-media__img" />
                  )}
                  {f.fieldType === 'video' && <video src={strVal} controls className="exploration-field-media__video" />}
                  {f.fieldType === 'audio' && <audio src={strVal} controls className="exploration-field-media__audio" />}
                  <a href={strVal} target="_blank" rel="noreferrer" className="exploration-field-media__link">
                    فتح الرابط / تحميل
                  </a>
                </div>
              )}
              {isLegacyData && (
                <p className="exploration-field-hint">
                  يوجد مرفق قديم مخزّن داخل السجل (base64). يُفضّل إعادة الرفع ليُحفظ الرابط في Storage فقط.
                </p>
              )}
            </>
          );
        }

        if (f.fieldType === 'color') {
          return wrap(
            <>
              {commonLabel}
              <input className={`app-input${variant === 'sheet' ? ' exploration-field-sheet__input exploration-field-sheet__input--color exploration-field-sheet__input--color-pick' : ''}`} type="color" value={v || '#000000'} onChange={(e) => onChange(f.id, e.target.value)} />
            </>
          );
        }

        if (f.fieldType === 'location') {
          const pair = v && typeof v === 'object' ? v : { lat: '', lng: '' };
          return wrap(
            <div className={variant === 'sheet' ? 'exploration-field-sheet__subgrid' : 'exploration-form-grid__subgrid'}>
              <div>
                <label className={`app-label${variant === 'sheet' ? ' exploration-field-sheet__sublabel' : ''}`}>خط العرض (Lat){f.required ? ' *' : ''}</label>
                <input
                  className={`app-input${variant === 'sheet' ? ' exploration-field-sheet__input' : ''}`}
                  inputMode="decimal"
                  placeholder="-13.254"
                  value={pair.lat ?? ''}
                  onChange={(e) => onChange(f.id, { ...pair, lat: e.target.value })}
                />
              </div>
              <div>
                <label className={`app-label${variant === 'sheet' ? ' exploration-field-sheet__sublabel' : ''}`}>خط الطول (Lng){f.required ? ' *' : ''}</label>
                <input
                  className={`app-input${variant === 'sheet' ? ' exploration-field-sheet__input' : ''}`}
                  inputMode="decimal"
                  placeholder="34.301"
                  value={pair.lng ?? ''}
                  onChange={(e) => onChange(f.id, { ...pair, lng: e.target.value })}
                />
              </div>
            </div>
          );
        }

        if (f.fieldType === 'signature') {
          return wrap(
            <>
              {commonLabel}
              <div className={variant === 'sheet' ? 'exploration-field-sheet__control-block' : 'exploration-form-grid__full'}>
                <SignatureCanvas
                  value={v}
                  onChange={(data) => onChange(f.id, data)}
                  storageUserId={storageUserId}
                  fieldId={f.id}
                />
              </div>
            </>
          );
        }

        if (f.fieldType === 'tag') {
          const str = Array.isArray(v) ? v.join(t('components.ExplorationDataModal.،', '، ')) : '';
          return wrap(
            <>
              {commonLabel}
              <input
                className={`app-input${variant === 'sheet' ? ' exploration-field-sheet__input' : ''}`}
                placeholder={f.placeholder || t('components.ExplorationDynamicFieldBlock.وسم1،_وسم2', 'وسم1، وسم2')}
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
            </>
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

        return wrap(
          <>
            {commonLabel}
            <input
              className={`app-input${variant === 'sheet' ? ' exploration-field-sheet__input' : ''}`}
              type={inputType}
              autoComplete={f.fieldType === 'password' ? 'new-password' : undefined}
              placeholder={f.placeholder || ''}
              value={v ?? ''}
              onChange={(e) => onChange(f.id, e.target.value)}
            />
          </>
        );
      });

  return variant === 'sheet' ? <div className="exploration-field-sheet">{cells.filter(Boolean)}</div> : <>{cells.filter(Boolean)}</>;
}
