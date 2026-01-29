import { api } from "./api";

export const fetcher = <T = unknown>(url: string, token?: string): Promise<T> => {
  return api.get(url, token) as Promise<T>;
}