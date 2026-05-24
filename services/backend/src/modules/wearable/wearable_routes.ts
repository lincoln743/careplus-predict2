/**
 * Rotas do wearable. O paciente envia/sincroniza leituras do seu dispositivo.
 * - POST /wearable/readings     : grava leituras (lote) — para device real
 * - POST /wearable/sync-mock    : sincroniza N dias mock (Samsung Health simulado)
 * - GET  /wearable/readings     : lista as leituras reais do paciente
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { autenticar } from "../auth/guards.js";
import * as wearable from "./wearable_service.js";

const leituraSchema = z.object({
  data_ref: z.string(),
  passos: z.number().optional(),
  sono_horas: z.number().optional(),
  fc_media: z.number().optional(),
  fc_min: z.number().optional(),
  fc_max: z.number().optional(),
  origem: z.enum(["samsung_health", "apple_health", "manual"]).optional(),
});
const enviarSchema = z.object({ leituras: z.array(leituraSchema).min(1) });
const syncSchema = z.object({ dias: z.number().min(1).max(90).optional() });

export async function wearableRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post("/wearable/readings", { preHandler: [autenticar] }, async (req) => {
    const { leituras } = enviarSchema.parse(req.body);
    return wearable.gravarLeituras(req.user!.id, leituras);
  });

  fastify.post("/wearable/sync-mock", { preHandler: [autenticar] }, async (req) => {
    const { dias } = syncSchema.parse(req.body ?? {});
    return wearable.sincronizarMock(req.user!.id, dias ?? 7);
  });

  fastify.get("/wearable/readings", { preHandler: [autenticar] }, async (req) => {
    return { leituras: await wearable.listarLeituras(req.user!.id) };
  });
}
