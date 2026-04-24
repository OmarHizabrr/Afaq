import React from 'react';
import { Info, AlertTriangle, CheckCircle, MessageCircle } from 'lucide-react';

const TYPE_CONFIG = {
  info: { Icon: Info, color: 'var(--md-primary)' },
  success: { Icon: CheckCircle, color: 'var(--success-color)' },
  warning: { Icon: AlertTriangle, color: '#f59e0b' },
  error: { Icon: AlertTriangle, color: 'var(--danger-color)' },
  neutral: { Icon: MessageCircle, color: 'var(--text-secondary)' },
};

/**
 * عرض موحّد للإشعارات ومحتوى الرسائل (عنوان، ميتا، نص، وقت، تذييل).
 * `type`: info | success | warning | error | neutral (محادثات)
 */
export default function UnifiedMessageCard({
  type = 'info',
  title,
  meta,
  body,
  timestamp,
  footer,
  unread = false,
  compact = false,
  className = '',
  ...rest
}) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.info;
  const { Icon, color } = cfg;
  const iconSize = compact ? 16 : 20;

  const hasTitle = title != null && title !== '';
  const hasTs = timestamp != null && timestamp !== '';
  const timeInHeader = hasTitle && hasTs;

  return (
    <div
      className={`unified-msg-card unified-msg-card--${type} ${unread ? 'unified-msg-card--unread' : ''} ${compact ? 'unified-msg-card--compact' : ''} ${className}`.trim()}
      {...rest}
    >
      <div className="unified-msg-card__icon" aria-hidden>
        <Icon size={iconSize} color={color} />
      </div>
      <div className="unified-msg-card__main">
        {(hasTitle || (hasTs && timeInHeader)) && (
          <div className="unified-msg-card__title-row">
            {hasTitle && <h3 className="unified-msg-card__title">{title}</h3>}
            {timeInHeader && <span className="unified-msg-card__time unified-msg-card__time--header">{timestamp}</span>}
          </div>
        )}
        {meta != null && <div className="unified-msg-card__meta">{meta}</div>}
        {body != null && <div className="unified-msg-card__text">{body}</div>}
        {(!timeInHeader && hasTs) || footer != null ? (
          <div className="unified-msg-card__foot">
            {!timeInHeader && hasTs && <span className="unified-msg-card__time">{timestamp}</span>}
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
