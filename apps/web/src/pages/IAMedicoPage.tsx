import { useEffect, useState, useRef } from "react";
import {
  perguntarRag, listarRagDocs, uploadRagPdf, removerRagDoc,
  type RagDoc,
} from "../api/client";
import { Card, tituloPagina } from "../components/Card";

interface Msg { autor: "voce" | "ia"; texto: string; fontes?: string[]; }

export function IAMedicoPage() {
  const [docs, setDocs] = useState<RagDoc[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [pergunta, setPergunta] = useState("");
  const [pensando, setPensando] = useState(false);
  const [enviandoDoc, setEnviandoDoc] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  function carregarDocs() {
    listarRagDocs().then((r) => setDocs(r.documentos ?? [])).catch(() => {});
  }
  useEffect(carregarDocs, []);
  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function enviar() {
    const q = pergunta.trim();
    if (!q || pensando) return;
    setMsgs((m) => [...m, { autor: "voce", texto: q }]);
    setPergunta("");
    setPensando(true);
    try {
      const r = await perguntarRag(q);
      setMsgs((m) => [...m, { autor: "ia", texto: r.resposta, fontes: r.fontes }]);
    } catch {
      setMsgs((m) => [...m, { autor: "ia", texto: "Não consegui responder agora. Verifique se há documentos na base e tente novamente." }]);
    } finally {
      setPensando(false);
    }
  }

  async function subirPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setEnviandoDoc(true);
    try {
      await uploadRagPdf(f.name.replace(/\.pdf$/i, ""), f);
      carregarDocs();
    } catch {
      alert("Falha ao enviar o PDF.");
    } finally {
      setEnviandoDoc(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remover(id: string) {
    try { await removerRagDoc(id); setDocs((d) => d.filter((x) => x.id !== id)); } catch { /* ignore */ }
  }

  return (
    <div className="fade-in">
      {tituloPagina("IA do Médico", "Converse com a IA usando a base de documentos curada (RAG).")}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>
        {/* Chat */}
        <Card style={{ display: "flex", flexDirection: "column", height: 540, padding: 0, overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
            {msgs.length === 0 && (
              <div style={{ color: "var(--text-muted)", textAlign: "center", marginTop: 40, fontSize: 14 }}>
                Faça uma pergunta clínica. A IA responde com base nos documentos da sua base.
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} style={{ alignSelf: m.autor === "voce" ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                <div style={{
                  padding: "11px 15px", borderRadius: 14, fontSize: 14, lineHeight: 1.5,
                  background: m.autor === "voce" ? "var(--brand)" : "var(--surface-alt)",
                  color: m.autor === "voce" ? "#fff" : "var(--text)",
                }}>
                  {m.texto}
                </div>
                {m.fontes && m.fontes.length > 0 && (
                  <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
                    Fontes: {m.fontes.join(", ")}
                  </div>
                )}
              </div>
            ))}
            {pensando && <div style={{ alignSelf: "flex-start", color: "var(--text-muted)", fontSize: 14 }}>IA pensando…</div>}
            <div ref={fimRef} />
          </div>
          <div style={{ borderTop: "1px solid var(--border)", padding: 14, display: "flex", gap: 10 }}>
            <input
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && enviar()}
              placeholder="Pergunte algo clínico…"
              style={{ flex: 1, padding: "11px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 14, outline: "none" }}
            />
            <button onClick={enviar} disabled={pensando}
              style={{ padding: "0 20px", borderRadius: "var(--radius-sm)", background: "var(--brand)", color: "#fff", fontWeight: 600 }}>
              Enviar
            </button>
          </div>
        </Card>

        {/* Base de documentos */}
        <Card style={{ padding: 18, height: "fit-content" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Base de documentos</h3>
          <input ref={fileRef} type="file" accept="application/pdf" onChange={subirPdf} style={{ display: "none" }} />
          <button onClick={() => fileRef.current?.click()} disabled={enviandoDoc}
            style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", background: "var(--brand-light)", color: "var(--brand)", fontWeight: 600, fontSize: 13, marginBottom: 14 }}>
            {enviandoDoc ? "Enviando…" : "+ Enviar PDF"}
          </button>
          {docs.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: 12 }}>Nenhum documento ainda.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {docs.map((d) => (
                <div key={d.id} style={{ background: "var(--surface-alt)", borderRadius: "var(--radius-sm)", padding: "10px 12px", fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.titulo}</span>
                    <button onClick={() => remover(d.id)} style={{ color: "var(--danger)", fontSize: 12 }}>✕</button>
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>
                    {d.status} · {d.num_chunks} trechos
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
