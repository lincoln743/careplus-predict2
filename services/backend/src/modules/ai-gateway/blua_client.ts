/**
 * Cliente HTTP da BluaDiagnostics.
 *
 * Fala com o wrapper FastAPI da Blua via BLUA_API_URL (do .env, NUNCA hardcode).
 * Envia o contrato pseudonimizado; recebe o contrato de resposta.
 *
 * Timeout generoso (90s default): o fluxo de prescricao encadeia varias tools
 * (consultar historico, verificar interacoes, buscar conhecimento) + RAG, e
 * pode passar de 30s em maquina local. Triagem e bem mais rapida.
 */
import { env } from "../../infra/env.js";

export interface BluaRequest {
  paciente_id: string; // BNF-XXXXX (pseudonimizado)
  mensagem: string;
  thread_id: string;
  perfil: "paciente" | "medico";
  nome_apelido?: string;
}

export interface BluaResponse {
  resposta: string;
  intent: string | null;
  requer_escalada_humana: boolean;
  red_flags: Array<Record<string, unknown>>;
  sugestao_prescricao: Record<string, unknown> | null;
  tools_usadas: string[];
  docs_consultados: string[];
  thread_id: string;
}

export async function chamarBlua(req: BluaRequest): Promise<BluaResponse> {
  if (!env.BLUA_API_URL) {
    throw new Error("BLUA_API_URL nao configurada no ambiente");
  }

  const timeout = env.BLUA_API_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const r = await fetch(`${env.BLUA_API_URL}/api/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      signal: controller.signal,
    });
    if (!r.ok) {
      throw new Error(`Blua respondeu ${r.status}`);
    }
    return (await r.json()) as BluaResponse;
  } finally {
    clearTimeout(timer);
  }
}
