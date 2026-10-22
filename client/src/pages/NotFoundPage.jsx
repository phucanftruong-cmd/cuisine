import { Link } from "react-router";
import { useI18n } from "../i18n/useI18n";

export default function NotFoundPage() {
  const { t } = useI18n();
  return (
    <div className="tv-container tv-page">
      <div className="tv-state">
        <p className="tv-state-code">404</p>
        <h1 className="tv-state-title">{t("notFound.title")}</h1>
        <p className="tv-state-text">{t("notFound.text")}</p>
        <Link to="/" className="tv-btn tv-btn--primary">
          {t("notFound.home")}
        </Link>
      </div>
    </div>
  );
}
