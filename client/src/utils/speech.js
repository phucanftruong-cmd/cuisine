// Đọc thuyết minh bằng giọng đọc có sẵn của trình duyệt (Web Speech API).
// Các hàm ở đây là hàm thuần để viết unit test; phần phát âm thanh nằm trong components/SpeakButton.jsx.

// Mã ngôn ngữ của ứng dụng -> mã giọng đọc của trình duyệt
export const SPEECH_LANGS = {
  vi: "vi-VN",
  en: "en-US",
  fr: "fr-FR",
  ja: "ja-JP",
  ko: "ko-KR",
  "zh-CN": "zh-CN",
};

export const LANGUAGE_NAMES = {
  vi: "tiếng Việt",
  en: "tiếng Anh",
  fr: "tiếng Pháp",
  ja: "tiếng Nhật",
  ko: "tiếng Hàn",
  "zh-CN": "tiếng Trung",
};

export const speechLang = (lang) => SPEECH_LANGS[lang] ?? lang;

const normalizeTag = (tag) => (tag ?? "").replace("_", "-").toLowerCase();

// Chọn giọng đọc phù hợp: đúng mã vùng (vi-VN) trước, rồi cùng ngôn ngữ (vi), giọng mặc định được ưu tiên
export function pickVoice(voices, langTag) {
  const wanted = normalizeTag(langTag);
  const base = wanted.split("-")[0];
  const byPreference = (list) => list.find((v) => v.default) ?? list[0] ?? null;
  const exact = voices.filter((v) => normalizeTag(v.lang) === wanted);
  if (exact.length) return byPreference(exact);
  const sameLanguage = voices.filter((v) => normalizeTag(v.lang).split("-")[0] === base);
  return byPreference(sameLanguage);
}

// Chia văn bản thành các đoạn ngắn để đọc lần lượt.
// Trình duyệt Chrome hay tự dừng khi đọc một đoạn quá dài, nên mỗi đoạn tối đa khoảng maxLength ký tự,
// ưu tiên cắt ở cuối câu, rồi ở dấu phẩy, cuối cùng mới cắt ở khoảng trắng.
export function splitForSpeech(text, maxLength = 200) {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const sentences = clean.match(/[^.!?。！？]+[.!?。！？]*\s*/g) ?? [clean];
  const chunks = [];

  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;
    if (sentence.length <= maxLength) {
      chunks.push(sentence);
      continue;
    }
    // Câu quá dài: cắt theo dấu phẩy, rồi theo từ
    let current = "";
    const parts = sentence.match(/[^,，、;；]+[,，、;；]?\s*/g) ?? [sentence];
    for (const part of parts) {
      const words = part.length > maxLength ? part.split(" ") : [part.trim()];
      for (const word of words) {
        const next = current ? `${current} ${word}` : word;
        if (next.length > maxLength && current) {
          chunks.push(current);
          current = word;
        } else {
          current = next;
        }
      }
    }
    if (current) chunks.push(current);
  }

  return chunks;
}
