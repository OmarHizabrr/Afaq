import { createContext } from 'react';

export const PermissionsContext = createContext({
  ready: true,
  hasPermissionProfile: false,
  canAccessPage: () => false,
  can: () => false,
});

