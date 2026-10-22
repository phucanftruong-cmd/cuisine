import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router";
import "./admin.css";
import RequireAdmin from "./auth/RequireAdmin";
import { useAuth } from "./auth/useAuth";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminPlacesPage from "./pages/admin/AdminPlacesPage";
import PlaceFormPage from "./pages/admin/PlaceFormPage";
import ToastProvider from "./pages/admin/ToastProvider";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import PlaceDetailPage from "./pages/PlaceDetailPage";

const admin = (page) => (
  <RequireAdmin>
    <ToastProvider>{page}</ToastProvider>
  </RequireAdmin>
);

export default function App() {
  const { pathname } = useLocation();
  // Trang quản trị có khung riêng (thanh bên), không dùng header của trang khách
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");

  const routes = (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/places/:id" element={<PlaceDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={admin(<AdminDashboardPage />)} />
      <Route path="/admin/places" element={admin(<AdminPlacesPage />)} />
      <Route path="/admin/places/new" element={admin(<PlaceFormPage />)} />
      <Route path="/admin/places/:id/edit" element={admin(<PlaceFormPage />)} />
      <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<p>Không tìm thấy trang.</p>} />
    </Routes>
  );

  if (isAdminArea) return routes;

  return (
    <>
      <SiteHeader />
      <main className="container">{routes}</main>
    </>
  );
}

function SiteHeader() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="logo">
          🍜 Ẩm thực Quận 6
        </Link>
        <nav className="site-nav" aria-label="Tài khoản">
          {isAdmin && <Link to="/admin">Quản trị</Link>}
          {user ? (
            <>
              <span className="site-nav-user" title="Tài khoản đang đăng nhập">
                👤 {user.username}
              </span>
              <button type="button" className="nav-button" onClick={handleLogout}>
                Đăng xuất
              </button>
            </>
          ) : (
            <Link to="/login">Đăng nhập</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
