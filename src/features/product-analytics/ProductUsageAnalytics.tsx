import { ChartBar, Database, Pulse, SpinnerGap, SquaresFour, UsersThree, WarningCircle } from "@phosphor-icons/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { TrackingEvent } from "../../types";
import { periodOptions, periodStart } from "./periods";
import { ProductAnalyticsResults } from "./ProductAnalyticsResults";
import { getClientProductAnalyticsSummary } from "./productAnalyticsApi";
import type { AnalyticsPeriod, ClientProductAnalyticsSummary } from "./types";
import "./product-analytics.css";

export function ProductUsageAnalytics({ clientId, demoEvents }: { clientId: string; demoEvents: TrackingEvent[] }) {
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const [applicationId, setApplicationId] = useState("");
  const [summary, setSummary] = useState<ClientProductAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const result = await getClientProductAnalyticsSummary(clientId, periodStart(period), applicationId);
        if (active) setSummary(result);
      } catch (loadError) {
        if (active) {
          setSummary(null);
          setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar as métricas reais.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [applicationId, clientId, period]);

  const applications = summary?.applications ?? [];
  const onlyApplication = applications.length === 1 ? applications[0] : null;
  const hasRealApplications = applications.length > 0;

  return (
    <section className="panel product-analytics-embedded" aria-labelledby="product-usage-title">
      <header className="product-analytics-embedded-heading">
        <div>
          <span className="product-analytics-eyebrow">
            <ChartBar size={16} weight="duotone" /> {summary && !hasRealApplications ? "Dados demonstrativos" : "Telemetria real"}
          </span>
          <h2 id="product-usage-title">Uso do produto</h2>
          <p>{summary && !hasRealApplications
            ? "Amostra demonstrativa específica deste produto; não representa eventos recebidos por integração."
            : "Métricas calculadas somente a partir dos eventos recebidos pelas aplicações vinculadas a este produto."}</p>
        </div>
      </header>

      {error ? (
        <div className="product-analytics-error" role="alert"><WarningCircle size={19} /> {error}</div>
      ) : loading ? (
        <div className="product-analytics-loading product-analytics-loading--compact"><SpinnerGap size={25} /> Carregando eventos reais...</div>
      ) : applications.length === 0 ? (
        <ProductUsageDemo events={demoEvents} />
      ) : summary ? (
        <>
          <div className="product-analytics-filters product-analytics-filters--embedded" aria-label="Filtros de uso do produto">
            <label>
              <span>Aplicação</span>
              {applications.length > 1 ? (
                <select value={applicationId} onChange={(event) => setApplicationId(event.target.value)}>
                  <option value="">Todas as aplicações</option>
                  {applications.map((application) => (
                    <option key={application.id} value={application.id}>{application.name}</option>
                  ))}
                </select>
              ) : (
                <div className="product-analytics-application-readonly">{onlyApplication?.name}</div>
              )}
              {onlyApplication && <small>Application ID: {onlyApplication.id}</small>}
              {applications.length > 1 && <small>{applicationId || "Agregando apenas as aplicações deste produto"}</small>}
            </label>
            <label>
              <span>Período</span>
              <select value={period} onChange={(event) => setPeriod(event.target.value as AnalyticsPeriod)}>
                {periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <small>Filtro aplicado à data real de recebimento.</small>
            </label>
          </div>
          <ProductAnalyticsResults
            summary={summary}
            emptyMessage="Selecione outro período ou envie eventos para uma aplicação vinculada a este produto."
          />
        </>
      ) : null}
    </section>
  );
}

function ProductUsageDemo({ events }: { events: TrackingEvent[] }) {
  const features = useMemo(() => {
    const usage = new Map<string, { eventName: string; name: string; usageCount: number }>();
    events.forEach((event) => {
      const current = usage.get(event.action);
      usage.set(event.action, {
        eventName: event.action,
        name: event.feature,
        usageCount: (current?.usageCount ?? 0) + 1,
      });
    });
    return [...usage.values()].sort((left, right) => right.usageCount - left.usageCount);
  }, [events]);
  const maxUsage = Math.max(1, ...features.map((feature) => feature.usageCount));

  if (events.length === 0) {
    return (
      <div className="product-analytics-empty product-analytics-empty--compact">
        <Database size={36} weight="duotone" />
        <h2>Nenhuma aplicação conectada</h2>
        <p>Este produto também não possui uma amostra demonstrativa de uso.</p>
        <Link to="/conexoes">Ir para Conexões</Link>
      </div>
    );
  }

  return (
    <>
      <div className="product-analytics-demo-notice">
        <Database size={20} weight="duotone" />
        <div>
          <strong>Nenhuma aplicação real conectada a este produto.</strong>
          <span>Os dados abaixo são mocks próprios do produto e não vieram de Sistema ex nem do SQLite.</span>
        </div>
        <Link to="/conexoes">Ir para Conexões</Link>
      </div>

      <section className="product-analytics-metrics" aria-label="Indicadores demonstrativos de uso">
        <DemoMetricCard icon={<Pulse size={22} weight="duotone" />} label="Eventos demonstrativos" value={events.length.toLocaleString("pt-BR")} helper="Amostra local do produto" />
        <DemoMetricCard icon={<UsersThree size={22} weight="duotone" />} label="Usuários únicos" value="—" helper="Não informado nos mocks" />
        <DemoMetricCard icon={<SquaresFour size={22} weight="duotone" />} label="Funcionalidades utilizadas" value={features.length.toLocaleString("pt-BR")} helper="Eventos distintos na amostra" />
      </section>

      <section className="product-analytics-panel product-analytics-panel--demo">
        <div className="product-analytics-panel-heading">
          <div><span>Amostra demonstrativa</span><h2>Utilização por funcionalidade</h2></div>
          <small>{features.length} funcionalidade(s)</small>
        </div>
        <div className="product-analytics-feature-list">
          {features.map((feature) => (
            <article key={feature.eventName} className="product-analytics-feature-row">
              <div className="product-analytics-feature-copy">
                <strong>{feature.name}</strong>
                <code>{feature.eventName}</code>
                <small>Dado demonstrativo do produto</small>
              </div>
              <div className="product-analytics-feature-usage">
                <div aria-hidden="true"><span style={{ width: `${(feature.usageCount / maxUsage) * 100}%` }} /></div>
                <strong>{feature.usageCount}</strong>
                <span>utilização(ões)</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function DemoMetricCard({ icon, label, value, helper }: { icon: ReactNode; label: string; value: string; helper: string }) {
  return (
    <article className="product-analytics-metric-card product-analytics-metric-card--demo">
      <span>{icon}</span>
      <div><small>{label}</small><strong>{value}</strong><p>{helper}</p></div>
    </article>
  );
}
