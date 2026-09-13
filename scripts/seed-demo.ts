/**
 * Seed de demonstracao — CarePlus Predict V2
 * ---------------------------------------------------------------------------
 * Popula o banco com o minimo necessario para a demo da banca ter evidencia de
 * funcionamento: usuarios, pseudonimos LGPD, pacientes simulados, leituras de
 * wearable, anamnese e a base de conhecimento do RAG.
 *
 * IMPORTANTE — dados sinteticos apenas. Nenhum dado de paciente real entra aqui.
 *
 * O que este script NAO faz: gerar as conversas de IA (ai_threads/ai_messages).
 * Essas sao produzidas rodando o chat de verdade contra o backend
 * (scripts/seed-chat.sh), para que a classificacao de intent e red_flags seja
 * a saida real do modelo, e nao linha forjada a mao.
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/seed-demo.ts
 *
 * Idempotente: pode rodar quantas vezes quiser. Usuarios ja existentes sao
 * reaproveitados; documentos do RAG com o mesmo titulo sao recriados.
 */
import argon2 from "argon2";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

// ---------------------------------------------------------------------------
// Configuracao
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BLUA_API_URL = process.env.BLUA_API_URL;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorias.");
  process.exit(1);
}
if (!BLUA_API_URL) {
  console.error("BLUA_API_URL obrigatoria (gera os embeddings 384d do RAG).");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SENHA_PADRAO = "senha123";

function log(etapa: string, detalhe: string) {
  console.log(`  ${etapa.padEnd(22)} ${detalhe}`);
}

// ---------------------------------------------------------------------------
// Chunkagem — copia fiel de services/backend/src/modules/rag/pdf_extract.ts.
// Duplicada de proposito: importar aquele modulo puxaria o unpdf junto, que o
// seed nao precisa. Se mudar la, mudar aqui.
// ---------------------------------------------------------------------------
function chunkar(texto: string, tamanho = 600, overlap = 80): string[] {
  const limpo = texto.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (limpo.length <= tamanho) return limpo ? [limpo] : [];
  const chunks: string[] = [];
  let inicio = 0;
  while (inicio < limpo.length) {
    let fim = Math.min(inicio + tamanho, limpo.length);
    if (fim < limpo.length) {
      const trecho = limpo.slice(inicio, fim);
      const corteParag = trecho.lastIndexOf("\n\n");
      const cortePonto = trecho.lastIndexOf(". ");
      const corte =
        corteParag > tamanho * 0.5 ? corteParag : cortePonto > tamanho * 0.5 ? cortePonto + 1 : -1;
      if (corte > 0) fim = inicio + corte;
    }
    const pedaco = limpo.slice(inicio, fim).trim();
    if (pedaco) chunks.push(pedaco);
    inicio = fim - overlap;
    if (inicio < 0) inicio = 0;
    if (fim >= limpo.length) break;
  }
  return chunks;
}

async function gerarEmbeddings(textos: string[]): Promise<number[][]> {
  const resp = await fetch(`${BLUA_API_URL}/api/v1/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ textos }),
  });
  if (!resp.ok) throw new Error(`Blua /embed retornou ${resp.status}`);
  const data = (await resp.json()) as { embeddings: number[][]; dim: number };
  if (data.dim !== 384) throw new Error(`Dimensao inesperada: ${data.dim} (esperado 384)`);
  return data.embeddings;
}

// ---------------------------------------------------------------------------
// 1. Usuarios
// ---------------------------------------------------------------------------
interface SeedUser {
  email: string;
  nome: string;
  role: "PATIENT" | "DOCTOR" | "ADMIN";
  crm?: string;
  especialidade?: string;
}

const USUARIOS: SeedUser[] = [
  // Medicos
  { email: "medico@careplus.com", nome: "Dr. Carlos Mendes", role: "DOCTOR", crm: "CRM-SP 123456", especialidade: "Clinica Medica" },
  { email: "medica@careplus.com", nome: "Dra. Ana Ribeiro", role: "DOCTOR", crm: "CRM-SP 654321", especialidade: "Cardiologia" },
  // Pacientes
  { email: "paciente@careplus.com", nome: "Maria Santos", role: "PATIENT" },
  { email: "joao@careplus.com", nome: "Joao Silva", role: "PATIENT" },
  { email: "maykon@careplus.com", nome: "Maykon Fonseca", role: "PATIENT" },
];

async function seedUsuarios(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  const hash = await argon2.hash(SENHA_PADRAO, { type: argon2.argon2id });

  for (const u of USUARIOS) {
    const { data: existente } = await supabase
      .from("users").select("id").eq("email", u.email).maybeSingle();

    if (existente) {
      ids.set(u.email, existente.id);
      log("usuario (ja existia)", u.email);
      continue;
    }
    const { data, error } = await supabase
      .from("users")
      .insert({
        email: u.email,
        password_hash: hash,
        role: u.role,
        nome: u.nome,
        crm: u.crm ?? null,
        especialidade: u.especialidade ?? null,
      })
      .select("id").single();
    if (error) throw new Error(`users(${u.email}): ${error.message}`);
    ids.set(u.email, data.id);
    log("usuario criado", `${u.email} (${u.role})`);
  }
  return ids;
}

// ---------------------------------------------------------------------------
// 2. Pseudonimos LGPD — mesma forma que o pseudonymizer do backend gera.
// ---------------------------------------------------------------------------
async function seedPseudonimos(ids: Map<string, string>) {
  const pacientes = USUARIOS.filter((u) => u.role === "PATIENT");
  for (const p of pacientes) {
    const userId = ids.get(p.email)!;
    const { data: existente } = await supabase
      .from("patient_pseudonyms").select("bnf_code").eq("user_id", userId).maybeSingle();
    if (existente) {
      log("pseudonimo (existia)", `${p.email} -> ${existente.bnf_code}`);
      continue;
    }
    const bnf = "BNF-" + crypto.randomBytes(4).toString("hex").toUpperCase();
    const { error } = await supabase
      .from("patient_pseudonyms").insert({ user_id: userId, bnf_code: bnf });
    if (error) throw new Error(`patient_pseudonyms(${p.email}): ${error.message}`);
    log("pseudonimo criado", `${p.email} -> ${bnf}`);
  }
}

// ---------------------------------------------------------------------------
// 3. Pacientes simulados (Modo Demo). A chave 'joao' e a que health_service
//    usa como PACIENTE_DEMO_CHAVE — nao renomear.
// ---------------------------------------------------------------------------
const SIM_PACIENTES = [
  { chave: "joao",   nome: "Joao Pereira",     idade: 34, perfil_risco: "saudavel" },
  { chave: "maria",  nome: "Maria Oliveira",   idade: 58, perfil_risco: "risco_medio" },
  { chave: "carlos", nome: "Carlos Nogueira",  idade: 67, perfil_risco: "risco_alto" },
];

/** Gerador deterministico: a demo precisa de historico estavel entre execucoes. */
function leituraSintetica(chave: string, d: Date) {
  const seed = d.getDate() + d.getMonth() * 31 + chave.length * 7;
  const base = chave === "carlos" ? 3200 : chave === "maria" ? 6000 : 8500;
  const passos = Math.max(1500, base + ((seed * 137) % 3000) - 1200);
  const sono = Math.round((6.0 + ((seed * 53) % 22) / 10) * 10) / 10;
  const fcBase = chave === "carlos" ? 82 : chave === "maria" ? 74 : 63;
  const fc = fcBase + ((seed * 17) % 12);
  return { passos, sono_horas: sono, fc_media: fc, fc_min: fc - 9, fc_max: fc + 52 };
}

async function seedSimulacao(dias = 30) {
  for (const sp of SIM_PACIENTES) {
    let simId: string;
    const { data: existente } = await supabase
      .from("sim_patients").select("id").eq("chave", sp.chave).maybeSingle();

    if (existente) {
      simId = existente.id;
    } else {
      const { data, error } = await supabase
        .from("sim_patients").insert(sp).select("id").single();
      if (error) throw new Error(`sim_patients(${sp.chave}): ${error.message}`);
      simId = data.id;
    }

    const linhas = [];
    const hoje = new Date();
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(d.getDate() - i);
      linhas.push({
        sim_patient_id: simId,
        data_ref: d.toISOString().slice(0, 10),
        ...leituraSintetica(sp.chave, d),
      });
    }
    const { error } = await supabase
      .from("sim_readings").upsert(linhas, { onConflict: "sim_patient_id,data_ref" });
    if (error) throw new Error(`sim_readings(${sp.chave}): ${error.message}`);
    log("paciente simulado", `${sp.chave} (${linhas.length} leituras)`);
  }
}

// ---------------------------------------------------------------------------
// 4. Leituras REAIS de wearable (health_readings).
//    Volume enxuto de proposito: a demo precisa de serie legivel, nao de 268
//    pontos que ninguem consegue ler num grafico projetado.
// ---------------------------------------------------------------------------
async function seedWearable(ids: Map<string, string>) {
  const alvos: Array<{ email: string; dias: number; chave: string }> = [
    { email: "paciente@careplus.com", dias: 20, chave: "maria" },
    { email: "joao@careplus.com", dias: 8, chave: "joao" },
    // maykon@careplus.com fica SEM leituras de proposito: e o caso de paciente
    // que ainda nao conectou o wearable, util para demonstrar o estado vazio.
  ];

  for (const alvo of alvos) {
    const userId = ids.get(alvo.email)!;
    const linhas = [];
    const hoje = new Date();
    for (let i = alvo.dias - 1; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(d.getDate() - i);
      linhas.push({
        user_id: userId,
        data_ref: d.toISOString().slice(0, 10),
        ...leituraSintetica(alvo.chave, d),
        origem: "samsung_health",
        is_simulated: false,
      });
    }
    const { error } = await supabase
      .from("health_readings")
      .upsert(linhas, { onConflict: "user_id,data_ref,origem" });
    if (error) throw new Error(`health_readings(${alvo.email}): ${error.message}`);
    log("wearable", `${alvo.email} (${linhas.length} dias)`);
  }
}

// ---------------------------------------------------------------------------
// 5. Anamnese
// ---------------------------------------------------------------------------
async function seedAnamnese(ids: Map<string, string>) {
  const userId = ids.get("paciente@careplus.com")!;
  const { error } = await supabase.from("anamnese").upsert(
    {
      user_id: userId,
      versao_questionario: "v1",
      respostas: {
        queixa_principal: "Cansaco e falta de ar ao subir escadas nas ultimas semanas",
        doencas_previas: "Hipertensao diagnosticada ha 4 anos",
        medicamentos_uso: "Losartana 50mg, 1x ao dia",
        alergias: "Nenhuma conhecida",
        historico_familiar: "Pai com infarto aos 62 anos",
        tabagismo: "nao",
        etilismo: "social",
        atividade_fisica: "caminhada 2x por semana",
      },
      completa: true,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`anamnese: ${error.message}`);
  log("anamnese", "paciente@careplus.com (completa)");
}

// ---------------------------------------------------------------------------
// 6. Base de conhecimento do RAG.
//    Conteudo didatico resumido, escrito para a demo. NAO e protocolo clinico
//    oficial e nao deve ser usado para decisao assistencial real.
// ---------------------------------------------------------------------------
const DOC_HIPERTENSAO = `
Protocolo de Manejo da Hipertensao Arterial Sistemica (resumo didatico)

1. Definicao e diagnostico
Hipertensao arterial sistemica e definida como pressao arterial sistolica maior ou igual a 140 mmHg e/ou pressao arterial diastolica maior ou igual a 90 mmHg, confirmada em pelo menos duas consultas distintas. A medida deve ser feita com o paciente sentado, em repouso por no minimo cinco minutos, com manguito adequado a circunferencia do braco.

2. Classificacao
Pressao otima: sistolica abaixo de 120 e diastolica abaixo de 80. Pre-hipertensao: sistolica entre 120 e 139 ou diastolica entre 80 e 89. Hipertensao estagio 1: sistolica entre 140 e 159 ou diastolica entre 90 e 99. Hipertensao estagio 2: sistolica entre 160 e 179 ou diastolica entre 100 e 109. Hipertensao estagio 3: sistolica maior ou igual a 180 ou diastolica maior ou igual a 110.

3. Sinais de alarme e emergencia hipertensiva
Pressao arterial maior ou igual a 180 por 120 mmHg acompanhada de dor toracica, dispneia, deficit neurologico focal, alteracao do nivel de consciencia ou dor abdominal intensa configura emergencia hipertensiva. Nesses casos o encaminhamento ao pronto-socorro deve ser imediato, sem aguardar nova aferição. Pressao elevada sem lesao de orgao alvo configura urgencia hipertensiva e pode ser manejada ambulatorialmente com reavaliacao em 24 a 72 horas.

4. Tratamento nao farmacologico
Reducao do consumo de sodio para menos de 2 gramas por dia. Adocao de padrao alimentar rico em frutas, hortalicas e laticinios com baixo teor de gordura. Atividade fisica aerobica de intensidade moderada por pelo menos 150 minutos semanais. Reducao de peso corporal em pacientes com sobrepeso, com meta de indice de massa corporal abaixo de 25. Limitacao do consumo de alcool e cessacao do tabagismo.

5. Tratamento farmacologico
As classes de primeira linha incluem diureticos tiazidicos, bloqueadores dos canais de calcio, inibidores da enzima conversora de angiotensina e bloqueadores do receptor de angiotensina. A escolha considera comorbidades, idade e perfil de efeitos adversos. Em hipertensao estagio 2 recomenda-se iniciar com combinacao de duas drogas. Betabloqueadores nao sao primeira linha isolada, exceto em pacientes com indicacao especifica como doenca coronariana ou insuficiencia cardiaca.

6. Seguimento
Reavaliacao em quatro semanas apos inicio ou ajuste de terapia. Uma vez atingida a meta pressorica, o intervalo pode ser estendido para tres a seis meses. Monitorar funcao renal e potassio serico em pacientes em uso de inibidores da enzima conversora de angiotensina, bloqueadores do receptor de angiotensina ou diureticos. Avaliar adesao ao tratamento antes de considerar hipertensao resistente.
`.trim();

const DOC_DIABETES = `
Protocolo de Manejo do Diabetes Mellitus Tipo 2 (resumo didatico)

1. Criterios diagnosticos
O diagnostico de diabetes mellitus tipo 2 e estabelecido por qualquer um dos seguintes: glicemia de jejum maior ou igual a 126 mg/dL, confirmada em segunda dosagem; glicemia duas horas apos sobrecarga oral de 75 gramas de glicose maior ou igual a 200 mg/dL; hemoglobina glicada maior ou igual a 6,5 por cento; ou glicemia casual maior ou igual a 200 mg/dL na presenca de sintomas classicos.

2. Pre-diabetes
Glicemia de jejum entre 100 e 125 mg/dL, glicemia pos-sobrecarga entre 140 e 199 mg/dL, ou hemoglobina glicada entre 5,7 e 6,4 por cento caracterizam pre-diabetes. Nessa faixa a intervencao no estilo de vida reduz significativamente a progressao para diabetes estabelecido.

3. Sinais de alarme
Poliuria e polidipsia intensas associadas a perda de peso rapida, halito cetonico, dor abdominal, vomitos, respiracao de Kussmaul ou rebaixamento do nivel de consciencia sugerem cetoacidose diabetica e exigem atendimento de emergencia imediato. Glicemia capilar acima de 300 mg/dL com sintomas, ou hipoglicemia com glicemia abaixo de 54 mg/dL, tambem demandam avaliacao urgente.

4. Metas de controle
A meta geral de hemoglobina glicada e abaixo de 7 por cento para a maioria dos adultos. Metas menos rigorosas, em torno de 8 por cento, sao apropriadas para idosos frageis, pacientes com historico de hipoglicemia grave, expectativa de vida reduzida ou complicacoes avancadas. Glicemia de jejum alvo entre 80 e 130 mg/dL e glicemia pos-prandial abaixo de 180 mg/dL.

5. Tratamento
A metformina permanece como terapia inicial de escolha, salvo contraindicacao por taxa de filtracao glomerular abaixo de 30 mL/min. Em pacientes com doenca cardiovascular aterosclerotica estabelecida, insuficiencia cardiaca ou doenca renal cronica, recomenda-se associar inibidor do cotransportador sodio-glicose tipo 2 ou agonista do receptor de GLP-1, independentemente do valor da hemoglobina glicada. A insulinizacao e indicada quando ha sintomas de catabolismo, hemoglobina glicada acima de 10 por cento ou falha das terapias orais combinadas.

6. Rastreamento de complicacoes
Exame de fundo de olho anual a partir do diagnostico. Dosagem anual de albuminuria e creatinina serica com calculo da taxa de filtracao glomerular. Exame dos pes a cada consulta, com avaliacao de sensibilidade protetora por monofilamento. Perfil lipidico anual. Avaliacao odontologica periodica.
`.trim();

const DOCUMENTOS = [
  { titulo: "Protocolo de Hipertensao Arterial", nome_arquivo: "protocolo-hipertensao.md", texto: DOC_HIPERTENSAO },
  { titulo: "Protocolo de Diabetes Mellitus Tipo 2", nome_arquivo: "protocolo-diabetes.md", texto: DOC_DIABETES },
];

async function seedRag(ids: Map<string, string>) {
  const ownerId = ids.get("medico@careplus.com")!;

  for (const doc of DOCUMENTOS) {
    // Recria do zero: apagar o documento leva os chunks junto (cascade).
    const { data: antigos } = await supabase
      .from("rag_documents").select("id").eq("owner_id", ownerId).eq("titulo", doc.titulo);
    for (const a of antigos ?? []) {
      await supabase.from("rag_documents").delete().eq("id", a.id);
    }

    const { data: criado, error: errDoc } = await supabase
      .from("rag_documents")
      .insert({
        owner_id: ownerId,
        titulo: doc.titulo,
        nome_arquivo: doc.nome_arquivo,
        tipo: "texto",
        status: "processando",
      })
      .select("id").single();
    if (errDoc) throw new Error(`rag_documents(${doc.titulo}): ${errDoc.message}`);

    const chunks = chunkar(doc.texto);
    const vetores = await gerarEmbeddings(chunks);

    const linhas = chunks.map((conteudo, i) => ({
      document_id: criado.id,
      owner_id: ownerId,
      ordem: i,
      conteudo,
      embedding: vetores[i],
    }));
    const { error: errChunks } = await supabase.from("rag_chunks").insert(linhas);
    if (errChunks) throw new Error(`rag_chunks(${doc.titulo}): ${errChunks.message}`);

    await supabase
      .from("rag_documents")
      .update({ status: "pronto", num_chunks: chunks.length })
      .eq("id", criado.id);

    log("documento RAG", `${doc.titulo} (${chunks.length} chunks, 384d)`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("\nSeed de demonstracao — CarePlus Predict V2");
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log(`Blua:     ${BLUA_API_URL}\n`);

  console.log("[1/6] Usuarios");
  const ids = await seedUsuarios();

  console.log("[2/6] Pseudonimos LGPD");
  await seedPseudonimos(ids);

  console.log("[3/6] Pacientes simulados (Modo Demo)");
  await seedSimulacao();

  console.log("[4/6] Leituras de wearable");
  await seedWearable(ids);

  console.log("[5/6] Anamnese");
  await seedAnamnese(ids);

  console.log("[6/6] Base de conhecimento do RAG");
  await seedRag(ids);

  console.log(`\nConcluido. Senha de todos os usuarios: ${SENHA_PADRAO}`);
  console.log("Proximo passo: scripts/seed-chat.sh para gerar as conversas de IA.\n");
}

main().catch((e) => {
  console.error("\nFALHOU:", e instanceof Error ? e.message : e);
  process.exit(1);
});
