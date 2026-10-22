import { Link, Route, Routes, useNavigate } from "react-router";
import "./admin.css";
import RequireAdmin from "./auth/RequireAdmin";
import { useAuth } from "./auth/useAuth";
import AdminPlacesPage from "./pages/admin/AdminPlacesPage";
import PlaceFormPage from "./pages/admin/PlaceFormPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import PlaceDetailPage from "./pages/PlaceDetailPage";

export default function App() {
  return (
    <>
      <SiteHeader />
      <main className="container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/places/:id" element={<PlaceDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminPlacesPage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/places/new"
            element={
              <RequireAdmin>
                <PlaceFormPage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/places/:id/edit"
            element={
              <RequireAdmin>
                <PlaceFormPage />
              </RequireAdmin>
            }
          />
          <Route path="*" element={<p>Không tìm thấy trang.</p>} />
        </Routes>
      </main>
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
