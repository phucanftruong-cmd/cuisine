// Unit test cho bộ chữ giao diện. Chạy: npm test
import assert from "node:assert/strict";
import test from "node:test";
import { LANGUAGES, MESSAGES, matchBrowserLang, translate } from "./messages.js";

test("ngôn ngữ nào cũng có đủ key giống tiếng Việt, không thừa không thiếu", () => {
  const base = Object.keys(MESSAGES.vi).sort();
  for (const { code } of LANGUAGES) {
    assert.ok(MESSAGES[code], `thiếu bộ chữ ${code}`);
    assert.deepEqual(Object.keys(MESSAGES[code]).sort(), base, `bộ chữ ${code} lệch key`);
  }
});

test("chuỗi dịch giữ đủ các biến {..} như bản tiếng Việt", () => {
  const vars = (s) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
  for (const { code } of LANGUAGES) {
    for (const [key, text] of Object.entries(MESSAGES.vi)) {
      assert.equal(vars(MESSAGES[code][key]), vars(text), `${code} ${key}`);
    }
  }
});

test("thay biến, thiếu key thì dùng tiếng Việt rồi tới chính key", () => {
  assert.equal(translate("en", "explore.page", { page: 2, total: 5 }), "Page 2 of 5");
  assert.equal(translate("xx", "nav.home"), "Trang chủ");
  assert.equal(translate("en", "khong.co"), "khong.co");
  assert.equal(translate("vi", "explore.results", {}), "{count} địa điểm");
});

test("chọn ngôn ngữ theo trình duyệt", () => {
  assert.equal(matchBrowserLang(["en-US", "vi"]), "en");
  assert.equal(matchBrowserLang(["zh-Hans-CN"]), "zh-CN");
  assert.equal(matchBrowserLang(["de-DE", "ko-KR"]), "ko");
  assert.equal(matchBrowserLang(["de"]), "vi");
  assert.equal(matchBrowserLang([]), "vi");
});
