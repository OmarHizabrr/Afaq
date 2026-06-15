import React, { useRef } from 'react';
import { X, Printer, FileDown, FileSpreadsheet } from 'lucide-react';
import BusyButton from './BusyButton';
import { REPORT_STYLES } from '../utils/schoolReportHtml';

/**
 * معاينة تقرير HTML (RTL) قبل الطباعة أو التحميل.
 */
export default function ReportPrintPreviewModal({
  open,
  onClose,
  title = 'معاينة التقرير',
  bodyHtml,
  onDownloadPdf,
  onDownloadExcel,
  pdfExporting = false,
  pdfLabel = 'تحميل PDF',
  excelLabel = 'تحميل Excel',
}) {
  const iframeRef = useRef(null);

  if (!open || !bodyHtml) return null;

  const srcDoc = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
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
          <h2 className="report-preview-modal__title">{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} title="إغلاق">
            <X size={20} />
          </button>
        </div>
        <iframe
          ref={iframeRef}
          className="report-preview-modal__frame"
          title={title}
          srcDoc={srcDoc}
        />
        <div className="report-preview-modal__actions">
          <button type="button" className="google-btn google-btn--filled" onClick={handlePrint}>
            <Printer size={16} /> طباعة
          </button>
          {onDownloadPdf && (
            <BusyButton type="button" className="google-btn" busy={pdfExporting} onClick={onDownloadPdf}>
              <FileDown size={16} /> {pdfLabel}
            </BusyButton>
          )}
          {onDownloadExcel && (
            <button type="button" className="google-btn" onClick={onDownloadExcel}>
              <FileSpreadsheet size={16} /> {excelLabel}
            </button>
          )}
          <button type="button" className="google-btn" onClick={onClose}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
