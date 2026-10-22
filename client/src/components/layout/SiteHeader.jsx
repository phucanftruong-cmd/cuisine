import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router";
import { useAuth } from "../../auth/useAuth";
import { useI18n } from "../../i18n/useI18n";
import Icon from "../Icon";
import LanguageSwitcher from "../LanguageSwitcher";
import Logo from "./Logo";

const LINKS = [
  { to: "/", key: "nav.home", end: true },
  { to: "/explore", key: "nav.explore" },
  { to: "/map", key: "nav.map" },
];

export default function SiteHeader() {
  const { t } = useI18n();
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const drawerRef = useRef(null);

  // Drawer mở: Esc để đóng, khóa cuộn trang phía sau, đưa focus vào drawer
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    drawerRef.current?.querySelector("a, button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);

  function handleLogout() {
    logout();
    close();
    navigate("/");
  }

  const navLinks = (onClick) =>
    LINKS.map((l) => (
      <NavLink key={l.to} to={l.to} end={l.end} className="tv-nav-link" onClick={onClick}>
        {t(l.key)}
      </NavLink>
    ));

  const account = user ? (
    <>
      {isAdmin && (
        <Link to="/admin" className="tv-nav-link" onClick={close}>
          {t("nav.admin")}
        </Link>
      )}
      <span className="tv-user" title={user.username}>
        <Icon name="user" size={18} />
        <span className="tv-user-name">{user.username}</span>
      </span>
      <button type="button" className="tv-nav-link tv-nav-button" onClick={handleLogout}>
        {t("nav.logout")}
      </button>
    </>
  ) : (
    <Link to="/login" className="tv-nav-link tv-nav-login" onClick={close}>
      <Icon name="user" size={18} />
      {t("nav.login")}
    </Link>
  );

  // Drawer nằm ngoài <header>: header có backdrop-filter nên position: fixed bên trong sẽ bị giới hạn trong header
  return (
    <>
      <header className="tv-header">
        <div className="tv-header-inner">
          <Logo onClick={close} />

          <nav className="tv-nav" aria-label={t("nav.main")}>
            {navLinks()}
          </nav>

          <div className="tv-header-actions">
            <LanguageSwitcher compact />
            <div className="tv-account">{account}</div>
            <button
              type="button"
              className="tv-icon-btn tv-menu-btn"
              aria-label={t("nav.menu")}
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Icon name="menu" size={22} />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="tv-drawer-backdrop" onClick={close}>
          <div
            className="tv-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("nav.main")}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tv-drawer-head">
              <Logo onClick={close} />
              <button type="button" className="tv-icon-btn" aria-label={t("nav.close")} onClick={close}>
                <Icon name="close" size={22} />
              </button>
            </div>
            <nav className="tv-drawer-nav" aria-label={t("nav.main")}>
              {navLinks(close)}
            </nav>
            <div className="tv-drawer-account">{account}</div>
          </div>
        </div>
      )}
    </>
  );
}
