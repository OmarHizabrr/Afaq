import React from 'react';
import { MapPin, ExternalLink } from 'lucide-react';
import { hasValidGps, openGoogleMaps } from '../utils/maps';

/**
 * عرض الإحداثيات مع إمكانية النقر لفتح خرائط Google (مثل تيليجرام/واتساب).
 */
const MapLocationOpen = ({ gpsLocation, label = 'الموقع الجغرافي', subtitle }) => {
  if (!hasValidGps(gpsLocation)) {
    return (
      <div className="map-location-open map-location-open--empty">
        <MapPin size={20} color="var(--text-secondary)" aria-hidden />
        <span>{subtitle || 'لم يتم تسجيل إحداثيات GPS'}</span>
      </div>
    );
  }

  const { lat, lng } = gpsLocation;
  const text = `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;

  const handleOpen = () => openGoogleMaps(lat, lng);

  return (
    <button
      type="button"
      className="map-location-open map-location-open--clickable"
      onClick={handleOpen}
      title="فتح في خرائط Google"
    >
      <MapPin size={22} color="var(--md-primary)" aria-hidden />
      <div className="map-location-open__text">
        <strong>{label}</strong>
        <span className="map-location-open__coords">{text}</span>
        <span className="map-location-open__hint">
          <ExternalLink size={14} aria-hidden /> اضغط للانتقال إلى الخريطة
        </span>
      </div>
    </button>
  );
};

export default MapLocationOpen;
