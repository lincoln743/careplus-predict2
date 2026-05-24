/**
 * Servico do RAG do "IA do Medico".
 * - ingerir: extrai texto -> chunka -> gera embeddings (Blua) -> salva no pgvector.
 * - listar/remover documentos do medico.
 * - perguntar: embeda a pergunta -> busca vetorial (match_rag_chunks) ->
 *   monta contexto -> Blua responde citando as fontes.
 *
 * Isolamento: tudo por owner_id (o medico logado). RLS no banco reforca.
 */
import { supabase } from "../../infra/supabase.js";
import { gerarEmbedding, gerarEmbeddings, responderRag } from "./blua_embed_client.js";
import { extrairTextoPdf, chunkar } from "./pdf_extract.js";

interface IngerirInput {
  ownerId: string;
  titulo: string;
  nomeArquivo: string;
  tipo: "pdf" | "texto";
  buffer?: Buffer;   // para pdf
  texto?: string;    // para texto puro
}

export async function ingerirDocumento(input: IngerirInput) {
  // 1. Cria o registro do documento (status: processando).
  const { data: doc, error: errDoc } = await supabase
    .from("rag_documents")
    .insert({
      owner_id: input.ownerId,
      titulo: input.titulo,
      nome_arquivo: input.nomeArquivo,
      tipo: input.tipo,
      status: "processando",
    })
    .select()
    .single();
  if (errDoc || !doc) throw new Error(`Erro ao criar documento: ${errDoc?.message}`);

  try {
    // 2. Extrai o texto.
    const texto = input.tipo === "pdf"
      ? await extrairTextoPdf(input.buffer!)
      : (input.texto ?? "");
    if (!texto.trim()) throw new Error("Documento sem texto extraivel.");

    // 3. Chunka. Limita a quantidade para nao travar com livros gigantes.
    const MAX_CHUNKS = 400;
    let chunks = chunkar(texto);
    if (chunks.length === 0) throw new Error("Nenhum chunk gerado.");
    let truncado = false;
    if (chunks.length > MAX_CHUNKS) {
      chunks = chunks.slice(0, MAX_CHUNKS);
      truncado = true;
    }

    // 4. Gera embeddings em LOTES (evita estourar timeout/memoria da Blua
    //    com documentos grandes). 32 chunks por requisicao.
    const LOTE = 32;
    const vetores: number[][] = [];
    for (let i = 0; i < chunks.length; i += LOTE) {
      const lote = chunks.slice(i, i + LOTE);
      const v = await gerarEmbeddings(lote);
      vetores.push(...v);
    }

    // 5. Salva os chunks em LOTES tambem (evita payload gigante numa insercao).
    for (let i = 0; i < chunks.length; i += LOTE) {
      const linhas = chunks.slice(i, i + LOTE).map((conteudo, j) => ({
        document_id: doc.id,
        owner_id: input.ownerId,
        ordem: i + j,
        conteudo,
        embedding: vetores[i + j],
      }));
      const { error: errChunks } = await supabase.from("rag_chunks").insert(linhas);
      if (errChunks) throw new Error(`Erro ao salvar chunks: ${errChunks.message}`);
    }

    // 6. Marca como pronto.
    await supabase
      .from("rag_documents")
      .update({
        status: "pronto",
        num_chunks: chunks.length,
        erro: truncado ? `Documento grande: indexados os primeiros ${MAX_CHUNKS} trechos.` : null,
      })
      .eq("id", doc.id);

    return { id: doc.id, titulo: doc.titulo, num_chunks: chunks.length, status: "pronto", truncado };
  } catch (e) {
    // Marca erro no documento e propaga.
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    await supabase.from("rag_documents").update({ status: "erro", erro: msg }).eq("id", doc.id);
    throw e;
  }
}

export async function listarDocumentos(ownerId: string) {
  const { data, error } = await supabase
    .from("rag_documents")
    .select("id, titulo, nome_arquivo, tipo, status, num_chunks, erro, criado_em")
    .eq("owner_id", ownerId)
    .order("criado_em", { ascending: false });
  if (error) throw new Error(`Erro ao listar documentos: ${error.message}`);
  return data ?? [];
}

export async function removerDocumento(ownerId: string, documentId: string) {
  // RLS + filtro por owner: so remove se for do medico. Chunks caem por cascade.
  const { error } = await supabase
    .from("rag_documents")
    .delete()
    .eq("id", documentId)
    .eq("owner_id", ownerId);
  if (error) throw new Error(`Erro ao remover: ${error.message}`);
  return { removido: true };
}

interface PerguntarInput {
  ownerId: string;
  nome: string;
  pergunta: string;
  threadId?: string;
}

export async function perguntar(input: PerguntarInput) {
  // 1. Embeda a pergunta.
  const vetor = await gerarEmbedding(input.pergunta);

  // 2. Busca vetorial nos chunks do medico (funcao SQL match_rag_chunks).
  const { data: matches, error } = await supabase.rpc("match_rag_chunks", {
    query_embedding: vetor,
    p_owner_id: input.ownerId,
    match_count: 5,
    min_similarity: 0.25,
  });
  if (error) throw new Error(`Erro na busca vetorial: ${error.message}`);

  const trechos = (matches ?? []) as Array<{
    conteudo: string; titulo: string; nome_arquivo: string; similaridade: number;
  }>;

  if (trechos.length === 0) {
    return {
      resposta: "Não encontrei informação sobre isso nos seus documentos. Tente enviar um documento relacionado ou reformular a pergunta.",
      fontes: [],
      thread_id: input.threadId ?? "rag",
    };
  }

  // 3. Monta o contexto com os trechos recuperados.
  const contexto = trechos
    .map((t, i) => `[Fonte ${i + 1}: ${t.titulo}]\n${t.conteudo}`)
    .join("\n\n---\n\n");

  // 4. Pede para a Blua responder via /rag-answer (LLM puro, SEM triagem).
  //    Isto e consulta a base de conhecimento, nao atendimento de paciente.
  const resposta = await responderRag(input.pergunta, contexto);

  // 5. Devolve resposta + fontes (titulos unicos dos documentos usados).
  const fontes = [...new Set(trechos.map((t) => t.titulo))];
  return { resposta, fontes, thread_id: input.threadId ?? `rag-${input.ownerId.slice(0, 8)}` };
}
