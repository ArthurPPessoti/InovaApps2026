import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { useChurnAnalysis } from "./churn/churnAnalysis";
import { AppShell } from "./components/AppShell";
import { AccessPage } from "./pages/AccessPage";
import { ClientDetailPage } from "./pages/ClientDetailPage";
import { CompanyDetailPage } from "./pages/CompanyDetailPage";
import { ConnectionsPage } from "./pages/ConnectionsPage";
import { PredictionsPage } from "./pages/PredictionsPage";
import { ProductAnalyticsPage } from "./pages/ProductAnalyticsPage";
import { ProductTemporalAnalyticsPage } from "./pages/ProductTemporalAnalyticsPage";
import { SignalsPage } from "./pages/SignalsPage";
import { GeneralClientDetailPage, GeneralDashboardPage } from "./pages/GeneralExperience";
import { GlobalSysCancelledClientPage, GlobalSysClientsPage } from "./pages/GlobalSysClientsPage";
import { GlobalSysManagementPage } from "./pages/GlobalSysManagementPage";
import { SurveyPage } from "./pages/RetentionPages";
import { AdaptiveDataPage } from "./analysis/AdaptiveDataPage";
import { usePortfolio } from "./features/portfolio/PortfolioContext";

function ClientDetailRoute() {
  const { clienteId } = useParams();
  const { account } = useAuth();
  const { analysis, loading } = useChurnAnalysis(account?.id);
  const { getProduct, loading: portfolioLoading } = usePortfolio();
  const connectedProduct = clienteId ? getProduct(clienteId) : undefined;
  if (loading || analysis?.predictions.some((item) => item.subjectId === clienteId)) return <GeneralClientDetailPage />;
  if (portfolioLoading) return <GeneralClientDetailPage />;
  return connectedProduct?.source === "persisted" ? <ClientDetailPage /> : <GeneralClientDetailPage />;
}

function CompanyDetailRoute() {
  const { companyId } = useParams();
  const { getCompany, loading } = usePortfolio();
  if (loading) return <CompanyDetailPage />;
  return companyId && getCompany(companyId)?.source === "persisted"
    ? <CompanyDetailPage />
    : <Navigate to="/clientes" replace />;
}

function ProtectedApp() {
  const { account } = useAuth();
  if (!account) return <Navigate to="/acesso" replace />;

  const isTechnology = account.profile === "technology";

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<GeneralDashboardPage />} />
        <Route path="/clientes" element={<GlobalSysClientsPage />} />
        <Route path="/clientes/cancelados/:clienteId" element={<GlobalSysCancelledClientPage />} />
        <Route path="/clientes/:clienteId/analytics" element={isTechnology ? <ProductTemporalAnalyticsPage /> : <Navigate to="/dados" replace />} />
        <Route path="/clientes/:clienteId" element={<ClientDetailRoute />} />
        <Route path="/empresas/:companyId" element={<CompanyDetailRoute />} />
        <Route path="/previsoes" element={<PredictionsPage />} />
        <Route path="/gestao" element={<GlobalSysManagementPage />} />
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
