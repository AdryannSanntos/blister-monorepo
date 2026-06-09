import axios from "axios";
import { getActiveCompanyId } from "./active-company";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const apiClient = axios.create({
  baseURL: `${apiBaseUrl}/api`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const activeCompanyId = getActiveCompanyId();
  if (activeCompanyId) {
    config.headers.set("x-blister-company-id", activeCompanyId);
  }
  return config;
});

export const apiBaseAxios = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

apiBaseAxios.interceptors.request.use((config) => {
  const activeCompanyId = getActiveCompanyId();
  if (activeCompanyId) {
    config.headers.set("x-blister-company-id", activeCompanyId);
  }
  return config;
});
