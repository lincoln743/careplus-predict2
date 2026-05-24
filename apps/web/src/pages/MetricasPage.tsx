import { useEffect, useState } from "react";
import { listarPacientes, buscarSerie, type PacienteResumo } from "../api/client";
import { Card, StatCard, tituloPagina } from "../components/Card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

export function MetricasPage() {
  const [pacientes, setPacientes] = useState<PacienteResumo[]>([]);
  const [mediasPorPaciente, setMediasPorPaciente] = useState<{ nome: string; passos: number; risco: string }[]>([]);

  useEffect(() => {
    listarPacientes().then(async (r) => {
      setPacientes(r.pacientes);
      // Busca a media de passos (30d) de cada paciente para o grafico comparativo.
      const medias = await Promise.all(
        r.pacientes.map(async (p) => {
          try {
            const s = await buscarSerie(p.chave, "30d");
            return { nome: p.nome.split(" ")[0], passos: s.resumo.passos_media, risco: p.perfil_risco };
          } catch {
            return { nome: p.nome.split(" ")[0], passos: 0, risco: p.perfil_risco };
          }
        }),
      );
      setMediasPorPaciente(medias);
    }).catch(() => {});
  }, []);

  const corRisco = (r: string) => r === "saudavel" ? "var(--success)" : r === "risco_medio" ? "var(--warning)" : "var(--danger)";

  return (
    <div className="fade-in">
      {tituloPagina("Métricas", "Indicadores agregados da sua base de pacientes.")}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard rotulo="Total pacientes" valor={pacientes.length} />
        <StatCard rotulo="Consultas (mês)" valor={36} emBreve />
        <StatCard rotulo="Alertas" valor={8} cor="var(--warning)" emBreve />
        <StatCard rotulo="Tempo resposta" valor="1.8" sufixo="h" emBreve />
      </div>

      <Card style={{ padding: 24 }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, marginBottom: 18 }}>
          Passos médios por paciente · 30 dias
        </h3>
        {mediasPorPaciente.length === 0 ? (
          <div style={{ color: "var(--text-muted)", padding: 30, textAlign: "center" }}>Carregando métricas...</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mediasPorPaciente} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="nome" tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 13 }} cursor={{ fill: "var(--surface-alt)" }} />
              <Bar dataKey="passos" radius={[8, 8, 0, 0]}>
                {mediasPorPaciente.map((m, i) => <Cell key={i} fill={corRisco(m.risco)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}
