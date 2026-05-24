/**
 * Cliente de API do dashboard web. Aponta para o backend Fastify.
 * A URL base vem de VITE_API_BASE_URL (.env) ou cai no localhost:3000.
 */
const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:3000";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) localStorage.setItem("cp_token", token);
  else localStorage.removeItem("cp_token");
}

export function carregarTokenSalvo(): string | null {
  const t = localStorage.getItem("cp_token");
  accessToken = t;
  return t;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(res.status, data?.message ?? data?.erro ?? `Erro ${res.status}`);
  }
  return data as T;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

// ---- Tipos compartilhados ----
export interface Usuario {
  id: string;
  email: string;
  role: "PATIENT" | "DOCTOR" | "ADMIN";
  nome: string;
}

export interface LoginResp {
  accessToken: string;
  user: Usuario;
}

export interface PontoSerie {
  data: string;
  passos: number;
  sono_horas: number;
  fc_media: number;
}

export interface SerieSaude {
  chave: string;
  nome: string;
  perfil_risco: string;
  periodo: string;
  is_simulated: boolean;
  pontos: PontoSerie[];
  resumo: { passos_media: number; sono_media: number; fc_media: number; passos_total: number; dias: number };
}

// ---- Chamadas ----
export const login = (email: string, senha: string) =>
  api<LoginResp>("/auth/login", { method: "POST", body: { email, senha } });

export const buscarSerie = (chave: string, periodo: string) =>
  api<SerieSaude>(`/health/series/${chave}?periodo=${periodo}`);

export interface PacienteResumo {
  chave: string;
  nome: string;
  idade: number;
  perfil_risco: string;
  ultima: { data: string; passos: number; sono_horas: number; fc_media: number } | null;
}

export const listarPacientes = () =>
  api<{ pacientes: PacienteResumo[] }>("/health/patients");
