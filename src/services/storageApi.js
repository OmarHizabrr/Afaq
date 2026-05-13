import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const uploadMedia = async (file, path) => {
  if (!file) return null;
  const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
};

function safeStorageFileName(name) {
  const base = String(name || 'file')
    .replace(/[/\\]/g, '_')
    .replace(/[^\w.\u0600-\u06FF-]+/g, '_')
    .trim();
  return (base || 'file').slice(0, 120);
}

/**
 * رفع مرفق لحقل استكشاف ديناميكي (ملف / صورة / فيديو / صوت / توقيع).
 * المسار: explorations/field_uploads/{userId}/{fieldId}_{timestamp}_{اسم_آمن}
 */
export async function uploadExplorationFieldFile(file, { userId, fieldId }) {
  if (!file) return null;
  const uid = String(userId || 'anonymous').replace(/[^\w-]/g, '') || 'anonymous';
  const fid = String(fieldId || 'field').replace(/[^\w-]/g, '_').slice(0, 80);
  const objectPath = `explorations/field_uploads/${uid}/${fid}_${Date.now()}_${safeStorageFileName(file.name)}`;
  const storageRef = ref(storage, objectPath);
  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type || 'application/octet-stream',
  });
  return getDownloadURL(snapshot.ref);
}
