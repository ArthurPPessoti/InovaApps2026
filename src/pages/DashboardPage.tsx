import {
  ArrowRight,
  Buildings,
  CurrencyCircleDollar,
  Funnel,
  MagnifyingGlass,
  Pulse,
  ShieldWarning,
  TrendDown,
  Package,
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
import { PredictiveInsights } from "../components/PredictiveInsights";
import { attentionCompanies, companyPortfolioSummary, getCompany, portfolioProducts, portfolioSeries, productPortfolioSummary, segmentAttention } from "../data/mockData";

const periodOptions = [
  { value: "3", label: "3 meses" },
  { value: "6", label: "6 meses" },
  { value: "12", label: "12 meses" },
] as const;

export function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
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
  const view = searchParams.get("visao") === "empresas" ? "empresas" : "produtos";
  const risk = searchParams.get("risco") ?? "Todos";
  const segment = searchParams.get("segmento") ?? "Todos";
  const solution = searchParams.get("produto") ?? "Todos";
  const period = (searchParams.get("periodo") ?? "6") as "3" | "6" | "12";

  const setFilter = (key: string, value: string, defaultValue: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === defaultValue) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const filteredProducts = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase("pt-BR");
    return portfolioProducts.filter((product) => {
      const company = getCompany(product.companyId)!;
      const matchesSearch = !normalized || `${product.productName} ${company.name}`.toLocaleLowerCase("pt-BR").includes(normalized);
      const matchesRisk = risk === "Todos" || product.riskLevel === risk;
      const matchesSegment = segment === "Todos" || company.segment === segment;
      const matchesSolution = solution === "Todos" || product.productName === solution;
      return matchesSearch && matchesRisk && matchesSegment && matchesSolution;
    });
  }, [risk, search, segment, solution]);

  const filteredCompanies = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase("pt-BR");
    return attentionCompanies.filter(({ company, riskLevel, products: companyProducts }) =>
      (!normalized || `${company.name} ${companyProducts.map((product) => product.productName).join(" ")}`.toLocaleLowerCase("pt-BR").includes(normalized))
      && (risk === "Todos" || riskLevel === risk)
      && (segment === "Todos" || company.segment === segment)
      && (solution === "Todos" || companyProducts.some((product) => product.productName === solution)),
    );
  }, [risk, search, segment, solution]);

  const segments = [...new Set(attentionCompanies.map(({ company }) => company.segment))];
  const solutions = [...new Set(portfolioProducts.map((product) => product.productName))];
  const openProduct = (productId: string) => {
    navigate(`/clientes/${productId}`, { state: { from: `${location.pathname}${location.search}` } });
  };
  const openCompany = (companyId: string) => navigate(`/empresas/${companyId}`, { state: { from: `${location.pathname}${location.search}` } });
  const visibleCount = view === "produtos" ? filteredProducts.length : filteredCompanies.length;
  const totalCount = view === "produtos" ? portfolioProducts.length : attentionCompanies.length;

  return (
    <div className="dashboard-page">
      <section id="resumo" className="page-heading">
        <div>
          <span className="eyebrow"><Pulse size={16} weight="fill" /> Inteligência de carteira</span>
          <h1>Quem precisa da minha atenção hoje?</h1>
          <p>Sinais de comportamento, atendimento e relacionamento reunidos em uma ordem clara de ação.</p>
        </div>
        <div className="heading-controls">
          <div className="view-toggle" role="group" aria-label="Agrupar carteira">
            <button type="button" className={view === "produtos" ? "active" : ""} onClick={() => setFilter("visao", "produtos", "produtos")}>Por produto</button>
            <button type="button" className={view === "empresas" ? "active" : ""} onClick={() => setFilter("visao", "empresas", "produtos")}>Por empresa</button>
          </div>
          <label className="period-control"><span>Período analisado</span><select value={period} onChange={(event) => setFilter("periodo", event.target.value, "6")}>{periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        </div>
      </section>

      <section className="metrics-grid" aria-label="Resumo da carteira">
        <article className="metric-card metric-card--primary">
          <div className="metric-icon">{view === "produtos" ? <Package size={22} weight="duotone" /> : <Buildings size={22} weight="duotone" />}</div>
          <span>{view === "produtos" ? "Produtos ativos" : "Empresas ativas"}</span>
          <strong>{view === "produtos" ? productPortfolioSummary.activeProducts : companyPortfolioSummary.activeCompanies}</strong>
          <small>Carteira monitorada</small>
        </article>
        <article className="metric-card">
          <div className="metric-icon"><TrendDown size={22} weight="duotone" /></div>
          <span>Exigem atenção</span>
          <strong>{view === "produtos" ? productPortfolioSummary.attentionProducts : companyPortfolioSummary.attentionCompanies}</strong>
          <small>13,8% da carteira</small>
        </article>
        <article className="metric-card">
          <div className="metric-icon metric-icon--danger"><ShieldWarning size={22} weight="duotone" /></div>
          <span>Risco alto</span>
          <strong>{view === "produtos" ? productPortfolioSummary.highRiskProducts : companyPortfolioSummary.highRiskCompanies}</strong>
          <small>Ação recomendada hoje</small>
        </article>
        <article className="metric-card">
          <div className="metric-icon"><CurrencyCircleDollar size={22} weight="duotone" /></div>
          <span>Receita em atenção</span>
          <strong>{formatCurrency(view === "produtos" ? productPortfolioSummary.revenueAtAttention : companyPortfolioSummary.affectedCompanyRevenue)}</strong>
          <small>{view === "produtos" ? "Contratos diretamente expostos" : "Todos os contratos das contas afetadas"}</small>
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

      <PredictiveInsights profile="technology" />

      <section id="clientes" className="panel clients-panel">
        <div className="panel-heading panel-heading--clients">
          <div>
            <span>Ordem de ação</span>
            <h2>{view === "produtos" ? "Produtos monitorados" : "Empresas que exigem atenção"}</h2>
            <p>{visibleCount} de {totalCount} {view} na seleção atual</p>
          </div>
          <div className="filters" aria-label="Filtros de clientes">
            <label className="search-control">
              <MagnifyingGlass size={18} aria-hidden="true" />
              <span className="sr-only">Buscar produto ou empresa</span>
              <input value={search} onChange={(event) => setFilter("busca", event.target.value, "")} placeholder="Buscar produto ou empresa" />
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
              <span className="sr-only">Filtrar por produto</span>
              <select value={solution} onChange={(event) => setFilter("produto", event.target.value, "Todos")}>
                <option>Todos</option>{solutions.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>
        </div>

        {visibleCount ? (
          <div className="table-scroll">
            <table className="clients-table">
              <thead><tr><th>Prioridade</th><th>{view === "produtos" ? "Produto / empresa" : "Empresa"}</th><th>Risco</th><th>Valor mensal</th><th>{view === "produtos" ? "Plano" : "Produtos"}</th><th>Principal alerta</th><th>{view === "produtos" ? "Tendência" : "Composição"}</th><th><span className="sr-only">Ação</span></th></tr></thead>
              <tbody>
                {view === "produtos" ? filteredProducts.map((product) => {
                  const company = getCompany(product.companyId)!;
                  return <tr key={product.id} tabIndex={0} onClick={() => openProduct(product.id)} onKeyDown={(event) => { if (event.key === "Enter") openProduct(product.id); }}>
                    <td><span className="priority-number">{String(product.priority).padStart(2, "0")}</span></td>
                    <td><strong>{product.productName}</strong><small>{company.name} · {company.segment}</small></td>
                    <td><RiskBadge level={product.riskLevel} score={product.riskScore} /></td>
                    <td className="revenue-cell">{formatCurrency(product.monthlyRevenue)}</td>
                    <td><span className="solution-label">{product.plan}</span></td>
                    <td className="signal-cell">{product.primarySignal}</td>
                    <td>
                      <div className="sparkline" aria-label={`Tendência de ${product.productName}`}>
                        <ResponsiveContainer width="100%" height="100%"><LineChart data={product.trend}><Line isAnimationActive={false} type="monotone" dataKey="value" stroke={product.riskLevel === "Alto" ? "#ff6b78" : "#ffba49"} strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
                      </div>
                    </td>
                    <td><button className="table-action" type="button" onClick={(event) => { event.stopPropagation(); openProduct(product.id); }}>Ver produto <ArrowRight size={16} /></button></td>
                  </tr>;
                }) : filteredCompanies.map((portfolio, index) => <tr key={portfolio.company.id} tabIndex={0} onClick={() => openCompany(portfolio.company.id)} onKeyDown={(event) => { if (event.key === "Enter") openCompany(portfolio.company.id); }}>
                  <td><span className="priority-number">{String(index + 1).padStart(2, "0")}</span></td>
                  <td><strong>{portfolio.company.name}</strong><small>{portfolio.company.segment} · {portfolio.company.owner}</small></td>
                  <td><RiskBadge level={portfolio.riskLevel} score={portfolio.riskScore} /></td>
                  <td className="revenue-cell">{formatCurrency(portfolio.monthlyRevenue)}</td>
                  <td><span className="solution-label">{portfolio.products.length} {portfolio.products.length === 1 ? "produto" : "produtos"}</span></td>
                  <td className="signal-cell">{portfolio.criticalAlert ? `${portfolio.criticalAlert.productName}: ${portfolio.criticalAlert.primarySignal}` : portfolio.products[0]?.primarySignal}</td>
                  <td><strong>{portfolio.productsAtRisk}</strong><small> em risco</small></td>
                  <td><button className="table-action" type="button" onClick={(event) => { event.stopPropagation(); openCompany(portfolio.company.id); }}>Ver empresa <ArrowRight size={16} /></button></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <MagnifyingGlass size={30} weight="duotone" />
            <h3>Nenhum resultado encontrado</h3>
            <p>Ajuste a busca ou remova um dos filtros aplicados.</p>
            <button type="button" className="secondary-button" onClick={() => setSearchParams({})}>Limpar filtros</button>
          </div>
        )}
      </section>
    </div>
  );
}
