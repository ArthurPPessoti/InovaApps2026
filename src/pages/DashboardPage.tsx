import {
  ArrowRight,
  CurrencyCircleDollar,
  Funnel,
  MagnifyingGlass,
  Pulse,
  ShieldWarning,
  TrendDown,
  UsersThree,
} from "@phosphor-icons/react";
import { useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RiskBadge, formatCurrency } from "../components/StatusUI";
import { clients, portfolioSeries, portfolioSummary, recentSignals, segmentAttention } from "../data/mockData";

const periodOptions = [
  { value: "3", label: "3 meses" },
  { value: "6", label: "6 meses" },
  { value: "12", label: "12 meses" },
] as const;

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <span key={item.name}>
          <i style={{ backgroundColor: item.color }} />
          {item.name}: {item.value}
        </span>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const search = searchParams.get("busca") ?? "";
  const risk = searchParams.get("risco") ?? "Todos";
  const segment = searchParams.get("segmento") ?? "Todos";
  const solution = searchParams.get("solucao") ?? "Todas";
  const period = (searchParams.get("periodo") ?? "6") as "3" | "6" | "12";

  const setFilter = (key: string, value: string, defaultValue: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === defaultValue) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const filteredClients = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase("pt-BR");
    return clients.filter((client) => {
      const matchesSearch = !normalized || client.name.toLocaleLowerCase("pt-BR").includes(normalized);
      const matchesRisk = risk === "Todos" || client.riskLevel === risk;
      const matchesSegment = segment === "Todos" || client.segment === segment;
      const matchesSolution = solution === "Todas" || client.solution === solution;
      return matchesSearch && matchesRisk && matchesSegment && matchesSolution;
    });
  }, [risk, search, segment, solution]);

  const segments = [...new Set(clients.map((client) => client.segment))];
  const solutions = [...new Set(clients.map((client) => client.solution))];
  const openClient = (clientId: string) => {
    navigate(`/clientes/${clientId}`, { state: { from: `${location.pathname}${location.search}` } });
  };

  return (
    <div className="dashboard-page">
      <section id="resumo" className="page-heading">
        <div>
          <span className="eyebrow"><Pulse size={16} weight="fill" /> Inteligência de carteira</span>
          <h1>Quem precisa da minha atenção hoje?</h1>
          <p>Sinais de comportamento, atendimento e relacionamento reunidos em uma ordem clara de ação.</p>
        </div>
        <label className="period-control">
          <span>Período analisado</span>
          <select value={period} onChange={(event) => setFilter("periodo", event.target.value, "6")}>
            {periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </section>

      <section className="metrics-grid" aria-label="Resumo da carteira">
        <article className="metric-card metric-card--primary">
          <div className="metric-icon"><UsersThree size={22} weight="duotone" /></div>
          <span>Clientes ativos</span>
          <strong>{portfolioSummary.activeClients}</strong>
          <small>Carteira monitorada</small>
        </article>
        <article className="metric-card">
          <div className="metric-icon"><TrendDown size={22} weight="duotone" /></div>
          <span>Exigem atenção</span>
          <strong>{portfolioSummary.attentionClients}</strong>
          <small>13,8% da carteira</small>
        </article>
        <article className="metric-card">
          <div className="metric-icon metric-icon--danger"><ShieldWarning size={22} weight="duotone" /></div>
          <span>Risco alto</span>
          <strong>{portfolioSummary.highRiskClients}</strong>
          <small>Ação recomendada hoje</small>
        </article>
        <article className="metric-card">
          <div className="metric-icon"><CurrencyCircleDollar size={22} weight="duotone" /></div>
          <span>Receita em atenção</span>
          <strong>R$ 208,5 mil</strong>
          <small>Valor mensal recorrente</small>
        </article>
      </section>

      <section className="analytics-grid">
        <article className="panel panel--wide">
          <div className="panel-heading">
            <div>
              <span>Visão da carteira</span>
              <h2>Evolução dos níveis de atenção</h2>
            </div>
            <div className="chart-legend" aria-label="Legenda">
              <span><i className="legend-dot legend-dot--high" /> Alto</span>
              <span><i className="legend-dot legend-dot--medium" /> Médio</span>
              <span><i className="legend-dot legend-dot--low" /> Baixo</span>
            </div>
          </div>
          <div className="main-chart" aria-label="Gráfico de evolução dos níveis de atenção">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={portfolioSeries[period]} margin={{ top: 18, right: 8, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="highGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ff5f6d" stopOpacity={0.45} /><stop offset="95%" stopColor="#ff5f6d" stopOpacity={0} /></linearGradient>
                  <linearGradient id="mediumGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ffba49" stopOpacity={0.28} /><stop offset="95%" stopColor="#ffba49" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#8593ae", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8593ae", fontSize: 12 }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area isAnimationActive={false} type="monotone" dataKey="alto" name="Alto" stroke="#ff5f6d" fill="url(#highGradient)" strokeWidth={2.5} />
                <Area isAnimationActive={false} type="monotone" dataKey="medio" name="Médio" stroke="#ffba49" fill="url(#mediumGradient)" strokeWidth={2} />
                <Area isAnimationActive={false} type="monotone" dataKey="baixo" name="Baixo" stroke="#00f3ff" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div><span>Concentração</span><h2>Atenção por segmento</h2></div>
          </div>
          <div className="segment-chart" aria-label="Gráfico de clientes em atenção por segmento">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={segmentAttention} layout="vertical" margin={{ top: 4, right: 8, left: 10, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,.05)" horizontal={false} />
                <XAxis type="number" hide domain={[0, 2]} />
                <YAxis dataKey="segment" type="category" axisLine={false} tickLine={false} width={74} tick={{ fill: "#b9b9b9", fontSize: 11 }} />
                <Tooltip cursor={{ fill: "rgba(255,255,255,.03)" }} content={<ChartTooltip />} />
                <Bar isAnimationActive={false} dataKey="clients" name="Clientes" fill="#0156fc" radius={[0, 8, 8, 0]} barSize={13} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section id="clientes" className="panel clients-panel">
        <div className="panel-heading panel-heading--clients">
          <div>
            <span>Ordem de ação</span>
            <h2>Clientes que exigem atenção</h2>
            <p>{filteredClients.length} de {clients.length} clientes na seleção atual</p>
          </div>
          <div className="filters" aria-label="Filtros de clientes">
            <label className="search-control">
              <MagnifyingGlass size={18} aria-hidden="true" />
              <span className="sr-only">Buscar cliente</span>
              <input value={search} onChange={(event) => setFilter("busca", event.target.value, "")} placeholder="Buscar cliente" />
            </label>
            <label className="select-control">
              <Funnel size={16} aria-hidden="true" />
              <span className="sr-only">Filtrar por risco</span>
              <select value={risk} onChange={(event) => setFilter("risco", event.target.value, "Todos")}>
                <option>Todos</option><option>Alto</option><option>Médio</option><option>Baixo</option>
              </select>
            </label>
            <label className="select-control">
              <span className="sr-only">Filtrar por segmento</span>
              <select value={segment} onChange={(event) => setFilter("segmento", event.target.value, "Todos")}>
                <option>Todos</option>{segments.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="select-control select-control--solution">
              <span className="sr-only">Filtrar por solução</span>
              <select value={solution} onChange={(event) => setFilter("solucao", event.target.value, "Todas")}>
                <option>Todas</option>{solutions.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>
        </div>

        {filteredClients.length ? (
          <div className="table-scroll">
            <table className="clients-table">
              <thead><tr><th>Prioridade</th><th>Cliente</th><th>Risco</th><th>Valor mensal</th><th>Solução</th><th>Principal sinal</th><th>Tendência</th><th><span className="sr-only">Ação</span></th></tr></thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.id} tabIndex={0} onClick={() => openClient(client.id)} onKeyDown={(event) => { if (event.key === "Enter") openClient(client.id); }}>
                    <td><span className="priority-number">{String(client.priority).padStart(2, "0")}</span></td>
                    <td><strong>{client.name}</strong><small>{client.segment}</small></td>
                    <td><RiskBadge level={client.riskLevel} score={client.riskScore} /></td>
                    <td className="revenue-cell">{formatCurrency(client.monthlyRevenue)}</td>
                    <td><span className="solution-label">{client.solution}</span></td>
                    <td className="signal-cell">{client.primarySignal}</td>
                    <td>
                      <div className="sparkline" aria-label={`Tendência de ${client.name}`}>
                        <ResponsiveContainer width="100%" height="100%"><LineChart data={client.trend}><Line isAnimationActive={false} type="monotone" dataKey="value" stroke={client.riskLevel === "Alto" ? "#ff6b78" : "#ffba49"} strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
                      </div>
                    </td>
                    <td><button className="table-action" type="button" onClick={(event) => { event.stopPropagation(); openClient(client.id); }}>Ver cliente <ArrowRight size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <MagnifyingGlass size={30} weight="duotone" />
            <h3>Nenhum cliente encontrado</h3>
            <p>Ajuste a busca ou remova um dos filtros aplicados.</p>
            <button type="button" className="secondary-button" onClick={() => setSearchParams({})}>Limpar filtros</button>
          </div>
        )}
      </section>

      <section id="sinais" className="signals-section">
        <div className="section-heading">
          <div><span>Sinais do tracking</span><h2>Mudanças recentes de comportamento</h2></div>
          <p>Eventos demonstrativos enviados pelas soluções monitoradas.</p>
        </div>
        <div className="signal-feed-grid">
          {recentSignals.slice(0, 6).map((signal) => (
            <button key={signal.id} className="signal-feed-card" type="button" onClick={() => openClient(signal.clientId)}>
              <span className={`signal-severity signal-severity--${signal.severity.toLowerCase().replace("é", "e")}`}><Pulse size={16} weight="fill" /> {signal.feature}</span>
              <strong>{signal.clientName}</strong>
              <p>{signal.detail}</p>
              <small>{signal.timestamp}</small>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
