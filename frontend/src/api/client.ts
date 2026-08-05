import axios from "axios";

// Use "/api" in dev so Vite proxies to the backend (see vite.config.ts). Override with VITE_API_URL in production.
// In dev, default to Vite proxy (/api → localhost:5001). Production sets VITE_API_URL in .env.production.
const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "/api" : "/api");

const isAuthEndpoint = (url?: string) =>
  !!url && (url.includes("/auth/login") || url.includes("/auth/register"));

// ─── Base instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  timeout: 45_000,
});

// ─── Request interceptor — attach JWT on every request ────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("mashhoor_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor — handle 401 and auto-refresh token ─────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token!);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not run refresh flow for login/register failures or unauthenticated requests
    const hadAccessToken = !!localStorage.getItem("mashhoor_token");
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      hadAccessToken &&
      !isAuthEndpoint(originalRequest?.url)
    ) {
      if (isRefreshing) {
        // Queue requests while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("mashhoor_refresh_token");
      if (!refreshToken) {
        // No refresh token — force logout
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        const newToken = data.data.token;
        localStorage.setItem("mashhoor_token", newToken);
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const message =
      error.code === "ECONNABORTED"
        ? "Request timed out. Is the backend running on port 5001?"
        : error.response?.status === 503
          ? (error.response?.data as { message?: string })?.message ||
            "Email service unavailable. Check SMTP settings on the server."
          : (error.response?.data as { message?: string } | undefined)?.message ||
            error.message ||
            "Request failed";
    return Promise.reject(new Error(message));
  }
);

export default api;
