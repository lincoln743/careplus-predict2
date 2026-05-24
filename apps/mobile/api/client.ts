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
  const headers: Record<string, string> = {};
  // Content-Type JSON apenas quando ha corpo — senao o Fastify rejeita
  // requisicoes sem body (ex: DELETE) que declaram application/json.
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.auth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
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

/**
 * Upload de arquivo (multipart). Usado pelo RAG do IA Medico.
 * Recebe a uri do arquivo (do document-picker), envia como multipart/form-data
 * com o token de auth. NAO seta Content-Type manualmente (o fetch monta o boundary).
 */
export async function uploadArquivo<T>(
  path: string,
  arquivo: { uri: string; name: string; mimeType?: string },
  campos: Record<string, string> = {},
): Promise<T> {
  const form = new FormData();
  // Campos extras primeiro (ex: titulo), para o backend ler antes do arquivo.
  for (const [k, v] of Object.entries(campos)) form.append(k, v);
  form.append("file", {
    uri: arquivo.uri,
    name: arquivo.name,
    type: arquivo.mimeType ?? "application/pdf",
  } as unknown as Blob);

  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers, // sem Content-Type: o fetch define multipart/form-data + boundary
    body: form,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(res.status, data?.code ?? "ERROR", data?.message ?? `Erro ${res.status}`);
  }
  return data as T;
}

// ---- Series temporais de saude (item 3) ----
export interface PontoSerie {
  data: string;        // YYYY-MM-DD
  passos: number;
  sono_horas: number;
  fc_media: number;
}
export interface SerieSaude {
  chave: string;
  nome: string;
  periodo: string;
  is_simulated: boolean;
  pontos: PontoSerie[];
  resumo: { passos_media: number; sono_media: number; fc_media: number; passos_total: number; dias: number };
}

export async function buscarMinhaSerie(periodo = "7d"): Promise<SerieSaude> {
  return apiRequest<SerieSaude>(`/health/me/series?periodo=${periodo}`, { auth: true });
}
