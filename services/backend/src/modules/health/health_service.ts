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
  ultima: { data: string; passos: number; sono_horas: number; fc_media: number } | null;
}

/** Lista os pacientes simulados com a leitura mais recente (para o dashboard). */
export async function listarPacientes(): Promise<PacienteResumo[]> {
  const { data: pacientes, error } = await supabase
    .from("sim_patients")
    .select("id, chave, nome, idade, perfil_risco")
    .order("chave", { ascending: true });
  if (error) throw new Error(`Erro ao listar pacientes: ${error.message}`);

  const resultado: PacienteResumo[] = [];
  for (const p of pacientes ?? []) {
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
      ultima: ult ? {
        data: ult.data_ref as string,
        passos: ult.passos as number,
        sono_horas: Number(ult.sono_horas),
        fc_media: ult.fc_media as number,
      } : null,
    });
  }
  return resultado;
}
