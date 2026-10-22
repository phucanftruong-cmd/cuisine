import { useEffect, useRef, useState } from "react";
import { LANGUAGES } from "../i18n/messages";
import { useI18n } from "../i18n/useI18n";
import Icon from "./Icon";

// Nút chọn ngôn ngữ ở header: hiện tên ngôn ngữ (không dùng cờ), bấm ra danh sách
export default function LanguageSwitcher({ compact = false }) {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const current = LANGUAGES.find((l) => l.code === lang);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !rootRef.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="tv-lang" ref={rootRef}>
      <button
        type="button"
        className="tv-lang-btn"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`${t("nav.language")}: ${current.label}`}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="globe" size={18} />
        <span>{compact ? current.short : current.label}</span>
        <Icon name="chevronDown" size={14} />
      </button>
      {open && (
        <ul className="tv-lang-menu" aria-label={t("nav.language")}>
          {LANGUAGES.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                lang={l.code}
                aria-pressed={l.code === lang}
                className={l.code === lang ? "is-active" : undefined}
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                }}
              >
                {l.label}
                {l.code === lang && <Icon name="check" size={16} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
