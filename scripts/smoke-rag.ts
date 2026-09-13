/**
 * Smoke test da recuperacao vetorial do RAG.
 * ---------------------------------------------------------------------------
 * Testa a metade do RAG que NAO depende do LLM: embedding da pergunta (Blua) +
 * busca por similaridade de cosseno no pgvector (match_rag_chunks).
 *
 * Util para isolar falhas: se este script passa mas /rag/query falha, o
 * problema esta na geracao da resposta (LLM), nao na recuperacao.
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/smoke-rag.ts
 */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function embed(texto: string): Promise<number[]> {
  const r = await fetch(`${process.env.BLUA_API_URL}/api/v1/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ textos: [texto] }),
  });
  if (!r.ok) throw new Error(`Blua /embed retornou ${r.status}`);
  const d = (await r.json()) as { embeddings: number[][]; dim: number };
  if (d.dim !== 384) throw new Error(`dim inesperada: ${d.dim}`);
  return d.embeddings[0];
}

/** Pergunta + o documento que DEVE ser recuperado. */
const CASOS = [
  { pergunta: "qual pressao caracteriza emergencia hipertensiva?", esperado: "Hipertensao" },
  { pergunta: "quando indicar insulina no diabetes tipo 2?", esperado: "Diabetes" },
  { pergunta: "qual a meta de hemoglobina glicada?", esperado: "Diabetes" },
  { pergunta: "quais sao as classes de primeira linha anti-hipertensivas?", esperado: "Hipertensao" },
];

async function main() {
  const { data: medico, error: errU } = await supabase
    .from("users").select("id, nome").eq("email", "medico@careplus.com").single();
  if (errU || !medico) throw new Error("medico@careplus.com nao encontrado — rode o seed antes.");

  console.log(`\nSmoke RAG — dono: ${medico.nome}\n`);
  let acertos = 0;

  for (const caso of CASOS) {
    const vetor = await embed(caso.pergunta);
    const { data, error } = await supabase.rpc("match_rag_chunks", {
      query_embedding: vetor,
      p_owner_id: medico.id,
      match_count: 2,
      min_similarity: 0.25,
    });
    if (error) throw new Error(`match_rag_chunks: ${error.message}`);

    const trechos = (data ?? []) as Array<{ conteudo: string; titulo: string; similaridade: number }>;
    const top = trechos[0];
    const ok = top && top.titulo.includes(caso.esperado);
    if (ok) acertos++;

    console.log(`${ok ? "OK  " : "FALHA"} ${caso.pergunta}`);
    if (top) {
      console.log(`      -> [${top.similaridade.toFixed(3)}] ${top.titulo}`);
      console.log(`         "${top.conteudo.slice(0, 110).replace(/\n/g, " ")}..."`);
    } else {
      console.log("      -> nenhum trecho acima do limiar de similaridade");
    }
  }

  // Isolamento: a mesma busca com outro dono nao pode retornar nada.
  const { data: outro } = await supabase
    .from("users").select("id").eq("email", "medica@careplus.com").single();
  const vetor = await embed(CASOS[0].pergunta);
  const { data: vazio } = await supabase.rpc("match_rag_chunks", {
    query_embedding: vetor, p_owner_id: outro!.id, match_count: 5, min_similarity: 0.25,
  });
  const isolado = (vazio ?? []).length === 0;
  console.log(`${isolado ? "OK  " : "FALHA"} isolamento por owner_id (outro medico nao ve os documentos)`);

  console.log(`\n${acertos}/${CASOS.length} recuperacoes corretas, isolamento ${isolado ? "OK" : "QUEBRADO"}\n`);
  if (acertos < CASOS.length || !isolado) process.exit(1);
}

main().catch((e) => {
  console.error("\nFALHOU:", e instanceof Error ? e.message : e);
  process.exit(1);
});
