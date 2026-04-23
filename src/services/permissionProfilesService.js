import {
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import FirestoreApi from './firestoreApi';

export function subscribePermissionProfiles(onNext, onError) {
  const api = FirestoreApi.Api;
  const q = query(api.getPermissionProfilesCollection(), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onNext(rows);
    },
    onError,
  );
}

export async function savePermissionProfile(user, profileId, payload) {
  const api = FirestoreApi.Api;
  const id = String(profileId || '').trim() || api.getNewId('permission_profiles');
  await api.setData({
    docRef: api.getPermissionProfileDoc(id),
    data: {
      name: String(payload.name || '').trim(),
      pages: payload.pages && typeof payload.pages === 'object' ? payload.pages : {},
    },
    merge: true,
    userData: user || {},
  });
  return id;
}

export async function deletePermissionProfile(profileId) {
  const api = FirestoreApi.Api;
  await api.deleteData(api.getPermissionProfileDoc(profileId));
}

