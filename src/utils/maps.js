/**
 * التحقق من صلاحية إحداثيات GPS للعرض على الخرائط.
 */
export function hasValidGps(gps) {
  if (!gps || gps.lat == null || gps.lng == null) return false;
  const lat = Number(gps.lat);
  const lng = Number(gps.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * رابط خرائط Google لنقطة جغرافية (يفتح في تبويب جديد).
 */
export function getGoogleMapsUrl(lat, lng) {
  if (!hasValidGps({ lat, lng })) return null;
  return `https://www.google.com/maps?q=${Number(lat)},${Number(lng)}`;
}

export function openGoogleMaps(lat, lng) {
  const url = getGoogleMapsUrl(lat, lng);
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}
