/**
 * Rotas de anamnese.
 * - GET  /anamnese/schema     : questionario (qualquer autenticado)
 * - GET  /anamnese/me         : anamnese do paciente logado
 * - POST /anamnese            : salva/atualiza a anamnese do paciente logado
 * - GET  /anamnese/:userId    : medico/admin consulta a de um paciente
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { autenticar, exigirPapel } from "../auth/guards.js";
import * as anamnese from "./anamnese_service.js";

const salvarSchema = z.object({
  respostas: z.record(z.unknown()),
});

export async function anamneseRoutes(fastify: FastifyInstance): Promise<void> {
  // Questionario (estrutura) — qualquer autenticado.
  fastify.get("/anamnese/schema", { preHandler: [autenticar] }, async () => {
    return anamnese.obterQuestionario();
  });

  // Anamnese do paciente logado.
  fastify.get("/anamnese/me", { preHandler: [autenticar] }, async (req) => {
    const dados = await anamnese.obterAnamnese(req.user!.id);
    return { anamnese: dados };
  });

  // Salvar/atualizar a anamnese do paciente logado.
  fastify.post("/anamnese", { preHandler: [autenticar] }, async (req) => {
    const { respostas } = salvarSchema.parse(req.body);
    return anamnese.salvarAnamnese(req.user!.id, respostas);
  });

  // Medico/admin consulta a anamnese de um paciente.
  fastify.get(
    "/anamnese/:userId",
    { preHandler: [autenticar, exigirPapel("DOCTOR", "ADMIN")] },
    async (req) => {
      const { userId } = req.params as { userId: string };
      const dados = await anamnese.obterAnamnese(userId);
      return { anamnese: dados };
    },
  );
}
