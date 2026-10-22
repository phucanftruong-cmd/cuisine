import { useCallback, useEffect, useMemo, useState } from "react";
import * as api from "../api";
import { AuthContext } from "./authContext";

const STORAGE_KEY = "audioguide.auth";

// Server trả thời gian UTC; nếu thiếu múi giờ thì coi như UTC
function parseUtc(value) {
  if (!value) return null;
  const text = /[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    const expires = parseUtc(session?.expiresAt);
    if (!session?.token || !expires || expires <= new Date()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function saveSession(session) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Trình duyệt chặn localStorage: vẫn dùng được, chỉ không nhớ sau khi tải lại trang
  }
}

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(loadSession);
  const [notice, setNotice] = useState(""); // mã thông báo ("expired"); giao diện tự dịch

  const logout = useCallback((reason) => {
    saveSession(null);
    setSession(null);
    setNotice(reason === "expired" ? "expired" : "");
  }, []);

  // Đăng nhập và đăng ký đều trả về token: lưu phiên giống nhau
  const startSession = useCallback((result) => {
    const next = {
      token: result.token,
      username: result.username,
      role: result.role,
      expiresAt: result.expiresAt,
    };
    saveSession(next);
    setSession(next);
    setNotice("");
    return next;
  }, []);

  const login = useCallback(
    async (username, password) => startSession(await api.login(username, password)),
    [startSession],
  );

  const register = useCallback(
    async (username, password) => startSession(await api.register(username, password)),
    [startSession],
  );

  // API trả 401 cho một request có token: token không còn dùng được
  useEffect(() => {
    api.setUnauthorizedHandler(() => logout("expired"));
    return () => api.setUnauthorizedHandler(null);
  }, [logout]);

  // Tự đăng xuất đúng lúc token hết hạn
  useEffect(() => {
    if (!session) return;
    const expires = parseUtc(session.expiresAt);
    const remaining = expires ? expires.getTime() - Date.now() : 0;
    const timer = setTimeout(() => logout("expired"), Math.max(0, Math.min(remaining, 2 ** 31 - 1)));
    return () => clearTimeout(timer);
  }, [session, logout]);

  // Mở lại trang: hỏi server xem token cũ còn hợp lệ không (401 sẽ tự đăng xuất)
  const token = session?.token;
  useEffect(() => {
    if (!token) return;
    let ignore = false;
    api
      .getMe(token)
      .then((me) => {
        if (ignore || !me) return;
        setSession((current) => {
          if (!current || current.token !== token || current.role === me.role) return current;
          const next = { ...current, role: me.role };
          saveSession(next);
          return next;
        });
      })
      .catch(() => {
        // Mất mạng hoặc server chưa chạy: giữ phiên, các thao tác sau sẽ báo lỗi riêng
      });
    return () => {
      ignore = true;
    };
  }, [token]);

  const value = useMemo(
    () => ({
      user: session ? { username: session.username, role: session.role } : null,
      token: session?.token ?? null,
      isAdmin: session?.role === "Admin",
      notice,
      clearNotice: () => setNotice(""),
      login,
      register,
      logout,
    }),
    [session, notice, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
