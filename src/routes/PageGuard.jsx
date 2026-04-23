import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import usePermissions from '../context/usePermissions';
import { getPermissionPageIdFromPath } from '../config/permissionRegistry';

export default function PageGuard({ pageId, children }) {
  const location = useLocation();
  const { ready, canAccessPage } = usePermissions();
  const pid = pageId || getPermissionPageIdFromPath(location.pathname);

  if (!ready) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (pid && !canAccessPage(pid)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

