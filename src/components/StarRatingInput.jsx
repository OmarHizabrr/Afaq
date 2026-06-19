import React from 'react';
import { Star } from 'lucide-react';

/**
 * @param {object} props
 * @param {number|string} props.value
 * @param {(n: number) => void} props.onChange
 * @param {string} [props.label]
 * @param {string} [props.className]
 */
const StarRatingInput = ({ value, onChange, label, className = '', style, compact = false, readOnly = false }) => {
  const { t } = useAppTranslation();
  const v = Math.min(5, Math.max(0, Math.round(Number(value) || 0)));
  const starSize = compact ? 22 : 28;

  if (readOnly) {
    return (
      <div className={`star-rating-input star-rating-input--readonly ${compact ? 'star-rating-input--compact' : ''} ${className}`.trim()} style={style}>
        {label ? <span className="app-label star-rating-input__label">{label}</span> : null}
        <span className="star-rating-input__value star-rating-input__value--readonly">{v > 0 ? `${v}/5` : '—'}</span>
      </div>
    );
  }

  return (
    <div className={`star-rating-input ${compact ? 'star-rating-input--compact' : ''} ${className}`.trim()} style={style}>
      {label ? (
        <span className="app-label star-rating-input__label">
          {label}
        </span>
      ) : null}
      <div className="star-rating-input__row">
        <div role="group" aria-label={label || t('components.StarRatingInput.تقييم_بالنجوم', 'تقييم بالنجوم')} className="star-rating-input__stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="star-rating-input__btn"
              aria-label={t('components.StarRatingInput.نجمة_star_من_5', `${star} من 5`)}
              aria-pressed={star <= v}
              onClick={() => onChange(star)}
            >
              <Star
                size={starSize}
                strokeWidth={1.75}
                fill={star <= v ? '#f59e0b' : 'transparent'}
                color="#f59e0b"
              />
            </button>
          ))}
        </div>
        <span className="star-rating-input__value">
          {v}/5
        </span>
      </div>
    </div>
  );
};

export default StarRatingInput;
