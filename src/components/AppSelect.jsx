import React from 'react';
import { ChevronDown } from 'lucide-react';

const AppSelect = ({ className = '', children, ...props }) => {
  const mergedClassName = ['app-select', 'app-select--enhanced', className].filter(Boolean).join(' ');

  return (
    <div className="app-select-wrap">
      <select {...props} className={mergedClassName}>
        {children}
      </select>
      <ChevronDown size={16} className="app-select-wrap__icon" aria-hidden />
    </div>
  );
};

export default AppSelect;
