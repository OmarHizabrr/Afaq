import React, { lazy, Suspense } from 'react';
import useAppTranslation from '../hooks/useAppTranslation';

const ReportPrintPreviewModal = lazy(() => import('./ReportPrintPreviewModal'));

const PreviewLoading = () => {
  const { t } = useAppTranslation();
  return (
  <div className="modal-overlay report-preview-overlay" role="status" aria-live="polite">
    <div className="modal-card modal-card--sm report-preview-loading">
      <div className="loading-spinner" />
      <p className="report-preview-loading__text">{t('components.LazyReportPrintPreviewModal.جاري_تحميل_المعاينة', 'جاري تحميل المعاينة…')}</p>
    </div>
  </div>
  );
};

export default function LazyReportPrintPreviewModal(props) {
  if (!props.open || !props.bodyHtml) return null;

  return (
    <Suspense fallback={<PreviewLoading />}>
      <ReportPrintPreviewModal {...props} />
    </Suspense>
  );
}
