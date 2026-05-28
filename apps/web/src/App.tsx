import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PacientesPage } from "./pages/PacientesPage";
import { MetricasPage } from "./pages/MetricasPage";
import { AnamnesePage } from "./pages/AnamnesePage";
import { PrescricoesPage } from "./pages/PrescricoesPage";
import { IAMedicoPage } from "./pages/IAMedicoPage";

function Protegida({ children }: { children: React.ReactNode }) {
  const { user, carregando } = useAuth();
  if (carregando) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function Rotas() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<Protegida><DashboardPage /></Protegida>} />
      <Route path="/pacientes" element={<Protegida><PacientesPage /></Protegida>} />
      <Route path="/metricas" element={<Protegida><MetricasPage /></Protegida>} />
      <Route path="/anamnese/:userId" element={<Protegida><AnamnesePage /></Protegida>} />
      <Route path="/prescricoes" element={<Protegida><PrescricoesPage /></Protegida>} />
      <Route path="/ia-medico" element={<Protegida><IAMedicoPage /></Protegida>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <Rotas />
    </AuthProvider>
  );
}
