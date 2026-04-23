import React, { useEffect, useMemo, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import FirestoreApi from '../services/firestoreApi';
import { PermissionsContext } from './permissionsContext';

function pageVisible(pages, pageId) {
  if (!pages || typeof pages !== 'object') return false;
  return Boolean(pages[pageId]);
}

export default function PermissionsProvider({ user, children }) {
  const [profileState, setProfileState] = useState({
    loading: true,
    profileId: '',
    profile: null,
  });

  useEffect(() => {
    const pid = String(user?.permissionProfileId || '').trim();
    if (!user?.uid || !pid) return undefined;

    const api = FirestoreApi.Api;
    const unsub = onSnapshot(
      api.getPermissionProfileDoc(pid),
      (snap) => {
        setProfileState({
          loading: false,
          profileId: pid,
          profile: snap.exists() ? snap.data() : null,
        });
      },
      () => {
        setProfileState({
          loading: false,
          profileId: pid,
          profile: null,
        });
      },
    );
    return () => unsub();
  }, [user?.uid, user?.permissionProfileId]);

  const value = useMemo(() => {
    const isAdmin = user?.role === 'admin';
    if (!user) {
      return {
        ready: true,
        canAccessPage: () => false,
        can: () => false,
      };
    }
    if (isAdmin && !user?.permissionProfileId) {
      return {
        ready: true,
        canAccessPage: () => true,
        can: () => true,
      };
    }

    const pid = String(user?.permissionProfileId || '').trim();
    if (!pid) {
      return {
        ready: true,
        canAccessPage: () => true,
        can: () => true,
      };
    }

    if (profileState.loading || profileState.profileId !== pid) {
      return {
        ready: false,
        canAccessPage: () => false,
        can: () => false,
      };
    }

    const pages = profileState.profile?.pages || {};
    return {
      ready: true,
      canAccessPage: (pageId) => {
        if (!pageId) return true;
        return pageVisible(pages, pageId);
      },
      can: (pageId, actionId) => {
        if (!pageId || !actionId) return false;
        if (!pageVisible(pages, pageId)) return false;
        return pages?.[pageId]?.actions?.[actionId] === true;
      },
    };
  }, [user, profileState]);

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

