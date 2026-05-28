import { useEffect, useState } from "react";
import { listarPrescricoes, revisarPrescricao, type Prescricao } from "../api/client";
import { Card, tituloPagina } from "../components/Card";

export function PrescricoesPage() {
  const [lista, setLista] = useState<Prescricao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [processando, setProcessando] = useState<string | null>(null);

  function carregar() {
    setCarregando(true);
    listarPrescricoes("pendente")
      .then((r) => setLista(r.prescricoes ?? []))
      .catch(() => setErro("Não foi possível carregar a fila de prescrições."))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, []);

  async function decidir(id: string, decisao: "aprovada" | "rejeitada") {
    setProcessando(id);
    try {
      await revisarPrescricao(id, decisao);
      setLista((l) => l.filter((p) => p.id !== id));
    } catch {
      alert("Erro ao revisar.");
    } finally {
      setProcessando(null);
    }
  }

  function resumoSugestao(s: Record<string, unknown>): string {
    if (!s) return "—";
    // tenta campos comuns; senao mostra JSON compacto
    const partes: string[] = [];
    for (const k of ["medicamento", "posologia", "duracao", "observacao", "texto", "resumo"]) {
      if (s[k]) partes.push(`${k}: ${s[k]}`);
    }
    return partes.length ? partes.join(" · ") : JSON.stringify(s);
  }

  return (
    <div className="fade-in">
      {tituloPagina("Fila de prescrições", "Sugestões da IA aguardando revisão médica (HITL).")}

      {carregando ? (
        <Card style={{ padding: 30, textAlign: "center", color: "var(--text-muted)" }}>Carregando...</Card>
      ) : erro ? (
        <Card style={{ padding: 30, textAlign: "center", color: "var(--text-muted)" }}>{erro}</Card>
      ) : lista.length === 0 ? (
        <Card style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
          Nenhuma prescrição pendente. Tudo revisado.
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {lista.map((p) => (
            <Card key={p.id} style={{ padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Paciente (pseudonimizado)</div>
                  <div style={{ fontWeight: 600, fontFamily: "monospace" }}>{p.paciente_bnf}</div>
                </div>
                <span style={{ fontSize: 12, color: "var(--warning)", background: "color-mix(in srgb, var(--warning) 12%, transparent)", padding: "4px 12px", borderRadius: 20, fontWeight: 600 }}>
                  {p.status}
                </span>
              </div>
              <div style={{ background: "var(--surface-alt)", borderRadius: "var(--radius-sm)", padding: 14, marginBottom: 14, fontSize: 14 }}>
                {resumoSugestao(p.sugestao)}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => decidir(p.id, "aprovada")} disabled={processando === p.id}
                  style={{ flex: 1, padding: "11px", borderRadius: "var(--radius-sm)", background: "var(--success)", color: "#fff", fontWeight: 600 }}>
                  Aprovar
                </button>
                <button onClick={() => decidir(p.id, "rejeitada")} disabled={processando === p.id}
                  style={{ flex: 1, padding: "11px", borderRadius: "var(--radius-sm)", background: "transparent", color: "var(--danger)", fontWeight: 600, border: "1px solid var(--danger)" }}>
                  Rejeitar
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
