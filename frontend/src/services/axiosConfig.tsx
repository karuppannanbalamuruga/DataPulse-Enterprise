
import axios from "axios";

const axiosConfig = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Add request interceptors here when authentication is implemented.
axiosConfig.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error),
);

// Centralized response error handling.
axiosConfig.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error("API Error:", error.response.status, error.response.data);
    } else if (error.request) {
      console.error("Server is not reachable.");
    }

    return Promise.reject(error);
  },
);

export default axiosConfig;
