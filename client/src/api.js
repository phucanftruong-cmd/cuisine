const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5295";

// Lỗi từ API, kèm mã HTTP để giao diện xử lý riêng (401, 403, 404...)
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// AuthProvider đăng ký hàm này để tự đăng xuất khi token hết hạn hoặc không hợp lệ
let unauthorizedHandler = null;
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

function errorMessage(status, data) {
  if (data?.error) return data.error;

  // Lỗi kiểm tra dữ liệu mặc định của ASP.NET: { errors: { Name: ["..."] } }
  if (data?.errors && typeof data.errors === "object") {
    const first = Object.values(data.errors).flat()[0];
    if (first) return first;
  }

  if (status === 401) return "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.";
  if (status === 403) return "Tài khoản của bạn không có quyền thực hiện thao tác này.";
  if (status === 404) return "Không tìm thấy dữ liệu.";
  return data?.title ?? `Lỗi ${status}`;
}

async function request(path, { token, ...options } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new ApiError("Không kết nối được tới server. Hãy kiểm tra backend đã chạy chưa.", 0);
  }
  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && token) unauthorizedHandler?.();
    throw new ApiError(errorMessage(response.status, data), response.status);
  }
  return data;
}

export function getPlaces(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });
  const qs = query.toString();
  return request(`/api/Places${qs ? `?${qs}` : ""}`);
}

// Lấy hết các quán khớp bộ lọc (gọi lần lượt từng trang 50 quán).
// Dùng cho trang tổng quan và bộ lọc "còn thiếu thông tin" của admin.
export async function getAllPlaces(params = {}) {
  const items = [];
  for (let page = 1; ; page++) {
    const data = await getPlaces({ ...params, page, pageSize: 50 });
    items.push(...data.items);
    if (page >= data.totalPages || data.items.length === 0) return items;
  }
}

export const getPlaceFilters = () => request("/api/Places/filters");
export const getPlace = (id) => request(`/api/Places/${id}`);
export const getTranslation = (id, lang) =>
  request(`/api/places/${id}/translations/${lang}`);

export const login = (username, password) =>
  request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
export const register = (username, password) =>
  request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
export const getMe = (token) => request("/api/auth/me", { token });

export const createPlace = (token, place) =>
  request("/api/Places", { method: "POST", token, body: JSON.stringify(place) });
export const updatePlace = (token, id, place) =>
  request(`/api/Places/${id}`, { method: "PUT", token, body: JSON.stringify(place) });
export const deletePlace = (token, id) =>
  request(`/api/Places/${id}`, { method: "DELETE", token });

// Bản dịch đã lưu (chỉ Admin)
export const getCachedTranslations = (token, id) =>
  request(`/api/places/${id}/translations`, { token });
export const clearCachedTranslations = (token, id) =>
  request(`/api/places/${id}/translations`, { method: "DELETE", token });
