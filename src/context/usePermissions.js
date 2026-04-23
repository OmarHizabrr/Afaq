import { useContext } from 'react';
import { PermissionsContext } from './permissionsContext';

export default function usePermissions() {
  return useContext(PermissionsContext);
}

