import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { entrar } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("medico@careplus.com");
  const [senha, setSenha] = useState("senha123");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      await entrar(email, senha);
      navigate("/");
    } catch {
      setErro("E-mail ou senha inválidos.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      {/* Painel da marca */}
      <div style={{
        background: "linear-gradient(150deg, var(--brand) 0%, var(--brand-dark) 100%)",
        display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 64px", color: "#fff",
      }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 44, fontWeight: 600, lineHeight: 1.1 }}>
          CarePlus<br />Predict
        </div>
        <p style={{ marginTop: 20, fontSize: 16, opacity: 0.9, maxWidth: 380, lineHeight: 1.6 }}>
          Plataforma de saúde preditiva. Acompanhe seus pacientes, métricas e inteligência clínica num só lugar.
        </p>
        <div style={{ marginTop: 40, fontSize: 12, opacity: 0.7, letterSpacing: 1 }}>
          PAINEL MÉDICO · ACESSO RESTRITO
        </div>
      </div>

      {/* Formulario */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 72px" }} className="fade-in">
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600 }}>Bem-vindo de volta</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 6, marginBottom: 32 }}>Entre com suas credenciais médicas.</p>

        <form onSubmit={submeter} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>E-mail</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              style={inputStyle} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Senha</span>
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required
              style={inputStyle} />
          </label>
          {erro && <div style={{ color: "var(--danger)", fontSize: 13 }}>{erro}</div>}
          <button type="submit" disabled={carregando}
            style={{ marginTop: 8, padding: "13px", borderRadius: "var(--radius-sm)", background: "var(--brand)", color: "#fff", fontSize: 15, fontWeight: 600, opacity: carregando ? 0.7 : 1 }}>
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "12px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
  fontSize: 14, background: "var(--surface)", outline: "none",
};
