// Khoảng cách giữa 2 điểm trên mặt đất (công thức haversine), đơn vị mét
export function distanceMeters(a, b) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// 350 m, 1,2 km (dấu thập phân theo ngôn ngữ)
export function formatDistance(meters, lang = "vi") {
  if (!Number.isFinite(meters)) return "";
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  const km = meters / 1000;
  return `${new Intl.NumberFormat(lang, { maximumFractionDigits: km < 10 ? 1 : 0 }).format(km)} km`;
}

export function hasCoords(place) {
  return Number.isFinite(place?.latitude) && Number.isFinite(place?.longitude);
}
