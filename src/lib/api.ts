import axios from "axios";

/**
 * API client.
 *
 * - In development, Vite proxies `/api` to your backend (see `vite.config.ts`).
 * - In production, set `VITE_API_BASE_URL` to your backend origin (e.g. `https://api.example.com`).
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "",
});

