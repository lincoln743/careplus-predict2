/**
 * Servico de simulacao. Estado POR MEDICO. Pacientes sinteticos marcados.
 * Default desligado. Toda operacao de toggle e auditada.
 */
import { supabase } from "../../infra/supabase.js";
import { PERFIS, gerarSerie } from "./generator.js";

async function auditar(atorId: string, acao: string, detalhe: Record<string, unknown> = {}) {
  await supabase.from("auditoria").insert({
    ator_id: atorId,
    acao,
    entidade: "simulation",
    entidade_id: atorId,
    detalhe,
  });
}

/** Garante que os pacientes sinteticos e suas leituras existem no banco. */
export async function semearPacientes(): Promise<void> {
  for (const perfil of PERFIS) {
    // upsert do paciente
    const { data: existente } = await supabase
      .from("sim_patients")
      .select("id")
      .eq("chave", perfil.chave)
      .maybeSingle();

    let patientId: string;
    if (existente) {
      patientId = existente.id;
    } else {
      const { data } = await supabase
        .from("sim_patients")
        .insert({
          chave: perfil.chave,
          nome: perfil.nome,
          idade: perfil.idade,
          perfil_risco: perfil.perfilRisco,
        })
        .select("id")
        .single();
      patientId = data!.id;
    }

    // Gera e persiste a serie (upsert por data_ref).
    const serie = gerarSerie(perfil, 7);
    for (const leitura of serie) {
      await supabase.from("sim_readings").upsert(
        {
          sim_patient_id: patientId,
          data_ref: leitura.dataRef,
          passos: leitura.passos,
          sono_horas: leitura.sonoHoras,
          fc_media: leitura.fcMedia,
          fc_min: leitura.fcMin,
          fc_max: leitura.fcMax,
        },
        { onConflict: "sim_patient_id,data_ref" },
      );
    }
  }
}

/** Liga ou desliga a simulacao para um medico. Semeia os dados ao ligar. */
export async function definirSimulacao(medicoId: string, ativo: boolean) {
  if (ativo) {
    await semearPacientes();
  }
  await supabase.from("simulation_state").upsert(
    {
      medico_id: medicoId,
      ativo,
      ligado_em: ativo ? new Date().toISOString() : null,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "medico_id" },
  );
  await auditar(medicoId, ativo ? "simulation.enabled" : "simulation.disabled");
  return { ativo };
}

/** Retorna se a simulacao esta ativa para o medico. */
export async function obterEstado(medicoId: string): Promise<{ ativo: boolean }> {
  const { data } = await supabase
    .from("simulation_state")
    .select("ativo")
    .eq("medico_id", medicoId)
    .maybeSingle();
  return { ativo: data?.ativo ?? false };
}

/**
 * Lista os pacientes simulados com a ultima leitura.
 * SO retorna dados se a simulacao estiver ativa para o medico —
 * caso contrario, lista vazia (pacientes simulados nao vazam quando desligado).
 */
export async function listarPacientesSimulados(medicoId: string) {
  const { ativo } = await obterEstado(medicoId);
  if (!ativo) return { ativo: false, pacientes: [] };

  const { data: pacientes } = await supabase
    .from("sim_patients")
    .select("id, chave, nome, idade, perfil_risco")
    .order("nome");

  const resultado = [];
  for (const p of pacientes ?? []) {
    const { data: leituras } = await supabase
      .from("sim_readings")
      .select("data_ref, passos, sono_horas, fc_media, fc_min, fc_max")
      .eq("sim_patient_id", p.id)
      .order("data_ref", { ascending: false });

    const ultima = leituras?.[0] ?? null;
    resultado.push({
      ...p,
      is_simulated: true,
      ultima_leitura: ultima,
      historico: leituras ?? [],
    });
  }
  return { ativo: true, pacientes: resultado };
}
