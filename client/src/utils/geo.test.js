// Unit test cho khoảng cách và link chỉ đường. Chạy: npm test
import assert from "node:assert/strict";
import test from "node:test";
import { directionsUrl } from "./directions.js";
import { distanceMeters, formatDistance, hasCoords } from "./geo.js";

test("khoảng cách gần đúng giữa hai điểm ở Quận 6", () => {
  // Chợ Bình Tây -> Nhà thờ Phú Bình: khoảng 1,1 km
  const d = distanceMeters({ lat: 10.7499, lng: 106.6509 }, { lat: 10.7553, lng: 106.6426 });
  assert.ok(d > 1000 && d < 1200, String(d));
  assert.equal(distanceMeters({ lat: 10, lng: 106 }, { lat: 10, lng: 106 }), 0);
});

test("định dạng khoảng cách", () => {
  assert.equal(formatDistance(347), "350 m");
  assert.equal(formatDistance(3), "10 m");
  assert.equal(formatDistance(1234, "vi"), "1,2 km");
  assert.equal(formatDistance(1234, "en"), "1.2 km");
  assert.equal(formatDistance(15400, "en"), "15 km");
  assert.equal(formatDistance(NaN), "");
});

test("có tọa độ thì chỉ đường theo tọa độ, không thì theo địa chỉ", () => {
  assert.ok(hasCoords({ latitude: 10.75, longitude: 106.64 }));
  assert.ok(!hasCoords({ latitude: null, longitude: 106.64 }));
  assert.equal(
    directionsUrl({ latitude: 10.75, longitude: 106.64, address: "x" }),
    "https://www.google.com/maps/dir/?api=1&destination=10.75,106.64",
  );
  assert.equal(
    directionsUrl({ address: "12 Hậu Giang", ward: "Phường 2" }),
    "https://www.google.com/maps/dir/?api=1&destination=12%20H%E1%BA%ADu%20Giang%2C%20Ph%C6%B0%E1%BB%9Dng%202",
  );
  assert.equal(directionsUrl({ address: "  " }), null);
});
