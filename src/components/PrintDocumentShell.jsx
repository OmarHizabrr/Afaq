import React, { useState } from 'react';
import { Printer, ArrowRight } from 'lucide-react';
import useAppTranslation from '../hooks/useAppTranslation';

/**
 * قالب طباعة موحّد للمشروع: إطار، شعار، ترويسة، وتذييل.
 * شريط الأدوات يُخفى تلقائياً عند الطباعة (انظر index.css).
 */
export default function PrintDocumentShell({
  documentTitle,
  subtitle,
  metaLines = [],
  children,
  onBack,
  backLabel,
  printButtonLabel,
}) {
  const { t } = useAppTranslation();
  const resolvedBackLabel = backLabel ?? t('components.PrintDocumentShell.رجوع', 'رجوع');
  const resolvedPrintLabel =
    printButtonLabel ?? t('components.PrintDocumentShell.طباعة_حفظ_pdf', 'طباعة / حفظ PDF');
  const [logoOk, setLogoOk] = useState(true);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="print-shell">
      <div className="print-toolbar" role="region" aria-label={t('components.PrintDocumentShell.معاينة_قبل_الطباعة', 'معاينة قبل الطباعة')}>
        <div className="print-toolbar__inner">
          <div className="print-toolbar__actions">
            <button type="button" className="google-btn google-btn--filled print-toolbar__btn" onClick={handlePrint}>
              <Printer size={18} aria-hidden />
              <span>{resolvedPrintLabel}</span>
            </button>
            {onBack && (
              <button type="button" className="google-btn print-toolbar__btn" onClick={onBack}>
                <ArrowRight size={18} aria-hidden />
                <span>{resolvedBackLabel}</span>
              </button>
            )}
          </div>
          <p className="print-toolbar__hint">
            {t(
              'components.PrintDocumentShell.بعد_إغلاق_الطباعة',
              'بعد إغلاق نافذة الطباعة تبقى هذه الصفحة للمراجعة. يمكنك الطباعة مجدداً عبر الزر أعلاه أو اختصار'
            )}{' '}
            <kbd className="print-kbd">Ctrl</kbd>+<kbd className="print-kbd">P</kbd>{' '}
            {t('components.PrintDocumentShell.أو', '(أو')}{' '}
            <kbd className="print-kbd">⌘</kbd>+<kbd className="print-kbd">P</kbd>{' '}
            {t('components.PrintDocumentShell.على_ماك', 'على ماك).')}
          </p>
        </div>
      </div>

      <article className="print-document">
        <div className="print-document__frame">
          <header className="print-document__header">
            <div className="print-document__brand">
              {logoOk && (
                <img
                  src="/icon-512.png"
                  alt=""
                  className="print-document__logo"
                  width={56}
                  height={56}
                  onError={() => setLogoOk(false)}
                />
              )}
              <div className="print-document__brand-text">
                <p className="print-document__platform">
                  {t('components.PrintDocumentShell.منصة_آفاق_التعليمية', 'منصة آفاق التعليمية')}
                </p>
                <h1 className="print-document__title">{documentTitle}</h1>
                {subtitle ? <p className="print-document__subtitle">{subtitle}</p> : null}
              </div>
            </div>
            {metaLines.length > 0 ? (
              <ul className="print-document__meta">
                {metaLines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            ) : null}
          </header>

          <div className="print-document__body">{children}</div>

          <footer className="print-document__footer">
            <span className="print-document__footer-brand">
              {t('components.PrintDocumentShell.آفاق_وثيقة_رسمية', 'آفاق — وثيقة رسمية')}
            </span>
          </footer>
        </div>
      </article>
    </div>
  );
}
