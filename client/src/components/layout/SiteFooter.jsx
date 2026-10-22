import { Link } from "react-router";
import { useI18n } from "../../i18n/useI18n";
import Logo from "./Logo";

const YEAR = new Date().getFullYear();

export default function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="tv-footer">
      <div className="tv-footer-inner">
        <div className="tv-footer-brand">
          <Logo />
          <p>{t("footer.text")}</p>
        </div>
        <nav className="tv-footer-links" aria-label={t("footer.discover")}>
          <Link to="/explore">{t("footer.discover")}</Link>
          <Link to="/explore">{t("footer.audio")}</Link>
          <Link to="/map">{t("footer.mapDirections")}</Link>
        </nav>
        <div className="tv-footer-about">
          <strong>{t("footer.about")}</strong>
          <p>{t("footer.aboutText")}</p>
        </div>
      </div>
      <p className="tv-footer-bottom">© {YEAR} TourVoice · Quận 6, TP.HCM</p>
    </footer>
  );
}
