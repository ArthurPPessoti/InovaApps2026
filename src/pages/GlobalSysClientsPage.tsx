import {
  ArrowLeft,
  ArrowRight,
  Buildings,
  CurrencyCircleDollar,
  Database,
  FileXls,
  ShieldWarning,
  TrendDown,
  UsersThree,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { churnBandLabel, evidenceHighlights, isAttention, primaryRiskReason } from "../churn/analysisAdapters";
import { useChurnAnalysis } from "../churn/churnAnalysis";
import { selectGlobalSysAnalysis } from "../churn/globalSysPortfolio";
import type { ChurnPrediction, HistoricalChurn } from "../churn/types";
import { formatCurrency } from "../components/StatusUI";
import { listApplications } from "../features/connections/connectionApi";
import { connectionTelemetryByClient } from "../features/connections/connectionTelemetry";
import type { ConnectedApplication } from "../features/connections/types";
import { ProductTelemetryStatus } from "../features/portfolio/ProductTelemetryStatus";
import { type PortfolioProductRecord, usePortfolio } from "../features/portfolio/PortfolioContext";
import {
  disconnectedProductTelemetry,
  matchesTelemetryFilter,
  type ProductTelemetrySummary,
  type TelemetryFilter,
} from "../features/portfolio/productTelemetry";

type GlobalSysClientTab = "ativos" | "atencao" | "cancelados";

function percentage(value: number) {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value * 100)}%`;
}

function SourceRequired({ loading, error }: { loading: boolean; error: string }) {
  return (
    <div className="general-empty-state">
      <FileXls size={38} weight="duotone" />
      <h1>{loading ? "Carregando a base GlobalSys..." : "A carteira GlobalSys ainda não está disponível."}</h1>
      {!loading && <p>{error || "Cadastre ou processe a base oficial para visualizar os clientes C... sem misturar dados demonstrativos."}</p>}
      {!loading && <Link className="primary-button" to="/dados">Abrir fonte de dados <ArrowRight size={17} /></Link>}
    </div>
  );
}

function TelemetryCell({
  telemetry,
  loading,
  unavailable,
}: {
  telemetry: ProductTelemetrySummary;
  loading: boolean;
  unavailable: boolean;
}) {
  if (loading) return <td><small>Verificando telemetria...</small></td>;
  if (unavailable) return <td><small>Status indisponível</small></td>;
  return <td><ProductTelemetryStatus telemetry={telemetry} /></td>;
}

function ActiveClientRow({
  client,
  telemetry,
  telemetryLoading,
  telemetryUnavailable,
}: {
  client: ChurnPrediction;
  telemetry: ProductTelemetrySummary;
  telemetryLoading: boolean;
  telemetryUnavailable: boolean;
}) {
  return (
    <tr>
      <td><strong>{client.subjectId}</strong><small>Cliente da base GlobalSys</small></td>
      <td><strong>{client.segment}</strong><small>{client.plan}</small></td>
      <td><span className={`churn-band churn-band--${client.probabilityBand.toLowerCase()}`}>{churnBandLabel[client.probabilityBand]} · {percentage(client.probability)}</span></td>
      <td className="revenue-cell">{formatCurrency(client.monthlyRevenue)}</td>
      <td className="signal-cell">{primaryRiskReason(client)}</td>
      <TelemetryCell telemetry={telemetry} loading={telemetryLoading} unavailable={telemetryUnavailable} />
      <td><Link className="table-action" to={`/clientes/${client.subjectId}`}>Ver cliente <ArrowRight size={14} /></Link></td>
    </tr>
  );
}

function persistedRiskBand(product: PortfolioProductRecord) {
  if (product.riskProfile?.riskLevel === "Alto") return "high";
  if (product.riskProfile?.riskLevel === "Médio") return "attention";
  return "low";
}

function PersistedProductRow({
  product,
  telemetry,
  telemetryLoading,
  telemetryUnavailable,
}: {
  product: PortfolioProductRecord;
  telemetry: ProductTelemetrySummary;
  telemetryLoading: boolean;
  telemetryUnavailable: boolean;
}) {
  const risk = product.riskProfile;
  return (
    <tr>
      <td><strong>{product.companyName}</strong><small>{product.productName} · Novo cadastro</small></td>
      <td><strong>{risk?.segment ?? "Não informado"}</strong><small>{risk?.plan ?? "Aguardando dados comerciais"}</small></td>
      <td>{risk
        ? <span className={`churn-band churn-band--${persistedRiskBand(product)}`}>{risk.riskLevel} · score {risk.riskScore}</span>
        : <span className="churn-band">Aguardando dados</span>}</td>
      <td className="revenue-cell">{risk ? formatCurrency(risk.monthlyRevenue) : "Não informado"}</td>
      <td className="signal-cell">{risk?.primarySignal ?? "Aguardando dados comerciais"}</td>
      <TelemetryCell telemetry={telemetry} loading={telemetryLoading} unavailable={telemetryUnavailable} />
      <td><Link className="table-action" to={`/clientes/${product.id}`}>Ver produto <ArrowRight size={14} /></Link></td>
    </tr>
  );
}

function historicalSignal(client: HistoricalChurn) {
  return evidenceHighlights(client.evidenceBeforeCancellation).find((item) => item.tone === "risk")?.label
    ?? evidenceHighlights(client.evidenceBeforeCancellation)[0]?.label
    ?? "Sem evidência operacional disponível";
}

function CancelledClientRow({ client }: { client: HistoricalChurn }) {
  return (
    <tr>
      <td><strong>{client.subjectId}</strong><small>Cliente histórico da GlobalSys</small></td>
      <td><strong>{client.segment}</strong><small>{client.plan}</small></td>
      <td>{client.cancelledMonth}</td>
      <td className="lost-revenue">{formatCurrency(client.monthlyRevenue)}</td>
      <td className="signal-cell">{historicalSignal(client)}</td>
      <td><Link className="table-action" to={`/clientes/cancelados/${client.subjectId}`}>Ver histórico <ArrowRight size={14} /></Link></td>
    </tr>
  );
}

export function GlobalSysClientsPage() {
  const { account } = useAuth();
  const { analysis, loading, error } = useChurnAnalysis(account?.id);
  const { persistedProducts } = usePortfolio();
  const [applications, setApplications] = useState<ConnectedApplication[]>([]);
  const [telemetryLoading, setTelemetryLoading] = useState(true);
  const [telemetryError, setTelemetryError] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const selected = useMemo(() => analysis ? selectGlobalSysAnalysis(analysis) : null, [analysis]);
  const tab = (searchParams.get("status") as GlobalSysClientTab | null) ?? "atencao";
  const telemetryFilter: TelemetryFilter = searchParams.get("telemetria") === "conectada"
    ? "connected"
    : searchParams.get("telemetria") === "desconectada" ? "disconnected" : "all";
  const active = selected?.predictions ?? [];
  const attention = active.filter(isAttention);
  const persistedAttention = persistedProducts.filter((product) => (
    product.riskProfile && product.riskProfile.riskLevel !== "Baixo"
  ));
  const cancelled = selected?.historicalChurn ?? [];
  const shownActive = tab === "atencao" ? attention : active;
  const shownPersisted = tab === "atencao" ? persistedAttention : persistedProducts;
  const activeCount = active.length + persistedProducts.length;
  const attentionCount = attention.length + persistedAttention.length;
  const telemetryByClient = useMemo(
    () => connectionTelemetryByClient(applications),
    [applications],
  );
  const telemetryFilterAvailable = !telemetryLoading && !telemetryError;
  const matchesSelectedTelemetry = (clientId: string) => (
    !telemetryFilterAvailable
    || matchesTelemetryFilter(
      telemetryByClient.get(clientId) ?? disconnectedProductTelemetry,
      telemetryFilter,
    )
  );
  const filteredActive = shownActive.filter((client) => matchesSelectedTelemetry(client.subjectId));
  const filteredPersisted = shownPersisted.filter((product) => matchesSelectedTelemetry(product.id));
  const visibleCount = filteredActive.length + filteredPersisted.length;

  useEffect(() => {
    let activeRequest = true;
    void listApplications()
      .then((items) => {
        if (!activeRequest) return;
        setApplications(items);
        setTelemetryError("");
      })
      .catch((loadError: unknown) => {
        if (!activeRequest) return;
        setTelemetryError(loadError instanceof Error ? loadError.message : "Não foi possível consultar a telemetria.");
      })
      .finally(() => {
        if (activeRequest) setTelemetryLoading(false);
      });
    return () => { activeRequest = false; };
  }, []);

  if (loading || !selected) return <SourceRequired loading={loading} error={error} />;

  const setTab = (nextTab: GlobalSysClientTab) => {
    const next = new URLSearchParams(searchParams);
    if (nextTab === "atencao") next.delete("status"); else next.set("status", nextTab);
    next.delete("visao");
    if (nextTab === "cancelados") next.delete("telemetria");
    setSearchParams(next, { replace: true });
  };

  const setTelemetryFilter = (filter: TelemetryFilter) => {
    const next = new URLSearchParams(searchParams);
    if (filter === "connected") next.set("telemetria", "conectada");
    else if (filter === "disconnected") next.set("telemetria", "desconectada");
    else next.delete("telemetria");
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="clients-lifecycle-page">
      <header className="page-heading">
        <div><span className="eyebrow"><Buildings size={16} weight="duotone" /> Carteira GlobalSys</span><h1>Clientes da fonte oficial e novos cadastros reais.</h1><p>Esta tela combina os identificadores C... de {selected.source.fileName} com produtos cadastrados diretamente no fluxo de Conexões, sem incluir dados demonstrativos.</p></div>
        <Link className="source-file-chip" to="/dados"><Database size={18} /><span><strong>{selected.source.fileName}</strong><small>{selected.source.observedFrom} a {selected.source.observedUntil}</small></span></Link>
      </header>

      <div className="lifecycle-tabs" role="tablist" aria-label="Situação dos clientes GlobalSys">
        <button type="button" role="tab" aria-selected={tab === "ativos"} className={tab === "ativos" ? "active" : ""} onClick={() => setTab("ativos")}>Ativos <span>{activeCount}</span></button>
        <button type="button" role="tab" aria-selected={tab === "atencao"} className={tab === "atencao" ? "active" : ""} onClick={() => setTab("atencao")}>Em atenção <span>{attentionCount}</span></button>
        <button type="button" role="tab" aria-selected={tab === "cancelados"} className={tab === "cancelados" ? "active" : ""} onClick={() => setTab("cancelados")}>Cancelados <span>{cancelled.length}</span></button>
      </div>

      <section className="panel clients-panel lifecycle-list-panel">
        <div className="panel-heading panel-heading--clients">
          <div>
            <span>{tab === "cancelados" ? "Histórico observado" : tab === "atencao" ? "Ordem de atuação" : "Carteira ativa"}</span>
            <h2>{tab === "cancelados" ? "Clientes cancelados na base" : tab === "atencao" ? "Clientes que exigem atenção" : "Clientes e produtos ativos"}</h2>
            <p>{tab === "cancelados" ? `${cancelled.length} registro(s) da fonte GlobalSys` : `${visibleCount} registro(s) nesta seleção`}</p>
          </div>
          {tab !== "cancelados" && (
            <div className="panel-tools">
              <div className="telemetry-filter" role="group" aria-label="Filtrar clientes por telemetria">
                {([
                  ["all", "Todos"],
                  ["connected", "Com telemetria"],
                  ["disconnected", "Sem telemetria"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={telemetryFilter === value ? "active" : ""}
                    aria-pressed={telemetryFilter === value}
                    disabled={!telemetryFilterAvailable}
                    onClick={() => setTelemetryFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="table-scroll">
          {tab === "cancelados" ? (
            <table className="clients-table cancelled-table">
              <thead><tr><th>Cliente</th><th>Segmento / plano</th><th>Cancelamento</th><th>Receita mensal</th><th>Evidência anterior</th><th>Ação</th></tr></thead>
              <tbody>{cancelled.map((client) => <CancelledClientRow key={client.subjectId} client={client} />)}</tbody>
            </table>
          ) : (
            <table className="clients-table lifecycle-table">
              <thead><tr><th>Cliente</th><th>Segmento / plano</th><th>Classificação</th><th>Receita mensal</th><th>Evidência atual</th><th>Telemetria</th><th>Ação</th></tr></thead>
              <tbody>
                {filteredActive.map((client) => (
                  <ActiveClientRow
                    key={client.subjectId}
                    client={client}
                    telemetry={telemetryByClient.get(client.subjectId) ?? disconnectedProductTelemetry}
                    telemetryLoading={telemetryLoading}
                    telemetryUnavailable={Boolean(telemetryError)}
                  />
                ))}
                {filteredPersisted.map((product) => (
                  <PersistedProductRow
                    key={product.id}
                    product={product}
                    telemetry={telemetryByClient.get(product.id) ?? disconnectedProductTelemetry}
                    telemetryLoading={telemetryLoading}
                    telemetryUnavailable={Boolean(telemetryError)}
                  />
                ))}
                {visibleCount === 0 && (
                  <tr>
                    <td colSpan={7}><small>Nenhum cliente corresponde ao filtro de telemetria selecionado.</small></td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

export function GlobalSysCancelledClientPage() {
  const { clienteId } = useParams();
  const { account } = useAuth();
  const { analysis, loading, error } = useChurnAnalysis(account?.id);
  const location = useLocation();
  const selected = useMemo(() => analysis ? selectGlobalSysAnalysis(analysis) : null, [analysis]);
  const client = selected?.historicalChurn.find((item) => item.subjectId === clienteId);
  const returnTo = (location.state as { from?: string } | null)?.from ?? "/clientes?status=cancelados";

  if (loading || !selected) return <SourceRequired loading={loading} error={error} />;
  if (!client) return <div className="not-found"><ShieldWarning size={42} /><h1>Cliente cancelado não encontrado na base GlobalSys</h1><Link className="primary-button" to="/clientes?status=cancelados">Voltar ao histórico</Link></div>;

  const highlights = evidenceHighlights(client.evidenceBeforeCancellation);
  return (
    <div className="client-detail-page">
      <Link className="back-link" to={returnTo}><ArrowLeft size={17} /> Voltar aos clientes cancelados</Link>
      <section className="client-hero">
        <div className="client-heading"><span className="eyebrow"><TrendDown size={16} weight="duotone" /> Histórico da fonte GlobalSys</span><div className="client-title-row"><div><h1>{client.subjectId}</h1><p>{client.segment} · {client.plan} · última observação em {client.lastObservedMonth}</p></div></div></div>
        <div className="client-value"><span>Receita mensal encerrada</span><strong>{formatCurrency(client.monthlyRevenue)}</strong><small>Cancelamento em {client.cancelledMonth}</small></div>
      </section>

      <section className="client-metrics" aria-label="Evidências anteriores ao cancelamento">
        {highlights.slice(0, 6).map((item) => <div className="client-metric" key={item.label}><UsersThree size={18} /><span>{item.label}</span><strong>{item.value}</strong><small>Registrado na base</small></div>)}
        {!highlights.length && <div className="client-metric"><CurrencyCircleDollar size={18} /><span>Evidências</span><strong>Não informadas</strong><small>A fonte não possui indicadores anteriores</small></div>}
      </section>

      <section className="panel data-lineage-panel"><div><Database size={20} /><span><strong>Fonte única</strong><small>{selected.source.fileName}. Nenhum cliente ou produto demonstrativo foi combinado com este histórico.</small></span></div></section>
    </div>
  );
}
