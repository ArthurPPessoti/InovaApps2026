import {
  ArrowLeft,
  ArrowRight,
  ChartBar,
  CheckCircle,
  CurrencyCircleDollar,
  FileCsv,
  FileXls,
  Funnel,
  MagnifyingGlass,
  ShieldWarning,
  TrendDown,
  UploadSimple,
  UsersThree,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
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
import { isSupportedSpreadsheet, useAuth } from "../auth/AuthContext";
import { RiskBadge, formatCurrency } from "../components/StatusUI";
import { PredictiveInsights } from "../components/PredictiveInsights";
import { attentionCompanies, companyPortfolioSummary, getCompany, portfolioProducts, portfolioSeries, productPortfolioSummary, segmentAttention } from "../data/mockData";

const generalPrimaryEvidence: Record<string, string> = {
  "atlas-logistica": "Volume operacional caiu 61% no período",
  "atlas-analytics": "Indicadores analíticos permanecem estáveis no período",
  "clinica-horizonte": "SLA em 71% e três ocorrências críticas",
  "varejo-nova": "Sem atividade registrada há 21 dias",
  "industria-orion": "46 ocorrências operacionais em sete dias",
  "educacional-delta": "Nenhuma das três reuniões foi realizada",
  "servicos-prisma": "Consumo contratado caiu 32%",
  "rotas-sul": "NPS detrator e chamados reabertos",
  "grupo-aurora": "Contatos ativos caíram 40%",
};

const generalActions = [
  { id: "general-action-1", title: "Validar o contexto", detail: "Conversar com o responsável para confirmar o motivo das mudanças observadas nos indicadores.", owner: "Relacionamento", urgency: "Hoje" },
  { id: "general-action-2", title: "Revisar histórico e qualidade", detail: "Comparar períodos anteriores e verificar lacunas ou alterações na origem dos dados.", owner: "Dados", urgency: "Esta semana" },
] as const;

function GeneralTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><strong>{label}</strong>{payload.map((item) => <span key={item.name}><i style={{ backgroundColor: item.color }} />{item.name}: {item.value}</span>)}</div>;
}

function SpreadsheetEmptyState() {
  return (
    <div className="general-empty-state">
      <span className="empty-data-icon"><FileXls size={34} weight="duotone" /></span>
      <span className="eyebrow">Primeira fonte de dados</span>
      <h1>Adicione uma planilha para liberar a análise.</h1>
      <p>O protótipo usará o nome do arquivo para ativar dados demonstrativos. Nenhuma linha será lida ou transmitida.</p>
      <Link className="primary-button" to="/dados">Importar Excel ou CSV <ArrowRight size={17} /></Link>
    </div>
  );
}

