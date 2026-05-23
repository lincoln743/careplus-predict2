/**
 * Rotas de simulacao. Protegidas: so DOCTOR/ADMIN podem ligar/desligar.
 * O estado e por medico (req.user.id).
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { autenticar, exigirPapel } from "../auth/guards.js";
import * as simService from "./sim_service.js";

const toggleSchema = z.object({
  ativo: z.boolean(),
});

export async function simulationRoutes(fastify: FastifyInstance): Promise<void> {
  // Liga/desliga a simulacao do medico autenticado.
  fastify.post(
    "/simulation/toggle",
    { preHandler: [autenticar, exigirPapel("DOCTOR", "ADMIN")] },
    async (req) => {
      const { ativo } = toggleSchema.parse(req.body);
      return simService.definirSimulacao(req.user!.id, ativo);
    },
  );

  // Consulta o estado atual.
  fastify.get(
    "/simulation/state",
    { preHandler: [autenticar, exigirPapel("DOCTOR", "ADMIN")] },
    async (req) => {
      return simService.obterEstado(req.user!.id);
    },
  );

  // Lista pacientes simulados (vazio se desligado).
  fastify.get(
    "/simulation/patients",
    { preHandler: [autenticar, exigirPapel("DOCTOR", "ADMIN")] },
    async (req) => {
      return simService.listarPacientesSimulados(req.user!.id);
    },
  );
}
