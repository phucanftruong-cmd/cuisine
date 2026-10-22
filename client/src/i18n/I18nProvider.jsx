import { useCallback, useEffect, useMemo, useState } from "react";
import { I18nContext } from "./i18nContext";
import { isSupportedLang, matchBrowserLang, translate } from "./messages";

const STORAGE_KEY = "tourvoice.lang";

// Lần đầu vào: theo ngôn ngữ trình duyệt; những lần sau: ngôn ngữ khách đã chọn
function initialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isSupportedLang(saved)) return saved;
  } catch {
    // Trình duyệt chặn localStorage: vẫn dùng được, chỉ không nhớ lựa chọn
  }
  return matchBrowserLang(navigator.languages ?? [navigator.language]);
}

export default function I18nProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);

  const setLang = useCallback((code) => {
    if (!isSupportedLang(code)) return;
    setLangState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // như trên
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(
    () => ({ lang, setLang, t: (key, vars) => translate(lang, key, vars) }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
