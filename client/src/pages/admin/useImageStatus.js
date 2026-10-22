import { useEffect, useState } from "react";

// Thử tải ảnh ở nền để biết link có dùng được không (đợi người dùng ngừng gõ một chút)
export function useImageStatus(url) {
  const [state, setState] = useState({ url: "", status: "idle" });

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    const img = new Image();
    img.referrerPolicy = "no-referrer";
    img.onload = () => !cancelled && setState({ url, status: "ok" });
    img.onerror = () => !cancelled && setState({ url, status: "error" });
    const timer = setTimeout(() => {
      img.src = url;
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
    };
  }, [url]);

  if (!url) return "idle";
  return state.url === url ? state.status : "loading";
}
