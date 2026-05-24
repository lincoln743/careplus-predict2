/**
 * Servico de anamnese: serve o questionario, salva/atualiza respostas do
 * paciente, e permite o medico consultar a anamnese de um paciente.
 */
import { supabase } from "../../infra/supabase.js";
import { QUESTIONARIO, VERSAO_QUESTIONARIO, CAMPOS_VALIDOS } from "./anamnese_schema.js";

export function obterQuestionario() {
  return { versao: VERSAO_QUESTIONARIO, secoes: QUESTIONARIO };
}

/** Filtra as respostas recebidas, mantendo so campos validos do questionario. */
function sanitizarRespostas(respostas: Record<string, unknown>): Record<string, unknown> {
  const limpo: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(respostas)) {
    if (CAMPOS_VALIDOS.has(k)) limpo[k] = v;
  }
  return limpo;
}

/** Considera "completa" se a queixa principal foi preenchida. */
function calcularCompleta(respostas: Record<string, unknown>): boolean {
  const q = respostas["queixa_principal"];
  return typeof q === "string" && q.trim().length > 0;
}

export async function salvarAnamnese(userId: string, respostasBrutas: Record<string, unknown>) {
  const respostas = sanitizarRespostas(respostasBrutas);
  const completa = calcularCompleta(respostas);

  // Upsert por user_id (uma anamnese por paciente). Faz merge com o que ja existe.
  const { data: existente } = await supabase
    .from("anamnese")
    .select("respostas")
    .eq("user_id", userId)
    .maybeSingle();

  const respostasFinais = { ...(existente?.respostas ?? {}), ...respostas };

  const { data, error } = await supabase
    .from("anamnese")
    .upsert(
      {
        user_id: userId,
        versao_questionario: VERSAO_QUESTIONARIO,
        respostas: respostasFinais,
        completa: calcularCompleta(respostasFinais),
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("id, versao_questionario, respostas, completa, atualizado_em")
    .single();
  if (error) throw new Error(`Erro ao salvar anamnese: ${error.message}`);
  return data;
}

export async function obterAnamnese(userId: string) {
  const { data, error } = await supabase
    .from("anamnese")
    .select("id, versao_questionario, respostas, completa, criado_em, atualizado_em")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Erro ao buscar anamnese: ${error.message}`);
  return data; // null se ainda nao preencheu
}
