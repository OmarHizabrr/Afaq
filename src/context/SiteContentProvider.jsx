import React, { useEffect, useMemo, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import FirestoreApi from '../services/firestoreApi';
import { SiteContentContext, siteContentDefaults } from './siteContentContext';

export default function SiteContentProvider({ children }) {
  const [data, setData] = useState(siteContentDefaults);

  useEffect(() => {
    const api = FirestoreApi.Api;
    const unsub = onSnapshot(
      api.getSiteConfigDoc('global'),
      (snap) => {
        const raw = snap.exists() ? snap.data() : {};
        setData({
          branding: {
            ...siteContentDefaults.branding,
            ...(raw.branding || {}),
          },
          strings: {
            ...(raw.strings || {}),
          },
          contacts: Array.isArray(raw.contacts) ? raw.contacts : [],
          contactsMessage:
            typeof raw.contactsMessage === 'string' && raw.contactsMessage.trim()
              ? raw.contactsMessage
              : siteContentDefaults.contactsMessage,
        });
      },
      () => {
        setData(siteContentDefaults);
      },
    );
    return () => unsub();
  }, []);

  const value = useMemo(() => ({
    ...data,
    str: (key, fallback = '') => {
      const v = data?.strings?.[key];
      if (typeof v === 'string' && v.trim()) return v;
      return fallback || key;
    },
  }), [data]);

  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}

