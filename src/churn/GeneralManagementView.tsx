import { ArrowRight, Briefcase, CurrencyCircleDollar, Database, Lightbulb, ShieldWarning, TrendDown, UsersThree } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "../components/StatusUI";
import { churnBandLabel, isAttention, primaryRiskReason, segmentRisk } from "./analysisAdapters";
import type { ChurnAnalysis } from "./types";

export function GeneralManagementView({ analysis }: { analysis: ChurnAnalysis }) {
  const attention = analysis.predictions.filter(isAttention);
  const high = attention.filter((item) => item.probabilityBand === "HIGH" || item.probabilityBand === "CRITICAL");
  const exposedRevenue = attention.reduce((sum, item) => sum + item.monthlyRevenue, 0);
  const historicalLoss = analysis.historicalChurn.reduce((sum, item) => sum + item.monthlyRevenue, 0);
  const segments = segmentRisk(analysis).map((item) => ({ ...item, expectedRevenue: Math.round(item.expectedRevenue / 1000) }));
  const topClient = analysis.predictions[0];
  const topSegment = segments[0];

  return (
    <div className="management-page">
      <header className="page-heading management-heading"><div><span className="eyebrow"><Briefcase size={16} weight="duotone" /> Gestão da carteira</span><h1>Onde concentrar a atuação do time?</h1><p>Esta fila usa exatamente os mesmos clientes, probabilidades e valores do Dashboard e de Previsões.</p></div><div className="management-period"><small>Fonte ativa</small><strong>{analysis.source.fileName}</strong><span>Dados até {analysis.source.observedUntil}</span></div></header>

      <section className="management-metrics" aria-label="Indicadores de gestão">
        <article><span><UsersThree size={20} /></span><small>Clientes acompanhados</small><strong>{analysis.summary.analyzedEntities}</strong><p>Ativos na execução atual</p></article>
        <article><span><TrendDown size={20} /></span><small>Exigem atenção</small><strong>{attention.length}</strong><p>Probabilidade a partir de 10%</p></article>
        <article className="management-metric--warning"><span><ShieldWarning size={20} /></span><small>Risco alto ou crítico</small><strong>{high.length}</strong><p>A partir de 25%</p></article>
        <article><span><CurrencyCircleDollar size={20} /></span><small>Receita dos clientes em atenção</small><strong>{formatCurrency(exposedRevenue)}</strong><p>Receita total dos contratos afetados</p></article>
        <article className="management-metric--loss"><span><CurrencyCircleDollar size={20} /></span><small>MRR esperado em risco</small><strong>{formatCurrency(analysis.summary.expectedMonthlyRevenueAtRisk)}</strong><p>Probabilidade × receita</p></article>
        <article><span><Database size={20} /></span><small>Receita no histórico de cancelados</small><strong>{formatCurrency(historicalLoss)}</strong><p>{analysis.historicalChurn.length} cancelamentos na fonte</p></article>
      </section>

      <section className="management-insights" aria-label="Insights explicáveis">
        <div className="management-insights__heading"><Lightbulb size={22} weight="duotone" /><div><small>Leitura conectada à fonte</small><h2>O que merece atenção da gestão</h2></div></div>
        <div className="management-insights__rail">
          {topClient && <Link to={`/clientes/${topClient.subjectId}`}><strong>Maior impacto esperado</strong><p>{topClient.subjectId} concentra {formatCurrency(topClient.expectedMonthlyRevenueAtRisk)} de MRR esperado em risco.</p><span>Entender classificação <ArrowRight size={13} /></span></Link>}
          {topSegment && <a href="#segmentos-gestao"><strong>Segmento mais exposto</strong><p>{topSegment.segment} soma R$ {topSegment.expectedRevenue} mil de impacto esperado.</p><span>Comparar segmentos <ArrowRight size={13} /></span></a>}
          <Link to="/dados"><strong>Campos operacionais ausentes</strong><p>Responsável, prazo e renovação não existem na fonte atual e não são inventados.</p><span>Revisar fonte <ArrowRight size={13} /></span></Link>
        </div>
      </section>

      <section className="management-grid">
        <article id="segmentos-gestao" className="panel"><div className="panel-heading"><div><span>Concentração</span><h2>Impacto esperado por segmento</h2><p>MRR em risco, em milhares de reais.</p></div></div><div className="management-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={segments} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} /><XAxis dataKey="segment" tick={{ fill: "#b9b9b9", fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#8593ae", fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="expectedRevenue" name="MRR em risco" fill="#0156fc" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></article>
        <article className="panel"><div className="panel-heading"><div><span>Qualidade operacional</span><h2>O que a fonte permite gerir</h2></div></div><div className="data-contract-list"><div><strong>Disponível</strong><span>Cliente, segmento, plano, receita, uso, SLA, suporte, NPS, reuniões e financeiro.</span></div><div><strong>Não disponível</strong><span>Responsável pela conta, data de renovação, ação, prazo e resultado da intervenção.</span></div><div><strong>Próxima evolução</strong><span>Adicionar essas colunas ou integrar CRM para liberar delegação e funil de execução.</span></div></div></article>
      </section>

      <section className="panel clients-panel"><div className="panel-heading"><div><span>Fila de atuação</span><h2>Clientes ordenados pelo impacto financeiro esperado</h2><p>Sem metas ou prioridades paralelas: a mesma ordem é usada em toda a plataforma.</p></div></div><div className="table-scroll"><table className="clients-table churn-table"><thead><tr><th>Cliente</th><th>Segmento / plano</th><th>Classificação</th><th>Probabilidade</th><th>Receita</th><th>Impacto esperado</th><th>Explicação principal</th><th>Ação</th></tr></thead><tbody>{attention.map((item) => <tr key={item.subjectId}><td><strong>{item.subjectId}</strong></td><td><strong>{item.segment}</strong><small>{item.plan}</small></td><td><span className={`churn-band churn-band--${item.probabilityBand.toLowerCase()}`}>{churnBandLabel[item.probabilityBand]}</span></td><td>{(item.probability * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</td><td>{formatCurrency(item.monthlyRevenue)}</td><td className="revenue-cell">{formatCurrency(item.expectedMonthlyRevenueAtRisk)}</td><td className="signal-cell">{primaryRiskReason(item)}</td><td><Link className="table-action" to={`/clientes/${item.subjectId}`}>Entender <ArrowRight size={14} /></Link></td></tr>)}</tbody></table></div></section>
    </div>
  );
}
