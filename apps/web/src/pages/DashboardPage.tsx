import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listarPacientes, type PacienteResumo } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Card, StatCard, tituloPagina, badgeRisco } from "../components/Card";

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pacientes, setPacientes] = useState<PacienteResumo[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    listarPacientes().then((r) => setPacientes(r.pacientes)).catch(() => {}).finally(() => setCarregando(false));
  }, []);

  const total = pacientes.length;
  const emRisco = pacientes.filter((p) => p.perfil_risco !== "saudavel").length;
  const passosMedio = total ? Math.round(pacientes.reduce((a, p) => a + (p.ultima?.passos ?? 0), 0) / total) : 0;

  return (
    <div className="fade-in">
      {tituloPagina(`Olá, ${user?.nome?.split(" ")[0] ?? "Doutor"}`, "Visão geral dos seus pacientes e indicadores.")}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        <StatCard rotulo="Pacientes" valor={total} />
        <StatCard rotulo="Em acompanhamento" valor={emRisco} cor="var(--warning)" />
        <StatCard rotulo="Passos (média)" valor={passosMedio.toLocaleString("pt-BR")} />
        <StatCard rotulo="Consultas (mês)" valor={36} emBreve />
      </div>

      <Card style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600 }}>Pacientes recentes</h2>
          <button onClick={() => navigate("/pacientes")} style={{ color: "var(--brand)", fontWeight: 600, fontSize: 14 }}>Ver todos →</button>
        </div>
        {carregando ? (
          <div style={{ color: "var(--text-muted)", padding: 20, textAlign: "center" }}>Carregando...</div>
        ) : pacientes.length === 0 ? (
          <div style={{ color: "var(--text-muted)", padding: 20, textAlign: "center" }}>Nenhum paciente. Verifique se o backend está no ar.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {pacientes.map((p) => (
              <div key={p.chave} onClick={() => navigate("/pacientes")} style={{
                display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", alignItems: "center",
                padding: "14px 12px", borderRadius: "var(--radius-sm)", cursor: "pointer",
              }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-alt)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--brand-light)", color: "var(--brand)", display: "grid", placeItems: "center", fontWeight: 600 }}>{p.nome.charAt(0)}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.nome}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.idade} anos</div>
                  </div>
                </div>
                <div>{badgeRisco(p.perfil_risco)}</div>
                <div style={{ fontSize: 13 }}>{p.ultima?.passos.toLocaleString("pt-BR") ?? "—"} <span style={{ color: "var(--text-muted)", fontSize: 11 }}>passos</span></div>
                <div style={{ fontSize: 13 }}>{p.ultima?.sono_horas ?? "—"}<span style={{ color: "var(--text-muted)", fontSize: 11 }}>h sono</span></div>
                <div style={{ fontSize: 13 }}>{p.ultima?.fc_media ?? "—"} <span style={{ color: "var(--text-muted)", fontSize: 11 }}>bpm</span></div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
