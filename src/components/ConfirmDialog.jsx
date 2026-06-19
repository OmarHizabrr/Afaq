import React from 'react';
import { AlertTriangle } from 'lucide-react';
import BusyButton from './BusyButton';
import useAppTranslation from '../hooks/useAppTranslation';

const ConfirmDialog = ({
  open,
  title,
  message = '',
  confirmLabel,
  cancelLabel,
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const { t } = useAppTranslation();
  const resolvedTitle = title ?? t('components.ConfirmDialog.تأكيد_الإجراء', 'تأكيد الإجراء');
  const resolvedConfirm = confirmLabel ?? t('components.ConfirmDialog.تأكيد', 'تأكيد');
  const resolvedCancel = cancelLabel ?? t('components.ConfirmDialog.إلغاء', 'إلغاء');

  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="modal-card modal-card--sm confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog__icon">
          <AlertTriangle size={22} color={danger ? 'var(--danger-color)' : 'var(--warning-color)'} />
        </div>
        <h3 className="confirm-dialog__title">{resolvedTitle}</h3>
        <p className="confirm-dialog__message">{message}</p>
        <div className="confirm-dialog__actions">
          <BusyButton type="button" className="btn-md btn-md--outline" onClick={onCancel} busy={loading}>
            {resolvedCancel}
          </BusyButton>
          <BusyButton
            type="button"
            className={`btn-md confirm-dialog__confirm${danger ? ' confirm-dialog__confirm--danger' : ''}`}
            onClick={onConfirm}
            busy={loading}
          >
            {resolvedConfirm}
          </BusyButton>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
