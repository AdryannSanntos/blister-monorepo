import axios from "axios";
import { getActiveWorkspaceId } from "./active-workspace";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const apiClient = axios.create({
  baseURL: `${apiBaseUrl}/api`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const activeCompanyId = getActiveWorkspaceId();
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
  const activeCompanyId = getActiveWorkspaceId();
  if (activeCompanyId) {
    config.headers.set("x-blister-company-id", activeCompanyId);
  }
  return config;
});
