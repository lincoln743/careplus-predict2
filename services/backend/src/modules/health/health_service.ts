/**
 * Servico de series temporais de saude.
 * Fonte: sim_readings (dados de SIMULACAO, is_simulated=true) ligados a sim_patients.
 * Serve serie por periodo + agregados. O endpoint deixa explicito que e simulado.
 *
 * Mapeamento do paciente logado -> sim_patient: para a demo, o paciente logado
 * "e" um sim_patient fixo (PACIENTE_DEMO_CHAVE). Quando houver wearable real
 * (item 7), gravamos leituras reais com is_simulated=false numa fonte propria.
 */
import { supabase } from "../../infra/supabase.js";

export const PACIENTE_DEMO_CHAVE = "joao";

type Periodo = "7d" | "30d" | "3m" | "90d";

function diasDoPeriodo(p: string): number {
  switch (p) {
    case "7d": return 7;
    case "30d": return 30;
    case "3m":
    case "90d": return 90;
    default: return 30;
  }
}

export interface PontoSerie {
  data: string;       // YYYY-MM-DD
  passos: number;
  sono_horas: number;
  fc_media: number;
}

export interface SerieSaude {
  chave: string;
  nome: string;
  perfil_risco: string;
  periodo: string;
  is_simulated: boolean;
  pontos: PontoSerie[];
  resumo: {
    passos_media: number;
    sono_media: number;
    fc_media: number;
    passos_total: number;
    dias: number;
  };
}

export async function seriePorChave(chave: string, periodo: string): Promise<SerieSaude> {
  const dias = diasDoPeriodo(periodo);
  if (chave.startsWith("real:")) {
    return (await buscarSeriePorChave(chave, dias)) as SerieSaude;
  }

  // 1. Acha o paciente simulado pela chave.
  const { data: paciente, error: errP } = await supabase
    .from("sim_patients")
    .select("id, chave, nome, perfil_risco")
    .eq("chave", chave)
    .single();
  if (errP || !paciente) throw new Error(`Paciente simulado '${chave}' nao encontrado.`);

  // 2. Busca as leituras dos ultimos N dias, em ordem cronologica.
  const desde = new Date();
  desde.setDate(desde.getDate() - (dias - 1));
  const desdeStr = desde.toISOString().slice(0, 10);

  const { data: leituras, error: errL } = await supabase
    .from("sim_readings")
    .select("data_ref, passos, sono_horas, fc_media")
    .eq("sim_patient_id", paciente.id)
    .gte("data_ref", desdeStr)
    .order("data_ref", { ascending: true });
  if (errL) throw new Error(`Erro ao buscar leituras: ${errL.message}`);

  const pontos: PontoSerie[] = (leituras ?? []).map((l) => ({
    data: l.data_ref as string,
    passos: l.passos as number,
    sono_horas: Number(l.sono_horas),
    fc_media: l.fc_media as number,
  }));

  // 3. Agregados.
  const n = pontos.length || 1;
  const passosTotal = pontos.reduce((a, p) => a + p.passos, 0);
  const resumo = {
    passos_media: Math.round(passosTotal / n),
    sono_media: Math.round((pontos.reduce((a, p) => a + p.sono_horas, 0) / n) * 10) / 10,
    fc_media: Math.round(pontos.reduce((a, p) => a + p.fc_media, 0) / n),
    passos_total: passosTotal,
    dias: pontos.length,
  };

  return {
    chave: paciente.chave as string,
    nome: paciente.nome as string,
    perfil_risco: paciente.perfil_risco as string,
    periodo,
    is_simulated: true,
    pontos,
    resumo,
  };
}

export async function serieDoPacienteLogado(periodo: string): Promise<SerieSaude> {
  // Demo: paciente logado mapeia para um sim_patient fixo.
  return seriePorChave(PACIENTE_DEMO_CHAVE, periodo);
}

export interface PacienteResumo {
  chave: string;
  nome: string;
  idade: number;
  perfil_risco: string;
  is_real: boolean;
  origem: string | null; // 'samsung_health' | 'apple_health' | 'simulado'
  ultima: { data: string; passos: number; sono_horas: number; fc_media: number } | null;
}

