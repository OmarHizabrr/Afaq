import { createContext } from 'react';

export const siteContentDefaults = {
  branding: {
    siteName: 'آفاق',
    siteTitle: 'آفاق',
    logoText: 'آفاق',
    adminSubtitle: 'لوحة تحكم الإدارة',
  },
  strings: {},
  contacts: [],
  contactsMessage: 'يرجى التواصل مع الإدارة لتحديد نوع الصلاحيات المناسبة لحسابك.',
};

export const SiteContentContext = createContext({
  ...siteContentDefaults,
  str: (key, fallback = '') => fallback || key,
});

