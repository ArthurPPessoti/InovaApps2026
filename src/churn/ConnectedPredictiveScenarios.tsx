import { ChartLineUp, CurrencyCircleDollar, MagicWand, ShieldWarning, TrendDown } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Line, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { formatCurrency } from "../components/StatusUI";
import type { ChurnAnalysis, ChurnBand } from "./types";

const colors: Record<ChurnBand, string> = { LOW: "#00f3ff", ATTENTION: "#ffba49", HIGH: "#ff6b78", CRITICAL: "#ff3355" };
const labels: Record<ChurnBand, string> = { LOW: "Baixo", ATTENTION: "Atenção", HIGH: "Alto", CRITICAL: "Crítico" };
const chartTooltipStyle = { background: "#061a35", border: "1px solid rgba(0,243,255,.24)", borderRadius: 12, color: "#fff", fontSize: 11 };
const legendStyle = { color: "#b9c4d8", fontSize: 11 };

function bandFor(probability: number): ChurnBand {
  if (probability >= .5) return "CRITICAL";
  if (probability >= .25) return "HIGH";
  if (probability >= .1) return "ATTENTION";
  return "LOW";
}

function moneyTooltip(value: number) {
  return formatCurrency(value);
}

export function ConnectedPredictiveScenarios({ analysis, mode }: { analysis: ChurnAnalysis; mode: "overview" | "details" }) {
  const [recoveryRate, setRecoveryRate] = useState(50);
  const expectedLoss = analysis.summary.expectedMonthlyRevenueAtRisk;
  const currentMrr = analysis.summary.totalMonthlyRevenue;
  const forecast = useMemo(() => Array.from({ length: 7 }, (_, index) => ({
    month: index === 0 ? "Atual" : `M+${index}`,
    real: index === 0 ? currentMrr : undefined,
    noAction: Math.round(currentMrr - expectedLoss * index / 6),
    expected: Math.round(currentMrr - expectedLoss * .55 * index / 6),
    withAction: Math.round(currentMrr - expectedLoss * (1 - recoveryRate / 100) * index / 6),
  })), [currentMrr, expectedLoss, recoveryRate]);
  const scatter = analysis.predictions.slice(0, 20).map((item) => ({ id: item.subjectId, risk: Math.round(item.probability * 1000) / 10, revenue: item.monthlyRevenue, impact: item.expectedMonthlyRevenueAtRisk, band: item.probabilityBand }));
  const migration = (Object.keys(labels) as ChurnBand[]).map((band) => ({
    band: labels[band],
    atual: analysis.predictions.filter((item) => item.probabilityBand === band).length,
    estresse: analysis.predictions.filter((item) => bandFor(Math.min(.99, item.probability * 1.25)) === band).length,
  }));
  const drivers = useMemo(() => {
    const grouped = new Map<string, { label: string; cases: number; impact: number }>();
    analysis.predictions.forEach((entity) => entity.topFactors.filter((factor) => factor.direction === "increases_risk").slice(0, 3).forEach((factor) => {
      const current = grouped.get(factor.feature) ?? { label: factor.label, cases: 0, impact: 0 };
      current.cases += 1;
      current.impact += entity.expectedMonthlyRevenueAtRisk;
      grouped.set(factor.feature, current);
    }));
    return [...grouped.values()].sort((a, b) => b.impact - a.impact).slice(0, 8).map((item) => ({ ...item, impact: Math.round(item.impact / 1000) }));
  }, [analysis]);
  const deterioration = analysis.predictions.map((item) => ({ id: item.subjectId, uso: item.evidence.usage.change3m, sla: item.evidence.service.slaChange3m, risk: item.probability })).filter((item) => item.uso != null || item.sla != null).sort((a, b) => (a.uso ?? 0) - (b.uso ?? 0)).slice(0, 10);
  const saved = expectedLoss * recoveryRate / 100;
  const avoided = analysis.summary.highOrCriticalEntities * recoveryRate / 100;

  return <section className={`connected-predictive connected-predictive--${mode}`}>
    <header className="section-heading predictive-heading"><div><span><MagicWand size={15} weight="fill" /> Cenários conectados à execução</span><h2>{mode === "overview" ? "O que muda se o time agir agora?" : "Como o risco pode se mover?"}</h2></div><p>As probabilidades vêm do modelo real. As linhas futuras são simulações gerenciais e não uma segunda probabilidade.</p></header>
    {mode === "overview" && <div className="predictive-grid"><article className="panel forecast-revenue-panel"><div className="panel-heading"><div><span>Receita da fonte ativa</span><h2>Projeção de MRR por cenário</h2><p>Parte de {formatCurrency(currentMrr)} e aplica o impacto esperado calculado de {formatCurrency(expectedLoss)}.</p></div><span className="forecast-confidence">Simulação sobre previsão real</span></div><div className="forecast-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={forecast}><defs><linearGradient id="connectedLoss" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ff6b78" stopOpacity={.22}/><stop offset="95%" stopColor="#ff6b78" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false}/><XAxis dataKey="month" tick={{ fill: "#8593ae", fontSize: 11 }}/><YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} tick={{ fill: "#8593ae", fontSize: 10 }}/><Tooltip formatter={(value) => moneyTooltip(Number(value))}/><Area dataKey="noAction" name="Sem ação" stroke="#ff6b78" fill="url(#connectedLoss)"/><Line dataKey="expected" name="Esperado" stroke="#ffba49" strokeDasharray="5 5"/><Line dataKey="withAction" name="Com ação" stroke="#00ff91" strokeWidth={2.5}/></AreaChart></ResponsiveContainer></div></article><article className="panel risk-value-panel"><div className="panel-heading"><div><span>Decisão</span><h2>Probabilidade × receita</h2><p>Cada ponto é um cliente real; o tamanho representa impacto esperado.</p></div></div><div className="predictive-chart"><ResponsiveContainer width="100%" height="100%"><ScatterChart><CartesianGrid stroke="rgba(255,255,255,.07)"/><XAxis type="number" dataKey="risk" name="Probabilidade" unit="%" tick={{ fill: "#8593ae", fontSize: 10 }}/><YAxis type="number" dataKey="revenue" name="Receita" tickFormatter={(value) => `${Math.round(value / 1000)}k`} tick={{ fill: "#8593ae", fontSize: 10 }}/><ZAxis type="number" dataKey="impact" range={[80, 500]}/><Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(value, name) => name === "Receita" ? moneyTooltip(Number(value)) : `${value}%`}/><Scatter data={scatter}>{scatter.map((item) => <Cell key={item.id} fill={colors[item.band]}/>)}</Scatter></ScatterChart></ResponsiveContainer></div></article></div>}
    {mode === "details" && <div className="predictive-grid predictive-grid--details">
      <article className="panel scenario-chart-card">
        <div className="panel-heading"><div><span>Cenário de estresse</span><h2>Migração possível entre faixas</h2><p>Compara a classificação atual com um aumento simulado de 25% nas probabilidades.</p></div></div>
        <div className="predictive-chart" role="img" aria-label="Comparação da quantidade atual de clientes por faixa de risco com o cenário de estresse">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart accessibilityLayer data={migration} margin={{ top: 34, right: 16, left: -8, bottom: 4 }} barGap={6}>
              <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false}/>
              <XAxis dataKey="band" axisLine={false} tickLine={false} tick={{ fill: "#aab7cc", fontSize: 11 }}/>
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#8593ae", fontSize: 10 }}/>
              <Tooltip contentStyle={chartTooltipStyle} labelStyle={{ color: "#fff", fontWeight: 700 }} cursor={{ fill: "rgba(255,255,255,.035)" }}/>
              <Legend verticalAlign="top" align="right" height={28} iconType="circle" iconSize={8} wrapperStyle={legendStyle}/>
              <Bar dataKey="atual" name="Atual" fill="#0156fc" radius={[6,6,0,0]} maxBarSize={38}><LabelList dataKey="atual" position="top" fill="#dbe7f8" fontSize={10}/></Bar>
              <Bar dataKey="estresse" name="Cenário de estresse" fill="#ff6b78" radius={[6,6,0,0]} maxBarSize={38}><LabelList dataKey="estresse" position="top" fill="#dbe7f8" fontSize={10}/></Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="panel scenario-chart-card">
        <div className="panel-heading"><div><span>Vetores do risco</span><h2>Fatores com maior impacto financeiro</h2><p>Soma do impacto esperado dos clientes em que cada fator apareceu.</p></div></div>
        <div className="predictive-chart predictive-chart--drivers" role="img" aria-label="Ranking dos fatores de risco por impacto financeiro esperado">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart accessibilityLayer data={drivers} layout="vertical" margin={{ top: 10, right: 66, left: 12, bottom: 6 }}>
              <CartesianGrid stroke="rgba(255,255,255,.06)" horizontal={false}/>
              <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(value) => `${value} mil`} tick={{ fill: "#8593ae", fontSize: 10 }}/>
              <YAxis type="category" dataKey="label" width={158} axisLine={false} tickLine={false} tick={{ fill: "#c4ccda", fontSize: 10 }}/>
              <Tooltip contentStyle={chartTooltipStyle} labelStyle={{ color: "#fff", fontWeight: 700 }} cursor={{ fill: "rgba(255,255,255,.035)" }} formatter={(value) => [`R$ ${value} mil`, "Impacto esperado"]}/>
              <Bar dataKey="impact" name="Impacto esperado" fill="#ffba49" radius={[0,6,6,0]} maxBarSize={18}>
                <LabelList dataKey="impact" position="right" fill="#ffd98a" fontSize={10} formatter={(value) => `R$ ${value} mil`}/>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="panel panel--wide scenario-chart-card">
        <div className="panel-heading"><div><span>Evidência anterior à projeção</span><h2>Clientes com maior deterioração observada</h2><p>Variações reais em uso e SLA nos três meses anteriores à data de referência.</p></div></div>
        <div className="predictive-chart predictive-chart--deterioration" role="img" aria-label="Variação de uso e SLA por cliente nos últimos três meses">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart accessibilityLayer data={deterioration} margin={{ top: 34, right: 18, left: 4, bottom: 4 }} barGap={4}>
              <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false}/>
              <ReferenceLine y={0} stroke="rgba(255,255,255,.34)"/>
              <XAxis dataKey="id" axisLine={false} tickLine={false} interval={0} tick={{ fill: "#aab7cc", fontSize: 10 }}/>
              <YAxis width={48} axisLine={false} tickLine={false} tickFormatter={(value) => `${value} p.p.`} tick={{ fill: "#8593ae", fontSize: 10 }}/>
              <Tooltip contentStyle={chartTooltipStyle} labelStyle={{ color: "#fff", fontWeight: 700 }} cursor={{ fill: "rgba(255,255,255,.035)" }} formatter={(value, name) => [`${Number(value) > 0 ? "+" : ""}${value} p.p.`, name]}/>
              <Legend verticalAlign="top" align="right" height={28} iconType="circle" iconSize={8} wrapperStyle={legendStyle}/>
              <Bar dataKey="uso" name="Variação de uso" fill="#ff6b78" radius={[4,4,0,0]} maxBarSize={28}/>
              <Bar dataKey="sla" name="Variação de SLA" fill="#00f3ff" radius={[4,4,0,0]} maxBarSize={28}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </div>}
    <article className="simulation-panel"><div className="simulation-copy"><span className="eyebrow"><ChartLineUp size={16}/> Simulador</span><h2>E se recuperarmos {recoveryRate}% do impacto esperado?</h2><p>O controle aplica uma hipótese de recuperação ao valor calculado pelo modelo, sem alterar a probabilidade original.</p><label htmlFor={`connected-recovery-${mode}`}>Taxa de recuperação<strong>{recoveryRate}%</strong></label><input id={`connected-recovery-${mode}`} type="range" min="0" max="100" step="10" value={recoveryRate} onChange={(event) => setRecoveryRate(Number(event.target.value))}/></div><div className="simulation-results"><div><CurrencyCircleDollar size={21}/><small>MRR potencialmente preservado</small><strong>{formatCurrency(saved)}</strong></div><div><ShieldWarning size={21}/><small>Casos altos equivalentes</small><strong>{avoided.toFixed(1)}</strong></div><div><TrendDown size={21}/><small>Impacto residual</small><strong>{formatCurrency(expectedLoss - saved)}</strong></div></div></article>
    {mode === "details" && <div className="scenario-links"><Link className="secondary-button" to="/gestao">Transformar em ações</Link><Link className="secondary-button" to="/clientes">Abrir clientes</Link></div>}
  </section>;
}
