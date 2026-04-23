import { useContext } from 'react';
import { SiteContentContext } from './siteContentContext';

export default function useSiteContent() {
  return useContext(SiteContentContext);
}

