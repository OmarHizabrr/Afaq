import React from 'react';

/** عنوان صفحة موحّد بأسلوب Material / Google */
export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-header-block" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}
