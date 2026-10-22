// Unit test cho phần tính "hồ sơ quán". Chạy: npm test
import assert from "node:assert/strict";
import test from "node:test";
import * as s from "./placeStatus.js";

const full = {
  id: 1,
  name: "Hủ tiếu Cô Ba",
  address: "112 Hậu Giang",
  imageUrl: "https://example.com/a.jpg",
  latitude: 10.75,
  longitude: 106.64,
  priceMin: 40000,
  priceMax: null,
  openingHours: "06:00 - 13:00",
};

test("quán đủ thông tin là đủ hồ sơ", () => {
  assert.deepEqual(s.getMissingItems(full), []);
  assert.ok(s.isProfileComplete(full));
});

test("liệt kê đúng mục còn thiếu", () => {
  const p = { ...full, imageUrl: "  ", latitude: null, openingHours: null };
  assert.deepEqual(s.getMissingItems(p).map((i) => i.key), ["image", "location", "hours"]);
  assert.ok(!s.isProfileComplete(p));
});

test("giá chỉ cần một trong hai mức", () => {
  assert.ok(!s.getMissingItems({ ...full, priceMin: null, priceMax: 50000 }).some((i) => i.key === "price"));
  assert.ok(s.getMissingItems({ ...full, priceMin: null, priceMax: null }).some((i) => i.key === "price"));
});

test("quán mẫu không được tính là đủ hồ sơ", () => {
  const sample = { ...full, name: "[Mẫu] Phở bò" };
  assert.ok(s.isSamplePlace(sample));
  assert.ok(!s.isProfileComplete(sample));
});

test("link ảnh hỏng được tính là thiếu ảnh", () => {
  const ctx = { brokenImages: new Set(["https://example.com/a.jpg"]) };
  assert.deepEqual(s.getMissingItems(full, ctx).map((i) => i.key), ["image"]);
  assert.ok(s.matchesMissingFilter(full, "image", ctx));
  assert.ok(!s.matchesMissingFilter(full, "image"));
});

test("bộ lọc còn thiếu", () => {
  const noHours = { ...full, openingHours: "" };
  assert.ok(s.matchesMissingFilter(noHours, "any"));
  assert.ok(s.matchesMissingFilter(noHours, "hours"));
  assert.ok(!s.matchesMissingFilter(noHours, "address"));
  assert.ok(s.matchesMissingFilter(full, ""));
  assert.ok(!s.matchesMissingFilter(full, "sample"));
});

test("tổng hợp số liệu cho trang tổng quan", () => {
  const places = [
    full,
    { ...full, id: 2, name: "[Mẫu] Bún", category: "Bún", imageUrl: null },
    { ...full, id: 3, category: "Bún", latitude: null, longitude: null },
  ];
  const sum = s.summarizePlaces(places);
  assert.equal(sum.total, 3);
  assert.equal(sum.complete, 1);
  assert.equal(sum.samples, 1);
  assert.equal(sum.missingCounts.image, 1);
  assert.equal(sum.missingCounts.location, 1);
  assert.deepEqual(sum.categories, [
    { name: "Bún", count: 2 },
    { name: "Chưa phân loại", count: 1 },
  ]);
});
