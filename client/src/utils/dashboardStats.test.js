// Unit test cho số liệu trang Tổng quan. Chạy: npm test
import assert from "node:assert/strict";
import test from "node:test";
import * as s from "./dashboardStats.js";

const now = new Date("2026-10-22T12:00:00Z");

test("đọc thời gian server, kể cả khi thiếu múi giờ", () => {
  assert.equal(s.parseServerDate("2026-10-22T10:00:00").toISOString(), "2026-10-22T10:00:00.000Z");
  assert.equal(s.parseServerDate("2026-10-22T10:00:00Z").toISOString(), "2026-10-22T10:00:00.000Z");
  assert.equal(s.parseServerDate(null), null);
});

test("thời gian tương đối", () => {
  assert.equal(s.relativeTime("2026-10-22T11:59:30Z", now), "vừa xong");
  assert.equal(s.relativeTime("2026-10-22T11:15:00Z", now), "45 phút trước");
  assert.equal(s.relativeTime("2026-10-22T07:00:00Z", now), "5 giờ trước");
  assert.equal(s.relativeTime("2026-10-21T08:00:00Z", now), "hôm qua");
  assert.equal(s.relativeTime("2026-10-18T12:00:00Z", now), "4 ngày trước");
});

test("giá trung bình làm tròn nghìn, bỏ quán chưa có giá", () => {
  const places = [
    { priceMin: 40000, priceMax: 70000 },
    { priceMin: 20000, priceMax: null },
    { priceMin: null, priceMax: null },
  ];
  assert.equal(s.typicalPrice(places[0]), 55000);
  assert.equal(s.averagePrice(places), 38000);
  assert.equal(s.averagePrice([{ priceMin: null, priceMax: null }]), null);
});

test("đếm quán mới và lấy quán mới nhất", () => {
  const places = [
    { id: 1, createdAt: "2026-10-01T00:00:00" },
    { id: 2, createdAt: "2026-10-20T00:00:00" },
    { id: 3, createdAt: "2026-10-22T09:00:00" },
  ];
  assert.equal(s.countRecent(places, 7, now), 2);
  assert.deepEqual(s.recentPlaces(places, 2).map((p) => p.id), [3, 2]);
});

test("đếm theo phường, ô trống xếp cuối", () => {
  const rows = s.countBy([{ ward: "Phường 11" }, { ward: "Phường 11" }, { ward: null }, { ward: "Phường 2" }], "ward", "Chưa có phường");
  assert.deepEqual(rows.map((r) => [r.label, r.count]), [["Phường 11", 2], ["Phường 2", 1], ["Chưa có phường", 1]]);
});

test("nhóm theo mức giá", () => {
  const rows = s.priceBuckets([{ priceMin: 25000 }, { priceMin: 30000 }, { priceMin: 99000 }, { priceMin: 150000 }, { priceMax: 45000 }, {}]);
  assert.deepEqual(rows.map((r) => r.count), [1, 2, 1, 1, 1]);
  assert.equal(rows.at(-1).label, "Chưa có giá");
});

test("đọc giờ mở cửa nhiều kiểu viết", () => {
  assert.deepEqual(s.parseOpeningHours("06:00 - 21:00"), { open: 360, close: 1260 });
  assert.deepEqual(s.parseOpeningHours("6h-21h"), { open: 360, close: 1260 });
  assert.deepEqual(s.parseOpeningHours("6:30 – 22h"), { open: 390, close: 1320 });
  assert.deepEqual(s.parseOpeningHours("18:00 - 02:00"), { open: 1080, close: 1560 });
  assert.equal(s.parseOpeningHours("Cả ngày"), null);
  assert.equal(s.parseOpeningHours(null), null);
});

test("mô tả giờ cao điểm, tách các khoảng không liền nhau", () => {
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, count: [6, 7, 8, 12].includes(hour) ? 3 : 1 }));
  assert.deepEqual(s.describePeakHours(hours), { max: 3, text: "6h – 9h, 12h – 13h" });
  assert.equal(s.describePeakHours(hours.map((h) => ({ ...h, count: 0 }))), null);
});

test("biểu đồ giờ mở cửa tính cả quán mở qua đêm", () => {
  const { hours, parsed, unparsed } = s.openHoursHistogram([
    { openingHours: "06:00 - 10:00" },
    { openingHours: "18:00 - 02:00" },
    { openingHours: "không rõ" },
    { openingHours: null },
  ]);
  assert.equal(parsed, 2);
  assert.equal(unparsed, 1);
  assert.equal(hours[5].count, 0);
  assert.equal(hours[6].count, 1);
  assert.equal(hours[9].count, 1);
  assert.equal(hours[10].count, 0);
  assert.equal(hours[23].count, 1);
  assert.equal(hours[1].count, 1);
  assert.equal(hours[2].count, 0);
});
