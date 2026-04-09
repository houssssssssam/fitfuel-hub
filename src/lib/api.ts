import axios from "axios";

/**
 * API client.
 *
 * - In development, Vite proxies `/api` to your backend (see `vite.config.ts`).
 * - In production, set `VITE_API_BASE_URL` to your backend origin (e.g. `https://api.example.com`).
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "",
  withCredentials: true, // send httpOnly refresh token cookie on every request
});

api.interceptors.request.use((config) => {
  const userStr = localStorage.getItem("user");
  if (userStr) {
    const user = JSON.parse(userStr);
    if (user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Attempt silent token refresh on 401, but not for the refresh endpoint itself
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/api/auth/refresh")
    ) {
      originalRequest._retry = true;

      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL ?? ""}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        // Update stored user with the new access token
        const userStr = localStorage.getItem("user");
        const user = userStr ? JSON.parse(userStr) : {};
        localStorage.setItem(
          "user",
          JSON.stringify({ ...user, ...data.user, token: data.token })
        );

        // Retry original request with the new token
        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        return api(originalRequest);
      } catch {
        // Refresh failed — clear session and send to login
        localStorage.removeItem("user");
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);
