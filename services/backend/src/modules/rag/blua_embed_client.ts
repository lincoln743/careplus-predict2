/**
 * Cliente HTTP para o endpoint /api/v1/embed da BluaDiagnostics.
 * Reusa o modelo de embeddings da Blua (paraphrase-multilingual-MiniLM-L12-v2,
 * 384 dims). URL via env (BLUA_API_URL), NUNCA hardcode.
 */
import { env } from "../../infra/env.js";

interface EmbedResponse {
  embeddings: number[][];
  dim: number;
  modelo: string;
}

export async function gerarEmbeddings(textos: string[]): Promise<number[][]> {
  if (!env.BLUA_API_URL) {
    throw new Error("BLUA_API_URL nao configurada no ambiente");
  }
  if (textos.length === 0) return [];

  const timeout = env.BLUA_API_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const resp = await fetch(`${env.BLUA_API_URL}/api/v1/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ textos }),
      signal: controller.signal,
    });
    if (!resp.ok) {
      throw new Error(`Blua /embed retornou ${resp.status}`);
    }
    const data = (await resp.json()) as EmbedResponse;
    if (data.dim !== 384) {
      throw new Error(`Dimensao inesperada do embedding: ${data.dim} (esperado 384)`);
    }
    return data.embeddings;
  } finally {
    clearTimeout(timer);
  }
}

export async function gerarEmbedding(texto: string): Promise<number[]> {
  const [v] = await gerarEmbeddings([texto]);
  return v;
}


interface RagAnswerResponse {
  resposta: string;
}

/**
 * Chama o endpoint /rag-answer da Blua (LLM puro, sem triagem).
 * Responde a pergunta do medico com base no contexto, sem comportamento
 * de atendimento de paciente.
 */
export async function responderRag(pergunta: string, contexto: string): Promise<string> {
  if (!env.BLUA_API_URL) throw new Error("BLUA_API_URL nao configurada");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.BLUA_API_TIMEOUT_MS);
  try {
    const resp = await fetch(`${env.BLUA_API_URL}/api/v1/rag-answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pergunta, contexto }),
      signal: controller.signal,
    });
    if (!resp.ok) throw new Error(`Blua /rag-answer retornou ${resp.status}`);
    const data = (await resp.json()) as RagAnswerResponse;
    return data.resposta;
  } finally {
    clearTimeout(timer);
  }
}
