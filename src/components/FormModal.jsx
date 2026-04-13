import React from 'react';

const FormModal = ({ open, title, onClose, size = 'sm', children }) => {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-card ${size === 'sm' ? 'modal-card--sm' : ''}`} onClick={(e) => e.stopPropagation()}>
        {title && <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>{title}</h3>}
        {children}
      </div>
    </div>
  );
};

export default FormModal;
