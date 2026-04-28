import React from 'react';
import { AlertTriangle } from 'lucide-react';
import BusyButton from './BusyButton';

const ConfirmDialog = ({
  open,
  title = 'تأكيد الإجراء',
  message = '',
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="modal-card modal-card--sm confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog__icon">
          <AlertTriangle size={22} color={danger ? 'var(--danger-color)' : 'var(--warning-color)'} />
        </div>
        <h3 className="confirm-dialog__title">{title}</h3>
        <p className="confirm-dialog__message">{message}</p>
        <div className="confirm-dialog__actions">
          <BusyButton type="button" className="btn-md btn-md--outline" onClick={onCancel} busy={loading}>
            {cancelLabel}
          </BusyButton>
          <BusyButton
            type="button"
            className="btn-md"
            onClick={onConfirm}
            busy={loading}
            style={{
              background: danger ? 'var(--danger-color)' : 'var(--md-primary)',
              color: '#fff',
            }}
          >
            {confirmLabel}
          </BusyButton>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
