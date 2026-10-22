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

// Tốc độ đọc: chậm hơn mặc định một chút nghe tự nhiên và dễ nghe hơn với khách
export const SPEECH_RATE = 0.92;

// Điểm chất lượng của một giọng. Giọng "tự nhiên"/nâng cao (Natural, Neural, Online, Premium, Enhanced)
// nghe giống người thật hơn nhiều so với giọng rút gọn (Compact) cài sẵn.
export function voiceQuality(voice) {
  const name = (voice?.name ?? "").toLowerCase();
  let score = 0;
  // Giọng AI (Natural/Neural) hay nhất, rồi đến giọng tải thêm chất lượng cao (Premium/Enhanced)
  if (/natural|neural|wavenet/.test(name)) score += 4;
  else if (/online|premium|enhanced|siri/.test(name)) score += 3;
  if (name.includes("google")) score += 2;
  if (/compact|eloquence|espeak/.test(name)) score -= 2;
  if (voice?.default) score += 1;
  return score;
}

// Các giọng đọc được ngôn ngữ này, giọng tốt nhất lên đầu (đúng mã vùng trước, rồi theo chất lượng)
export function voicesForLang(voices, langTag) {
  const wanted = normalizeTag(langTag);
  const base = wanted.split("-")[0];
  const exact = (v) => (normalizeTag(v.lang) === wanted ? 1 : 0);
  return voices
    .filter((v) => normalizeTag(v.lang).split("-")[0] === base)
    .sort((a, b) => exact(b) - exact(a) || voiceQuality(b) - voiceQuality(a) || a.name.localeCompare(b.name));
}

// Chọn giọng: giọng người dùng đã chọn trước đó (nếu máy còn), không thì giọng tốt nhất
export function pickVoice(voices, langTag, preferredName) {
  const list = voicesForLang(voices, langTag);
  return (preferredName && list.find((v) => v.name === preferredName)) || list[0] || null;
}

// Tên giọng ngắn gọn để hiện trong ô chọn: "Microsoft HoaiMy Online (Natural) - Vietnamese (Vietnam)" -> "HoaiMy Online (Natural)"
export function voiceLabel(voice) {
  return (voice?.name ?? "")
    .replace(/^(Microsoft|Google|Apple)\s+/i, "")
    .replace(/\s+-\s+.*$/, "")
    .trim();
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
