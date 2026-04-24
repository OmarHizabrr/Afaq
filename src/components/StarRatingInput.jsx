import React from 'react';
import { Star } from 'lucide-react';

/**
 * @param {object} props
 * @param {number|string} props.value
 * @param {(n: number) => void} props.onChange
 * @param {string} [props.label]
 * @param {string} [props.className]
 */
const StarRatingInput = ({ value, onChange, label, className = '', style }) => {
  const v = Math.min(5, Math.max(0, Math.round(Number(value) || 0)));

  return (
    <div className={className} style={style}>
      {label ? (
        <span className="app-label" style={{ display: 'block', marginBottom: 8 }}>
          {label}
        </span>
      ) : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div role="group" aria-label={label || 'تقييم بالنجوم'} style={{ display: 'flex', gap: 4 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="star-rating-input__btn"
              aria-label={`${star} من 5`}
              aria-pressed={star <= v}
              onClick={() => onChange(star)}
            >
              <Star
                size={28}
                strokeWidth={1.75}
                fill={star <= v ? '#f59e0b' : 'transparent'}
                color="#f59e0b"
              />
            </button>
          ))}
        </div>
        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
          {v}/5
        </span>
      </div>
    </div>
  );
};

export default StarRatingInput;