/** Lista pacientes — simulados (sim_patients) + reais (users PATIENT com leituras em health_readings). */
export async function listarPacientes(): Promise<PacienteResumo[]> {
  const resultado: PacienteResumo[] = [];

  // 1) Simulados (origem antiga, mantidos para demo)
  const { data: simulados, error: errSim } = await supabase
    .from("sim_patients")
    .select("id, chave, nome, idade, perfil_risco")
    .order("chave", { ascending: true });
  if (errSim) throw new Error(`Erro ao listar simulados: ${errSim.message}`);

  for (const p of simulados ?? []) {
    const { data: ult } = await supabase
      .from("sim_readings")
      .select("data_ref, passos, sono_horas, fc_media")
      .eq("sim_patient_id", p.id)
      .order("data_ref", { ascending: false })
      .limit(1)
      .maybeSingle();
    resultado.push({
      chave: p.chave as string,
      nome: p.nome as string,
      idade: p.idade as number,
      perfil_risco: p.perfil_risco as string,
      is_real: false,
      origem: "simulado",
      ultima: ult ? {
        data: ult.data_ref as string,
        passos: ult.passos as number,
        sono_horas: Number(ult.sono_horas),
        fc_media: ult.fc_media as number,
      } : null,
    });
  }

  // 2) Reais: users PATIENT que tenham alguma leitura em health_readings
  const { data: reais, error: errReal } = await supabase
    .from("users")
    .select("id, nome")
    .eq("role", "PATIENT")
    .eq("ativo", true);
  if (errReal) throw new Error(`Erro ao listar reais: ${errReal.message}`);

  for (const u of reais ?? []) {
    const { data: ult } = await supabase
      .from("health_readings")
      .select("data_ref, passos, sono_horas, fc_media, origem")
      .eq("user_id", u.id)
      .order("data_ref", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!ult) continue; // pula pacientes sem leitura ainda
    resultado.push({
      chave: `real:${u.id}`,
      nome: u.nome as string,
      idade: 0, // nao temos idade no users; mostrar "—" no dashboard
      perfil_risco: "saudavel", // sem regra de risco ainda; default
      is_real: true,
      origem: (ult.origem as string) ?? "samsung_health",
      ultima: {
        data: ult.data_ref as string,
        passos: (ult.passos as number) ?? 0,
        sono_horas: ult.sono_horas != null ? Number(ult.sono_horas) : 0,
        fc_media: (ult.fc_media as number) ?? 0,
      },
    });
  }

  return resultado;
}

/**
 * Busca serie temporal aceitando uma "chave" generica:
 * - "real:<userId>" -> busca em health_readings (dados de wearable reais)
 * - "<chave_simulada>" -> delega para buscarSerie (sim_readings)
 */
export async function buscarSeriePorChave(chave: string, dias: number) {
  if (chave.startsWith("real:")) {
    const userId = chave.slice(5);
    const desde = new Date();
    desde.setDate(desde.getDate() - (dias - 1));
    const { data, error } = await supabase
      .from("health_readings")
      .select("data_ref, passos, sono_horas, fc_media, fc_min, fc_max, origem")
      .eq("user_id", userId)
      .gte("data_ref", desde.toISOString().slice(0, 10))
      .order("data_ref", { ascending: true });
    if (error) throw new Error(`Erro ao buscar serie real: ${error.message}`);

    const pontos = (data ?? []).map((p) => ({
      data: p.data_ref as string,
      passos: (p.passos as number) ?? 0,
      sono_horas: p.sono_horas != null ? Number(p.sono_horas) : 0,
      fc_media: (p.fc_media as number) ?? 0,
    }));
    const n = pontos.length;
    const sum = (k: keyof typeof pontos[0]) => pontos.reduce((a, p) => a + (p[k] as number), 0);
    const passos_total = sum("passos");
    return {
      chave,
      nome: "Paciente real",
      perfil_risco: "saudavel",
      periodo: `${dias}d`,
      is_simulated: false,
      pontos,
      resumo: {
        passos_media: n ? Math.round(passos_total / n) : 0,
        sono_media: n ? Math.round((sum("sono_horas") / n) * 10) / 10 : 0,
        fc_media: n ? Math.round(sum("fc_media") / n) : 0,
        passos_total,
        dias: n,
      },
    };
  }
  // delega para o existente (sim_patients)
  return buscarSerie(chave, dias);
}
