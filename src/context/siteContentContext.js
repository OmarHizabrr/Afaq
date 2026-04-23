import { createContext } from 'react';

export const siteContentDefaults = {
  branding: {
    siteName: 'آفاق',
    siteTitle: 'آفاق',
    logoText: 'آفاق',
    adminSubtitle: 'لوحة تحكم الإدارة',
  },
  strings: {},
};

export const SiteContentContext = createContext({
  ...siteContentDefaults,
  str: (key, fallback = '') => fallback || key,
});

