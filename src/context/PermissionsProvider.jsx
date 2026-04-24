import React, { useEffect, useMemo, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import FirestoreApi from '../services/firestoreApi';
import { PermissionsContext } from './permissionsContext';
import { resolvePageDataScope, loadMembershipGroupIdsFromMirrors } from '../utils/permissionDataScope';

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

  const [membershipGroupIds, setMembershipGroupIds] = useState(() => new Set());
  const [membershipLoading, setMembershipLoading] = useState(false);

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
      }
    );
    return () => unsub();
  }, [user?.uid, user?.permissionProfileId]);

  const pages = profileState.profile?.pages || {};

  const needsMembershipData = useMemo(() => {
    if (!user || user.role === 'admin') return false;
    if (!profileState.profile) return false;
    return Object.values(pages).some((cfg) => cfg && cfg.dataScope === 'membership');
  }, [user, profileState.profile, pages]);

  useEffect(() => {
    if (!user?.uid || user.role === 'admin' || !needsMembershipData) {
      setMembershipGroupIds(new Set());
      setMembershipLoading(false);
      return undefined;
    }

    const uid = user.uid || user.id;
    let cancelled = false;
    setMembershipLoading(true);
    (async () => {
      try {
        const ids = await loadMembershipGroupIdsFromMirrors(FirestoreApi.Api, uid);
        if (!cancelled) {
          setMembershipGroupIds(ids);
          setMembershipLoading(false);
        }
      } catch {
        if (!cancelled) {
          setMembershipGroupIds(new Set());
          setMembershipLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, user?.id, user?.role, needsMembershipData]);

  const value = useMemo(() => {
    if (!user) {
      return {
        ready: true,
        hasPermissionProfile: false,
        canAccessPage: () => false,
        can: () => false,
        pageDataScope: () => 'all',
        membershipGroupIds: new Set(),
        membershipLoading: false,
        actorUser: null,
      };
    }

    const pid = String(user?.permissionProfileId || '').trim();
    if (!pid) {
      return {
        ready: true,
        hasPermissionProfile: false,
        canAccessPage: () => false,
        can: () => false,
        pageDataScope: () => 'all',
        membershipGroupIds: new Set(),
        membershipLoading: false,
        actorUser: user,
      };
    }

    if (profileState.loading || profileState.profileId !== pid) {
      return {
        ready: false,
        hasPermissionProfile: true,
        canAccessPage: () => false,
        can: () => false,
        pageDataScope: () => 'all',
        membershipGroupIds: new Set(),
        membershipLoading: Boolean(needsMembershipData),
        actorUser: user,
      };
    }

    const pagesResolved = profileState.profile?.pages || {};
    return {
      ready: true,
      hasPermissionProfile: Boolean(profileState.profile),
      actorUser: user,
      membershipGroupIds,
      membershipLoading,
      pageDataScope: (pageId) => resolvePageDataScope(user, pagesResolved, pageId),
      canAccessPage: (pageId) => {
        if (!pageId) return true;
        return pageVisible(pagesResolved, pageId);
      },
      can: (pageId, actionId) => {
        if (!pageId || !actionId) return false;
        if (!pageVisible(pagesResolved, pageId)) return false;
        return pagesResolved?.[pageId]?.actions?.[actionId] === true;
      },
    };
  }, [user, profileState, membershipGroupIds, membershipLoading, needsMembershipData]);

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}
