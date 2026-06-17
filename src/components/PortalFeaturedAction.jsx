import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Sparkles } from 'lucide-react';

/**
 * بطاقة وصول سريع بارزة في لوحات البوابات (مشرف / معلم).
 */
const PortalFeaturedAction = ({
  to,
  icon: Icon,
  title,
  subtitle,
  badge,
  tone = 'primary',
  secondaryAction,
}) => {
  const navigate = useNavigate();

  if (!to || !Icon || !title) return null;

  const SecondaryIcon = secondaryAction?.icon;

  return (
    <div className="portal-featured-action-wrap">
      <button
        type="button"
        className={`portal-featured-action portal-featured-action--${tone}`}
        onClick={() => navigate(to)}
        aria-label={subtitle ? `${title} — ${subtitle}` : title}
      >
        <span className="portal-featured-action__glow" aria-hidden />
        <span className="portal-featured-action__icon" aria-hidden>
          <Icon size={28} strokeWidth={2.25} />
        </span>
        <span className="portal-featured-action__body">
          {badge ? (
            <span className="portal-featured-action__badge">
              <Sparkles size={12} aria-hidden />
              {badge}
            </span>
          ) : null}
          <span className="portal-featured-action__title">{title}</span>
          {subtitle ? <span className="portal-featured-action__subtitle">{subtitle}</span> : null}
        </span>
        <span className="portal-featured-action__chevron" aria-hidden>
          <ChevronLeft size={22} strokeWidth={2.5} />
        </span>
      </button>

      {secondaryAction ? (
        <button
          type="button"
          className="portal-featured-action__secondary"
          onClick={() => navigate(secondaryAction.path)}
        >
          {SecondaryIcon ? <SecondaryIcon size={16} aria-hidden /> : null}
          <span>{secondaryAction.label}</span>
        </button>
      ) : null}
    </div>
  );
};

export default PortalFeaturedAction;
