/**
 * Servico de autenticacao: registro, login, refresh (com rotacao) e logout.
 * Toda operacao sensivel grava na auditoria (sem dado sensivel no detalhe).
 */
import { supabase } from "../../infra/supabase.js";
import { env } from "../../infra/env.js";
import { Errors } from "../../shared/errors.js";
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshExpiryDate,
} from "./security.js";
import type { Role, UserRow } from "./types.js";

async function auditar(
  atorId: string | null,
  acao: string,
  entidade: string,
  entidadeId: string | null,
  detalhe: Record<string, unknown> = {},
): Promise<void> {
  await supabase.from("auditoria").insert({
    ator_id: atorId,
    acao,
    entidade,
    entidade_id: entidadeId,
    detalhe,
  });
}

export interface RegisterInput {
  email: string;
  senha: string;
  nome: string;
  role?: Role;
  crm?: string;
  especialidade?: string;
}

export async function registrar(input: RegisterInput) {
  const email = input.email.toLowerCase().trim();

  const { data: existente } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existente) {
    throw Errors.conflict("Email ja cadastrado");
  }

  const password_hash = await hashPassword(input.senha);

  const { data, error } = await supabase
    .from("users")
    .insert({
      email,
      password_hash,
      nome: input.nome,
      role: input.role ?? "PATIENT",
      crm: input.crm ?? null,
      especialidade: input.especialidade ?? null,
    })
    .select("id, email, role, nome")
    .single();

  if (error || !data) {
    throw Errors.badRequest("Falha ao criar usuario");
  }

  await auditar(data.id, "user.registered", "user", data.id, { role: data.role });
  return data;
}

async function emitirTokens(user: Pick<UserRow, "id" | "email" | "role">) {
  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    email: user.email,
  });

  const refreshToken = generateRefreshToken();
  const token_hash = hashRefreshToken(refreshToken);
  const expira_em = refreshExpiryDate(env.JWT_REFRESH_TTL);

  await supabase.from("refresh_tokens").insert({
    user_id: user.id,
    token_hash,
    expira_em: expira_em.toISOString(),
  });

  return { accessToken, refreshToken };
}

export async function login(email: string, senha: string) {
  const emailNorm = email.toLowerCase().trim();

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("email", emailNorm)
    .maybeSingle<UserRow>();

  // Mensagem generica para nao revelar se o email existe (anti-enumeracao).
  if (!user || !user.ativo) {
    throw Errors.unauthorized("Credenciais invalidas");
  }

  const ok = await verifyPassword(user.password_hash, senha);
  if (!ok) {
    await auditar(user.id, "login.failed", "user", user.id);
    throw Errors.unauthorized("Credenciais invalidas");
  }

  const tokens = await emitirTokens(user);
  await auditar(user.id, "login.success", "user", user.id);

  return {
    ...tokens,
    user: { id: user.id, email: user.email, role: user.role, nome: user.nome },
  };
}

// Refresh com ROTACAO: valida o refresh atual, revoga, emite um novo par.
// Detecta reuso: se o token ja estava revogado, e sinal de vazamento —
// revogamos toda a familia do usuario (defesa).
export async function refresh(refreshToken: string) {
  const token_hash = hashRefreshToken(refreshToken);

  const { data: row } = await supabase
    .from("refresh_tokens")
    .select("*")
    .eq("token_hash", token_hash)
    .maybeSingle();

  if (!row) {
    throw Errors.unauthorized("Refresh token invalido");
  }

  if (row.revogado) {
    // Reuso de token revogado: revoga tudo do usuario.
    await supabase
      .from("refresh_tokens")
      .update({ revogado: true })
      .eq("user_id", row.user_id);
    await auditar(row.user_id, "refresh.reuse_detected", "user", row.user_id);
    throw Errors.unauthorized("Sessao comprometida. Faca login novamente.");
  }

  if (new Date(row.expira_em).getTime() < Date.now()) {
    throw Errors.unauthorized("Refresh token expirado");
  }

  // Revoga o atual.
  await supabase
    .from("refresh_tokens")
    .update({ revogado: true })
    .eq("id", row.id);

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", row.user_id)
    .single<UserRow>();

  if (!user || !user.ativo) {
    throw Errors.unauthorized("Usuario inativo");
  }

  const tokens = await emitirTokens(user);
  await auditar(user.id, "refresh.rotated", "user", user.id);
  return tokens;
}

export async function logout(refreshToken: string): Promise<void> {
  const token_hash = hashRefreshToken(refreshToken);
  await supabase
    .from("refresh_tokens")
    .update({ revogado: true })
    .eq("token_hash", token_hash);
}
