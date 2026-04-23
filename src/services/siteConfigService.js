import FirestoreApi from './firestoreApi';

export async function saveBranding(user, branding) {
  const api = FirestoreApi.Api;
  await api.setData({
    docRef: api.getSiteConfigDoc('global'),
    data: { branding: { ...(branding || {}) } },
    merge: true,
    userData: user || {},
  });
}

export async function saveStrings(user, stringsPatch) {
  const api = FirestoreApi.Api;
  const patch = {};
  Object.entries(stringsPatch || {}).forEach(([k, v]) => {
    patch[`strings.${k}`] = String(v || '');
  });
  await api.updateData({
    docRef: api.getSiteConfigDoc('global'),
    data: patch,
    userData: user || {},
  });
}

export async function saveContacts(user, contacts) {
  const api = FirestoreApi.Api;
  await api.setData({
    docRef: api.getSiteConfigDoc('global'),
    data: {
      contacts: Array.isArray(contacts) ? contacts : [],
    },
    merge: true,
    userData: user || {},
  });
}

