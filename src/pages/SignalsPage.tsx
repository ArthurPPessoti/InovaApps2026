import { ArrowRight, CurrencyCircleDollar, Database, Funnel, PlugsConnected, Pulse, ShieldWarning, TrendDown } from "@phosphor-icons/react";
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useChurnAnalysis } from "../churn/churnAnalysis";
import { connectedSignals } from "../churn/technologySignals";
import { formatCurrency } from "../components/StatusUI";

export function SignalsPage() {
  const { account } = useAuth();
  const { analysis, loading } = useChurnAnalysis(account?.id);
  const [searchParams, setSearchParams] = useSearchParams();
  const source = searchParams.get("origem") ?? "Todas";
  const severity = searchParams.get("gravidade") ?? "Todas";
  const signals = useMemo(() => analysis ? connectedSignals(analysis, account?.profile === "technology") : [], [account?.profile, analysis]);
  const filtered = signals.filter((signal) => (source === "Todas" || signal.source === source) && (severity === "Todas" || signal.severity === severity));
  const clientsWithSignals = new Set(signals.map((signal) => signal.clientId));
  const connected = signals.filter((signal) => signal.source === "product-telemetry");
  const observed = signals.filter((signal) => signal.source === "spreadsheet");
  const revenue = analysis?.predictions.filter((item) => clientsWithSignals.has(item.subjectId)).reduce((sum, item) => sum + item.monthlyRevenue, 0) ?? 0;
  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "Todas") next.delete(key); else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  if (loading) return <div className="general-empty-state"><Database size={36} /><h1>Carregando sinais da carteira...</h1></div>;
  if (!analysis) return <div className="general-empty-state"><ShieldWarning size={36} /><h1>Cadastre uma fonte antes de conectar sinais.</h1><Link className="primary-button" to="/dados">Cadastrar planilha</Link></div>;

  return <div className="dashboard-page signals-page">
    <section className="page-heading"><div><span className="eyebrow"><Pulse size={16} weight="fill" /> Sinais da carteira e do produto</span><h1>O que mudou na experiência dos clientes?</h1><p>Dados contratuais e de relacionamento são combinados com o uso das funções para revelar problemas que o login sozinho não mostra.</p></div></section>

    <section className="signal-source-banner"><Database size={20} /><div><strong>Carteira: {analysis.source.fileName}</strong><span>{analysis.summary.analyzedEntities} clientes analisados até {analysis.source.observedUntil}</span></div><PlugsConnected size={20} /><div><strong>Telemetria de produto ativa</strong><span>Uso, funções e eventos associados aos mesmos clientes da carteira.</span></div><small>Telemetria simulada para apresentação</small></section>

    <section className="metrics-grid" aria-label="Resumo dos sinais">
      <article className="metric-card metric-card--primary"><div className="metric-icon"><Pulse size={22} /></div><span>Sinais encontrados</span><strong>{signals.length}</strong><small>{observed.length} da base · {connected.length} do produto</small></article>
      <article className="metric-card"><div className="metric-icon"><CurrencyCircleDollar size={22} /></div><span>Receita associada</span><strong>{formatCurrency(revenue)}</strong><small>{clientsWithSignals.size} clientes reais</small></article>
      <article className="metric-card"><div className="metric-icon metric-icon--danger"><TrendDown size={22} /></div><span>Sinais altos</span><strong>{signals.filter((item) => item.severity === "Alto").length}</strong><small>Relacionamento e uso reunidos</small></article>
      <article className="metric-card"><div className="metric-icon"><PlugsConnected size={22} /></div><span>Funções em deterioração</span><strong>{connected.length}</strong><small>Queda detectada pela telemetria</small></article>
    </section>

    <section className="panel clients-panel">
      <div className="panel-heading panel-heading--clients"><div><span>Leitura unificada</span><h2>Sinais por cliente</h2><p>{filtered.length} de {signals.length} sinais na seleção atual</p></div><div className="filters"><label className="select-control"><Funnel size={16} /><span className="sr-only">Filtrar origem</span><select value={source} onChange={(event) => setFilter("origem", event.target.value)}><option>Todas</option><option value="spreadsheet">Dados da planilha</option><option value="product-telemetry">Telemetria do produto</option></select></label><label className="select-control"><span className="sr-only">Filtrar gravidade</span><select value={severity} onChange={(event) => setFilter("gravidade", event.target.value)}><option>Todas</option><option>Alto</option><option>Médio</option></select></label></div></div>
      <div className="signal-feed-grid signal-feed-grid--panel">{filtered.map((signal) => {
        const client = analysis.predictions.find((item) => item.subjectId === signal.clientId);
        return <Link className="signal-feed-card" key={signal.id} to={`/clientes/${signal.clientId}`}><span className="signal-feed-card__tags"><span className={`signal-severity signal-severity--${signal.severity === "Alto" ? "alto" : "medio"}`}><Pulse size={15} weight="fill" />{signal.severity}</span><span className="dimension-tag">{signal.dimension}</span><span className={`signal-origin signal-origin--${signal.source}`}>{signal.source === "spreadsheet" ? "Dados da carteira" : "Telemetria do produto"}</span></span><strong>{signal.title}</strong><p>{signal.detail}</p><span className="signal-feed-card__client">{signal.clientId} · {client?.segment} · {formatCurrency(client?.monthlyRevenue ?? 0)}/mês</span><small>Ver uso, evidências e classificação <ArrowRight size={13} /></small></Link>;
      })}</div>
    </section>
  </div>;
}
