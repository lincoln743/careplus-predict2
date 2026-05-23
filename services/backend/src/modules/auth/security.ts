/**
 * Utilitarios de seguranca: hash de senha (argon2id), JWT (access/refresh),
 * e hash de refresh token.
 */
import argon2 from "argon2";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../../infra/env.js";
import type { Role } from "./types.js";

// ---- Senha: argon2id (recomendado para senhas) ----
export async function hashPassword(senha: string): Promise<string> {
  return argon2.hash(senha, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, senha: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, senha);
  } catch {
    return false;
  }
}

// ---- Access token (curto, stateless) ----
export interface AccessPayload {
  sub: string; // user id
  role: Role;
  email: string;
}

export function signAccessToken(payload: AccessPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
}

// ---- Refresh token (opaco, guardado como hash no banco) ----
// Geramos um valor aleatorio (nao um JWT) e guardamos so o hash SHA-256.
// Assim, vazamento do banco nao expoe tokens utilizaveis.
export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Calcula a data de expiracao do refresh a partir de uma string tipo "7d".
export function refreshExpiryDate(ttl: string): Date {
  const match = ttl.match(/^(\d+)([smhd])$/);
  const now = Date.now();
  if (!match) return new Date(now + 7 * 24 * 60 * 60 * 1000); // default 7d
  const n = Number(match[1]);
  const unit = match[2];
  const ms =
    unit === "s" ? n * 1000 :
    unit === "m" ? n * 60 * 1000 :
    unit === "h" ? n * 60 * 60 * 1000 :
    n * 24 * 60 * 60 * 1000;
  return new Date(now + ms);
}
