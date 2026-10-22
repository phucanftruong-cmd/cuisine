import { useEffect, useState } from "react";

// Thử tải ngầm các link ảnh, trả về Set các link không tải được.
// Kết quả được nhớ lại trong phiên để chuyển trang không phải kiểm tra lại.
const cache = new Map(); // url -> "ok" | "error"

export function useBrokenImages(urls) {
  const list = [...new Set((urls ?? []).map((u) => u?.trim()).filter(Boolean))];
  const key = list.join("\n");
  const [, setVersion] = useState(0);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const images = [];
    for (const url of key.split("\n")) {
      if (cache.has(url)) continue;
      const img = new Image();
      img.referrerPolicy = "no-referrer";
      img.onload = () => {
        cache.set(url, "ok");
      };
      img.onerror = () => {
        cache.set(url, "error");
        if (!cancelled) setVersion((v) => v + 1);
      };
      img.src = url;
      images.push(img);
    }
    return () => {
      cancelled = true;
    };
  }, [key]);

  return new Set(list.filter((url) => cache.get(url) === "error"));
}
