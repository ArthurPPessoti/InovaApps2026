import { ArrowRight, Brain, ChartLineUp, CheckCircle, CurrencyCircleDollar, Database, ShieldWarning, Target } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "../components/StatusUI";
import type { ChurnAnalysis, ChurnBand } from "./types";

const bandLabels: Record<ChurnBand, string> = { LOW: "Baixo", ATTENTION: "Atenção", HIGH: "Alto", CRITICAL: "Crítico" };
const bandColors: Record<ChurnBand, string> = { LOW: "#00f3ff", ATTENTION: "#ffba49", HIGH: "#ff6b78", CRITICAL: "#ff3355" };

function percentage(value: number | null) {
  return value == null ? "Indisponível" : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value * 100)}%`;
}

export function ChurnSummaryPanel({ analysis }: { analysis: ChurnAnalysis }) {
  return (
    <section className="churn-summary-panel" aria-label="Probabilidade real de churn">
      <div className="churn-summary-copy">
        <span className="eyebrow"><Brain size={16} weight="duotone" /> Análise preditiva ativa</span>
        <h2>Probabilidade de churn nos próximos {analysis.model.horizonDays} dias</h2>
        <p>Calculada com histórico de uso, atendimento, satisfação, relacionamento e financeiro. Cenários de recuperação continuam separados como simulação.</p>
      </div>
      <div className="churn-summary-numbers">
        <div><span>MRR esperado em risco</span><strong>{formatCurrency(analysis.summary.expectedMonthlyRevenueAtRisk)}</strong></div>
        <div><span>Risco alto ou crítico</span><strong>{analysis.summary.highOrCriticalEntities}</strong></div>
        <div><span>Qualidade temporal</span><strong>{percentage(analysis.model.test.prAuc)}</strong><small>PR-AUC</small></div>
      </div>
      <Link className="table-action" to="/previsoes">Abrir previsões <ArrowRight size={16} /></Link>
    </section>
  );
}

function ChurnTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><strong>{label}</strong>{payload.map((item) => <span key={item.name}><i style={{ backgroundColor: item.color }} />{item.name}: {item.name.includes("Taxa") || item.name.includes("Probabilidade") ? percentage(item.value) : item.value}</span>)}</div>;
}

export function ChurnPredictionsView({ analysis }: { analysis: ChurnAnalysis }) {
  const distribution = (Object.keys(analysis.summary.distribution) as ChurnBand[]).map((band) => ({ band, label: bandLabels[band], value: analysis.summary.distribution[band] }));
  const calibration = analysis.model.test.calibration.map((point) => ({ ...point, label: `${Math.round(point.meanProbability * 100)}% previsto` }));

  return (
    <div className="churn-predictions-view">
      <section className="model-provenance-strip">
        <div><CheckCircle size={19} weight="fill" /><span><strong>Resultado calculado</strong><small>{analysis.model.version} · regressão logística</small></span></div>
        <div><Database size={19} /><span><strong>{analysis.source.entities} clientes e {analysis.model.trainingSnapshots} observações</strong><small>{analysis.source.observedFrom} a {analysis.source.observedUntil}</small></span></div>
        <div><Target size={19} /><span><strong>Horizonte de {analysis.model.horizonDays} dias</strong><small>Base de referência em {analysis.predictionRun.asOfDate}</small></span></div>
        <span className="pilot-badge">Análise ativa</span>
      </section>

      <section className="metrics-grid" aria-label="Resumo do modelo de churn">
        <article className="metric-card metric-card--primary"><div className="metric-icon"><Database size={22} weight="duotone" /></div><span>Clientes analisados</span><strong>{analysis.summary.analyzedEntities}</strong><small>Ativos na data de referência</small></article>
        <article className="metric-card"><div className="metric-icon metric-icon--danger"><ShieldWarning size={22} weight="duotone" /></div><span>Risco alto ou crítico</span><strong>{analysis.summary.highOrCriticalEntities}</strong><small>Probabilidade igual ou superior a 25%</small></article>
        <article className="metric-card"><div className="metric-icon"><CurrencyCircleDollar size={22} weight="duotone" /></div><span>MRR esperado em risco</span><strong>{formatCurrency(analysis.summary.expectedMonthlyRevenueAtRisk)}</strong><small>Probabilidade × receita mensal</small></article>
        <article className="metric-card"><div className="metric-icon"><ChartLineUp size={22} weight="duotone" /></div><span>PR-AUC temporal</span><strong>{percentage(analysis.model.test.prAuc)}</strong><small>Teste fora da janela de treino</small></article>
      </section>

      <section className="churn-chart-grid">
        <article className="panel">
          <div className="panel-heading"><div><span>Distribuição calculada</span><h2>Carteira por probabilidade</h2><p>Faixas fixas e auditáveis para o horizonte de 90 dias.</p></div></div>
          <div className="churn-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={distribution}><CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#9aa7bd", fontSize: 11 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#9aa7bd", fontSize: 11 }} /><Tooltip content={<ChurnTooltip />} /><Bar dataKey="value" name="Clientes" radius={[8, 8, 2, 2]}>{distribution.map((item) => <Cell key={item.band} fill={bandColors[item.band]} />)}</Bar></BarChart></ResponsiveContainer></div>
        </article>
        <article className="panel">
          <div className="panel-heading"><div><span>Confiabilidade</span><h2>Previsto × observado</h2><p>Quanto mais próximas as linhas, melhor a calibração.</p></div></div>
          <div className="churn-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={calibration}><CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#9aa7bd", fontSize: 11 }} /><YAxis domain={[0, 0.5]} tickFormatter={(value) => `${Math.round(value * 100)}%`} axisLine={false} tickLine={false} tick={{ fill: "#9aa7bd", fontSize: 11 }} /><Tooltip content={<ChurnTooltip />} /><Line isAnimationActive={false} dataKey="meanProbability" name="Probabilidade" stroke="#00f3ff" strokeWidth={2.5} /><Line isAnimationActive={false} dataKey="observedRate" name="Taxa observada" stroke="#00ff91" strokeWidth={2.5} /></LineChart></ResponsiveContainer></div>
        </article>
      </section>

      <section className="panel clients-panel churn-ranking-panel">
        <div className="panel-heading"><div><span>Priorização calculada</span><h2>Maior receita esperada em risco</h2><p>Ordenação por probabilidade multiplicada pela receita mensal. Os identificadores vêm da base enviada.</p></div></div>
        <div className="table-scroll"><table className="clients-table churn-table"><thead><tr><th>Cliente</th><th>Segmento / plano</th><th>Probabilidade</th><th>Faixa</th><th>Receita mensal</th><th>MRR esperado em risco</th><th>Principais fatores</th><th>Ação</th></tr></thead><tbody>{analysis.predictions.slice(0, 12).map((prediction) => <tr key={prediction.subjectId}><td><strong>{prediction.subjectId}</strong><small>{Math.round(prediction.dataCoverage * 100)}% de cobertura</small></td><td><strong>{prediction.segment}</strong><small>{prediction.plan}</small></td><td><strong className="probability-value">{percentage(prediction.probability)}</strong></td><td><span className={`churn-band churn-band--${prediction.probabilityBand.toLowerCase()}`}>{bandLabels[prediction.probabilityBand]}</span></td><td>{formatCurrency(prediction.monthlyRevenue)}</td><td className="revenue-cell">{formatCurrency(prediction.expectedMonthlyRevenueAtRisk)}</td><td><ul className="factor-list">{prediction.topFactors.slice(0, 2).map((factor) => <li key={factor.feature} className={factor.direction === "increases_risk" ? "factor-risk" : "factor-protection"}>{factor.label}</li>)}</ul></td><td><Link className="table-action" to={`/clientes/${prediction.subjectId}`}>Entender <ArrowRight size={14} /></Link></td></tr>)}</tbody></table></div>
      </section>

      <section className="model-quality-grid">
        <article className="panel"><div className="panel-heading"><div><span>Validação temporal</span><h2>O que o teste mediu</h2></div></div><div className="model-metric-list"><div><span>ROC-AUC</span><strong>{percentage(analysis.model.test.rocAuc)}</strong></div><div><span>Precisão no Top 10</span><strong>{percentage(analysis.model.test.precisionAt10)}</strong></div><div><span>Recall no Top 10</span><strong>{percentage(analysis.model.test.recallAt10)}</strong></div><div><span>Receita capturada no Top 10</span><strong>{percentage(analysis.model.test.revenueCapturedAt10)}</strong></div></div></article>
        <article className="panel model-limitations"><div className="panel-heading"><div><span>Critérios de uso</span><h2>Como usar a previsão com segurança</h2></div></div><ul>{analysis.limitations.map((limitation) => <li key={limitation}><ShieldWarning size={16} />{limitation}</li>)}</ul><p>{analysis.readiness.reason}</p></article>
      </section>
    </div>
  );
}
