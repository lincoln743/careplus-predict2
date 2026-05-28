import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { buscarAnamneseDe, buscarAnamneseSchema, type AnamneseSchema } from "../api/client";
import { Card, tituloPagina } from "../components/Card";

export function AnamnesePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [schema, setSchema] = useState<AnamneseSchema | null>(null);
  const [respostas, setRespostas] = useState<Record<string, unknown> | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!userId) return;
    Promise.all([buscarAnamneseSchema(), buscarAnamneseDe(userId)])
      .then(([sc, an]) => {
        setSchema(sc);
        setRespostas(an.anamnese?.respostas ?? null);
      })
      .catch(() => setErro("Não foi possível carregar a anamnese."))
      .finally(() => setCarregando(false));
  }, [userId]);

  function formatar(valor: unknown): string {
    if (valor === null || valor === undefined || valor === "") return "—";
    if (typeof valor === "boolean") return valor ? "Sim" : "Não";
    if (Array.isArray(valor)) return valor.length ? valor.join(", ") : "—";
    return String(valor);
  }

  return (
    <div className="fade-in">
      <button onClick={() => navigate(-1)} style={{ color: "var(--brand)", fontWeight: 600, fontSize: 14, marginBottom: 16 }}>
        ← Voltar
      </button>
      {tituloPagina("Anamnese do paciente", "Histórico clínico declarado pelo paciente.")}

      {carregando ? (
        <Card style={{ padding: 30, textAlign: "center", color: "var(--text-muted)" }}>Carregando...</Card>
      ) : erro ? (
        <Card style={{ padding: 30, textAlign: "center", color: "var(--danger)" }}>{erro}</Card>
      ) : !respostas ? (
        <Card style={{ padding: 30, textAlign: "center", color: "var(--text-muted)" }}>
          Este paciente ainda não preencheu a anamnese.
        </Card>
      ) : (
        schema?.secoes.map((secao) => (
          <Card key={secao.id} style={{ padding: 24, marginBottom: 16 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "var(--brand)", marginBottom: 16 }}>
              {secao.titulo}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {secao.campos.map((campo) => (
                <div key={campo.id} style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16, paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 14, color: "var(--text-muted)" }}>{campo.rotulo}</span>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{formatar(respostas[campo.id])}</span>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
