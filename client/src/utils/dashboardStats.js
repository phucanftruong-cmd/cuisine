// Các hàm tính số liệu cho trang Tổng quan. Hàm thuần, không gọi API, có unit test.

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

// Server trả thời gian UTC, có khi thiếu chữ "Z" (SQLite không lưu múi giờ) -> coi như UTC
export function parseServerDate(value) {
  if (!value) return null;
  const text = /[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

// "vừa xong", "5 phút trước", "3 giờ trước", "hôm qua", "4 ngày trước", hoặc ngày cụ thể
export function relativeTime(value, now = new Date()) {
  const date = value instanceof Date ? value : parseServerDate(value);
  if (!date) return "";
  const diff = now.getTime() - date.getTime();
  if (diff < MINUTE) return "vừa xong";
  if (diff < 60 * MINUTE) return `${Math.floor(diff / MINUTE)} phút trước`;
  if (diff < DAY) return `${Math.floor(diff / (60 * MINUTE))} giờ trước`;
  if (diff < 2 * DAY) return "hôm qua";
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)} ngày trước`;
  return date.toLocaleDateString("vi-VN");
}

// Giá đại diện của một quán: trung bình giá thấp nhất và cao nhất (hoặc mức duy nhất có)
export function typicalPrice(place) {
  const { priceMin, priceMax } = place;
  if (priceMin != null && priceMax != null) return (priceMin + priceMax) / 2;
  return priceMin ?? priceMax ?? null;
}

export function averagePrice(places) {
  const prices = places.map(typicalPrice).filter((p) => p != null);
  if (prices.length === 0) return null;
  return Math.round(prices.reduce((a, b) => a + b, 0) / prices.length / 1000) * 1000;
}

export function countRecent(places, days, now = new Date()) {
  const since = now.getTime() - days * DAY;
  return places.filter((p) => (parseServerDate(p.createdAt)?.getTime() ?? 0) >= since).length;
}

export function recentPlaces(places, limit = 5) {
  return [...places]
    .sort(
      (a, b) =>
        (parseServerDate(b.createdAt)?.getTime() ?? 0) - (parseServerDate(a.createdAt)?.getTime() ?? 0) ||
        b.id - a.id,
    )
    .slice(0, limit);
}

// Đếm theo một trường chữ (phường, loại món...), nhiều nhất lên trước, ô trống gom vào emptyLabel
export function countBy(places, key, emptyLabel) {
  const counts = new Map();
  for (const place of places) {
    const value = place[key]?.trim() || emptyLabel;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count, empty: label === emptyLabel }))
    .sort((a, b) => Number(a.empty) - Number(b.empty) || b.count - a.count || a.label.localeCompare(b.label, "vi"));
}

export const PRICE_BUCKETS = [
  { label: "Dưới 30 nghìn", max: 30000 },
  { label: "30 – 50 nghìn", max: 50000 },
  { label: "50 – 100 nghìn", max: 100000 },
  { label: "Từ 100 nghìn", max: Infinity },
];

// Nhóm theo mức giá thấp nhất (hoặc giá cao nhất nếu chỉ có giá cao nhất)
export function priceBuckets(places) {
  const rows = PRICE_BUCKETS.map((b) => ({ label: b.label, count: 0 }));
  let missing = 0;
  for (const place of places) {
    const price = place.priceMin ?? place.priceMax;
    if (price == null) {
      missing += 1;
      continue;
    }
    rows[PRICE_BUCKETS.findIndex((b) => price < b.max)].count += 1;
  }
  if (missing) rows.push({ label: "Chưa có giá", count: missing, empty: true });
  return rows;
}

// "06:00 - 21:00", "6h-21h", "6:30 – 22h", "18:00 - 02:00" -> { open, close } tính bằng phút trong ngày.
// Quán mở qua đêm có close > 24 giờ. Không đọc được thì trả null.
export function parseOpeningHours(text) {
  const match = /(\d{1,2})\s*(?:[:hg.]\s*(\d{2})?)?\s*[-–—]\s*(\d{1,2})\s*(?:[:hg.]\s*(\d{2})?)?/i.exec(text ?? "");
  if (!match) return null;
  const [, oh, om = "0", ch, cm = "0"] = match;
  const open = Number(oh) * 60 + Number(om);
  let close = Number(ch) * 60 + Number(cm);
  if (Number(oh) > 24 || Number(ch) > 24 || Number(om) > 59 || Number(cm) > 59) return null;
  if (close <= open) close += 24 * 60;
  return { open, close };
}

// Mô tả các giờ đông quán mở nhất: [6,7,8,12] -> "6h – 9h, 12h – 13h"
export function describePeakHours(hours) {
  const max = Math.max(0, ...hours.map((h) => h.count));
  if (max === 0) return null;
  const peak = hours.filter((h) => h.count === max).map((h) => h.hour);
  const ranges = [];
  for (const hour of peak) {
    const last = ranges.at(-1);
    if (last && last.end === hour) last.end = hour + 1;
    else ranges.push({ start: hour, end: hour + 1 });
  }
  return { max, text: ranges.map((r) => `${r.start}h – ${r.end}h`).join(", ") };
}

// Số quán mở cửa trong từng giờ của ngày (0h đến 23h)
export function openHoursHistogram(places) {
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  let parsed = 0;
  for (const place of places) {
    const range = parseOpeningHours(place.openingHours);
    if (!range) continue;
    parsed += 1;
    for (const slot of hours) {
      const start = slot.hour * 60;
      // Kiểm tra cả giờ đó của ngày hôm sau, cho quán mở qua đêm
      const open = [start, start + 24 * 60].some((s) => range.open < s + 60 && range.close > s);
      if (open) slot.count += 1;
    }
  }
  return { hours, parsed, unparsed: places.filter((p) => p.openingHours?.trim()).length - parsed };
}
