// Unit test cho phần kiểm tra và chuyển đổi dữ liệu form quán. Chạy: npm test
import assert from "node:assert/strict";
import test from "node:test";
import * as m from "./placeForm.js";
const ok = { ...m.EMPTY_FORM, name: "Phở Hòa", description: "Ngon" };

test("form hợp lệ tối thiểu", () => assert.deepEqual(m.validatePlaceForm(ok), {}));
test("bắt buộc tên và mô tả", () => {
  const e = m.validatePlaceForm(m.EMPTY_FORM);
  assert.ok(e.name && e.description);
  assert.ok(m.validatePlaceForm({ ...ok, name: "   " }).name);
});
test("giới hạn độ dài khớp backend", () => {
  assert.ok(m.validatePlaceForm({ ...ok, name: "a".repeat(201) }).name);
  assert.deepEqual(m.validatePlaceForm({ ...ok, name: "a".repeat(200) }), {});
  assert.ok(m.validatePlaceForm({ ...ok, description: "a".repeat(5001) }).description);
  assert.ok(m.validatePlaceForm({ ...ok, phone: "1".repeat(31) }).phone);
});
test("parsePrice", () => {
  assert.equal(m.parsePrice(""), null);
  assert.equal(m.parsePrice("40000"), 40000);
  assert.equal(m.parsePrice("40.000"), 40000);
  assert.equal(m.parsePrice("1 250 000"), 1250000);
  assert.ok(Number.isNaN(m.parsePrice("40.5")));
  assert.ok(Number.isNaN(m.parsePrice("-5")));
  assert.ok(Number.isNaN(m.parsePrice("abc")));
});
test("giá: âm, min > max, quá lớn", () => {
  assert.ok(m.validatePlaceForm({ ...ok, priceMin: "-1" }).priceMin);
  assert.ok(m.validatePlaceForm({ ...ok, priceMin: "70000", priceMax: "40000" }).priceMax);
  assert.deepEqual(m.validatePlaceForm({ ...ok, priceMin: "40000", priceMax: "40000" }), {});
  assert.ok(m.validatePlaceForm({ ...ok, priceMax: "999999999999" }).priceMax);
});
test("tọa độ", () => {
  assert.equal(m.parseCoordinate("10,7465"), 10.7465);
  assert.equal(m.parseCoordinate("-33.5"), -33.5);
  assert.ok(Number.isNaN(m.parseCoordinate("10.7.4")));
  assert.ok(m.validatePlaceForm({ ...ok, latitude: "10.7" }).longitude);
  assert.ok(m.validatePlaceForm({ ...ok, latitude: "91", longitude: "106" }).latitude);
  assert.ok(m.validatePlaceForm({ ...ok, latitude: "10", longitude: "181" }).longitude);
  assert.deepEqual(m.validatePlaceForm({ ...ok, latitude: "10.7465", longitude: "106.635" }), {});
});
test("tách cặp tọa độ dán từ Google Maps", () => {
  assert.deepEqual(m.splitCoordinatePair("10.7465, 106.6350"), { latitude: "10.7465", longitude: "106.6350" });
  assert.deepEqual(m.splitCoordinatePair(" 10.7465 106.635 "), { latitude: "10.7465", longitude: "106.635" });
  assert.equal(m.splitCoordinatePair("10,7465"), null);
  assert.equal(m.splitCoordinatePair("10.7465"), null);
});
test("link ảnh", () => {
  assert.ok(m.validatePlaceForm({ ...ok, imageUrl: "ftp://a.com/x.png" }).imageUrl);
  assert.ok(m.validatePlaceForm({ ...ok, imageUrl: "not a url" }).imageUrl);
  assert.deepEqual(m.validatePlaceForm({ ...ok, imageUrl: "https://a.com/x.png" }), {});
});
test("số điện thoại", () => {
  assert.deepEqual(m.validatePlaceForm({ ...ok, phone: "(028) 3855-1234" }), {});
  assert.ok(m.validatePlaceForm({ ...ok, phone: "abc" }).phone);
});
test("toPlacePayload chuẩn hóa dữ liệu gửi API", () => {
  const p = m.toPlacePayload({ ...ok, name: "  Phở  ", address: "  ", priceMin: "40.000", latitude: "10,5", longitude: "106.6" });
  assert.equal(p.name, "Phở");
  assert.equal(p.address, null);
  assert.equal(p.priceMin, 40000);
  assert.equal(p.priceMax, null);
  assert.equal(p.latitude, 10.5);
  assert.deepEqual(Object.keys(p).sort(), ["address","category","description","imageUrl","latitude","longitude","name","openingHours","phone","priceMax","priceMin","ward"]);
});
test("toFormValues + isSameForm", () => {
  const v = m.toFormValues({ id: 3, name: "A", description: "B", priceMin: 40000, latitude: null, extra: 1 });
  assert.equal(v.priceMin, "40000");
  assert.equal(v.latitude, "");
  assert.ok(!("id" in v));
  assert.ok(m.isSameForm(v, { ...v, name: "A  " }));
  assert.ok(!m.isSameForm(v, { ...v, name: "B" }));
});
