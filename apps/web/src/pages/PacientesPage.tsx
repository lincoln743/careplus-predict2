import { useEffect, useState } from "react";
import { listarPacientesFull, buscarSerie, buscarAnamneseSchema, buscarAnamneseDe, type PacienteResumoFull, type SerieSaude } from "../api/client";
import { gerarRelatorioPDF } from "../lib/gerarRelatorio";
import { useNavigate } from "react-router-dom";
import { Card, tituloPagina, badgeRisco } from "../components/Card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function PacientesPage() {
  const navigate = useNavigate();
  const [pacientes, setPacientes] = useState<PacienteResumoFull[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [serie, setSerie] = useState<SerieSaude | null>(null);
  const [periodo, setPeriodo] = useState("30d");
  const [gerandoPdf, setGerandoPdf] = useState(false);

  useEffect(() => {
    listarPacientesFull().then((r) => {
      setPacientes(r.pacientes);
      if (r.pacientes[0]) setSel(r.pacientes[0].chave);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (sel) buscarSerie(sel, periodo).then(setSerie).catch(() => setSerie(null));
  }, [sel, periodo]);

  const pacienteSel = pacientes.find((p) => p.chave === sel);

  async function gerarRelatorio() {
    if (!pacienteSel) return;
    setGerandoPdf(true);
    try {
      let anamneseSchema = null;
      let anamneseRespostas = null;
      // So pacientes reais tem anamnese vinculada (chave real:<userId>)
      if (pacienteSel.is_real && pacienteSel.chave.startsWith("real:")) {
        const userId = pacienteSel.chave.slice(5);
        try {
          const [sc, an] = await Promise.all([buscarAnamneseSchema(), buscarAnamneseDe(userId)]);
          anamneseSchema = sc;
          anamneseRespostas = an.anamnese?.respostas ?? null;
        } catch { /* sem anamnese, segue sem ela */ }
      }
      gerarRelatorioPDF({
        nome: pacienteSel.nome,
        origem: pacienteSel.origem,
        isReal: pacienteSel.is_real,
        serie,
        anamneseSchema,
        anamneseRespostas,
      });
    } finally {
      setGerandoPdf(false);
    }
  }

  return (
    <div className="fade-in">
      {tituloPagina("Pacientes", "Acompanhe a evolução de cada paciente.")}
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
        {/* Lista */}
        <Card style={{ padding: 10, height: "fit-content" }}>
          {pacientes.map((p) => (
            <div key={p.chave} onClick={() => setSel(p.chave)} style={{
              padding: "13px 14px", borderRadius: "var(--radius-sm)", cursor: "pointer",
              background: sel === p.chave ? "var(--brand-light)" : "transparent", marginBottom: 2,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: sel === p.chave ? "var(--brand)" : "var(--surface-alt)", color: sel === p.chave ? "#fff" : "var(--text)", display: "grid", placeItems: "center", fontWeight: 600 }}>{p.nome.charAt(0)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.nome}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.idade} anos</div>
                </div>
              </div>
            </div>
          ))}
        </Card>

        {/* Detalhe */}
        <div>
          {pacienteSel && (
            <>
              <Card style={{ padding: 24, marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600 }}>{pacienteSel.nome}</h2>
                      {pacienteSel.is_real && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--success)", background: "color-mix(in srgb, var(--success) 14%, transparent)", padding: "3px 9px", borderRadius: 20 }}>
                          REAL · {pacienteSel.origem ?? "wearable"}
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: 6, display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{pacienteSel.idade ? pacienteSel.idade + " anos" : "idade —"}</span>
                      {badgeRisco(pacienteSel.perfil_risco)}
                      {pacienteSel.is_real && pacienteSel.chave.startsWith("real:") && (
                        <button onClick={() => navigate(`/anamnese/${pacienteSel.chave.slice(5)}`)}
                          style={{ fontSize: 12, fontWeight: 600, color: "var(--brand)", background: "var(--brand-light)", padding: "4px 12px", borderRadius: 20 }}>
                          Ver anamnese →
                        </button>
                      )}
                      {serie?.is_simulated && <span style={{ fontSize: 11, color: "var(--text-muted)", border: "1px solid var(--border)", padding: "2px 8px", borderRadius: 20 }}>simulado</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {["7d", "30d", "90d"].map((p) => (
                      <button key={p} onClick={() => setPeriodo(p)} style={{
                        padding: "7px 13px", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600,
                        background: periodo === p ? "var(--brand)" : "var(--surface-alt)",
                        color: periodo === p ? "#fff" : "var(--text-muted)",
                      }}>{p}</button>
                    ))}
                    <button onClick={gerarRelatorio} disabled={gerandoPdf || !serie}
                      style={{
                        marginLeft: 8, padding: "7px 14px", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600,
                        background: "var(--success)", color: "#fff", display: "flex", alignItems: "center", gap: 6,
                        opacity: gerandoPdf || !serie ? 0.6 : 1,
                      }}>
                      {gerandoPdf ? "Gerando…" : "⬇ Relatório PDF"}
                    </button>
                  </div>
                </div>
                {serie && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginTop: 20 }}>
                    {[["Passos (média)", serie.resumo.passos_media.toLocaleString("pt-BR")], ["Sono (média)", serie.resumo.sono_media + "h"], ["FC (média)", serie.resumo.fc_media + " bpm"]].map(([r, v]) => (
                      <div key={r} style={{ background: "var(--surface-alt)", borderRadius: "var(--radius-sm)", padding: "14px 16px" }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>{r}</div>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, marginTop: 4 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {serie && serie.pontos.length > 0 && (
                <Card style={{ padding: 24 }}>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, marginBottom: 18 }}>Passos · últimos {serie.resumo.dias} dias</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={serie.pontos} margin={{ left: -10, right: 10 }}>
                      <defs>
                        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="data" tick={{ fontSize: 11, fill: "var(--text-muted)" }} tickFormatter={(d) => d.slice(5)} minTickGap={30} />
                      <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                      <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 13 }} />
                      <Area type="monotone" dataKey="passos" stroke="var(--brand)" strokeWidth={2.5} fill="url(#g)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
