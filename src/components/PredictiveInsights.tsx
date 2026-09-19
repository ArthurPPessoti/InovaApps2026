import { ChartLineUp, CurrencyCircleDollar, MagicWand, ShieldWarning, TrendDown } from "@phosphor-icons/react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { getCompany, portfolioProducts } from "../data/mockData";
import type { CompanyProfile } from "../types";
import { formatCurrency } from "./StatusUI";

const revenueForecast = [
  { month: "Mar", real: 2520, noAction: null, expected: null, withAction: null },
  { month: "Abr", real: 2580, noAction: null, expected: null, withAction: null },
  { month: "Mai", real: 2620, noAction: null, expected: null, withAction: null },
  { month: "Hoje", real: 2650, noAction: 2650, expected: 2650, withAction: 2650 },
  { month: "+30d", real: null, noAction: 2608, expected: 2631, withAction: 2645 },
  { month: "+60d", real: null, noAction: 2554, expected: 2602, withAction: 2648 },
  { month: "+90d", real: null, noAction: 2488, expected: 2569, withAction: 2656 },
  { month: "+120d", real: null, noAction: 2421, expected: 2537, withAction: 2668 },
  { month: "+180d", real: null, noAction: 2342, expected: 2498, withAction: 2684 },
];

const transitionForecast = [
  { period: "Hoje", healthy: 50, attention: 4, high: 4 },
  { period: "Em 90 dias", healthy: 43, attention: 8, high: 7 },
];

const riskTrajectories = [
  { period: "Hoje", pesagem: 88, suporte: 85, analytics: 22, rpa: 64 },
  { period: "+30d", pesagem: 92, suporte: 88, analytics: 21, rpa: 68 },
  { period: "+60d", pesagem: 95, suporte: 91, analytics: 20, rpa: 72 },
  { period: "+90d", pesagem: 97, suporte: 94, analytics: 19, rpa: 76 },
];

const featureForecast = [
  { name: "Pesagem · Atlas", current: 39, projected: 18 },
  { name: "Previsão · Vitta", current: 28, projected: 11 },
  { name: "ERP · Porto Sul", current: 42, projected: 25 },
  { name: "Dashboards · Varejo", current: 28, projected: 13 },
];

const riskValue = portfolioProducts.map((product) => ({
  name: product.productName,
  company: getCompany(product.companyId)?.name ?? product.companyId,
  risk: product.riskScore,
  impact: Math.round(product.monthlyRevenue * product.strategicCriticality / 1000),
  revenue: product.monthlyRevenue,
  level: product.riskLevel,
}));

function ForecastTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><strong>{label}</strong>{payload.map((item) => <span key={item.name}><i style={{ backgroundColor: item.color }} />{item.name}: R$ {item.value} mil</span>)}</div>;
}

function BubbleTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: (typeof riskValue)[number] }> }) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;
  return <div className="chart-tooltip"><strong>{item.name}</strong><span>{item.company}</span><span>Risco: {item.risk}</span><span>Impacto ponderado: {item.impact}</span><span>{formatCurrency(item.revenue)}/mês</span></div>;
}

const bubbleColor = { Alto: "#ff6b78", Médio: "#ffba49", Baixo: "#00f3ff" } as const;

