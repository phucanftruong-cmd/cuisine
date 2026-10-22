// Hàm thuần cho phần đọc thuyết minh (có unit test: narration.test.js)

// Mã ngôn ngữ của web -> mã giọng đọc của trình duyệt
const SPEECH_LANGS = {
  vi: "vi-VN",
  en: "en-US",
  fr: "fr-FR",
  ja: "ja-JP",
  ko: "ko-KR",
  "zh-CN": "zh-CN",
};

export function speechLang(code) {
  return SPEECH_LANGS[code] ?? "vi-VN";
}

// Chọn giọng đọc khớp ngôn ngữ (máy có thể ghi "vi_VN" hoặc chỉ "vi")
export function pickVoice(voices, code) {
  const target = speechLang(code).toLowerCase();
  const base = target.split("-")[0];
  const norm = (v) => (v.lang ?? "").replace("_", "-").toLowerCase();
  return (
    voices.find((v) => norm(v) === target) ??
    voices.find((v) => norm(v).split("-")[0] === base) ??
    null
  );
}

// Chia đoạn văn thành từng câu ngắn rồi đọc lần lượt:
// Chrome hay tự dừng giữa chừng khi một lần đọc quá dài
export function splitSentences(text, maxLength = 200) {
  const sentences = (text ?? "")
    .split(/(?<=[.!?。！？])\s*|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const parts = [];
  for (const sentence of sentences) {
    let rest = sentence;
    while (rest.length > maxLength) {
      // Cắt ở dấu phẩy hoặc khoảng trắng gần nhất, không cắt giữa từ
      const cut = Math.max(rest.lastIndexOf(",", maxLength), rest.lastIndexOf(" ", maxLength));
      const at = cut > 0 ? cut + 1 : maxLength;
      parts.push(rest.slice(0, at).trim());
      rest = rest.slice(at).trim();
    }
    if (rest) parts.push(rest);
  }
  return parts;
}

// Mã riêng của thiết bị, tạo một lần rồi nhớ lại, để 1 máy chỉ được đếm 1 lần
const DEVICE_KEY = "audioguide.deviceId";
let memoryDeviceId = null;

export function getDeviceId(storage = globalThis.localStorage) {
  try {
    const saved = storage?.getItem(DEVICE_KEY);
    if (saved) return saved;
  } catch {
    // Trình duyệt chặn localStorage: dùng mã tạm trong phiên
  }

  const id = memoryDeviceId ?? newId();
  memoryDeviceId = id;
  try {
    storage?.setItem(DEVICE_KEY, id);
  } catch {
    // như trên
  }
  return id;
}

function newId() {
  // randomUUID chỉ có trên https/localhost, mở bằng http qua IP thì không có
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
