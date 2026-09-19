import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { AppShell } from "./components/AppShell";
import { AccessPage } from "./pages/AccessPage";
import { ClientDetailPage } from "./pages/ClientDetailPage";
import { ConnectionsPage } from "./pages/ConnectionsPage";
import { CompanyDetailPage } from "./pages/CompanyDetailPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ManagementPage } from "./pages/ManagementPage";
import { PredictionsPage } from "./pages/PredictionsPage";
import { ProductAnalyticsPage } from "./pages/ProductAnalyticsPage";
import { SignalsPage } from "./pages/SignalsPage";
import { DataPage, GeneralClientDetailPage, GeneralDashboardPage } from "./pages/GeneralExperience";
import { CancelledClientDetailPage, ClientsPage, SurveyPage } from "./pages/RetentionPages";

function ProtectedApp() {
  const { account } = useAuth();
  if (!account) return <Navigate to="/acesso" replace />;

  const isTechnology = account.profile === "technology";

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={isTechnology ? <DashboardPage /> : <GeneralDashboardPage />} />
        <Route path="/clientes" element={<ClientsPage />} />
        <Route path="/clientes/cancelados/:clienteId" element={<CancelledClientDetailPage />} />
        <Route path="/clientes/:clienteId" element={isTechnology ? <ClientDetailPage /> : <GeneralClientDetailPage />} />
        <Route path="/empresas/:companyId" element={<CompanyDetailPage />} />
        <Route path="/previsoes" element={<PredictionsPage />} />
        <Route path="/gestao" element={<ManagementPage />} />
        <Route path="/sinais" element={isTechnology ? <SignalsPage /> : <Navigate to="/" replace />} />
        <Route path="/conexoes" element={isTechnology ? <ConnectionsPage /> : <Navigate to="/dados" replace />} />
        <Route path="/product-analytics" element={isTechnology ? <ProductAnalyticsPage /> : <Navigate to="/dados" replace />} />
        <Route path="/dados" element={isTechnology ? <Navigate to="/conexoes" replace /> : <DataPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  const { account } = useAuth();
  return (
    <Routes>
      <Route path="/acesso" element={account ? <Navigate to="/" replace /> : <AccessPage />} />
      <Route path="/pesquisa/:token" element={<SurveyPage />} />
      <Route path="/*" element={<ProtectedApp />} />
    </Routes>
  );
}
