import React, { useRef } from 'react';
import { X, Printer, FileDown, FileSpreadsheet } from 'lucide-react';
import BusyButton from './BusyButton';
import { REPORT_STYLES } from '../utils/schoolReportHtml';
import useAppTranslation from '../hooks/useAppTranslation';


/**
 * معاينة تقرير HTML (RTL) قبل الطباعة أو التحميل.
 */
export default function ReportPrintPreviewModal({
  open,
  onClose,
  title,
  bodyHtml,
  onDownloadPdf,
  onDownloadExcel,
  pdfExporting = false,
  pdfLabel,
  excelLabel,
}) {
  const { t } = useAppTranslation();
  const resolvedTitle = title ?? t('components.ReportPrintPreviewModal.معاينة_التقرير', 'معاينة التقرير');
  const resolvedPdfLabel = pdfLabel ?? t('components.ReportPrintPreviewModal.تحميل_pdf', 'تحميل PDF');
  const resolvedExcelLabel = excelLabel ?? t('components.ReportPrintPreviewModal.تحميل_excel', 'تحميل Excel');
  const iframeRef = useRef(null);

  if (!open || !bodyHtml) return null;

  const srcDoc = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${resolvedTitle}</title>
  <style>${REPORT_STYLES}</style>
</head>
<body>${bodyHtml}</body>
</html>`;

  const handlePrint = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
  };

  return (
    <div className="modal-overlay report-preview-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-card modal-card--xl report-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-preview-modal__head">
          <h2 className="report-preview-modal__title">{resolvedTitle}</h2>
          <button type="button" className="icon-btn" onClick={onClose} title={t('components.InstallAppBanner.إغلاق', 'إغلاق')}>
            <X size={20} />
          </button>
        </div>
        <iframe
          ref={iframeRef}
          className="report-preview-modal__frame"
          title={resolvedTitle}
          srcDoc={srcDoc}
        />
        <div className="report-preview-modal__actions">
          <button type="button" className="google-btn google-btn--filled" onClick={handlePrint}>
            <Printer size={16} /> {t('components.ReportPrintPreviewModal.طباعة', 'طباعة')}
          </button>
          {onDownloadPdf && (
            <BusyButton type="button" className="google-btn" busy={pdfExporting} onClick={onDownloadPdf}>
              <FileDown size={16} /> {resolvedPdfLabel}
            </BusyButton>
          )}
          {onDownloadExcel && (
            <button type="button" className="google-btn" onClick={onDownloadExcel}>
              <FileSpreadsheet size={16} /> {resolvedExcelLabel}
            </button>
          )}
          <button type="button" className="google-btn" onClick={onClose}>
            {t('components.InstallAppBanner.إغلاق', 'إغلاق')}
          </button>
        </div>
      </div>
    </div>
  );
}
