import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChartLineUp,
  CheckCircle,
  ClockCounterClockwise,
  Pulse,
  SpinnerGap,
  SquaresFour,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usePortfolio } from "../features/portfolio/PortfolioContext";
import { getTemporalProductAnalytics } from "../features/product-analytics/productAnalyticsApi";
import {
  ALL_FEATURES,
  buildFeatureChart,
  buildPeriodHighlights,
  getFeatureFilterMode,
  normalizeFeatureSelection,
  type PeriodHighlight,
} from "../features/product-analytics/temporalPresentation";
import type {
  AnalysisAvailabilityStatus,
  MetricComparison,
  TemporalAnalyticsPeriod,
  TemporalProductAnalytics,
} from "../features/product-analytics/types";
import "../features/product-analytics/product-analytics.css";

const periodOptions: Array<{ value: TemporalAnalyticsPeriod; label: string }> = [
  { value: "monthly", label: "Mensal" },
  { value: "quarterly", label: "Trimestral" },
  { value: "semiannual", label: "Semestral" },
  { value: "annual", label: "Anual" },
];

const featureLineColors = ["#00f3ff", "#4779ff", "#24ff9a", "#ffba49", "#b779ff", "#ff6b78", "#43b9ff", "#d4ff5f"];

function formatNumber(value: number, maximumFractionDigits = 2) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits });
}

