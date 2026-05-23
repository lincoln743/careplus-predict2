/**
 * Servidor Fastify — ponto de entrada do backend.
 * Registra plugins (cookie, cors, rate-limit), o handler de erros tipado e as rotas.
 */
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { ZodError } from "zod";
import { env } from "./infra/env.js";
import { AppError } from "./shared/errors.js";
import { authRoutes } from "./modules/auth/routes.js";
import { simulationRoutes } from "./modules/simulation/sim_routes.js";
import { aiGatewayRoutes } from "./modules/ai-gateway/gw_routes.js";

const app = Fastify({
  logger: { level: env.LOG_LEVEL },
});

await app.register(cookie);
await app.register(cors, {
  origin: true, // ajustar para os dominios do app/web em producao
  credentials: true,
});
await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});

// Handler de erros: traduz AppError e ZodError, esconde o resto.
app.setErrorHandler((error, _req, reply) => {
  if (error instanceof AppError) {
    return reply.code(error.statusCode).send({ code: error.code, message: error.message });
  }
  if (error instanceof ZodError) {
    return reply.code(400).send({
      code: "VALIDATION_ERROR",
      message: "Dados invalidos",
      issues: error.issues.map((i) => ({ campo: i.path.join("."), erro: i.message })),
    });
  }
  if ((error as { statusCode?: number }).statusCode === 429) {
    return reply.code(429).send({ code: "RATE_LIMITED", message: "Muitas requisicoes" });
  }
  app.log.error(error);
  return reply.code(500).send({ code: "INTERNAL", message: "Erro interno" });
});

// Health check (nao toca no banco).
app.get("/health", async () => ({ status: "ok" }));

// Rotas de dominio.
await app.register(authRoutes);
await app.register(simulationRoutes);
await app.register(aiGatewayRoutes);

const port = env.API_PORT;
app
  .listen({ port, host: "0.0.0.0" })
  .then(() => app.log.info(`Backend no ar em :${port}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