export function PredictiveInsights({ profile, mode = "overview" }: { profile: CompanyProfile; mode?: "overview" | "details" }) {
  const [recoveryRate, setRecoveryRate] = useState(50);
  const savedRevenue = 74000 * recoveryRate / 100;
  const avoidedLosses = 4 * recoveryRate / 100;
  const projectedRisk = Math.round(61 - 14 * recoveryRate / 100);
  const trackedLabel = profile === "technology" ? "funcionalidades" : "indicadores da base";

  return (
    <section id={mode === "overview" ? "previsoes" : undefined} className={`predictive-section predictive-section--${mode}`} aria-label={mode === "details" ? "Análises preditivas detalhadas" : undefined} aria-labelledby={mode === "overview" ? "predictive-title" : undefined}>
      {mode === "overview" && <header className="section-heading predictive-heading">
        <div><span><MagicWand size={15} weight="fill" /> Cenários preditivos</span><h2 id="predictive-title">Se o comportamento continuar, o que pode acontecer?</h2></div>
        <p>Estimativas demonstrativas para apoiar decisões. Faixas futuras não representam probabilidades calculadas por um modelo real.</p>
      </header>}

      {mode === "overview" && <article className="panel forecast-revenue-panel">
        <div className="panel-heading"><div><span>Próximos seis meses</span><h2>Projeção da receita recorrente</h2><p>A distância entre os cenários representa até <strong>R$ 342 mil</strong> de receita mensal preservável no horizonte.</p></div><span className="forecast-confidence">Confiança demonstrativa · média</span></div>
        <div className="forecast-chart" aria-label="Receita recorrente real e projetada em três cenários">
          <ResponsiveContainer width="100%" height="100%"><AreaChart data={revenueForecast} margin={{ top: 18, right: 18, left: 0, bottom: 0 }}>
            <defs><linearGradient id="lossForecast" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ff6b78" stopOpacity={0.22} /><stop offset="95%" stopColor="#ff6b78" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#8593ae", fontSize: 11 }} /><YAxis width={70} domain={[2250, 2750]} axisLine={false} tickLine={false} tick={{ fill: "#8593ae", fontSize: 11 }} tickFormatter={(value) => `${(value / 1000).toFixed(2).replace(".", ",")} mi`} /><Tooltip content={<ForecastTooltip />} />
            <Area isAnimationActive={false} type="monotone" dataKey="noAction" name="Sem ação" stroke="#ff6b78" strokeDasharray="7 6" fill="url(#lossForecast)" strokeWidth={2.5} connectNulls />
            <Line isAnimationActive={false} type="monotone" dataKey="expected" name="Esperado" stroke="#ffba49" strokeDasharray="5 5" strokeWidth={2.5} dot={false} connectNulls />
            <Line isAnimationActive={false} type="monotone" dataKey="withAction" name="Com ação" stroke="#00ff91" strokeDasharray="7 5" strokeWidth={2.5} dot={false} connectNulls />
            <Line isAnimationActive={false} type="monotone" dataKey="real" name="Real" stroke="#00f3ff" strokeWidth={3} dot={{ r: 3, fill: "#00f3ff", strokeWidth: 0 }} connectNulls />
          </AreaChart></ResponsiveContainer>
        </div>
        <div className="forecast-legend"><span><i className="real" />Real</span><span><i className="no-action" />Sem ação</span><span><i className="expected" />Esperado</span><span><i className="with-action" />Com ação</span></div>
      </article>}

      <div id={mode === "overview" ? "matriz-preditiva" : undefined} className={`predictive-grid predictive-grid--${mode}`}>
        {mode === "overview" && <article className="panel risk-value-panel">
          <div className="panel-heading"><div><span>Decisão</span><h2>Risco × impacto financeiro</h2><p>O tamanho da bolha representa a receita do produto.</p></div></div>
          <div className="predictive-chart"><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 12, right: 18, bottom: 10, left: 0 }}><CartesianGrid stroke="rgba(255,255,255,.07)" /><XAxis type="number" dataKey="risk" name="Risco" domain={[0, 100]} tick={{ fill: "#8593ae", fontSize: 11 }} label={{ value: "Risco →", position: "insideBottomRight", fill: "#8593ae", offset: -4 }} /><YAxis type="number" dataKey="impact" name="Impacto" tick={{ fill: "#8593ae", fontSize: 11 }} label={{ value: "Impacto", angle: -90, position: "insideLeft", fill: "#8593ae" }} /><ZAxis type="number" dataKey="revenue" range={[90, 600]} /><Tooltip content={<BubbleTooltip />} /><Scatter data={riskValue}>{riskValue.map((item) => <Cell key={`${item.company}-${item.name}`} fill={bubbleColor[item.level]} fillOpacity={0.78} />)}</Scatter></ScatterChart></ResponsiveContainer></div>
        </article>}

        {mode === "details" && <article className="panel transition-panel">
          <div className="panel-heading"><div><span>Movimento da carteira</span><h2>Migração prevista em 90 dias</h2><p>Sete produtos podem deixar a faixa saudável sem intervenção.</p></div></div>
          <div className="predictive-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={transitionForecast} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}><CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} /><XAxis dataKey="period" tick={{ fill: "#b9b9b9", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#8593ae", fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: "rgba(255,255,255,.03)" }} /><Bar isAnimationActive={false} dataKey="healthy" name="Saudável" stackId="portfolio" fill="#00f3ff" radius={[0, 0, 6, 6]} /><Bar isAnimationActive={false} dataKey="attention" name="Atenção" stackId="portfolio" fill="#ffba49" /><Bar isAnimationActive={false} dataKey="high" name="Alto" stackId="portfolio" fill="#ff6b78" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
          <div className="migration-callout"><TrendDown size={18} /><span><strong>+3 produtos em risco alto</strong><small>cenário demonstrativo sem ação</small></span></div>
        </article>}

        {mode === "details" && <article className="panel trajectory-panel">
          <div className="panel-heading"><div><span>Trajetória</span><h2>Risco projetado por produto</h2><p>A direção da curva importa mais que uma data exata de saída.</p></div></div>
          <div className="predictive-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={riskTrajectories} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}><CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} /><XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: "#8593ae", fontSize: 11 }} /><YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: "#8593ae", fontSize: 11 }} /><Tooltip /><Line isAnimationActive={false} dataKey="pesagem" name="Pesagem · Atlas" stroke="#ff6b78" strokeWidth={3} /><Line isAnimationActive={false} dataKey="suporte" name="Suporte · Horizonte" stroke="#ff9f68" strokeWidth={2.5} /><Line isAnimationActive={false} dataKey="rpa" name="RPA · Prisma" stroke="#ffba49" strokeWidth={2.5} /><Line isAnimationActive={false} dataKey="analytics" name="Analytics · Atlas" stroke="#00f3ff" strokeWidth={2.5} /></LineChart></ResponsiveContainer></div>
        </article>}

        {mode === "details" && <article className="panel feature-forecast-panel">
          <div className="panel-heading"><div><span>Risco silencioso</span><h2>Queda prevista em {trackedLabel}</h2><p>Uso atual comparado ao cenário estimado para 30 dias.</p></div></div>
          <div className="predictive-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={featureForecast} layout="vertical" margin={{ top: 6, right: 10, left: 24, bottom: 0 }}><CartesianGrid stroke="rgba(255,255,255,.06)" horizontal={false} /><XAxis type="number" domain={[0, 100]} tick={{ fill: "#8593ae", fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="name" width={115} tick={{ fill: "#b9b9b9", fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: "rgba(255,255,255,.03)" }} /><Bar isAnimationActive={false} dataKey="current" name="Atual" fill="#0156fc" radius={[0, 6, 6, 0]} barSize={9} /><Bar isAnimationActive={false} dataKey="projected" name="Em 30 dias" fill="#ff6b78" radius={[0, 6, 6, 0]} barSize={9} /></BarChart></ResponsiveContainer></div>
        </article>}
      </div>

      {mode === "overview" && <article id="simulador" className="simulation-panel">
        <div className="simulation-copy"><span className="eyebrow"><ChartLineUp size={16} /> Simulador de intervenção</span><h2>E se recuperarmos {recoveryRate}% dos produtos em risco alto?</h2><p>Movimente o controle para comparar o impacto potencial de uma ação coordenada.</p><label htmlFor="recovery-rate">Taxa de recuperação simulada<strong>{recoveryRate}%</strong></label><input id="recovery-rate" type="range" min="0" max="100" step="10" value={recoveryRate} onChange={(event) => setRecoveryRate(Number(event.target.value))} /></div>
        <div className="simulation-results"><div><CurrencyCircleDollar size={21} /><small>Receita mensal preservada</small><strong>{formatCurrency(savedRevenue)}</strong></div><div><ShieldWarning size={21} /><small>Cancelamentos evitados</small><strong>{avoidedLosses.toFixed(1)}</strong></div><div><TrendDown size={21} /><small>Risco médio projetado</small><strong>{projectedRisk}</strong></div></div>
      </article>}
    </section>
  );
}
