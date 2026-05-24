/**
 * Rotas de series temporais de saude.
 * - GET /health/series/:chave   : serie de um paciente simulado (medico/admin)
 * - GET /health/me/series       : serie do paciente logado (atalho)
 *
 * Fonte: sim_readings (simulado). A resposta marca is_simulated=true.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { autenticar, exigirPapel } from "../auth/guards.js";
import * as health from "./health_service.js";

const periodoSchema = z.object({
  periodo: z.enum(["7d", "30d", "3m", "90d"]).default("30d"),
});

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  // Serie por chave de paciente — medico/admin (ve qualquer paciente).
  fastify.get(
    "/health/series/:chave",
    { preHandler: [autenticar, exigirPapel("DOCTOR", "ADMIN")] },
    async (req) => {
      const { chave } = req.params as { chave: string };
      const { periodo } = periodoSchema.parse(req.query);
      return health.seriePorChave(chave, periodo);
    },
  );

  // Lista pacientes (com ultima leitura) — medico/admin.
  fastify.get(
    "/health/patients",
    { preHandler: [autenticar, exigirPapel("DOCTOR", "ADMIN")] },
    async () => {
      return { pacientes: await health.listarPacientes() };
    },
  );

  // Serie do paciente logado — qualquer usuario autenticado.
  fastify.get(
    "/health/me/series",
    { preHandler: [autenticar] },
    async (req) => {
      const { periodo } = periodoSchema.parse(req.query);
      return health.serieDoPacienteLogado(periodo);
    },
  );
}
