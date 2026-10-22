// "Hồ sơ" của một quán: những thông tin khách cần mà quán đã có hay còn thiếu.
// Dùng cho trang tổng quan, cột hồ sơ trong danh sách và thẻ xem trước ở form.
// ctx.brokenImages (Set link ảnh không tải được) để coi ảnh hỏng là chưa có ảnh.

export const PROFILE_ITEMS = [
  { key: "address", label: "Địa chỉ", icon: "address", has: (p) => Boolean(p.address?.trim()) },
  {
    key: "image",
    label: "Ảnh",
    icon: "image",
    has: (p, ctx) => Boolean(p.imageUrl?.trim()) && !ctx?.brokenImages?.has(p.imageUrl.trim()),
  },
  {
    key: "location",
    label: "Vị trí bản đồ",
    icon: "pin",
    has: (p) => p.latitude != null && p.latitude !== "" && p.longitude != null && p.longitude !== "",
  },
  {
    key: "price",
    label: "Giá",
    icon: "price",
    has: (p) => (p.priceMin != null && p.priceMin !== "") || (p.priceMax != null && p.priceMax !== ""),
  },
  { key: "hours", label: "Giờ mở cửa", icon: "clock", has: (p) => Boolean(p.openingHours?.trim()) },
];

// Quán mẫu do server tự tạo khi database trống
export const isSamplePlace = (place) => /^\[Mẫu\]/.test(place?.name?.trim() ?? "");

export function getMissingItems(place, ctx) {
  return PROFILE_ITEMS.filter((item) => !item.has(place, ctx));
}

export function isProfileComplete(place, ctx) {
  return getMissingItems(place, ctx).length === 0 && !isSamplePlace(place);
}

// Bộ lọc "còn thiếu" dùng trên địa chỉ trang: ?missing=image
export const MISSING_FILTERS = [
  { key: "any", label: "Chưa đủ hồ sơ" },
  ...PROFILE_ITEMS.map((item) => ({ key: item.key, label: `Thiếu ${item.label.toLowerCase()}` })),
  { key: "sample", label: "Còn dữ liệu mẫu" },
];

export function matchesMissingFilter(place, filter, ctx) {
  if (!filter) return true;
  if (filter === "any") return !isProfileComplete(place, ctx);
  if (filter === "sample") return isSamplePlace(place);
  const item = PROFILE_ITEMS.find((i) => i.key === filter);
  return item ? !item.has(place, ctx) : true;
}

// Số liệu cho trang tổng quan
export function summarizePlaces(places, ctx) {
  const missingCounts = Object.fromEntries(PROFILE_ITEMS.map((i) => [i.key, 0]));
  let complete = 0;
  let samples = 0;
  const categories = new Map();

  for (const place of places) {
    for (const item of getMissingItems(place, ctx)) missingCounts[item.key] += 1;
    if (isProfileComplete(place, ctx)) complete += 1;
    if (isSamplePlace(place)) samples += 1;
    const category = place.category?.trim() || "Chưa phân loại";
    categories.set(category, (categories.get(category) ?? 0) + 1);
  }

  return {
    total: places.length,
    complete,
    samples,
    missingCounts,
    categories: [...categories.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "vi")),
  };
}
