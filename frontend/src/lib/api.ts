import axios from "axios";

const getApiBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  const trimmed = envUrl.trim().replace(/\/+$/, "");
  if (!trimmed.endsWith("/api/v1")) {
    return `${trimmed}/api/v1`;
  }
  return trimmed;
};

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true, // Sends and receives HttpOnly cookies automatically
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Extract backend error message cleanly
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      "An unexpected error occurred.";
    return Promise.reject(new Error(message));
  }
);
