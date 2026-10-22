import { hasCoords } from "./geo.js";

// Link mở Google Maps chỉ đường tới địa điểm (ưu tiên tọa độ, không có thì theo địa chỉ)
export function directionsUrl(place) {
  const base = "https://www.google.com/maps/dir/?api=1&destination=";
  if (hasCoords(place)) return `${base}${place.latitude},${place.longitude}`;
  const address = [place?.address, place?.ward].filter((s) => s?.trim()).join(", ");
  return address ? `${base}${encodeURIComponent(address)}` : null;
}
