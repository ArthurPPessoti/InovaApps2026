import { CalendarBlank, ChartLineUp, CurrencyCircleDollar, MagicWand, ShieldWarning } from "@phosphor-icons/react";
import { useAuth } from "../auth/AuthContext";
import { PredictiveInsights } from "../components/PredictiveInsights";

export function PredictionsPage() {
  const { account } = useAuth();
  const profile = account?.profile ?? "general";

  return (
    <div className="predictions-page">
      <header className="page-heading predictions-page-heading">
        <div><span className="eyebrow"><MagicWand size={16} weight="fill" /> Evolução futura da carteira</span><h1>O que pode acontecer nos próximos 90 dias?</h1><p>Explore movimentos prováveis da carteira e identifique onde uma intervenção antecipada pode preservar valor.</p></div>
        <span className="forecast-confidence">Cenários demonstrativos · confiança média</span>
      </header>

      <section className="metrics-grid" aria-label="Resumo das previsões">
        <article className="metric-card metric-card--primary"><div className="metric-icon"><CalendarBlank size={22} weight="duotone" /></div><span>Horizonte analisado</span><strong>90 dias</strong><small>Janela operacional</small></article>
        <article className="metric-card"><div className="metric-icon"><ChartLineUp size={22} weight="duotone" /></div><span>Produtos migrando</span><strong>7</strong><small>Podem deixar a faixa saudável</small></article>
        <article className="metric-card"><div className="metric-icon metric-icon--danger"><ShieldWarning size={22} weight="duotone" /></div><span>Novos riscos altos</span><strong>+3</strong><small>Cenário sem intervenção</small></article>
        <article className="metric-card"><div className="metric-icon"><CurrencyCircleDollar size={22} weight="duotone" /></div><span>Amplitude financeira</span><strong>R$ 342 mil</strong><small>Diferença entre cenários em 180 dias</small></article>
      </section>

      <PredictiveInsights profile={profile} mode="details" />

      <footer className="prediction-disclaimer"><ShieldWarning size={18} /><span><strong>Como interpretar:</strong> direção e intensidade são demonstrativas. Nenhuma probabilidade ou data de cancelamento foi calculada por um modelo real.</span></footer>
    </div>
  );
}
