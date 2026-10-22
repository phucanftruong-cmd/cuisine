import { useEffect, useState } from "react";
import { clearCachedTranslations, getCachedTranslations } from "../../api";
import ConfirmDialog from "../../components/ConfirmDialog";
import Icon from "../../components/Icon";
import { useToast } from "./toastContext";

const LANGUAGE_NAMES = {
  en: "English",
  fr: "Français",
  ja: "日本語",
  ko: "한국어",
  "zh-CN": "简体中文",
};

// Xem và xóa các bản dịch đã lưu của quán
export default function TranslationCachePanel({ placeId, token }) {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [clearError, setClearError] = useState("");

  useEffect(() => {
    let ignore = false;
    getCachedTranslations(token, placeId)
      .then((data) => {
        if (!ignore) {
          setItems(data ?? []);
          setError("");
        }
      })
      .catch((err) => {
        if (!ignore) setError(err.message);
      });
    return () => {
      ignore = true;
    };
  }, [placeId, token, reloadKey]);

  async function handleClear() {
    setBusy(true);
    setClearError("");
    try {
      await clearCachedTranslations(token, placeId);
      setConfirming(false);
      toast("Đã xóa các bản dịch đã lưu. Khách xem lần tới sẽ được dịch lại.");
      setReloadKey((k) => k + 1);
    } catch (err) {
      setClearError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface form-section translation-panel" aria-labelledby="translation-title">
      <div className="surface-head">
        <h2 id="translation-title">
          <Icon name="translate" /> Bản dịch đã lưu
        </h2>
        {items && items.length > 0 && (
          <button
            type="button"
            className="btn btn-danger-ghost btn-sm"
            onClick={() => {
              setClearError("");
              setConfirming(true);
            }}
          >
            Xóa tất cả
          </button>
        )}
      </div>
      <p className="field-hint">
        Hệ thống lưu lại bản dịch sau lần dịch đầu tiên. Xóa đi khi bản dịch sai để khách xem lần tới được
        dịch lại.
      </p>

      {error && <p className="field-error">Không tải được bản dịch: {error}</p>}
      {!items && !error && <div className="skeleton skeleton--line" />}
      {items && items.length === 0 && <p className="muted">Chưa có bản dịch nào được lưu.</p>}
      {items && items.length > 0 && (
        <ul className="translation-list">
          {items.map((t) => (
            <li key={t.languageCode}>
              <strong>{LANGUAGE_NAMES[t.languageCode] ?? t.languageCode}</strong>
              <p>{t.translatedText}</p>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={confirming}
        title="Xóa bản dịch đã lưu?"
        confirmLabel="Xóa bản dịch"
        busy={busy}
        error={clearError}
        onConfirm={handleClear}
        onCancel={() => setConfirming(false)}
      >
        <p>
          {items?.length ?? 0} bản dịch của quán sẽ bị xóa. Khi khách chọn ngôn ngữ, hệ thống sẽ dịch lại từ
          nội dung tiếng Việt hiện tại.
        </p>
      </ConfirmDialog>
    </section>
  );
}
