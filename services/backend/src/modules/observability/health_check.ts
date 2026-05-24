/**
 * Health check rico: verifica as dependencias do backend (Supabase + Blua)
 * e retorna o status de cada uma. Usado para observabilidade/monitoramento.
 */
import type { FastifyInstance } from "fastify";
import { supabase } from "../../infra/supabase.js";
import { env } from "../../infra/env.js";

interface DepStatus { ok: boolean; latencia_ms?: number; erro?: string; }

async function checarSupabase(): Promise<DepStatus> {
  const t0 = Date.now();
  try {
    // Query trivial: conta usuarios (rapida, confirma conexao + auth).
    const { error } = await supabase.from("users").select("id", { count: "exact", head: true });
    if (error) return { ok: false, erro: error.message };
    return { ok: true, latencia_ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "erro" };
  }
}

async function checarBlua(): Promise<DepStatus> {
  if (!env.BLUA_API_URL) return { ok: false, erro: "BLUA_API_URL nao configurada" };
  const t0 = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000); // 5s — health deve ser rapido
  try {
    const r = await fetch(`${env.BLUA_API_URL}/health`, { signal: controller.signal });
    if (!r.ok) return { ok: false, erro: `Blua retornou ${r.status}` };
    return { ok: true, latencia_ms: Date.now() - t0 };
  } catch (e) {
    const msg = e instanceof Error && e.name === "AbortError" ? "timeout (5s)" : "indisponivel";
    return { ok: false, erro: msg };
  } finally {
    clearTimeout(timer);
  }
}

export async function observabilityRoutes(fastify: FastifyInstance): Promise<void> {
  // Health detalhado: checa dependencias. /health simples continua no server.ts.
  fastify.get("/health/full", async (_req, reply) => {
    const [sb, blua] = await Promise.all([checarSupabase(), checarBlua()]);
    const tudoOk = sb.ok && blua.ok;
    return reply.code(tudoOk ? 200 : 503).send({
      status: tudoOk ? "ok" : "degraded",
      dependencias: { supabase: sb, blua },
      timestamp: new Date().toISOString(),
    });
  });
}
