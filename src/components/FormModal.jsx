import React from 'react';

const FormModal = ({ open, title, onClose, size = 'sm', children, className }) => {
  if (!open) return null;

  const sizeClass =
    size === 'sm'
      ? 'modal-card--sm'
      : size === 'lg'
        ? 'modal-card--lg'
        : size === 'xl'
          ? 'modal-card--xl'
          : '';

  return (
    <div className="modal-overlay modal-overlay--drawer" onClick={onClose}>
      <div className={`modal-card ${sizeClass} ${className || ''}`.trim()} onClick={(e) => e.stopPropagation()}>
        {title && <h3 className="modal-card__title">{title}</h3>}
        {children}
      </div>
    </div>
  );
};

export default FormModal;
