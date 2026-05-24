/**
 * Extracao de texto de PDF usando unpdf — lib ESM-first (sem as dores do
 * pdf-parse em modulos ESM). extractText devolve o texto por pagina.
 */
import { extractText, getDocumentProxy } from "unpdf";

export async function extrairTextoPdf(buffer: Buffer): Promise<string> {
  // unpdf trabalha com Uint8Array.
  const uint8 = new Uint8Array(buffer);
  const pdf = await getDocumentProxy(uint8);
  const { text } = await extractText(pdf, { mergePages: true });
  return (typeof text === "string" ? text : text.join("\n")).trim();
}

/**
 * Chunking: ~600 chars com 80 de overlap, cortando em quebras naturais.
 */
export function chunkar(texto: string, tamanho = 600, overlap = 80): string[] {
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
      const corte = corteParag > tamanho * 0.5 ? corteParag : cortePonto > tamanho * 0.5 ? cortePonto + 1 : -1;
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
