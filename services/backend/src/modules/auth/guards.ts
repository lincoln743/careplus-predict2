/**
 * Guards de autenticacao e autorizacao (RBAC).
 *
 * - autenticar: valida o access token e popula request.user.
 * - exigirPapel: garante que o usuario tem um dos papeis permitidos.
 *
 * Uso nas rotas:
 *   fastify.get("/rota", { preHandler: [autenticar, exigirPapel("DOCTOR")] }, handler)
 */
import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyAccessToken } from "./security.js";
import { Errors } from "../../shared/errors.js";
import type { AuthUser, Role } from "./types.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export async function autenticar(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw Errors.unauthorized("Token ausente");
  }
  const token = header.slice("Bearer ".length).trim();
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      nome: "", // preenchido sob demanda; o token nao carrega nome por privacidade
    };
  } catch {
    throw Errors.unauthorized("Token invalido ou expirado");
  }
}

export function exigirPapel(...permitidos: Role[]) {
  return async function (req: FastifyRequest, _reply: FastifyReply): Promise<void> {
    if (!req.user) {
      throw Errors.unauthorized();
    }
    if (!permitidos.includes(req.user.role)) {
      throw Errors.forbidden(`Requer papel: ${permitidos.join(" ou ")}`);
    }
  };
}
