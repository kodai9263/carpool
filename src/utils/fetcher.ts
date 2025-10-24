import { api } from "./api";

export const fetcher = <T = any>(url: string, token?: string): Promise<T> => {
  return api.get(url, token) as Promise<T>;
}