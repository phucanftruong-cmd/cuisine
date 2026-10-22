import { useI18n } from "../i18n/useI18n";
import Icon from "./Icon";

// Khung xương lúc đang tải danh sách thẻ
export function CardSkeletons({ count = 3 }) {
  const { t } = useI18n();
  return (
    <div className="tv-grid" aria-busy="true" aria-label={t("state.loading")}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="tv-skeleton-card">
          <div className="tv-skeleton tv-skeleton--media" />
          <div className="tv-skeleton tv-skeleton--line" />
          <div className="tv-skeleton tv-skeleton--line tv-skeleton--short" />
        </div>
      ))}
    </div>
  );
}

// Lỗi chung (mất mạng, 401/403/404) hiện theo ngôn ngữ giao diện; lỗi cụ thể từ server giữ nguyên lời server
const TRANSLATED = { 0: "error.network", 401: "error.401", 403: "error.403", 404: "error.404" };

export function ErrorState({ error, onRetry }) {
  const { t } = useI18n();
  const key = TRANSLATED[error?.status];
  const message = key ? t(key) : error?.message;
  return (
    <div className="tv-state tv-state--error" role="alert">
      <Icon name="alert" size={28} />
      <p className="tv-state-title">{t("state.error")}</p>
      {message && <p className="tv-state-text">{message}</p>}
      {onRetry && (
        <button type="button" className="tv-btn tv-btn--outline" onClick={onRetry}>
          {t("state.retry")}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="tv-state">
      <Icon name="search" size={28} />
      <p className="tv-state-title">{title}</p>
      {text && <p className="tv-state-text">{text}</p>}
      {action}
    </div>
  );
}
