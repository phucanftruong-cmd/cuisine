// Unit test cho phần đọc thuyết minh. Chạy: npm test
import assert from "node:assert/strict";
import test from "node:test";
import * as n from "./narration.js";

test("mã ngôn ngữ đổi sang mã giọng đọc", () => {
  assert.equal(n.speechLang("vi"), "vi-VN");
  assert.equal(n.speechLang("ja"), "ja-JP");
  assert.equal(n.speechLang("zh-CN"), "zh-CN");
  assert.equal(n.speechLang("xx"), "vi-VN");
});

test("chọn giọng khớp ngôn ngữ, chấp nhận vi_VN hoặc chỉ vi", () => {
  const voices = [{ lang: "en-GB" }, { lang: "vi_VN" }, { lang: "en-US" }];
  assert.equal(n.pickVoice(voices, "vi"), voices[1]);
  assert.equal(n.pickVoice(voices, "en"), voices[2]);
  assert.equal(n.pickVoice([{ lang: "fr" }], "fr").lang, "fr");
  assert.equal(n.pickVoice(voices, "ko"), null);
});

test("tách câu theo dấu chấm, chấm hỏi, xuống dòng và dấu câu tiếng Nhật/Trung", () => {
  assert.deepEqual(n.splitSentences("Phở ngon. Giá rẻ!\nMở cửa sớm?"), [
    "Phở ngon.",
    "Giá rẻ!",
    "Mở cửa sớm?",
  ]);
  assert.deepEqual(n.splitSentences("美味しい。安い。"), ["美味しい。", "安い。"]);
  assert.deepEqual(n.splitSentences("  "), []);
  assert.deepEqual(n.splitSentences(null), []);
});

test("câu quá dài được cắt ở khoảng trắng, không cắt giữa từ", () => {
  const parts = n.splitSentences("một hai ba bốn năm sáu", 10);
  assert.ok(parts.every((p) => p.length <= 10));
  assert.equal(parts.join(" "), "một hai ba bốn năm sáu");
});

test("mã thiết bị tạo một lần rồi dùng lại", () => {
  const data = new Map();
  const storage = { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
  const id = n.getDeviceId(storage);
  assert.ok(id.length > 0 && id.length <= 64);
  assert.equal(n.getDeviceId(storage), id);
});

test("localStorage bị chặn vẫn có mã thiết bị", () => {
  const blocked = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };
  const id = n.getDeviceId(blocked);
  assert.ok(id);
  assert.equal(n.getDeviceId(blocked), id);
});

test("ước lượng thời lượng theo số ký tự, ngôn ngữ và tốc độ", () => {
  const text = "a".repeat(140);
  assert.equal(n.estimateSeconds(text, "vi"), 10);
  assert.equal(n.estimateSeconds(text, "vi", 2), 5);
  assert.equal(n.estimateSeconds("あ".repeat(70), "ja"), 10);
  assert.equal(n.estimateSeconds("", "vi"), 0);
  assert.equal(n.estimateSeconds("ab", "vi"), 1);
});

test("định dạng thời lượng m:ss", () => {
  assert.equal(n.formatDuration(75), "1:15");
  assert.equal(n.formatDuration(5), "0:05");
  assert.equal(n.formatDuration(-3), "0:00");
});
