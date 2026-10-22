// Unit test cho phần xử lý giọng đọc. Chạy: npm test
import assert from "node:assert/strict";
import test from "node:test";
import { pickVoice, speechLang, splitForSpeech } from "./speech.js";

test("đổi mã ngôn ngữ của app sang mã giọng đọc", () => {
  assert.equal(speechLang("vi"), "vi-VN");
  assert.equal(speechLang("zh-CN"), "zh-CN");
  assert.equal(speechLang("ja"), "ja-JP");
});

test("chọn giọng: đúng mã vùng trước, rồi cùng ngôn ngữ, ưu tiên giọng mặc định", () => {
  const voices = [
    { name: "Samantha", lang: "en-US", default: true },
    { name: "Daniel", lang: "en-GB" },
    { name: "Linh", lang: "vi_VN" },
    { name: "Kyoko", lang: "ja-JP" },
  ];
  assert.equal(pickVoice(voices, "vi-VN").name, "Linh");
  assert.equal(pickVoice(voices, "en-GB").name, "Daniel");
  assert.equal(pickVoice(voices, "en-AU").name, "Samantha");
  assert.equal(pickVoice(voices, "ko-KR"), null);
  assert.equal(pickVoice([], "vi-VN"), null);
});

test("chia văn bản theo câu", () => {
  assert.deepEqual(splitForSpeech("Phở ngon.  Nước dùng trong!\nMở cửa sớm"), [
    "Phở ngon.",
    "Nước dùng trong!",
    "Mở cửa sớm",
  ]);
  assert.deepEqual(splitForSpeech("   "), []);
  assert.deepEqual(splitForSpeech(null), []);
});

test("câu quá dài được cắt ở dấu phẩy rồi ở khoảng trắng, không đoạn nào vượt giới hạn", () => {
  const long = `${"bánh ".repeat(30)}rất ngon, ${"nước ".repeat(30)}rất trong`;
  const chunks = splitForSpeech(long, 60);
  assert.ok(chunks.length > 2);
  assert.ok(chunks.every((c) => c.length <= 60), chunks.join(" | "));
  assert.equal(chunks.join(" ").replace(/\s+/g, " "), long.replace(/\s+/g, " ").trim());
});

test("chữ Nhật, Trung có dấu câu riêng", () => {
  assert.deepEqual(splitForSpeech("美味しいです。安いです。"), ["美味しいです。", "安いです。"]);
});
