import {
  ChartBar,
  Database,
  SpinnerGap,
  WarningCircle,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { periodOptions, periodStart } from "./periods";
import { ProductAnalyticsResults } from "./ProductAnalyticsResults";
import {
  getProductAnalyticsSummary,
  listAnalyticsApplications,
} from "./productAnalyticsApi";
import type {
  AnalyticsApplication,
  AnalyticsPeriod,
  ProductAnalyticsSummary,
} from "./types";
import "./product-analytics.css";

export function ProductAnalyticsFeature() {
  const [applications, setApplications] = useState<AnalyticsApplication[]>([]);
  const [applicationId, setApplicationId] = useState("");
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const [summary, setSummary] = useState<ProductAnalyticsSummary | null>(null);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const items = await listAnalyticsApplications();
        setApplications(items);
        setApplicationId((current) => current || items[0]?.id || "");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar as aplicações.");
      } finally {
        setLoadingApplications(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!applicationId) {
      setSummary(null);
      return;
    }

    let active = true;
    const load = async () => {
      setLoadingSummary(true);
      setError("");
      try {
        const result = await getProductAnalyticsSummary(applicationId, periodStart(period));
        if (active) setSummary(result);
      } catch (loadError) {
        if (active) {
          setSummary(null);
          setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar as métricas.");
        }
      } finally {
        if (active) setLoadingSummary(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [applicationId, period]);

  return (
    <div className="product-analytics-page">
      <header className="product-analytics-header">
        <div>
          <span className="product-analytics-eyebrow"><ChartBar size={16} weight="duotone" /> Product Analytics</span>
          <h1>Uso real do produto</h1>
          <p>Visualize quais funcionalidades estão sendo utilizadas a partir dos eventos recebidos pela integração.</p>
        </div>
      </header>

      <section className="product-analytics-filters" aria-label="Filtros do Product Analytics">
        <label>
          <span>Aplicação</span>
          <select
            value={applicationId}
            onChange={(event) => setApplicationId(event.target.value)}
            disabled={loadingApplications || applications.length === 0}
          >
            {applications.length === 0 && <option value="">Nenhuma aplicação cadastrada</option>}
            {applications.map((application) => (
              <option key={application.id} value={application.id}>{application.name} · {application.client ?? "Cliente não vinculado"}</option>
            ))}
          </select>
          {applicationId && <small>Application ID: {applicationId}</small>}
        </label>
        <label>
          <span>Período</span>
          <select value={period} onChange={(event) => setPeriod(event.target.value as AnalyticsPeriod)}>
            {periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <small>Filtro aplicado sobre a data real de recebimento.</small>
        </label>
      </section>

      {error && <div className="product-analytics-error" role="alert"><WarningCircle size={19} /> {error}</div>}

      {loadingApplications || loadingSummary ? (
        <div className="product-analytics-loading"><SpinnerGap size={25} /> Carregando eventos reais...</div>
      ) : applications.length === 0 ? (
        <section className="product-analytics-empty">
          <Database size={36} weight="duotone" />
          <h2>Nenhuma aplicação cadastrada</h2>
          <p>Cadastre uma aplicação em Conexões antes de analisar seus eventos.</p>
          <Link to="/conexoes">Ir para Conexões</Link>
        </section>
      ) : summary ? (
        <ProductAnalyticsResults summary={summary} />
      ) : null}
    </div>
  );
}
