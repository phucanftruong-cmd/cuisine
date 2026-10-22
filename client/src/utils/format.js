export function formatPrice(place) {
  const { priceMin, priceMax } = place;
  if (priceMin == null && priceMax == null) return null;

  const fmt = (n) => `${n.toLocaleString("vi-VN")}đ`;
  if (priceMin != null && priceMax != null) {
    return `${fmt(priceMin)} - ${fmt(priceMax)}`;
  }
  return fmt(priceMin ?? priceMax);
}