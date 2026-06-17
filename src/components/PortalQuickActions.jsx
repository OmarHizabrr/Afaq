import React from 'react';
import { useNavigate } from 'react-router-dom';

const PortalQuickActions = ({ actions }) => {
  const navigate = useNavigate();

  if (!actions?.length) return null;

  return (
    <div className="portal-quick-actions" role="navigation" aria-label="اختصارات سريعة">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.path}
            type="button"
            className={`portal-quick-actions__btn${action.tone ? ` portal-quick-actions__btn--${action.tone}` : ''}`}
            onClick={() => navigate(action.path)}
          >
            {Icon ? <Icon size={18} aria-hidden /> : null}
            <span className="portal-quick-actions__label">{action.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default PortalQuickActions;
