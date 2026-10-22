import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "../../auth/useAuth";
import Icon from "../../components/Icon";
import { useToast } from "./toastContext";

const NAV = [
  { to: "/admin", label: "Tổng quan", icon: "overview", match: (p) => p === "/admin" },
  { to: "/admin/places", label: "Quán ăn", icon: "store", match: (p) => p.startsWith("/admin/places") },
];

// Khung chung của trang quản trị: thanh bên và tiêu đề trang
export default function AdminLayout({ title, description, back, actions, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const toast = useToast();
  const handledFlash = useRef(null);

  // Thông báo gửi kèm khi chuyển trang (vd. "Đã thêm quán") rồi xóa khỏi lịch sử
  useEffect(() => {
    const flash = location.state?.flash;
    if (!flash || handledFlash.current === location.key) return;
    handledFlash.current = location.key;
    toast(flash);
    navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null });
  }, [location, navigate, toast]);

  // Đóng menu điện thoại khi chuyển trang
  const [menuPath, setMenuPath] = useState(location.pathname);
  if (menuPath !== location.pathname) {
    setMenuPath(location.pathname);
    setMenuOpen(false);
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div className={menuOpen ? "admin-shell admin-shell--menu-open" : "admin-shell"}>
      <aside className="admin-sidebar" aria-label="Điều hướng quản trị">
        <div className="admin-brand">
          <Link to="/admin" className="admin-brand-link">
            <span className="admin-brand-mark" aria-hidden="true">
              🍜
            </span>
            <span>
              <strong>Ẩm thực Quận 6</strong>
              <small>Trang quản trị</small>
            </span>
          </Link>
          <button
            type="button"
            className="admin-menu-toggle"
            aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon name={menuOpen ? "close" : "menu"} size={22} />
          </button>
        </div>

        <nav className="admin-nav">
          {NAV.map((item) => {
            const active = item.match(location.pathname);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={active ? "admin-nav-link is-active" : "admin-nav-link"}
                aria-current={active ? "page" : undefined}
              >
                <Icon name={item.icon} />
                {item.label}
              </Link>
            );
          })}
          <Link to="/" className="admin-nav-link admin-nav-link--quiet">
            <Icon name="external" />
            Xem trang khách
          </Link>
        </nav>

        <div className="admin-account">
          <span className="admin-avatar" aria-hidden="true">
            {user?.username?.[0]?.toUpperCase()}
          </span>
          <span className="admin-account-name">
            {user?.username}
            <small>Quản trị viên</small>
          </span>
          <button
            type="button"
            className="admin-icon-button admin-icon-button--on-dark"
            onClick={handleLogout}
            aria-label="Đăng xuất"
            title="Đăng xuất"
          >
            <Icon name="logout" />
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-page-header">
          <div className="admin-page-heading">
            {back && (
              <Link to={back.to} className="admin-back" onClick={back.onClick}>
                ← {back.label}
              </Link>
            )}
            <h1>{title}</h1>
            {description && <p>{description}</p>}
          </div>
          {actions && <div className="admin-page-actions">{actions}</div>}
        </header>

        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
