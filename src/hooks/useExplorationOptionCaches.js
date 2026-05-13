import { useCallback, useEffect, useState } from 'react';
import FirestoreApi from '../services/firestoreApi';
import { buildFieldsWithResolvedOptions, loadExplorationOptionCaches } from '../services/explorationFieldOptions';

/**
 * يحمّل محافظات/مناطق/قرى/مستخدمين لدمج خيارات حقول الاستكشاف الديناميكية.
 * @param {boolean} enabled — مثلاً عند فتح مودال الاستكشاف أو محرر النوع
 */
export function useExplorationOptionCaches(enabled) {
  const [caches, setCaches] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await loadExplorationOptionCaches(FirestoreApi.Api);
        if (!cancelled) setCaches(data);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const mergeFields = useCallback(
    (schemaFields, fieldValues, actorUser) => {
      if (!caches || !Array.isArray(schemaFields)) return schemaFields || [];
      return buildFieldsWithResolvedOptions(schemaFields, fieldValues, caches, actorUser);
    },
    [caches]
  );

  return { caches, loading, error, mergeFields };
}
