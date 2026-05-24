export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)", boxShadow: "var(--shadow)", ...style }}>
      {children}
    </div>
  );
}

export function StatCard({ rotulo, valor, sufixo, cor, emBreve }: { rotulo: string; valor: string | number; sufixo?: string; cor?: string; emBreve?: boolean }) {
  return (
    <Card style={{ padding: "20px 22px", cursor: emBreve ? "pointer" : "default", position: "relative" }}>
      {emBreve && <span style={{ position: "absolute", top: 12, right: 12, fontSize: 9, color: "var(--text-muted)", border: "1px solid var(--border)", padding: "2px 6px", borderRadius: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>demo</span>}
      <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 500 }}>{rotulo}</div>
      <div style={{ marginTop: 8, fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 600, color: cor ?? "var(--text)" }}>
        {valor}{sufixo && <span style={{ fontSize: 15, color: "var(--text-muted)", fontWeight: 400, marginLeft: 4 }}>{sufixo}</span>}
      </div>
    </Card>
  );
}

export function tituloPagina(titulo: string, subtitulo: string) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 27, fontWeight: 600 }}>{titulo}</h1>
      <p style={{ color: "var(--text-muted)", marginTop: 4 }}>{subtitulo}</p>
    </div>
  );
}

export function badgeRisco(perfil: string) {
  const map: Record<string, [string, string]> = {
    saudavel: ["Saudável", "var(--success)"],
    risco_medio: ["Risco médio", "var(--warning)"],
    alto_risco: ["Alto risco", "var(--danger)"],
  };
  const [txt, cor] = map[perfil] ?? [perfil, "var(--text-muted)"];
  return <span style={{ fontSize: 12, fontWeight: 600, color: cor, background: `color-mix(in srgb, ${cor} 12%, transparent)`, padding: "3px 10px", borderRadius: 20 }}>{txt}</span>;
}
