/**
 * Rotas de autenticacao. Validacao de entrada com zod (nada confia no cliente).
 * Refresh token vai em cookie httpOnly/secure; access token na resposta JSON.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as authService from "./service.js";
import { autenticar } from "./guards.js";
import { env } from "../../infra/env.js";

const registerSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
  nome: z.string().min(1),
  role: z.enum(["PATIENT", "DOCTOR", "ADMIN"]).optional(),
  crm: z.string().optional(),
  especialidade: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

const COOKIE_NAME = "cp_refresh";
const cookieOpts = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/auth",
};

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post("/auth/register", async (req, reply) => {
    const body = registerSchema.parse(req.body);
    const user = await authService.registrar({
      email: body.email,
      senha: body.senha,
      nome: body.nome,
      role: body.role,
      crm: body.crm,
      especialidade: body.especialidade,
    });
    return reply.code(201).send({ user });
  });

  fastify.post("/auth/login", async (req, reply) => {
    const { email, senha } = loginSchema.parse(req.body);
    const result = await authService.login(email, senha);
    reply.setCookie(COOKIE_NAME, result.refreshToken, cookieOpts);
    return reply.send({ accessToken: result.accessToken, user: result.user });
  });

  fastify.post("/auth/refresh", async (req, reply) => {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      return reply.code(401).send({ code: "UNAUTHORIZED", message: "Sem refresh token" });
    }
    const tokens = await authService.refresh(token);
    reply.setCookie(COOKIE_NAME, tokens.refreshToken, cookieOpts);
    return reply.send({ accessToken: tokens.accessToken });
  });

  fastify.post("/auth/logout", async (req, reply) => {
    const token = req.cookies?.[COOKIE_NAME];
    if (token) await authService.logout(token);
    reply.clearCookie(COOKIE_NAME, cookieOpts);
    return reply.send({ ok: true });
  });

  // Rota protegida de exemplo: retorna o usuario autenticado.
  fastify.get("/auth/me", { preHandler: [autenticar] }, async (req) => {
    return { user: req.user };
  });
}
