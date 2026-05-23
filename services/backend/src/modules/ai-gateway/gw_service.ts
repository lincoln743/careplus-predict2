/**
 * Servico do ai-gateway (BFF da IA).
 *
 * Orquestra: pseudonimiza -> chama Blua -> persiste conversa -> se prescricao,
 * cria item na fila HITL -> filtra por perfil -> devolve ao app.
 */
import { supabase } from "../../infra/supabase.js";
import { obterOuCriarBnf } from "./pseudonymizer.js";
import { chamarBlua, type BluaResponse } from "./blua_client.js";
import type { Role } from "../auth/types.js";

interface ChatParams {
  userId: string;
  role: Role;
  nome?: string;
  mensagem: string;
  threadId?: string;
}

// Garante que existe uma thread; cria se nao informada.
async function obterThread(userId: string, bnf: string, perfil: string, threadId?: string) {
  if (threadId) {
    const { data } = await supabase
      .from("ai_threads")
      .select("id")
      .eq("id", threadId)
      .eq("user_id", userId) // so a propria thread (isolamento)
      .maybeSingle();
    if (data) return data.id as string;
  }
  const { data } = await supabase
    .from("ai_threads")
    .insert({ user_id: userId, bnf_code: bnf, perfil })
    .select("id")
    .single();
  return data!.id as string;
}

// Filtra a resposta da Blua conforme o perfil. Peca de seguranca.
function filtrarPorPerfil(dados: BluaResponse, perfil: "paciente" | "medico") {
  if (perfil === "medico") {
    return dados; // medico ve tudo (trilha + prescricao)
  }
  // paciente: ve resposta, intent e red_flags (banner de emergencia),
  // mas NAO a prescricao crua nem a trilha de raciocinio.
  return {
    resposta: dados.resposta,
    intent: dados.intent,
    requer_escalada_humana: dados.requer_escalada_humana,
    red_flags: dados.red_flags,
    thread_id: dados.thread_id,
  };
}

export async function conversar(params: ChatParams) {
  const perfil: "paciente" | "medico" = params.role === "DOCTOR" || params.role === "ADMIN" ? "medico" : "paciente";

  // 1. Pseudonimiza (a IA nunca ve o usuario real).
  const bnf = await obterOuCriarBnf(params.userId);

  // 2. Garante a thread.
  const threadId = await obterThread(params.userId, bnf, perfil, params.threadId);

  // 3. Persiste a mensagem do usuario.
  await supabase.from("ai_messages").insert({
    thread_id: threadId,
    autor: perfil === "medico" ? "ia" : "paciente",
    texto: params.mensagem,
  });

  // 4. Chama a Blua (pseudonimizado).
  const resposta = await chamarBlua({
    paciente_id: bnf,
    mensagem: params.mensagem,
    thread_id: threadId,
    perfil,
    nome_apelido: params.nome,
  });

  // 5. Persiste a resposta da IA (com snapshot de red_flags se houver).
  await supabase.from("ai_messages").insert({
    thread_id: threadId,
    autor: "ia",
    texto: resposta.resposta,
    intent: resposta.intent,
    red_flags: resposta.red_flags?.length ? resposta.red_flags : null,
  });

  // 6. Se for prescricao, cria item na fila HITL (sempre pendente).
  if (resposta.intent === "prescricao" && resposta.sugestao_prescricao) {
    await supabase.from("prescriptions").insert({
      paciente_user_id: params.userId,
      paciente_bnf: bnf,
      thread_id: threadId,
      sugestao: resposta.sugestao_prescricao,
      status: "pendente",
    });
  }

  // 7. Filtra por perfil e devolve.
  return filtrarPorPerfil(resposta, perfil);
}

// ---- Fila de prescricao (lado do medico) ----

export async function listarPrescricoesPendentes() {
  const { data } = await supabase
    .from("prescriptions")
    .select("*")
    .eq("status", "pendente")
    .order("criado_em", { ascending: true });
  return data ?? [];
}

export async function revisarPrescricao(
  prescricaoId: string,
  medicoId: string,
  decisao: "aprovada" | "editada" | "recusada",
  observacao?: string,
  sugestaoEditada?: Record<string, unknown>,
) {
  const update: Record<string, unknown> = {
    status: decisao,
    revisado_por_medico: medicoId,
    revisado_em: new Date().toISOString(),
    observacao_medico: observacao ?? null,
  };
  if (decisao === "editada" && sugestaoEditada) {
    update.sugestao = sugestaoEditada;
  }
  const { data } = await supabase
    .from("prescriptions")
    .update(update)
    .eq("id", prescricaoId)
    .select("id, status")
    .single();

  await supabase.from("auditoria").insert({
    ator_id: medicoId,
    acao: `prescription.${decisao}`,
    entidade: "prescription",
    entidade_id: prescricaoId,
    detalhe: { observacao: observacao ?? null },
  });

  return data;
}