export function GeneralDashboardPage() {
  const { account } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const search = searchParams.get("busca") ?? "";
  const view = searchParams.get("visao") === "empresas" ? "empresas" : "produtos";
  const risk = searchParams.get("risco") ?? "Todos";
  const filteredProducts = useMemo(() => portfolioProducts.filter((product) => {
    const normalized = search.trim().toLocaleLowerCase("pt-BR");
    const company = getCompany(product.companyId)!;
    return (!normalized || `${product.productName} ${company.name}`.toLocaleLowerCase("pt-BR").includes(normalized)) && (risk === "Todos" || product.riskLevel === risk);
  }), [risk, search]);
  const filteredCompanies = useMemo(() => attentionCompanies.filter((portfolio) => {
    const normalized = search.trim().toLocaleLowerCase("pt-BR");
    return (!normalized || `${portfolio.company.name} ${portfolio.products.map((product) => product.productName).join(" ")}`.toLocaleLowerCase("pt-BR").includes(normalized)) && (risk === "Todos" || portfolio.riskLevel === risk);
  }), [risk, search]);

  if (!account?.spreadsheet) return <SpreadsheetEmptyState />;

  const setFilter = (key: string, value: string, defaultValue: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === defaultValue) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const openClient = (clientId: string) => navigate(`/clientes/${clientId}`, { state: { from: `${location.pathname}${location.search}` } });
  const openCompany = (companyId: string) => navigate(`/empresas/${companyId}`, { state: { from: `${location.pathname}${location.search}` } });
  const visibleCount = view === "produtos" ? filteredProducts.length : filteredCompanies.length;

  return (
    <div className="dashboard-page general-dashboard-page">
      <section id="resumo" className="page-heading">
        <div>
          <span className="eyebrow"><ChartBar size={16} weight="duotone" /> Análise preditiva por dados</span>
          <h1>Quais clientes merecem atenção nesta base?</h1>
          <p>Os sinais abaixo são demonstrativos e representam como as colunas confirmadas poderiam orientar a priorização.</p>
        </div>
        <div className="heading-controls"><div className="view-toggle" role="group" aria-label="Agrupar análise"><button type="button" className={view === "produtos" ? "active" : ""} onClick={() => setFilter("visao", "produtos", "produtos")}>Por produto</button><button type="button" className={view === "empresas" ? "active" : ""} onClick={() => setFilter("visao", "empresas", "produtos")}>Por empresa</button></div><Link className="source-file-chip" to="/dados"><FileXls size={18} /><span><strong>{account.spreadsheet.fileName}</strong><small>{account.spreadsheet.rows} registros</small></span></Link></div>
      </section>

      <section className="metrics-grid" aria-label="Resumo da análise">
        <article className="metric-card metric-card--primary"><div className="metric-icon"><UsersThree size={22} weight="duotone" /></div><span>{view === "produtos" ? "Produtos analisados" : "Empresas analisadas"}</span><strong>{view === "produtos" ? productPortfolioSummary.activeProducts : companyPortfolioSummary.activeCompanies}</strong><small>{account.spreadsheet.rows} linhas válidas na base</small></article>
        <article className="metric-card"><div className="metric-icon"><TrendDown size={22} weight="duotone" /></div><span>Exigem atenção</span><strong>{view === "produtos" ? productPortfolioSummary.attentionProducts : companyPortfolioSummary.attentionCompanies}</strong><small>Sinais demonstrativos</small></article>
        <article className="metric-card"><div className="metric-icon metric-icon--danger"><ShieldWarning size={22} weight="duotone" /></div><span>Risco alto</span><strong>{view === "produtos" ? productPortfolioSummary.highRiskProducts : companyPortfolioSummary.highRiskCompanies}</strong><small>Revisão recomendada</small></article>
        <article className="metric-card"><div className="metric-icon"><CurrencyCircleDollar size={22} weight="duotone" /></div><span>Receita exposta</span><strong>{formatCurrency(view === "produtos" ? productPortfolioSummary.revenueAtAttention : companyPortfolioSummary.affectedCompanyRevenue)}</strong><small>{view === "produtos" ? "Contratos em risco" : "Contas afetadas completas"}</small></article>
      </section>

      <section id="analises" className="analytics-grid">
        <article className="panel panel--wide">
          <div className="panel-heading"><div><span>Evolução</span><h2>Deterioração da carteira</h2><p>Comparação demonstrativa dos últimos seis períodos.</p></div></div>
          <div className="main-chart">
            <ResponsiveContainer width="100%" height="100%"><AreaChart data={portfolioSeries["6"]} margin={{ top: 18, right: 8, left: -22, bottom: 0 }}><defs><linearGradient id="generalRiskGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ff6b78" stopOpacity={0.38} /><stop offset="95%" stopColor="#ff6b78" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#8593ae", fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#8593ae", fontSize: 12 }} allowDecimals={false} /><Tooltip content={<GeneralTooltip />} /><Area isAnimationActive={false} type="monotone" dataKey="alto" name="Alto" stroke="#ff6b78" fill="url(#generalRiskGradient)" strokeWidth={2.5} /><Area isAnimationActive={false} type="monotone" dataKey="medio" name="Médio" stroke="#ffba49" fill="transparent" strokeWidth={2} /></AreaChart></ResponsiveContainer>
          </div>
        </article>
        <article className="panel">
          <div className="panel-heading"><div><span>Distribuição</span><h2>Atenção por segmento</h2></div></div>
          <div className="segment-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={segmentAttention} layout="vertical" margin={{ top: 4, right: 8, left: 10, bottom: 0 }}><CartesianGrid stroke="rgba(255,255,255,.05)" horizontal={false} /><XAxis type="number" hide domain={[0, 2]} /><YAxis dataKey="segment" type="category" axisLine={false} tickLine={false} width={74} tick={{ fill: "#b9b9b9", fontSize: 11 }} /><Tooltip cursor={{ fill: "rgba(255,255,255,.03)" }} content={<GeneralTooltip />} /><Bar isAnimationActive={false} dataKey="clients" name="Clientes" fill="#0156fc" radius={[0, 8, 8, 0]} barSize={13} /></BarChart></ResponsiveContainer></div>
        </article>
      </section>

      <section className="data-quality-strip" aria-label="Qualidade e limitações da análise">
        <div><CheckCircle size={20} weight="fill" /><span><strong>94% de completude</strong><small>Base demonstrativa consistente</small></span></div>
        <div><FileCsv size={20} /><span><strong>12 colunas interpretadas</strong><small>Cliente, período, receita e indicadores</small></span></div>
        <p>Sem histórico validado de saída, os resultados indicam atenção e deterioração, não probabilidade real de cancelamento.</p>
      </section>

      <PredictiveInsights profile="general" />

      <section id="clientes" className="panel clients-panel">
        <div className="panel-heading panel-heading--clients">
          <div><span>Ordem de análise</span><h2>{view === "produtos" ? "Produtos monitorados" : "Empresas que exigem atenção"}</h2><p>{visibleCount} resultados demonstrativos</p></div>
          <div className="filters">
            <label className="search-control"><MagnifyingGlass size={18} /><span className="sr-only">Buscar produto ou empresa</span><input value={search} onChange={(event) => setFilter("busca", event.target.value, "")} placeholder="Buscar produto ou empresa" /></label>
            <label className="select-control"><Funnel size={16} /><span className="sr-only">Filtrar por risco</span><select value={risk} onChange={(event) => setFilter("risco", event.target.value, "Todos")}><option>Todos</option><option>Alto</option><option>Médio</option><option>Baixo</option></select></label>
          </div>
        </div>
        <div className="table-scroll">
          <table className="clients-table general-clients-table">
            <thead><tr><th>Prioridade</th><th>{view === "produtos" ? "Produto / empresa" : "Empresa"}</th><th>Risco</th><th>Receita mensal</th><th>Evidência principal</th><th>NPS</th><th>Atraso</th><th>Ação</th></tr></thead>
            <tbody>{view === "produtos" ? filteredProducts.map((product) => { const company = getCompany(product.companyId)!; return <tr key={product.id} tabIndex={0} onClick={() => openClient(product.id)} onKeyDown={(event) => { if (event.key === "Enter") openClient(product.id); }}><td><span className="priority-number">{String(product.priority).padStart(2, "0")}</span></td><td><strong>{product.productName}</strong><small>{company.name} · {company.segment}</small></td><td><RiskBadge level={product.riskLevel} /></td><td className="revenue-cell">{formatCurrency(product.monthlyRevenue)}</td><td className="signal-cell">{generalPrimaryEvidence[product.id]}</td><td>{company.nps ?? "Sem dado"}</td><td>{company.paymentDelay ? `${company.paymentDelay} dias` : "Em dia"}</td><td><button className="table-action" type="button" onClick={(event) => { event.stopPropagation(); openClient(product.id); }}>Ver produto <ArrowRight size={14} /></button></td></tr>; }) : filteredCompanies.map((portfolio, index) => <tr key={portfolio.company.id} tabIndex={0} onClick={() => openCompany(portfolio.company.id)} onKeyDown={(event) => { if (event.key === "Enter") openCompany(portfolio.company.id); }}><td><span className="priority-number">{String(index + 1).padStart(2, "0")}</span></td><td><strong>{portfolio.company.name}</strong><small>{portfolio.company.segment} · {portfolio.products.length} produto(s)</small></td><td><RiskBadge level={portfolio.riskLevel} score={portfolio.riskScore} /></td><td>{formatCurrency(portfolio.monthlyRevenue)}</td><td className="signal-cell">{portfolio.criticalAlert ? `${portfolio.criticalAlert.productName}: ${portfolio.criticalAlert.primarySignal}` : portfolio.products[0]?.primarySignal}</td><td>{portfolio.company.nps ?? "Sem dado"}</td><td>{portfolio.company.paymentDelay ? `${portfolio.company.paymentDelay} dias` : "Em dia"}</td><td><button className="table-action" type="button" onClick={(event) => { event.stopPropagation(); openCompany(portfolio.company.id); }}>Ver empresa <ArrowRight size={14} /></button></td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <footer className="mock-footer"><UsersThree size={18} /> Dados e classificações demonstrativos. Nenhuma previsão real foi calculada.</footer>
    </div>
  );
}

export function DataPage() {
  const { account, updateSpreadsheet } = useAuth();
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState(false);

  const selectFile = (file?: File) => {
    if (!file) return;
    if (!isSupportedSpreadsheet(file.name)) {
      setError("Formato inválido. Selecione um arquivo .xlsx, .xls ou .csv.");
      setUpdated(false);
      return;
    }
    updateSpreadsheet(file.name);
    setError("");
    setUpdated(true);
  };

  return (
    <div className="data-page">
      <header className="page-heading"><div><span className="eyebrow"><FileXls size={16} weight="duotone" /> Fonte principal</span><h1>Seus dados, interpretados no seu contexto.</h1><p>Selecione um arquivo para ativar a demonstração. O conteúdo não é lido, processado ou enviado.</p></div></header>
      <section className="data-upload-panel">
        <span className="empty-data-icon"><UploadSimple size={32} /></span>
        <div><span className="eyebrow">Excel ou CSV</span><h2>{account?.spreadsheet ? "Atualize sua base de clientes" : "Adicione sua primeira base"}</h2><p>A IA real será integrada depois. Por enquanto, o sistema associa o arquivo a uma análise fixa e explicável.</p></div>
        <label className="primary-button file-button"><UploadSimple size={17} />{account?.spreadsheet ? "Trocar arquivo" : "Selecionar arquivo"}<input className="sr-only" type="file" accept=".xlsx,.xls,.csv" onChange={(event) => selectFile(event.target.files?.[0])} /></label>
      </section>
      {error && <p className="form-error data-feedback" role="alert">{error}</p>}
      {updated && <p className="form-success data-feedback" role="status"><CheckCircle size={17} weight="fill" /> Base demonstrativa atualizada.</p>}

      {account?.spreadsheet && (
        <section className="panel current-data-panel">
          <div className="panel-heading"><div><span>Base atual</span><h2>{account.spreadsheet.fileName}</h2><p>Importada em {account.spreadsheet.importedAt}</p></div><span className="connection-status connection-status--active"><CheckCircle size={14} weight="fill" /> Pronta</span></div>
          <div className="recognized-columns">
            {["cliente_id", "nome_cliente", "segmento", "periodo", "receita_mensal", "nps", "sla", "dias_atraso", "situacao"].map((column) => <span key={column}>{column}</span>)}
          </div>
          <div className="data-actions"><Link className="primary-button" to="/">Ver análise demonstrativa <ArrowRight size={17} /></Link></div>
        </section>
      )}
    </div>
  );
}

export function GeneralClientDetailPage() {
  const { clienteId } = useParams();
  const location = useLocation();
  const client = portfolioProducts.find((item) => item.id === clienteId);
  const returnTo = (location.state as { from?: string } | null)?.from ?? "/#clientes";

  if (!client) return <div className="not-found"><ShieldWarning size={42} /><h1>Cliente não encontrado</h1><p>Este registro não faz parte da base demonstrativa.</p><Link className="primary-button" to="/">Voltar ao dashboard</Link></div>;
  const company = getCompany(client.companyId)!;

  return (
    <div className="client-detail-page general-client-detail">
      <Link className="back-link" to={returnTo}><ArrowLeft size={16} /> Voltar à análise</Link>
      <section className="client-hero"><div className="client-heading"><span className="eyebrow">Registro da planilha · prioridade {client.priority}</span><div className="client-title-row"><div><h1>{client.productName}</h1><p><Link to={`/empresas/${company.id}`}>{company.name}</Link> · {company.segment} · {client.plan}</p></div><RiskBadge level={client.riskLevel} /></div></div><div className="client-value"><span>Receita mensal associada</span><strong>{formatCurrency(client.monthlyRevenue)}</strong><small>Valor demonstrativo</small></div></section>

      <section className="explanation-panel"><span className="explanation-icon"><ChartBar size={23} weight="duotone" /></span><div><strong>Por que este cliente merece atenção?</strong><p>{generalPrimaryEvidence[client.id]}. A leitura combina a tendência de atividade com atendimento, satisfação, relacionamento e situação financeira registrados na base.</p></div></section>

      <section className="client-metrics general-client-metrics">
        <div className="client-metric"><span>Engajamento</span><strong>{client.usage}%</strong><small>Coluna de atividade</small></div>
        <div className="client-metric"><span>SLA</span><strong>{client.sla}%</strong><small>Atendimento no prazo</small></div>
        <div className="client-metric"><span>NPS</span><strong>{client.nps ?? "Sem dado"}</strong><small>Satisfação registrada</small></div>
        <div className="client-metric"><span>Chamados</span><strong>{client.openTickets}</strong><small>Em aberto</small></div>
        <div className="client-metric"><span>Reuniões</span><strong>{client.meetings}</strong><small>Realizadas no período</small></div>
        <div className="client-metric"><span>Atraso</span><strong>{client.paymentDelay}d</strong><small>Financeiro</small></div>
      </section>

      <section className="detail-main-grid">
        <article className="panel"><div className="panel-heading"><div><span>Histórico da base</span><h2>Indicadores nos últimos seis períodos</h2></div></div><div className="detail-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={client.usageAndSla} margin={{ top: 14, right: 10, left: -24, bottom: 0 }}><CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#8593ae", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#8593ae", fontSize: 11 }} domain={[0, 100]} /><Tooltip content={<GeneralTooltip />} /><Line isAnimationActive={false} type="monotone" dataKey="uso" name="Engajamento" stroke="#00f3ff" strokeWidth={2.5} dot={false} /><Line isAnimationActive={false} type="monotone" dataKey="sla" name="SLA" stroke="#4779ff" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer></div></article>
        <article className="panel"><div className="panel-heading"><div><span>Próximos passos</span><h2>Ações sugeridas</h2></div></div><div className="actions-list">{generalActions.map((action, index) => <div className="action-item" key={action.id}><span className="action-index">{index + 1}</span><div><strong>{action.title}</strong><p>{action.detail}</p><small>{action.owner} · {action.urgency}</small></div></div>)}</div><p className="decision-note">Sugestões demonstrativas. A decisão permanece com a equipe responsável.</p></article>
      </section>

      <section className="panel general-evidence-panel"><div className="panel-heading"><div><span>Evidências interpretadas</span><h2>Colunas que sustentam a atenção</h2></div></div><div className="evidence-grid">
        <article><span className={`signal-severity signal-severity--${client.riskLevel.toLowerCase().replace("é", "e")}`}>{client.riskLevel}</span><strong>Tendência de atividade</strong><p>{generalPrimaryEvidence[client.id]}.</p><small>Métrica associada: atividade por período</small></article>
        <article><span className="signal-severity signal-severity--medio">Contexto</span><strong>Atendimento e satisfação</strong><p>SLA de {client.sla}% e NPS {client.nps ?? "não informado"} na base atual.</p><small>Métricas associadas: SLA, chamados e NPS</small></article>
        <article><span className="signal-severity signal-severity--medio">Contexto</span><strong>Relacionamento e financeiro</strong><p>{client.meetings} reuniões registradas e {client.paymentDelay ? `${client.paymentDelay} dias de atraso` : "pagamentos em dia"}.</p><small>Métricas associadas: reuniões e dias de atraso</small></article>
      </div></section>
      <footer className="mock-footer"><FileXls size={18} /> Leitura demonstrativa. Nenhum modelo preditivo real foi executado.</footer>
    </div>
  );
}
