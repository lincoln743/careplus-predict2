/** Tipos do modulo de auth. */
export type Role = "PATIENT" | "DOCTOR" | "ADMIN";

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: Role;
  nome: string;
  crm: string | null;
  especialidade: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  nome?: string; // opcional: o access token nao carrega nome (privacidade)
}
