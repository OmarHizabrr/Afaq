import React from 'react';
import { Navigate } from 'react-router-dom';
import usePermissions from '../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../config/permissionRegistry';

/** يسمح للمعلمين ولمن لديه صلاحية التحضير أو التقارير */
export default function DailyPrepGuard({ children }) {
  const { ready, canAccessPage, actorUser } = usePermissions();

  if (!ready) {
    return (
      <div className="route-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  const role = actorUser?.role || '';
  const allowed =
    canAccessPage(PERMISSION_PAGE_IDS.daily_preparation) ||
    canAccessPage(PERMISSION_PAGE_IDS.reports) ||
    role === 'teacher';

  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return children;
}
