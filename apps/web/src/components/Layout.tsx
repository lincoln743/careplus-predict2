import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTema } from "../context/ThemeContext";

const NAV = [
  { to: "/", rotulo: "Visão Geral", icone: "M3 12l9-9 9 9M5 10v10h14V10" },
  { to: "/pacientes", rotulo: "Pacientes", icone: "M17 20v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M12 7a3 3 0 100-6 3 3 0 000 6z" },
  { to: "/metricas", rotulo: "Métricas", icone: "M4 19V5M4 19h16M8 15l3-3 3 2 4-5" },
  { to: "/prescricoes", rotulo: "Prescrições", icone: "M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V18a2 2 0 01-2 2z" },
  { to: "/ia-medico", rotulo: "IA do Médico", icone: "M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H6a2 2 0 01-2-2v-1H3a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, sair } = useAuth();
  const { tema, alternar } = useTema();
  const navigate = useNavigate();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside style={{
        width: 248, background: "var(--surface)", borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh",
      }}>
        <div style={{ padding: "26px 24px 20px" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "var(--brand)" }}>
            CarePlus
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 2 }}>
            Predict · Painel Médico
          </div>
        </div>
        <nav style={{ flex: 1, padding: "8px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === "/"}
              style={({ isActive }) => ({
                display: "flex", alignItems: "center", gap: 12, padding: "11px 14px",
                borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 500,
                color: isActive ? "var(--brand)" : "var(--text-muted)",
                background: isActive ? "var(--brand-light)" : "transparent",
              })}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={n.icone} /></svg>
              {n.rotulo}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: 14, borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px 10px" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--brand)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 600 }}>
              {user?.nome?.charAt(0) ?? "M"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.nome}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{user?.role === "DOCTOR" ? "Médico" : user?.role}</div>
            </div>
          </div>
          <button onClick={alternar}
            style={{ width: "100%", marginTop: 6, padding: "9px", borderRadius: "var(--radius-sm)", color: "var(--text-muted)", fontSize: 13, fontWeight: 500, background: "var(--surface-alt)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {tema === "light" ? "🌙  Modo escuro" : "☀️  Modo claro"}
          </button>
          <button onClick={() => { sair(); navigate("/login"); }}
            style={{ width: "100%", marginTop: 6, padding: "9px", borderRadius: "var(--radius-sm)", color: "var(--danger)", fontSize: 13, fontWeight: 500, background: "transparent" }}>
            Sair
          </button>
        </div>
      </aside>

      {/* Conteudo */}
      <main style={{ flex: 1, padding: "32px 40px", maxWidth: 1200, width: "100%" }}>
        {children}
      </main>
    </div>
  );
}
