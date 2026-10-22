import { Navigate, useLocation } from "react-router";
import { useAuth } from "./useAuth";

// Chỉ cho Admin vào; chưa đăng nhập thì chuyển sang trang đăng nhập rồi quay lại
export default function RequireAdmin({ children }) {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (!isAdmin) {
    return (
      <section className="panel panel--narrow">
        <h1>Không có quyền truy cập</h1>
        <p>
          Tài khoản <strong>{user.username}</strong> không phải quản trị viên nên
          không vào được trang quản trị.
        </p>
        <button type="button" onClick={() => logout()}>
          Đăng nhập bằng tài khoản khác
        </button>
      </section>
    );
  }

  return children;
}
