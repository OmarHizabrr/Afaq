/** تقييم زيارة المشرف: النطاق الجديد 1–5 نجوم. القيم القديمة كانت حتى 10. */

export function formatVisitRatingLabel(stored) {
  const x = Number(stored);
  if (!Number.isFinite(x) || x <= 0) return '—';
  if (x <= 5) return `${Math.round(x)}/5`;
  return `${Math.round(x)}/10`;
}

/** للعرض في واجهة النجوم: تحويل تخزين قديم (حتى 10) إلى 1–5 */
export function toStarDisplayValue(stored) {
  const x = Number(stored);
  if (!Number.isFinite(x) || x <= 0) return 3;
  if (x <= 5) return Math.min(5, Math.max(1, Math.round(x)));
  return Math.min(5, Math.max(1, Math.round(x / 2)));
}

export function clampVisitRatingSave(value) {
  const x = Math.round(Number(value));
  if (!Number.isFinite(x)) return 3;
  return Math.min(5, Math.max(1, x));
}
