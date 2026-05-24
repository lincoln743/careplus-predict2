/**
 * Rotas do RAG do "IA do Medico". Todas exigem papel DOCTOR/ADMIN.
 * - POST   /rag/documents        : upload de PDF (multipart) ou texto (json)
 * - GET    /rag/documents        : lista os documentos do medico
 * - DELETE /rag/documents/:id    : remove um documento
 * - POST   /rag/query            : pergunta sobre a base curada
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { autenticar, exigirPapel } from "../auth/guards.js";
import * as rag from "./rag_service.js";

const textoSchema = z.object({
  titulo: z.string().min(1),
  texto: z.string().min(1),
});

const querySchema = z.object({
  pergunta: z.string().min(1),
  threadId: z.string().optional(),
});

const soMedico = { preHandler: [autenticar, exigirPapel("DOCTOR", "ADMIN")] };

export async function ragRoutes(fastify: FastifyInstance): Promise<void> {
  // Upload de documento. Aceita multipart (PDF) OU json (texto puro).
  fastify.post("/rag/documents", soMedico, async (req, reply) => {
    const ehMultipart = req.isMultipart?.();

    if (ehMultipart) {
      // PDF via multipart.
      const file = await (req as any).file();
      if (!file) return reply.code(400).send({ erro: "Arquivo nao enviado." });
      const buffer = await file.toBuffer();
      const nomeArquivo = file.filename ?? "documento.pdf";
      const titulo = (file.fields?.titulo?.value as string) || nomeArquivo.replace(/\.pdf$/i, "");
      const resultado = await rag.ingerirDocumento({
        ownerId: req.user!.id,
        titulo,
        nomeArquivo,
        tipo: "pdf",
        buffer,
      });
      return reply.code(201).send(resultado);
    }

    // Texto puro via json.
    const { titulo, texto } = textoSchema.parse(req.body);
    const resultado = await rag.ingerirDocumento({
      ownerId: req.user!.id,
      titulo,
      nomeArquivo: `${titulo}.txt`,
      tipo: "texto",
      texto,
    });
    return reply.code(201).send(resultado);
  });

  // Lista os documentos do medico.
  fastify.get("/rag/documents", soMedico, async (req) => {
    return { documentos: await rag.listarDocumentos(req.user!.id) };
  });

  // Remove um documento.
  fastify.delete("/rag/documents/:id", soMedico, async (req) => {
    const { id } = req.params as { id: string };
    return rag.removerDocumento(req.user!.id, id);
  });

  // Pergunta sobre a base curada.
  fastify.post("/rag/query", soMedico, async (req) => {
    const { pergunta, threadId } = querySchema.parse(req.body);
    return rag.perguntar({
      ownerId: req.user!.id,
      nome: req.user!.nome,
      pergunta,
      threadId,
    });
  });
}
