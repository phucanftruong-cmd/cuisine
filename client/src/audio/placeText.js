import { getTranslation } from "../api";

// Nội dung thuyết minh của một địa điểm theo ngôn ngữ, nhớ lại để trang chi tiết và trình phát
// không gọi API dịch hai lần. Tiếng Việt là bản gốc (description), ngôn ngữ khác gọi API dịch.
const cache = new Map(); // "placeId|lang" -> Promise<string>

export function getPlaceText(place, lang) {
  if (lang === "vi") return Promise.resolve(place.description ?? "");
  const key = `${place.id}|${lang}`;
  if (!cache.has(key)) {
    const request = getTranslation(place.id, lang).then((data) => data?.translatedText ?? "");
    // Lỗi thì không nhớ, lần sau thử lại
    request.catch(() => cache.delete(key));
    cache.set(key, request);
  }
  return cache.get(key);
}
