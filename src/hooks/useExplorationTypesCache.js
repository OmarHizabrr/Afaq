import { useEffect, useState } from 'react';
import FirestoreApi from '../services/firestoreApi';

/**
 * كاش جلوبال (على مستوى الموديول) لأنواع الاستكشاف بحيث لا تُحمَّل أكثر من مرة
 * عبر الصفحات. يُستخدم لعرض بيانات نموذج الاستكشاف للسجلات داخل بطاقات
 * القوائم بدون استدعاءات مكررة.
 */

let cachedTypes = null;
let cachedTypesById = null;
let cachePromise = null;
const subscribers = new Set();

function setCache(rows) {
  cachedTypes = Array.isArray(rows) ? rows : [];
  cachedTypesById = new Map(cachedTypes.map((t) => [t.id, t]));
  subscribers.forEach((cb) => {
    try { cb(cachedTypes); } catch (_err) { /* ignore */ }
  });
}

async function loadOnce() {
  if (cachedTypes) return cachedTypes;
  if (cachePromise) return cachePromise;
  cachePromise = (async () => {
    try {
      const api = FirestoreApi.Api;
      const docs = await api.getDocuments(api.getExplorationTypesCollection());
      const rows = docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setCache(rows);
      return cachedTypes;
    } finally {
      cachePromise = null;
    }
  })();
  return cachePromise;
}

/** إبطال الكاش يدوياً (مثلاً بعد إضافة/تعديل نوع استكشاف) */
export function invalidateExplorationTypesCache() {
  cachedTypes = null;
  cachedTypesById = null;
}

/**
 * @param {boolean} enabled — هل نريد بدء التحميل عند ركوب المكوّن
 */
export function useExplorationTypesCache(enabled = true) {
  const [types, setTypes] = useState(cachedTypes || []);
  const [loading, setLoading] = useState(!cachedTypes && enabled);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    if (cachedTypes) {
      setTypes(cachedTypes);
      setLoading(false);
    } else {
      setLoading(true);
      loadOnce()
        .then((rows) => {
          if (!cancelled) {
            setTypes(rows || []);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) setLoading(false);
        });
    }
    const cb = (rows) => {
      if (!cancelled) setTypes(rows);
    };
    subscribers.add(cb);
    return () => {
      cancelled = true;
      subscribers.delete(cb);
    };
  }, [enabled]);

  return {
    types,
    loading,
    getById: (id) => (id && cachedTypesById ? cachedTypesById.get(id) || null : null),
  };
}
