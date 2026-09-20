import { ChartLineUp, MagicWand, ShieldWarning } from "@phosphor-icons/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ChurnPredictionsView } from "../churn/ChurnViews";
import { ConnectedPredictiveScenarios } from "../churn/ConnectedPredictiveScenarios";
import { useChurnAnalysis } from "../churn/churnAnalysis";

export function PredictionsPage() {
  const { account } = useAuth();
  const { analysis, loading, error } = useChurnAnalysis(account?.id);
  const [activeView, setActiveView] = useState<"calculated" | "movement">("calculated");

  return (
    <div className="predictions-page">
      <header className="page-heading predictions-page-heading">
        <div><span className="eyebrow"><MagicWand size={16} weight="fill" /> Probabilidade e cenários</span><h1>O que pode acontecer nos próximos 90 dias?</h1><p>Primeiro, veja a probabilidade calculada com dados históricos. Depois, explore cenários gerenciais simulados sem misturar os dois resultados.</p></div>
        <span className="forecast-confidence">Fonte ativa · horizonte de 90 dias</span>
      </header>

      {analysis && <nav className="management-view-switch" aria-label="Visão das previsões">
        <button type="button" className={activeView === "calculated" ? "is-active" : ""} aria-pressed={activeView === "calculated"} onClick={() => setActiveView("calculated")}>
          <span><ShieldWarning size={20} weight="duotone" /></span>
          <div><strong>Risco calculado</strong><small>Probabilidade, fatores e validação</small></div>
        </button>
        <button type="button" className={activeView === "movement" ? "is-active" : ""} aria-pressed={activeView === "movement"} onClick={() => setActiveView("movement")}>
          <span><ChartLineUp size={20} weight="duotone" /></span>
          <div><strong>Como o risco pode se mover</strong><small>Cenários e impacto de mudanças</small></div>
        </button>
      </nav>}

      {loading && <section className="panel churn-loading" role="status">Calculando a leitura mais recente do modelo...</section>}
      {error && <section className="panel churn-error" role="alert"><ShieldWarning size={20} />{error}</section>}
      {analysis && (activeView === "calculated" ? <ChurnPredictionsView analysis={analysis} /> : <ConnectedPredictiveScenarios analysis={analysis} mode="details" />)}
      {!loading && !analysis && <section className="panel prediction-source-empty"><ShieldWarning size={24} /><div><h2>Nenhuma fonte analisada nesta conta</h2><p>Cadastre uma planilha para que Previsões use os mesmos clientes do Dashboard e da área de Clientes.</p></div><Link className="primary-button" to="/dados">Cadastrar planilha</Link></section>}

      {analysis && <footer className="prediction-disclaimer"><ShieldWarning size={18} /><span><strong>Como interpretar:</strong> {activeView === "calculated" ? "a probabilidade indica chance de cancelamento no horizonte analisado. Abra um cliente para ver fatores e valores observados." : "os cenários mostram movimentos possíveis sob hipóteses explícitas; não substituem a probabilidade calculada."}</span></footer>}
    </div>
  );
}
