import React from 'react';
import { Navigate } from 'react-router-dom';
import usePermissions from '../context/usePermissions';

export function isPortalRole(role, portal) {
  if (!role || !portal) return false;
  if (portal === 'teacher') return role === 'teacher';
  if (portal === 'student') return role === 'student';
  if (portal === 'supervisor') return role === 'supervisor_arab' || role === 'supervisor_local';
  return false;
}

export default function RolePortalGuard({ portal, children }) {
  const { ready, actorUser } = usePermissions();

  if (!ready) {
    return (
      <div className="route-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!isPortalRole(actorUser?.role, portal)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
