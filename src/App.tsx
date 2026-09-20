import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { AppShell } from "./components/AppShell";
import { AccessPage } from "./pages/AccessPage";
import { ClientDetailPage } from "./pages/ClientDetailPage";
import { CompanyDetailPage } from "./pages/CompanyDetailPage";
import { ConnectionsPage } from "./pages/ConnectionsPage";
import { ManagementPage } from "./pages/ManagementPage";
import { PredictionsPage } from "./pages/PredictionsPage";
import { ProductAnalyticsPage } from "./pages/ProductAnalyticsPage";
import { ProductTemporalAnalyticsPage } from "./pages/ProductTemporalAnalyticsPage";
import { SignalsPage } from "./pages/SignalsPage";
import { GeneralDashboardPage } from "./pages/GeneralExperience";
import { CancelledClientDetailPage, ClientsPage, SurveyPage } from "./pages/RetentionPages";
import { AdaptiveClientDetailPage, AdaptiveClientsPage, AdaptiveDashboardPage, AdaptiveManagementPage, AdaptivePredictionsPage } from "./analysis/AdaptivePages";
import { AdaptiveDataPage } from "./analysis/AdaptiveDataPage";

function ProtectedApp() {
  const { account } = useAuth();
  if (!account) return <Navigate to="/acesso" replace />;

  const isTechnology = account.profile === "technology";

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={isTechnology ? <GeneralDashboardPage /> : <AdaptiveDashboardPage />} />
        <Route path="/clientes" element={isTechnology ? <ClientsPage /> : <AdaptiveClientsPage />} />
        <Route path="/clientes/cancelados/:clienteId" element={<CancelledClientDetailPage />} />
        <Route path="/clientes/:clienteId/analytics" element={isTechnology ? <ProductTemporalAnalyticsPage /> : <Navigate to="/dados" replace />} />
        <Route path="/clientes/:clienteId" element={isTechnology ? <ClientDetailPage /> : <AdaptiveClientDetailPage />} />
        <Route path="/empresas/:companyId" element={isTechnology ? <CompanyDetailPage /> : <Navigate to="/clientes" replace />} />
        <Route path="/previsoes" element={isTechnology ? <PredictionsPage /> : <AdaptivePredictionsPage />} />
        <Route path="/gestao" element={isTechnology ? <ManagementPage /> : <AdaptiveManagementPage />} />
        <Route path="/sinais" element={isTechnology ? <SignalsPage /> : <Navigate to="/" replace />} />
        <Route path="/conexoes" element={isTechnology ? <ConnectionsPage /> : <Navigate to="/dados" replace />} />
        <Route path="/product-analytics" element={isTechnology ? <ProductAnalyticsPage /> : <Navigate to="/dados" replace />} />
        <Route path="/dados" element={<AdaptiveDataPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

// Quem entra sem base importada começa na tela de dados; o resto vai direto ao painel.
function entryRoute(account: { profile: string; spreadsheet?: unknown }) {
  return account.profile === "general" && !account.spreadsheet ? "/dados" : "/";
}

export default function App() {
  const { account } = useAuth();
  return (
    <Routes>
      <Route path="/acesso" element={account ? <Navigate to={entryRoute(account)} replace /> : <AccessPage />} />
      <Route path="/pesquisa/:token" element={<SurveyPage />} />
      <Route path="/*" element={<ProtectedApp />} />
    </Routes>
  );
}
