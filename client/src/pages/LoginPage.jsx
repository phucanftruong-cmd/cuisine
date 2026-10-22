import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { useAuth } from "../auth/useAuth";
import Icon from "../components/Icon";
import { useI18n } from "../i18n/useI18n";

// Đăng nhập / đăng ký (không bắt buộc với khách). Trang admin chuyển về đây kèm state.from.
export default function LoginPage() {
  const { t } = useI18n();
  const { user, isAdmin, login, register, logout, notice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;

  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Admin đã đăng nhập mà được chuyển tới đây thì đưa thẳng về trang cần vào
  if (user && isAdmin && from) return <Navigate to={from} replace />;

  if (user) {
    return (
      <div className="tv-container tv-page">
        <section className="tv-auth">
          <h1>{t("auth.welcome")}</h1>
          <p>{t("auth.loggedInAs", { name: user.username })}</p>
          <div className="tv-auth-actions">
            {isAdmin && (
              <Link to="/admin" className="tv-btn tv-btn--primary">
                {t("auth.goAdmin")}
              </Link>
            )}
            <Link to="/" className="tv-btn tv-btn--outline">
              {t("auth.backHome")}
            </Link>
            <button type="button" className="tv-link" onClick={() => logout()}>
              {t("nav.logout")}
            </button>
          </div>
        </section>
      </div>
    );
  }

  function switchMode(next) {
    setMode(next);
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!username.trim() || !password) return setError(t("auth.required"));

    setSubmitting(true);
    setError("");
    try {
      const action = mode === "login" ? login : register;
      const session = await action(username.trim(), password);
      navigate(from ?? (session.role === "Admin" ? "/admin" : "/"), { replace: true });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <div className="tv-container tv-page">
      <section className="tv-auth">
        <div className="tv-tabs" role="tablist">
          {["login", "register"].map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              className={mode === m ? "tv-tab is-active" : "tv-tab"}
              onClick={() => switchMode(m)}
            >
              {t(`auth.${m}`)}
            </button>
          ))}
        </div>

        <p className="tv-muted">{from?.startsWith("/admin") ? t("auth.adminOnly") : t("auth.optional")}</p>
        {notice === "expired" && <p className="tv-note tv-note--warn">{t("error.401")}</p>}

        <form className="tv-form" onSubmit={handleSubmit} noValidate>
          <label className="tv-field">
            <span>{t("auth.username")}</span>
            <input
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>

          <label className="tv-field">
            <span>{t("auth.password")}</span>
            <span className="tv-input-group">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isLogin ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="tv-icon-btn"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
              >
                <Icon name="eye" size={18} />
              </button>
            </span>
            {!isLogin && <small className="tv-muted">{t("auth.passwordHint")}</small>}
          </label>

          {error && (
            <p className="tv-note tv-note--error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="tv-btn tv-btn--primary tv-btn--block tv-btn--lg" disabled={submitting}>
            {submitting
              ? t(isLogin ? "auth.loggingIn" : "auth.registering")
              : t(isLogin ? "auth.login" : "auth.register")}
          </button>
        </form>
      </section>
    </div>
  );
}
