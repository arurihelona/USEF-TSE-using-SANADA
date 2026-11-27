const rawBaseUrl = import.meta.env.VITE_API_URL || "";

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");

/**
 * Resolve a backend API or media path against VITE_API_URL.
 * When VITE_API_URL is unset, relative paths are preserved for Vite proxy / same-origin serving.
 */
export function apiUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
