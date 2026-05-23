/**
 * Pseudonimizacao (LGPD): traduz usuario real <-> codigo BNF-XXXXX.
 *
 * O codigo e ALEATORIO (nao sequencial) para nao revelar ordem nem quantidade
 * de pacientes. O mapa fica SO no nosso banco — a IA nunca recebe nome/email/UUID,
 * apenas o BNF opaco. Esta e a fronteira de conformidade ao chamar a IA externa.
 */
import crypto from "node:crypto";
import { supabase } from "../../infra/supabase.js";

/** Gera um codigo BNF aleatorio: BNF- + 8 hex maiusculos. */
function novoBnf(): string {
  return "BNF-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

/**
 * Retorna o BNF do usuario, criando se ainda nao existir.
 * Idempotente: o mesmo usuario sempre recebe o mesmo BNF.
 */
export async function obterOuCriarBnf(userId: string): Promise<string> {
  const { data: existente } = await supabase
    .from("patient_pseudonyms")
    .select("bnf_code")
    .eq("user_id", userId)
    .maybeSingle();

  if (existente) return existente.bnf_code;

  // Tenta inserir; em caso de colisao raríssima de bnf_code, tenta de novo.
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const bnf = novoBnf();
    const { error } = await supabase
      .from("patient_pseudonyms")
      .insert({ user_id: userId, bnf_code: bnf });
    if (!error) return bnf;

    // Se a colisao foi no user_id (corrida), busca o que ja existe.
    const { data } = await supabase
      .from("patient_pseudonyms")
      .select("bnf_code")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) return data.bnf_code;
    // senao, foi colisao de bnf_code — tenta outro.
  }
  throw new Error("Falha ao gerar BNF unico");
}
