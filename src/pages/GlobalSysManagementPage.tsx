import { Database } from "@phosphor-icons/react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { GeneralManagementView } from "../churn/GeneralManagementView";
import { useChurnAnalysis } from "../churn/churnAnalysis";
import { selectGlobalSysAnalysis } from "../churn/globalSysPortfolio";

export function GlobalSysManagementPage() {
  const { account } = useAuth();
  const { analysis, loading, error } = useChurnAnalysis(account?.id);
  const selected = useMemo(() => analysis ? selectGlobalSysAnalysis(analysis) : null, [analysis]);

  if (loading) return <div className="general-empty-state"><Database size={36} /><h1>Carregando a base GlobalSys...</h1></div>;
  if (!selected) return <div className="general-empty-state"><Database size={36} /><h1>Cadastre a fonte GlobalSys para formar a fila de gestão.</h1><p>{error}</p><Link className="primary-button" to="/dados">Abrir fonte de dados</Link></div>;

  return <GeneralManagementView analysis={selected} />;
}
