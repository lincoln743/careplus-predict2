/**
 * Servico de wearable. Recebe leituras de saude REAIS (de Samsung Health agora,
 * Apple HealthKit no futuro) e grava em health_readings (is_simulated=false).
 * Separado dos dados de simulacao (sim_readings).
 */
import { supabase } from "../../infra/supabase.js";

export interface LeituraWearable {
  data_ref: string;       // YYYY-MM-DD
  passos?: number;
  sono_horas?: number;
  fc_media?: number;
  fc_min?: number;
  fc_max?: number;
  origem?: "samsung_health" | "apple_health" | "manual";
}

export async function gravarLeituras(userId: string, leituras: LeituraWearable[], origemPadrao = "samsung_health") {
  if (leituras.length === 0) return { gravadas: 0 };
  const linhas = leituras.map((l) => ({
    user_id: userId,
    data_ref: l.data_ref,
    passos: l.passos ?? null,
    sono_horas: l.sono_horas ?? null,
    fc_media: l.fc_media ?? null,
    fc_min: l.fc_min ?? null,
    fc_max: l.fc_max ?? null,
    origem: l.origem ?? origemPadrao,
    is_simulated: false,
  }));
  // Upsert por (user_id, data_ref, origem): reenvio do mesmo dia atualiza.
  const { error } = await supabase
    .from("health_readings")
    .upsert(linhas, { onConflict: "user_id,data_ref,origem" });
  if (error) throw new Error(`Erro ao gravar leituras: ${error.message}`);
  return { gravadas: linhas.length };
}

export async function listarLeituras(userId: string, dias = 7) {
  const desde = new Date();
  desde.setDate(desde.getDate() - (dias - 1));
  const { data, error } = await supabase
    .from("health_readings")
    .select("data_ref, passos, sono_horas, fc_media, origem")
    .eq("user_id", userId)
    .gte("data_ref", desde.toISOString().slice(0, 10))
    .order("data_ref", { ascending: true });
  if (error) throw new Error(`Erro ao listar leituras: ${error.message}`);
  return data ?? [];
}

/**
 * MOCK do WearableProvider (estilo Samsung Health). Gera N dias de leituras
 * plausiveis e as grava. Simula um smartwatch sincronizando o historico.
 * No futuro, troca-se por integracao real (Samsung Health SDK) sem mexer no resto.
 */
export async function sincronizarMock(userId: string, dias = 7) {
  const leituras: LeituraWearable[] = [];
  const hoje = new Date();
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    const seed = d.getDate() + d.getMonth() * 31;
    const passos = 7000 + ((seed * 137) % 3500) - 800;
    const sono = Math.round((6.5 + ((seed * 53) % 18) / 10) * 10) / 10;
    const fc = 64 + ((seed * 17) % 14);
    leituras.push({
      data_ref: d.toISOString().slice(0, 10),
      passos: Math.max(2000, passos),
      sono_horas: sono,
      fc_media: fc,
      fc_min: fc - 10,
      fc_max: fc + 55,
      origem: "samsung_health",
    });
  }
  return gravarLeituras(userId, leituras);
}