function formatHistoryPoint(value: string, granularity: "daily" | "weekly" | "monthly") {
  const options: Intl.DateTimeFormatOptions = granularity === "monthly"
    ? { month: "short", year: "2-digit", timeZone: "America/Sao_Paulo" }
    : { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" };
  return new Intl.DateTimeFormat("pt-BR", options)
    .format(new Date(value))
    .replace(" de ", "/")
    .replace(".", "");
}

function formatDateTime(value: string | null) {
  if (!value) return "Ainda não registrado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

const availabilityCopy: Record<Exclude<AnalysisAvailabilityStatus, "ready">, { title: string; description: string }> = {
  no_connection: {
    title: "Telemetria não conectada",
    description: "Este produto ainda não possui uma aplicação vinculada. Conecte uma aplicação antes de analisar o uso.",
  },
  no_features: {
    title: "Configure funcionalidades monitoradas",
    description: "A conexão existe, mas ainda não há funcionalidades cadastradas para compor as métricas de produto.",
  },
  waiting_for_events: {
    title: "Coleta de dados iniciada",
    description: "As funcionalidades estão configuradas. Agora aguardamos o primeiro evento correspondente a uma delas.",
  },
  insufficient_history: {
    title: "Primeiro período de coleta",
    description: "A telemetria está funcionando e os eventos já estão sendo armazenados. A análise comparativa ainda não aparece porque este produto não possui um período anterior equivalente.",
  },
};

const comparisonReadinessCopy: Record<TemporalAnalyticsPeriod, string> = {
  monthly: "A visão mensal será liberada após a virada para um novo mês, desde que o mês anterior tenha eventos monitorados.",
  quarterly: "A visão trimestral será liberada quando existir uma janela anterior equivalente de três meses com eventos monitorados.",
  semiannual: "A visão semestral será liberada quando existir uma janela anterior equivalente de seis meses com eventos monitorados.",
  annual: "A visão anual será liberada quando existir uma janela anterior equivalente de 12 meses com eventos monitorados.",
};

const chartPeriodCopy: Record<TemporalAnalyticsPeriod, string> = {
  monthly: "Mês atual · séries diárias por funcionalidade",
  quarterly: "Janela trimestral atual · séries semanais por funcionalidade",
  semiannual: "Janela semestral atual · séries mensais por funcionalidade",
  annual: "Últimos 12 meses · séries mensais por funcionalidade",
};

function VariationText({ metric }: { metric: MetricComparison }) {
  if (metric.percentageChange === null) {
    return (
      <span className="temporal-variation temporal-variation--neutral">
        Δ {metric.absoluteChange > 0 ? "+" : ""}{formatNumber(metric.absoluteChange)} · Sem base anterior
      </span>
    );
  }
  const direction = metric.percentageChange > 0 ? "up" : metric.percentageChange < 0 ? "down" : "neutral";
  return (
    <span className={`temporal-variation temporal-variation--${direction}`}>
      {metric.percentageChange > 0 ? <ArrowUp size={13} /> : metric.percentageChange < 0 ? <ArrowDown size={13} /> : null}
      Δ {metric.absoluteChange > 0 ? "+" : ""}{formatNumber(metric.absoluteChange)}
      {" · "}{metric.percentageChange > 0 ? "+" : ""}{formatNumber(metric.percentageChange)}%
    </span>
  );
}

function ComparisonCard({
  icon,
  label,
  metric,
  decimal = false,
}: {
  icon: ReactNode;
  label: string;
  metric: MetricComparison;
  decimal?: boolean;
}) {
  return (
    <article className="temporal-metric-card">
      <span className="temporal-metric-icon">{icon}</span>
      <div className="temporal-metric-copy">
        <small>{label}</small>
        <strong>{formatNumber(metric.current, decimal ? 2 : 0)}</strong>
        <p>Anterior: {formatNumber(metric.previous, decimal ? 2 : 0)}</p>
      </div>
      <VariationText metric={metric} />
    </article>
  );
}

function AnalysisAvailability({ analytics }: { analytics: TemporalProductAnalytics }) {
  const availability = analytics.analysisAvailability;
  if (availability.status === "ready") return null;
  const copy = availabilityCopy[availability.status];

  return (
    <section className="temporal-availability" aria-live="polite">
      <span className="temporal-availability-icon"><ClockCounterClockwise size={30} /></span>
      <div className="temporal-availability-copy">
        <small>Disponibilidade da análise</small>
        <h2>{copy.title}</h2>
        <p>{copy.description}</p>
      </div>
      <dl className="temporal-availability-facts">
        <div><dt>Conexão</dt><dd>{availability.hasConnection ? "Ativa" : "Não configurada"}</dd></div>
        <div><dt>Funcionalidades monitoradas</dt><dd>{formatNumber(availability.monitoredFeatures, 0)}</dd></div>
        <div><dt>Eventos válidos acumulados</dt><dd>{formatNumber(availability.totalProductEvents, 0)}</dd></div>
        <div><dt>Eventos no período atual</dt><dd>{formatNumber(availability.currentPeriodEvents, 0)}</dd></div>
        <div><dt>Primeiro evento válido</dt><dd>{formatDateTime(availability.firstProductEventAt)}</dd></div>
        <div><dt>Último evento válido</dt><dd>{formatDateTime(availability.lastProductEventAt)}</dd></div>
      </dl>
      {availability.status === "insufficient_history" && (
        <div className="temporal-history-explainer">
          <div className="temporal-history-explainer-copy">
            <small>Por que os cards e gráficos ainda não aparecem?</small>
            <strong>Este é um estado esperado, não um erro da integração.</strong>
            <p>Cards, destaques, gráfico e tabela dependem da comparação entre dois períodos equivalentes. Enquanto existe somente o primeiro período, esses elementos ficam ocultos para não apresentar percentuais ou tendências sem uma base confiável.</p>
            <p>{comparisonReadinessCopy[analytics.period.key]}</p>
          </div>
          <div className="temporal-history-progress" aria-label="Progresso da preparação da análise">
            <span className="complete"><CheckCircle size={17} weight="fill" /> Coleta de eventos ativa</span>
            <span><ClockCounterClockwise size={17} /> Formando período de comparação</span>
          </div>
        </div>
      )}
    </section>
  );
}

function PeriodHighlights({ highlights }: { highlights: PeriodHighlight[] }) {
  if (highlights.length === 0) return null;
  return (
    <section className="temporal-highlights" aria-labelledby="temporal-highlights-title">
      <div className="temporal-section-heading">
        <span>Leitura descritiva dos eventos monitorados</span>
        <h2 id="temporal-highlights-title">Destaques do período</h2>
      </div>
      <div className="temporal-highlight-list">
        {highlights.map((highlight) => (
          <article className={`temporal-highlight temporal-highlight--${highlight.kind}`} key={highlight.eventName}>
            <span className="temporal-highlight-icon" aria-hidden="true">
              {highlight.kind === "decline" ? <ArrowDown size={18} /> : highlight.kind === "growth" ? <ArrowUp size={18} /> : <ArrowRight size={18} />}
            </span>
            <p>{highlight.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FeatureChartFilter({
  features,
  selectedFeature,
  onChange,
}: {
  features: TemporalProductAnalytics["features"];
  selectedFeature: string;
  onChange: (eventName: string) => void;
}) {
  if (getFeatureFilterMode(features.length) === "select") {
    return (
      <label className="temporal-feature-select">
        <span>Funcionalidade exibida</span>
        <select value={selectedFeature} onChange={(event) => onChange(event.target.value)}>
          <option value={ALL_FEATURES}>Todas</option>
          {features.map((feature) => <option key={feature.eventName} value={feature.eventName}>{feature.name}</option>)}
        </select>
      </label>
    );
  }

  return (
    <div className="temporal-feature-filter" role="group" aria-label="Filtrar gráfico por funcionalidade">
      <button type="button" aria-pressed={selectedFeature === ALL_FEATURES} className={selectedFeature === ALL_FEATURES ? "active" : ""} onClick={() => onChange(ALL_FEATURES)}>Todas</button>
      {features.map((feature) => (
        <button
          key={feature.eventName}
          type="button"
          aria-pressed={selectedFeature === feature.eventName}
          className={selectedFeature === feature.eventName ? "active" : ""}
          onClick={() => onChange(feature.eventName)}
        >
          {feature.name}
        </button>
      ))}
    </div>
  );
}

export function ProductTemporalAnalyticsPage() {
  const { clienteId = "" } = useParams();
  const { getProduct, loading: portfolioLoading } = usePortfolio();
  const product = getProduct(clienteId);
  const [period, setPeriod] = useState<TemporalAnalyticsPeriod>("monthly");
  const [analytics, setAnalytics] = useState<TemporalProductAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedFeature, setSelectedFeature] = useState(ALL_FEATURES);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void getTemporalProductAnalytics(clienteId, period)
      .then((result) => { if (active) setAnalytics(result); })
      .catch((loadError: unknown) => {
        if (active) {
          setAnalytics(null);
          setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar a análise temporal.");
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [clienteId, period]);

  useEffect(() => {
    setSelectedFeature(ALL_FEATURES);
  }, [clienteId]);

  useEffect(() => {
    if (!analytics) return;
    setSelectedFeature((current) => normalizeFeatureSelection(current, analytics.features));
  }, [analytics]);

  const highlights = useMemo(() => (
    analytics
      ? buildPeriodHighlights(analytics.features, analytics.analysisAvailability.status)
      : []
  ), [analytics]);
  const featureChart = useMemo(() => (
    analytics
      ? buildFeatureChart(analytics.featureHistory, analytics.features, selectedFeature)
      : { selection: ALL_FEATURES, features: [], granularity: "monthly" as const, data: [] }
  ), [analytics, selectedFeature]);

  if (portfolioLoading && !product) {
    return <div className="temporal-analytics-state"><SpinnerGap size={26} /> Carregando produto...</div>;
  }
  if (!product) {
    return (
      <div className="temporal-analytics-state">
        <WarningCircle size={35} />
        <h1>Produto não encontrado</h1>
        <Link to="/clientes">Voltar para Clientes</Link>
      </div>
    );
  }

  return (
    <div className="temporal-analytics-page">
      <Link className="back-link" to={`/clientes/${product.id}`}>
        <ArrowLeft size={18} /> Voltar para {product.productName}
      </Link>

      <header className="temporal-analytics-header">
        <div>
          <span className="product-analytics-eyebrow"><ChartLineUp size={16} /> Análise de uso</span>
          <h1>{product.productName}</h1>
          <p>{product.companyName}</p>
        </div>
        <div className="temporal-origin-badge">
          <ClockCounterClockwise size={18} />
          <span>
            <strong>{analytics?.dataOrigins.includesDemo ? "Histórico demonstrativo + telemetria real" : "Telemetria real"}</strong>
            <small>Cálculos feitos sobre eventos armazenados</small>
          </span>
        </div>
      </header>

      <nav className="temporal-period-selector" aria-label="Período da análise">
        {periodOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={period === option.value ? "temporal-period-button temporal-period-button--active" : "temporal-period-button"}
            onClick={() => setPeriod(option.value)}
          >
            {option.label}
          </button>
        ))}
      </nav>

      {error && <div className="product-analytics-error" role="alert"><WarningCircle size={19} /> {error}</div>}
      {loading ? (
        <div className="product-analytics-loading"><SpinnerGap size={26} /> Recalculando período...</div>
      ) : analytics ? (
        <>
          <section className="temporal-window-summary">
            <div><small>Período atual</small><strong>{analytics.period.current.label}</strong></div>
            <ArrowRight size={18} />
            <div><small>Período anterior equivalente</small><strong>{analytics.period.previous.label}</strong></div>
            <span>Fuso: America/Sao_Paulo</span>
          </section>
          {analytics.analysisAvailability.status !== "ready" ? (
            <AnalysisAvailability analytics={analytics} />
          ) : (
            <>
              <section className="temporal-metrics" aria-label="Comparação das métricas de uso monitorado">
                <ComparisonCard icon={<Pulse size={22} />} label="Total de eventos" metric={analytics.summary.events} />
                <ComparisonCard icon={<UsersThree size={22} />} label="Usuários únicos" metric={analytics.summary.uniqueUsers} />
                <ComparisonCard icon={<SquaresFour size={22} />} label="Funcionalidades utilizadas" metric={analytics.summary.featuresUsed} />
                <ComparisonCard icon={<ChartLineUp size={22} />} label="Frequência média por usuário" metric={analytics.summary.frequencyPerUser} decimal />
              </section>

              <PeriodHighlights highlights={highlights} />

              <section className="product-analytics-panel temporal-history-panel">
                <div className="product-analytics-panel-heading">
                  <div><span>{chartPeriodCopy[analytics.period.key]}</span><h2>Evolução da utilização</h2></div>
                  <small>{analytics.dataOrigins.demoEvents} demo · {analytics.dataOrigins.realEvents} real</small>
                </div>
                <FeatureChartFilter
                  features={analytics.features}
                  selectedFeature={featureChart.selection}
                  onChange={setSelectedFeature}
                />
                <div className="temporal-history-chart" aria-label="Eventos mensais por funcionalidade monitorada">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={featureChart.data} margin={{ top: 20, right: 12, left: -10, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} />
                      <XAxis dataKey="start" tickFormatter={(value) => formatHistoryPoint(String(value), featureChart.granularity)} axisLine={false} tickLine={false} tick={{ fill: "#8593ae", fontSize: 10 }} minTickGap={24} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8593ae", fontSize: 10 }} />
                      <Tooltip labelFormatter={(label) => formatHistoryPoint(String(label), featureChart.granularity)} />
                      {featureChart.features.map((feature, index) => (
                        <Line
                          key={feature.eventName}
                          isAnimationActive={false}
                          type="monotone"
                          dataKey={(point: { values: Record<string, number> }) => point.values[feature.eventName] ?? 0}
                          name={feature.name}
                          stroke={featureLineColors[index % featureLineColors.length]}
                          strokeWidth={featureChart.features.length === 1 ? 3 : 2.5}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="product-analytics-panel">
                <div className="product-analytics-panel-heading">
                  <div><span>Comparação calculada por funcionalidade monitorada</span><h2>Utilização por funcionalidade</h2></div>
                  <small>{analytics.features.length} funcionalidade(s)</small>
                </div>
                <div className="temporal-feature-table">
                  <div className="temporal-feature-row temporal-feature-row--header">
                    <span>Funcionalidade</span><span>Eventos</span><span>Usuários</span><span>Frequência</span><span>Tendência</span>
                  </div>
                  {analytics.features.map((feature) => (
                    <article className="temporal-feature-row" key={feature.eventName}>
                      <div><strong>{feature.name}</strong><code>{feature.eventName}</code></div>
                      <div><strong>{formatNumber(feature.events.current, 0)}</strong><small>antes {formatNumber(feature.events.previous, 0)}</small><VariationText metric={feature.events} /></div>
                      <div><strong>{formatNumber(feature.uniqueUsers.current, 0)}</strong><small>antes {formatNumber(feature.uniqueUsers.previous, 0)}</small><VariationText metric={feature.uniqueUsers} /></div>
                      <div><strong>{formatNumber(feature.frequencyPerUser.current)}</strong><small>antes {formatNumber(feature.frequencyPerUser.previous)}</small><VariationText metric={feature.frequencyPerUser} /></div>
                      <div className="temporal-decline">
                        {feature.consecutiveDeclines > 0 ? (
                          <><ArrowDown size={16} /><strong>{feature.consecutiveDeclines} queda(s) consecutiva(s)</strong><small>Meses completos; não indica causalidade.</small></>
                        ) : (
                          <><span>—</span><strong>Sem queda persistente</strong><small>Meses completos analisados.</small></>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
