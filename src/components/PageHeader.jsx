import React from 'react';

/**
 * عنوان صفحة موحّد بأسلوب Material / Google (RTL).
 */
export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  iconColor,
  iconBox = false,
  variant = 'default',
  children,
  style,
  className = '',
  topRow,
}) {
  const titleClass =
    variant === 'hero'
      ? 'page-header-block__title page-header-block__title--hero'
      : 'page-header-block__title';

  const iconEl =
    Icon &&
    (iconBox ? (
      <div className="page-header__icon-box" aria-hidden>
        <Icon size={26} color={iconColor || 'var(--md-primary)'} />
      </div>
    ) : (
      <div className="page-header__icon-plain" aria-hidden>
        <Icon size={28} color={iconColor || 'var(--md-primary)'} />
      </div>
    ));

  return (
    <div className={`page-header-block ${className}`.trim()} style={style}>
      {topRow ? <div className="page-header-block__top">{topRow}</div> : null}
      <div className="page-header-block__layout">
        <div className="page-header-block__lead">
          {iconEl}
          <div className="page-header-block__text">
            <h1 className={titleClass}>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
        </div>
        {children ? <div className="page-header-block__actions">{children}</div> : null}
      </div>
    </div>
  );
}
