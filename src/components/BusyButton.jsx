import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * زر يُعطَّل ويُظهر مؤشر دوران أثناء `busy`.
 * مرّر `className` و`children` كأي زر عادي.
 */
export default function BusyButton({ busy = false, children, className = '', type = 'button', disabled, ...rest }) {
  return (
    <button type={type} className={className} disabled={disabled || busy} {...rest}>
      {busy ? (
        <span className="busy-btn__inner">
          <Loader2 className="busy-btn__spin" size={18} aria-hidden />
          <span className="busy-btn__label">{children}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
