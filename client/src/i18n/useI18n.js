import { useContext } from "react";
import { I18nContext } from "./i18nContext";

// { lang, setLang, t } - t("key", { biến }) lấy chữ giao diện theo ngôn ngữ đang chọn
export function useI18n() {
  const i18n = useContext(I18nContext);
  if (!i18n) throw new Error("useI18n phải được dùng bên trong <I18nProvider>.");
  return i18n;
}
