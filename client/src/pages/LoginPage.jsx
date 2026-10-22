import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { useAuth } from "../auth/useAuth";

export default function LoginPage() {
  const { user, isAdmin, login, logout, notice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Admin đã đăng nhập mà được chuyển tới đây thì đưa thẳng về trang cần vào
  if (user && isAdmin && from) return <Navigate to={from} replace />;

  if (user) {
    return (
      <section className="panel panel--narrow">
        <h1>Bạn đã đăng nhập</h1>
        <p>
          Đang đăng nhập với tài khoản <strong>{user.username}</strong>
          {isAdmin ? " (quản trị viên)" : ""}.
        </p>
        <div className="form-actions">
          {isAdmin && (
            <Link to="/admin" className="button-link">
              Vào trang quản trị
            </Link>
          )}
          <button type="button" className="button-secondary" onClick={() => logout()}>
            Đăng xuất
          </button>
        </div>
      </section>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError("Vui lòng nhập tên đăng nhập và mật khẩu.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const session = await login(username.trim(), password);
      const admin = session.role === "Admin";
      navigate(from ?? (admin ? "/admin" : "/"), { replace: true });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <section className="panel panel--narrow">
      <h1>Đăng nhập</h1>
      {from?.startsWith("/admin") && (
        <p className="muted">Trang quản trị chỉ dành cho tài khoản Admin.</p>
      )}
      {notice && <p className="alert alert--warning">{notice}</p>}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="login-username">Tên đăng nhập</label>
          <input
            id="login-username"
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="login-password">Mật khẩu</label>
          <div className="input-with-button">
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="button-secondary"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? "Ẩn" : "Hiện"}
            </button>
          </div>
        </div>

        {error && (
          <p className="alert alert--error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="button-block" disabled={submitting}>
          {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
    </section>
  );
}
