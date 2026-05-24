/**
 * Cliente de API. A URL base vem da config do Expo (extra.apiBaseUrl),
 * NUNCA hardcoded. Em dev, aponta para o IP da maquina na rede local
 * (o celular nao enxerga "localhost" do PC).
 */
import Constants from "expo-constants";

const API_BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? "";

if (!API_BASE_URL) {
  console.warn(
    "[api] apiBaseUrl nao configurada. Defina em app.config.ts (extra.apiBaseUrl).",
  );
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.auth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.message ?? `Erro ${res.status}`;
    throw new ApiError(res.status, data?.code ?? "ERROR", message);
  }
  return data as T;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
