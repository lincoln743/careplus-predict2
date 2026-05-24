/**
 * Helper de auditoria. Registra acoes sensiveis na tabela auditoria (ja existente).
 * Best-effort: nunca quebra o fluxo principal se a auditoria falhar (so loga).
 */
import { supabase } from "../../infra/supabase.js";

export type AcaoAuditavel =
  | "login" | "login_falha" | "logout"
  | "prescricao_revisada" | "rag_documento_enviado" | "rag_documento_removido"
  | "anamnese_salva" | "wearable_sync";

export async function auditar(params: {
  atorId: string | null;
  acao: AcaoAuditavel;
  entidade?: string;
  entidadeId?: string;
  detalhe?: Record<string, unknown>;
}): Promise<void> {
  try {
    await supabase.from("auditoria").insert({
      ator_id: params.atorId,
      acao: params.acao,
      entidade: params.entidade ?? null,
      entidade_id: params.entidadeId ?? null,
      detalhe: params.detalhe ?? null,
    });
  } catch {
    // best-effort: nao propaga (auditoria nao deve derrubar a operacao principal)
  }
}
