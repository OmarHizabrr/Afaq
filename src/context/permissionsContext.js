import { createContext } from 'react';

export const PermissionsContext = createContext({
  ready: true,
  hasPermissionProfile: false,
  canAccessPage: () => false,
  can: () => false,
  pageDataScope: () => 'all',
  membershipGroupIds: new Set(),
  membershipMirrorGroupIds: new Set(),
  membershipLoading: false,
  actorUser: null,
});

