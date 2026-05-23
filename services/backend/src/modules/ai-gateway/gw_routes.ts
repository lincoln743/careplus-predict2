/**
 * Rotas do ai-gateway.
 * - /ai/chat: paciente ou medico conversa com a IA (filtrado por perfil).
 * - /ai/prescriptions: medico ve e revisa a fila HITL.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { autenticar, exigirPapel } from "../auth/guards.js";
import * as gw from "./gw_service.js";

const chatSchema = z.object({
  mensagem: z.string().min(1),
  threadId: z.string().uuid().optional(),
});

const revisaoSchema = z.object({
  decisao: z.enum(["aprovada", "editada", "recusada"]),
  observacao: z.string().optional(),
  sugestaoEditada: z.record(z.unknown()).optional(),
});

export async function aiGatewayRoutes(fastify: FastifyInstance): Promise<void> {
  // Chat — qualquer usuario autenticado (paciente ou medico).
  fastify.post("/ai/chat", { preHandler: [autenticar] }, async (req) => {
    const { mensagem, threadId } = chatSchema.parse(req.body);
    return gw.conversar({
      userId: req.user!.id,
      role: req.user!.role,
      nome: req.user!.nome,
      mensagem,
      threadId,
    });
  });

  // Fila de prescricao — so medico/admin.
  fastify.get(
    "/ai/prescriptions",
    { preHandler: [autenticar, exigirPapel("DOCTOR", "ADMIN")] },
    async () => {
      return { pendentes: await gw.listarPrescricoesPendentes() };
    },
  );

  // Revisar uma prescricao (aprovar/editar/recusar) — so medico/admin.
  fastify.post(
    "/ai/prescriptions/:id/review",
    { preHandler: [autenticar, exigirPapel("DOCTOR", "ADMIN")] },
    async (req) => {
      const { id } = req.params as { id: string };
      const body = revisaoSchema.parse(req.body);
      return gw.revisarPrescricao(
        id,
        req.user!.id,
        body.decisao,
        body.observacao,
        body.sugestaoEditada,
      );
    },
  );
}
