import { createContext } from 'react';

export const PermissionsContext = createContext({
  ready: true,
  canAccessPage: () => true,
  can: () => true,
});

