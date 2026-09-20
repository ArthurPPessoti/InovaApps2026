import { MagicWand, ShieldWarning } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ChurnPredictionsView } from "../churn/ChurnViews";
import { ConnectedPredictiveScenarios } from "../churn/ConnectedPredictiveScenarios";
import { useChurnAnalysis } from "../churn/churnAnalysis";

export function PredictionsPage() {
  const { account } = useAuth();
  const { analysis, loading, error } = useChurnAnalysis(account?.id);

  return (
    <div className="predictions-page">
      <header className="page-heading predictions-page-heading">
        <div><span className="eyebrow"><MagicWand size={16} weight="fill" /> Probabilidade e cenários</span><h1>O que pode acontecer nos próximos 90 dias?</h1><p>Primeiro, veja a probabilidade calculada com dados históricos. Depois, explore cenários gerenciais simulados sem misturar os dois resultados.</p></div>
        <span className="forecast-confidence">Fonte ativa · horizonte de 90 dias</span>
      </header>

      {loading && <section className="panel churn-loading" role="status">Calculando a leitura mais recente do modelo...</section>}
      {error && <section className="panel churn-error" role="alert"><ShieldWarning size={20} />{error}</section>}
      {analysis && <><ChurnPredictionsView analysis={analysis} /><ConnectedPredictiveScenarios analysis={analysis} mode="details" /></>}
      {!loading && !analysis && <section className="panel prediction-source-empty"><ShieldWarning size={24} /><div><h2>Nenhuma fonte analisada nesta conta</h2><p>Cadastre uma planilha para que Previsões use os mesmos clientes do Dashboard e da área de Clientes.</p></div><Link className="primary-button" to="/dados">Cadastrar planilha</Link></section>}

      {analysis && <footer className="prediction-disclaimer"><ShieldWarning size={18} /><span><strong>Como interpretar:</strong> a probabilidade indica chance de cancelamento no horizonte analisado. Abra um cliente para ver os fatores, os valores observados e a regra da classificação.</span></footer>}
    </div>
  );
}
