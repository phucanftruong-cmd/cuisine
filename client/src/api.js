const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5295";

async function request(path, { token, ...options } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error ?? data?.title ?? `Lỗi ${response.status}`);
  }
  return data;
}

export const getPlaces = () => request("/api/Places");
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

export const createPlace = (token, place) =>
  request("/api/Places", { method: "POST", token, body: JSON.stringify(place) });
export const updatePlace = (token, id, place) =>
  request(`/api/Places/${id}`, { method: "PUT", token, body: JSON.stringify(place) });
export const deletePlace = (token, id) =>
  request(`/api/Places/${id}`, { method: "DELETE", token });