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

// ============================================================
// EXPANSAO: paridade com o app (anamnese, prescricao, IA/RAG)
// ============================================================

// is_real/origem agora vem do backend — estende PacienteResumo de forma retrocompativel.
export interface PacienteResumoFull extends PacienteResumo {
  is_real?: boolean;
  origem?: string | null;
}
export const listarPacientesFull = () =>
  api<{ pacientes: PacienteResumoFull[] }>("/health/patients");

// ---- Anamnese ----
export interface AnamneseResp {
  anamnese: {
    versao_questionario: string;
    respostas: Record<string, unknown>;
    completa: boolean;
    atualizado_em: string;
  } | null;
}
export interface AnamneseSchema {
  versao: string;
  secoes: { id: string; titulo: string; campos: { id: string; rotulo: string; tipo: string; opcoes?: string[] }[] }[];
}
export const buscarAnamneseSchema = () => api<AnamneseSchema>("/anamnese/schema");
export const buscarAnamneseDe = (userId: string) =>
  api<AnamneseResp>(`/anamnese/${userId}`);

// ---- Prescricoes (fila HITL) ----
export interface Prescricao {
  id: string;
  paciente_bnf: string;
  paciente_user_id: string | null;
  sugestao: Record<string, unknown>;
  status: "pendente" | "aprovada" | "rejeitada" | string;
  observacao_medico: string | null;
  criado_em: string;
}
export const listarPrescricoes = (status?: string) =>
  api<{ prescricoes: Prescricao[] }>(`/ai/prescriptions${status ? `?status=${status}` : ""}`);
export const revisarPrescricao = (id: string, decisao: "aprovada" | "rejeitada", observacao?: string) =>
  api<{ prescricao: Prescricao }>(`/ai/prescriptions/${id}/revisar`, {
    method: "POST",
    body: { decisao, observacao },
  });

// ---- IA do Medico (RAG) ----
export interface RagDoc {
  id: string;
  titulo: string;
  nome_arquivo: string;
  status: string;
  num_chunks: number;
  criado_em: string;
}
export const listarRagDocs = () => api<{ documentos: RagDoc[] }>("/rag/documents");
export const removerRagDoc = (id: string) =>
  api<{ ok: boolean }>(`/rag/documents/${id}`, { method: "DELETE" });
export interface RagQueryResp {
  resposta: string;
  fontes?: { titulo: string; trecho: string }[];
}
export const perguntarRag = (pergunta: string) =>
  api<RagQueryResp>("/rag/query", { method: "POST", body: { pergunta } });

// upload de PDF (multipart) — precisa de tratamento especial (FormData, sem Content-Type manual)
export async function uploadRagPdf(titulo: string, arquivo: File): Promise<RagDoc> {
  const token = localStorage.getItem("cp_token");
  const fd = new FormData();
  fd.append("titulo", titulo);
  fd.append("arquivo", arquivo);
  const res = await fetch(`${API_BASE_URL}/rag/documents`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd, // NAO setar Content-Type — o browser poe o boundary do multipart
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, data?.message ?? `Erro ${res.status}`);
  return (data?.documento ?? data) as RagDoc;
}
