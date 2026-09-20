import {
  ArrowLeft,
  ArrowRight,
  Buildings,
  CalendarBlank,
  ChartBar,
  CheckCircle,
  ClipboardText,
  Copy,
  CurrencyCircleDollar,
  EnvelopeSimple,
  Gift,
  GoogleLogo,
  Lightbulb,
  Plus,
  TrendDown,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";
import { type FormEvent, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { churnBandLabel, isAttention, primaryRiskReason } from "../churn/analysisAdapters";
import { useChurnAnalysis } from "../churn/churnAnalysis";
import { clientTechnologyTelemetry } from "../churn/technologySignals";
import type { ChurnAnalysis } from "../churn/types";
import { AddClientSheet } from "../components/AddClientSheet";
import { RiskBadge, formatCurrency } from "../components/StatusUI";
import { type RegisteredClient, useRegisteredClients } from "../data/clientRegistry";
import { attentionCompanies, companies as mockCompanies, getCompany, portfolioProducts } from "../data/mockData";
import { ProductTelemetryStatus } from "../features/portfolio/ProductTelemetryStatus";
import { usePortfolio } from "../features/portfolio/PortfolioContext";
import {
  disconnectedProductTelemetry,
  matchesTelemetryFilter,
  type TelemetryFilter,
} from "../features/portfolio/productTelemetry";
import {
  cancellationReasons,
  cancelledClients,
  defaultSurveyMessage,
  defaultSurveySubject,
  rewardOptions,
  useRetention,
} from "../retention/RetentionContext";
import type { CancellationReason, RewardConfig, SurveyCampaign, SurveyStatus } from "../types";

type ClientTab = "ativos" | "atencao" | "cancelados";

const statusLabel: Record<SurveyStatus, string> = {
  not_sent: "Não enviada",
  sent: "Enviada",
  responded: "Respondida",
};

const clientSegments = [...new Set(mockCompanies.map((company) => company.segment))].sort((a, b) => a.localeCompare(b, "pt-BR"));

function NewClientRow({ client, view }: { client: RegisteredClient; view: "produtos" | "empresas" }) {
  return (
    <tr className="new-client-row">
      <td>
        <strong>{view === "produtos" ? client.productName : client.companyName} <span className="new-badge">Novo</span></strong>
        <small>{view === "produtos" ? `${client.companyName} · ${client.plan}` : `1 produto(s) · ${client.owner}`}</small>
      </td>
      <td>{client.segment}</td>
      <td><span className="no-data-badge">Sem dados ainda</span></td>
      <td className="revenue-cell">{formatCurrency(client.monthlyRevenue)}</td>
      <td className="signal-cell">Aguardando primeiros dados</td>
      <td><span className="table-note">Detalhe após os primeiros dados</span></td>
    </tr>
  );
}

function ActiveClients({
  analysis,
  attentionOnly,
  view,
  registered,
  telemetryFilter,
  onViewChange,
  onTelemetryFilterChange,
}: {
  analysis: ChurnAnalysis | null;
  attentionOnly: boolean;
  view: "produtos" | "empresas";
  registered: RegisteredClient[];
  telemetryFilter: TelemetryFilter;
  onViewChange: (view: "produtos" | "empresas") => void;
  onTelemetryFilterChange: (filter: TelemetryFilter) => void;
}) {
  const { account } = useAuth();
  const { companies, persistedProducts, getProduct } = usePortfolio();
  const hasTelemetry = account?.profile === "technology";
  const effectiveTelemetryFilter = hasTelemetry ? telemetryFilter : "all";
  const telemetryFor = (productId: string) => getProduct(productId)?.telemetry ?? disconnectedProductTelemetry;
  const newClients = analysis || attentionOnly || effectiveTelemetryFilter === "connected" ? [] : registered;
  const visibleAnalyzedProducts = (analysis?.predictions ?? []).filter((prediction) => (
    (!attentionOnly || isAttention(prediction))
    && effectiveTelemetryFilter !== "disconnected"
  ));
  const visibleProducts = portfolioProducts.filter((product) => (
    (!attentionOnly || product.riskLevel !== "Baixo")
    && matchesTelemetryFilter(telemetryFor(product.id), effectiveTelemetryFilter)
  ));
  const visibleCompanies = attentionOnly ? attentionCompanies : attentionCompanies;
  const visiblePersistedProducts = persistedProducts.filter((product) => (
    (!attentionOnly || (product.riskProfile && product.riskProfile.riskLevel !== "Baixo"))
    && matchesTelemetryFilter(product.telemetry, effectiveTelemetryFilter)
  ));
  const persistedByCompany = useMemo(() => {
    const groups = new Map<string, typeof persistedProducts>();
    visiblePersistedProducts.forEach((product) => {
      groups.set(product.companyId, [...(groups.get(product.companyId) ?? []), product]);
    });
    return groups;
  }, [persistedProducts, visiblePersistedProducts]);
  const additionalCompanies = [...persistedByCompany.entries()]
    .filter(([companyId]) => !visibleCompanies.some((portfolio) => portfolio.company.id === companyId))
    .map(([companyId, companyProducts]) => ({
      company: companies.find((item) => item.id === companyId),
      products: companyProducts,
    }))
    .filter((item) => item.company);
  const visibleCount = view === "produtos"
    ? analysis ? visibleAnalyzedProducts.length : newClients.length + visibleProducts.length + visiblePersistedProducts.length
    : newClients.length + visibleCompanies.length + additionalCompanies.length;

  return (
    <section className="panel clients-panel lifecycle-list-panel">
      <div className="panel-heading panel-heading--clients">
        <div>
          <span>{attentionOnly ? "Ordem de ação" : "Amostra monitorada"}</span>
          <h2>{attentionOnly ? `${view === "produtos" ? "Produtos" : "Empresas"} que exigem atenção` : `${view === "produtos" ? "Produtos" : "Empresas"} com contrato ativo`}</h2>
          <p>{attentionOnly
            ? `${visibleCount} registros em atenção`
            : `${visibleCount} registros disponíveis na carteira consolidada`}</p>
        </div>
        <div className="panel-tools">
          <span id="group-label">Agrupar</span>
          <div className="view-toggle view-toggle--compact" role="group" aria-labelledby="group-label">
            <button type="button" className={view === "produtos" ? "active" : ""} aria-pressed={view === "produtos"} onClick={() => onViewChange("produtos")}>Produto</button>
            <button type="button" className={view === "empresas" ? "active" : ""} aria-pressed={view === "empresas"} onClick={() => onViewChange("empresas")}>Empresa</button>
          </div>
          {hasTelemetry && view === "produtos" && (
            <div className="telemetry-filter" role="group" aria-label="Filtrar produtos por telemetria">
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
                  onClick={() => onTelemetryFilterChange(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="table-scroll">
        <table className="clients-table lifecycle-table">
          <thead><tr><th>{view === "produtos" ? "Produto / empresa" : "Empresa"}</th><th>Segmento</th><th>Risco</th><th>Receita mensal</th><th>Evidência atual</th><th>Ação</th></tr></thead>
          <tbody>
            {newClients.map((client) => <NewClientRow key={client.id} client={client} view={view} />)}
            {view === "produtos" ? <>
            {analysis ? visibleAnalyzedProducts.map((prediction) => {
              const telemetry = hasTelemetry ? clientTechnologyTelemetry(analysis, prediction.subjectId) : undefined;
              return <tr key={prediction.subjectId}><td><strong>{prediction.subjectId}</strong><small>Cliente da base · {prediction.plan}</small>{telemetry && <ProductTelemetryStatus telemetry={{ connected: true, applicationId: prediction.subjectId, featureCount: telemetry.features.length }} />}</td><td>{prediction.segment}</td><td><span className={`churn-band churn-band--${prediction.probabilityBand.toLowerCase()}`}>{churnBandLabel[prediction.probabilityBand]} · {Math.round(prediction.probability * 100)}%</span></td><td className="revenue-cell">{formatCurrency(prediction.monthlyRevenue)}</td><td className="signal-cell">{telemetry?.summary ?? primaryRiskReason(prediction)}</td><td><Link className="table-action" to={`/clientes/${prediction.subjectId}`}>Ver produto <ArrowRight size={14} /></Link></td></tr>;
            }) : <>
            {visibleProducts.map((product) => { const company = getCompany(product.companyId)!; const telemetry = telemetryFor(product.id); return (
              <tr key={product.id}><td><strong>{product.productName}</strong><small>{company.name} · {product.plan}</small>{hasTelemetry && <ProductTelemetryStatus telemetry={telemetry} />}</td><td>{company.segment}</td><td><RiskBadge level={product.riskLevel} score={product.riskScore} /></td><td className="revenue-cell">{formatCurrency(product.monthlyRevenue)}</td><td className="signal-cell">{hasTelemetry ? product.primarySignal : `SLA ${product.sla}% · NPS ${company.nps ?? "sem dado"}`}</td><td><Link className="table-action" to={`/clientes/${product.id}`}>Ver produto <ArrowRight size={14} /></Link></td></tr>
            ); })}
            {visiblePersistedProducts.map((product) => {
              const risk = product.riskProfile;
              return (
                <tr key={product.id}><td><strong>{product.productName}</strong><small>{product.companyName} · {risk ? `${risk.plan}${risk.source === "demo" ? " · Exemplo demonstrativo" : ""}` : "Dados comerciais não informados"}</small>{hasTelemetry && <ProductTelemetryStatus telemetry={product.telemetry} />}</td><td>{risk?.segment ?? "Não informado"}</td><td>{risk ? <RiskBadge level={risk.riskLevel} score={risk.riskScore} /> : "Sem dados"}</td><td className="revenue-cell">{risk ? formatCurrency(risk.monthlyRevenue) : "Não informado"}</td><td className="signal-cell">{risk?.primarySignal ?? "Sem evidência comercial"}</td><td><Link className="table-action" to={`/clientes/${product.id}`}>Ver produto <ArrowRight size={14} /></Link></td></tr>
              );
            })}
            </>}
          </> : <>
            {visibleCompanies.map((portfolio) => {
              const extraProducts = persistedByCompany.get(portfolio.company.id)?.length ?? 0;
              return <tr key={portfolio.company.id}><td><strong>{portfolio.company.name}</strong><small>{portfolio.products.length + extraProducts} produto(s) · {portfolio.company.owner}</small></td><td>{portfolio.company.segment}</td><td><RiskBadge level={portfolio.riskLevel} score={portfolio.riskScore} /></td><td>{formatCurrency(portfolio.monthlyRevenue)}</td><td className="signal-cell">{portfolio.criticalAlert ? `${portfolio.criticalAlert.productName}: ${portfolio.criticalAlert.primarySignal}` : portfolio.products[0]?.primarySignal}</td><td><Link className="table-action" to={`/empresas/${portfolio.company.id}`}>Ver empresa <ArrowRight size={14} /></Link></td></tr>;
            })}
            {additionalCompanies.map(({ company, products: companyProducts }) => <tr key={company!.id}><td><strong>{company!.name}</strong><small>{companyProducts.length} produto(s) · Dados comerciais não informados</small></td><td>Não informado</td><td>Sem dados</td><td>Não informado</td><td className="signal-cell">Aguardando dados</td><td><Link className="table-action" to={`/empresas/${company!.id}`}>Ver empresa <ArrowRight size={14} /></Link></td></tr>)}
          </>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CancelledClients() {
  const { campaigns, responses } = useRetention();
  const sentCount = Object.values(campaigns).filter((item) => item.status !== "not_sent").length;
  const responseCount = Object.values(responses).length;
  const willingCount = Object.values(responses).filter((item) => item.returnIntent !== "no").length;
  const lostRevenue = cancelledClients.reduce((sum, client) => sum + client.monthlyRevenueLost, 0);
  const averageLeadTime = Math.round(cancelledClients.reduce((sum, client) => sum + client.firstSignalDays, 0) / cancelledClients.length);
  const reasonCounts = cancellationReasons.map((reason) => ({ reason, value: cancelledClients.filter((client) => client.reason === reason).length })).filter((item) => item.value);
  const monthCounts = ["Mai", "Jun", "Jul", "Ago", "Set"].map((month) => ({ month, value: cancelledClients.filter((client) => client.cancellationMonth === month).length }));

  return (
    <div className="cancelled-content">
      <section className="retention-metrics" aria-label="Indicadores dos cancelamentos">
        <article><span className="retention-metric-icon retention-metric-icon--loss"><TrendDown size={21} /></span><small>Cancelados</small><strong>{cancelledClients.length}</strong><p>No histórico demonstrativo</p></article>
        <article><span className="retention-metric-icon retention-metric-icon--loss"><CurrencyCircleDollar size={21} /></span><small>Receita mensal perdida</small><strong>R$ 108,5 mil</strong><p>{formatCurrency(lostRevenue)} reconciliados</p></article>
        <article><span className="retention-metric-icon"><EnvelopeSimple size={21} /></span><small>Taxa de resposta</small><strong>{sentCount ? Math.round((responseCount / sentCount) * 100) : 0}%</strong><p>{responseCount} de {sentCount} convites</p></article>
        <article><span className="retention-metric-icon"><UsersThree size={21} /></span><small>Abertos a conversar</small><strong>{willingCount}</strong><p>Sim ou talvez no retorno</p></article>
      </section>

      <section className="retention-insight">
        <span><Lightbulb size={25} weight="duotone" /></span>
        <div><small>Aprendizado da carteira</small><h2>Dois cancelados citaram baixo valor percebido.</h2><p>Cinco clientes ativos apresentam sinais semelhantes. Relação demonstrativa para orientar uma conversa preventiva.</p></div>
        <Link className="secondary-button" to="/?risco=Médio#clientes">Ver clientes semelhantes</Link>
      </section>

      <section className="retention-analytics">
        <article className="panel">
          <div className="panel-heading"><div><span>Motivos</span><h2>Por que os clientes saíram</h2></div></div>
          <div className="reason-bars">{reasonCounts.map((item) => <div key={item.reason}><div><span>{item.reason}</span><strong>{item.value}</strong></div><i><b style={{ width: `${(item.value / 2) * 100}%` }} /></i></div>)}</div>
        </article>
        <article className="panel">
          <div className="panel-heading"><div><span>Linha do tempo</span><h2>Cancelamentos por mês</h2></div><strong className="average-signal">{averageLeadTime} dias<small>entre sinal e saída</small></strong></div>
          <div className="month-bars">{monthCounts.map((item) => <div key={item.month}><span><i style={{ height: `${28 + item.value * 54}px` }} /></span><strong>{item.value}</strong><small>{item.month}</small></div>)}</div>
        </article>
      </section>

      <section className="panel clients-panel cancelled-table-panel">
        <div className="panel-heading panel-heading--clients"><div><span>Pós-cancelamento</span><h2>Pesquisa e aprendizado individual</h2><p>Envios manuais, identificados e demonstrativos.</p></div></div>
        <div className="table-scroll">
          <table className="clients-table cancelled-table">
            <thead><tr><th>Cliente</th><th>Cancelamento</th><th>Motivo</th><th>Receita perdida</th><th>Primeiro sinal</th><th>Pesquisa</th><th>Ação</th></tr></thead>
            <tbody>{cancelledClients.map((client) => {
              const status = campaigns[client.id]?.status ?? "not_sent";
              const company = getCompany(client.companyId)!;
              return <tr key={client.id}><td><strong>{client.productName}</strong><small>{company.name} · {company.segment}</small></td><td>{client.cancelledAt}</td><td>{client.reason}</td><td className="lost-revenue">{formatCurrency(client.monthlyRevenueLost)}</td><td>{client.firstSignalDays} dias antes</td><td><span className={`survey-status survey-status--${status}`}>{statusLabel[status]}</span></td><td><Link className="table-action" to={`/clientes/cancelados/${client.id}`}>Abrir <ArrowRight size={14} /></Link></td></tr>;
            })}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function ClientsPage() {
  const { account } = useAuth();
  const { analysis } = useChurnAnalysis(account?.id);
  const { persistedProducts, companies } = usePortfolio();
  const registered = useRegisteredClients();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("status") as ClientTab | null) ?? "atencao";
  const view = searchParams.get("visao") === "empresas" ? "empresas" : "produtos";
  const telemetryFilter: TelemetryFilter = searchParams.get("telemetria") === "conectada"
    ? "connected"
    : searchParams.get("telemetria") === "desconectada" ? "disconnected" : "all";
  const activeCompanyCount = new Set([
    ...attentionCompanies.map((portfolio) => portfolio.company.id),
    ...persistedProducts.map((product) => product.companyId),
  ]).size + registered.length;
  const setParam = (key: string, value: string, defaultValue: string) => { const next = new URLSearchParams(searchParams); if (value === defaultValue) next.delete(key); else next.set(key, value); setSearchParams(next, { replace: true }); };
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addedMessage, setAddedMessage] = useState("");

  const handleSaved = (client: RegisteredClient) => {
    setSheetOpen(false);
    setAddedMessage(`${client.companyName} foi adicionada à carteira ativa.`);
    setParam("status", "ativos", "atencao");
  };

  return (
    <div className="clients-lifecycle-page">
      <header className="page-heading">
        <div><span className="eyebrow"><Buildings size={16} weight="duotone" /> Ciclo de relacionamento</span><h1>Clientes antes, durante e depois do risco.</h1><p>Acompanhe quem precisa de atenção e transforme cancelamentos em aprendizado para a carteira ativa.</p></div>
        <button type="button" className="primary-button" onClick={() => setSheetOpen(true)}><Plus size={17} weight="bold" /> Adicionar cliente</button>
      </header>
      <div className="lifecycle-tabs" role="tablist" aria-label="Situação dos clientes">
        <button type="button" role="tab" aria-selected={tab === "ativos"} className={tab === "ativos" ? "active" : ""} onClick={() => setParam("status", "ativos", "atencao")}>Ativos <span>{view === "produtos" ? analysis?.predictions.length ?? portfolioProducts.length + persistedProducts.length + registered.length : activeCompanyCount}</span></button>
        <button type="button" role="tab" aria-selected={tab === "atencao"} className={tab === "atencao" ? "active" : ""} onClick={() => setParam("status", "atencao", "atencao")}>Em atenção <span>{view === "produtos" ? analysis?.predictions.filter(isAttention).length ?? portfolioProducts.filter((product) => product.riskLevel !== "Baixo").length : attentionCompanies.length}</span></button>
        <button type="button" role="tab" aria-selected={tab === "cancelados"} className={tab === "cancelados" ? "active" : ""} onClick={() => setParam("status", "cancelados", "atencao")}>Cancelados <span>{cancelledClients.length}</span></button>
      </div>
      <p className="client-added" role="status">{addedMessage && <><CheckCircle size={16} weight="fill" /> {addedMessage}</>}</p>
      {tab === "cancelados" ? <CancelledClients /> : (
        <ActiveClients
          analysis={analysis}
          attentionOnly={tab === "atencao"}
          view={view}
          registered={registered}
          telemetryFilter={telemetryFilter}
          onViewChange={(next) => setParam("visao", next, "produtos")}
          onTelemetryFilterChange={(filter) => setParam(
            "telemetria",
            filter === "connected" ? "conectada" : filter === "disconnected" ? "desconectada" : "todas",
            "todas",
          )}
        />
      )}
      <AddClientSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSaved={handleSaved}
        segments={clientSegments}
        existingNames={[...companies.map((company) => company.name), ...registered.map((client) => client.companyName)]}
        requireExternalId={account?.profile === "technology"}
      />
    </div>
  );
}

export function CancelledClientDetailPage() {
  const { clienteId } = useParams();
  const { account } = useAuth();
  const { campaigns, responses, sendSurvey } = useRetention();
  const client = cancelledClients.find((item) => item.id === clienteId);
  const currentCampaign = client ? campaigns[client.id] : undefined;
  const currentResponse = currentCampaign?.token ? responses[currentCampaign.token] : undefined;
  const [subject, setSubject] = useState(currentCampaign?.subject ?? defaultSurveySubject);
  const [message, setMessage] = useState(currentCampaign?.message ?? defaultSurveyMessage);
  const [recipient, setRecipient] = useState("");
  const [rewardType, setRewardType] = useState<RewardConfig["type"]>(currentCampaign?.reward.type ?? "consulting");
  const [customReward, setCustomReward] = useState(currentCampaign?.reward.type === "custom" ? currentCampaign.reward.label : "");
  const [sentToken, setSentToken] = useState(currentCampaign?.token ?? "");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [previewMode, setPreviewMode] = useState<"email" | "survey">("email");
  const [gmailOpened, setGmailOpened] = useState(false);
  const [draftToken] = useState(() => `${clienteId ?? "cliente"}-${crypto.randomUUID()}`);

  if (!client) return <div className="not-found"><WarningCircle size={42} /><h1>Cliente cancelado não encontrado</h1><Link className="primary-button" to="/clientes?status=cancelados">Voltar aos clientes</Link></div>;
  const company = getCompany(client.companyId)!;

  const selectedReward = rewardOptions.find((item) => item.type === rewardType) ?? rewardOptions[0];
  const reward: RewardConfig = rewardType === "custom" ? { ...selectedReward, label: customReward.trim() || "Benefício personalizado" } : selectedReward;
  const signals = account?.profile === "technology" ? client.technologySignals : client.dataSignals;
  const surveyQuery = new URLSearchParams({ product: client.id, rewardType: reward.type, reward: reward.label });
  const draftSurveyUrl = `${window.location.origin}/pesquisa/${draftToken}?${surveyQuery}`;
  const sentSurveyUrl = sentToken ? `${window.location.origin}/pesquisa/${sentToken}?${surveyQuery}` : "";
  const emailBody = `Olá, equipe da ${company.name}.\n\nGostaríamos de ouvir sua experiência com o produto ${client.productName}.\n\n${message.trim()}${reward.type !== "none" ? `\n\nComo agradecimento pela participação: ${reward.label}. Validade de 30 dias.` : ""}\n\nResponder pesquisa: ${draftSurveyUrl}\n\nO link identifica a resposta para análise da experiência e eventual contato. A participação é opcional.`;
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipient.trim())}&su=${encodeURIComponent(subject.trim())}&body=${encodeURIComponent(emailBody)}`;
  const mailtoUrl = `mailto:${encodeURIComponent(recipient.trim())}?subject=${encodeURIComponent(subject.trim())}&body=${encodeURIComponent(emailBody)}`;

  const submitCampaign = (event: FormEvent) => {
    event.preventDefault();
    if (rewardType === "custom" && !customReward.trim()) {
      setError("Descreva o benefício personalizado.");
      return;
    }
    setError("");
    window.open(gmailUrl, "_blank", "noopener,noreferrer");
    setGmailOpened(true);
  };

  const confirmSent = () => {
    setSentToken(sendSurvey(client.id, subject.trim(), message.trim(), reward, draftToken));
    setGmailOpened(false);
  };

  const copyLink = () => {
    if (!sentSurveyUrl) return;
    navigator.clipboard?.writeText(sentSurveyUrl).catch(() => undefined);
    setCopied(true);
  };

  return (
    <div className="cancelled-detail-page">
      <Link className="back-link" to="/clientes?status=cancelados"><ArrowLeft size={16} /> Voltar aos cancelados</Link>
      <section className="cancelled-hero">
        <div><span className="eyebrow"><TrendDown size={16} /> Produto cancelado</span><h1>{client.productName}</h1><p>{company.name} · {company.segment} · {client.plan}</p></div>
        <div className="cancelled-value"><small>Receita mensal perdida</small><strong>{formatCurrency(client.monthlyRevenueLost)}</strong><span>{client.cancelledAt}</span></div>
      </section>

      <section className="cancelled-summary-grid">
        <article><small>Motivo registrado</small><strong>{client.reason}</strong><p>Informação demonstrativa</p></article>
        <article><small>Primeiro sinal</small><strong>{client.firstSignalDays} dias antes</strong><p>Janela potencial de atuação</p></article>
        <article><small>Status da pesquisa</small><strong>{statusLabel[currentCampaign?.status ?? "not_sent"]}</strong><p>{currentCampaign?.sentAt ?? "Aguardando envio manual"}</p></article>
      </section>

      <section className="cancelled-detail-grid">
        <article className="panel">
          <div className="panel-heading"><div><span>Histórico</span><h2>Jornada até o encerramento</h2></div></div>
          <div className="relationship-timeline">{client.relationshipHistory.map((item) => <div key={`${item.date}-${item.title}`}><span>{item.date}</span><i /><div><strong>{item.title}</strong><p>{item.detail}</p></div></div>)}</div>
        </article>
        <article className="panel">
          <div className="panel-heading"><div><span>{account?.profile === "technology" ? "Contexto interno" : "Evidências da planilha"}</span><h2>Sinais anteriores à saída</h2></div></div>
          <div className="pre-cancel-signals">{signals.map((signal, index) => <div key={signal}><span>{String(index + 1).padStart(2, "0")}</span><p>{signal}</p></div>)}</div>
          <p className="privacy-note"><WarningCircle size={17} /> Estes dados orientam a equipe internamente e nunca aparecem na mensagem enviada ao cliente.</p>
        </article>
      </section>

      {currentResponse && (
        <section className="response-panel">
          <div className="response-heading"><span><CheckCircle size={24} weight="fill" /></span><div><small>Resposta recebida</small><h2>O cliente explicou sua decisão.</h2><p>{currentResponse.answeredAt}</p></div></div>
          <div className="response-grid"><div><small>Motivo</small><strong>{currentResponse.reason}</strong></div><div><small>Possibilidade de retorno</small><strong>{currentResponse.returnIntent === "yes" ? "Sim" : currentResponse.returnIntent === "maybe" ? "Talvez" : "Não"}</strong></div><div><small>O que faltou</small><p>{currentResponse.missing}</p></div><div><small>O que poderia evitar</small><p>{currentResponse.prevention}</p></div></div>
        </section>
      )}

      <section className="campaign-layout">
        <form className="panel campaign-form" onSubmit={submitCampaign}>
          <div className="panel-heading"><div><span>Envio manual</span><h2>Preparar pesquisa de saída</h2><p>O Gmail abrirá a mensagem pronta para sua revisão e envio.</p></div><EnvelopeSimple size={25} /></div>
          <label>Destinatário<input type="email" required value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="cliente@empresa.com" /></label>
          <label>Assunto<input required value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
          <label>Mensagem<textarea required rows={5} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
          <label>Benefício<select value={rewardType} onChange={(event) => setRewardType(event.target.value as RewardConfig["type"])}>{rewardOptions.map((item) => <option value={item.type} key={item.type}>{item.label}</option>)}</select></label>
          {rewardType === "custom" && <label>Descrição do benefício<input value={customReward} onChange={(event) => setCustomReward(event.target.value)} placeholder="Ex.: 2 horas de consultoria" /></label>}
          <div className="reward-validity"><CalendarBlank size={17} /> Validade demonstrativa de 30 dias</div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit"><GoogleLogo size={18} weight="bold" /> Abrir no Gmail</button>
          <a className="mailto-option" href={mailtoUrl}><EnvelopeSimple size={15} /> Usar outro aplicativo de e-mail</a>
          {gmailOpened && <div className="gmail-confirm" role="status"><GoogleLogo size={20} /><div><strong>O Gmail foi aberto em outra aba</strong><small>O navegador não consegue verificar o envio. Confirme somente depois de clicar em Enviar no Gmail.</small></div><button type="button" onClick={confirmSent}><CheckCircle size={16} /> Confirmar que enviei</button></div>}
          {sentToken && <div className="campaign-sent" role="status"><CheckCircle size={18} weight="fill" /><div><strong>Envio confirmado</strong><small>Confirmação manual salva neste navegador.</small></div><button type="button" onClick={copyLink}><Copy size={16} /> {copied ? "Copiado" : "Copiar link"}</button><a href={sentSurveyUrl} target="_blank" rel="noreferrer">Abrir pesquisa <ArrowRight size={14} /></a></div>}
        </form>

        <article className="email-preview campaign-preview">
          <div className="email-preview-bar">
            <span /><span /><span />
            <div className="preview-tabs" role="tablist" aria-label="Tipo de visualização">
              <button type="button" role="tab" aria-selected={previewMode === "email"} className={previewMode === "email" ? "active" : ""} onClick={() => setPreviewMode("email")}>E-mail</button>
              <button type="button" role="tab" aria-selected={previewMode === "survey"} className={previewMode === "survey" ? "active" : ""} onClick={() => setPreviewMode("survey")}>Pesquisa</button>
            </div>
            <small>{previewMode === "email" ? "Prévia do e-mail" : "Prévia da pesquisa"}</small>
          </div>
          {previewMode === "email" ? (
            <div className="email-preview-content"><img src="/brand/globalsys-logo.svg" alt="Globalsys" /><small>Para: {recipient || `contato da ${company.name}`}</small><h2>{subject}</h2><p>Olá, equipe da {company.name}.</p><p>Gostaríamos de ouvir sua experiência com o produto <strong>{client.productName}</strong>.</p><p>{message}</p>{reward.type !== "none" && <div className="email-reward"><Gift size={21} /><span><small>Agradecimento pela participação</small><strong>{reward.label}</strong></span></div>}<span className="email-cta">Responder pesquisa</span><p className="email-privacy">O link identifica sua resposta para que possamos compreender a experiência e, se você permitir, entrar em contato. A participação é opcional.</p></div>
          ) : (
            <div className="survey-inline-preview">
              <img src="/brand/globalsys-logo.svg" alt="Globalsys" />
              <span className="eyebrow"><ClipboardText size={14} /> Pesquisa de experiência</span>
              <h2>Sua perspectiva pode melhorar as próximas experiências.</h2>
              <p>Olá, equipe da {company.name}. A pesquisa é sobre {client.productName}, tem cinco perguntas e leva cerca de três minutos.</p>
              {reward.type !== "none" && <div className="inline-preview-reward"><Gift size={18} /><span><small>Benefício pela participação</small><strong>{reward.label}</strong></span></div>}
              <div className="inline-question"><strong><span>01</span> Qual foi o principal motivo do cancelamento?</strong><select disabled><option>{client.reason}</option></select></div>
              <div className="inline-question"><strong><span>02</span> O que estava faltando no produto ou serviço?</strong><textarea disabled rows={2} placeholder="Campo de resposta" /></div>
              <div className="inline-question"><strong><span>03</span> O que poderia ter evitado o cancelamento?</strong><textarea disabled rows={2} placeholder="Campo de resposta" /></div>
              <div className="inline-question"><strong><span>04</span> Você consideraria voltar no futuro?</strong><div className="inline-options"><span>Sim</span><span>Talvez</span><span>Não</span></div></div>
              <div className="inline-question"><strong><span>05</span> Deseja acrescentar alguma observação?</strong><textarea disabled rows={2} placeholder="Campo opcional" /></div>
              <div className="inline-consent"><i /> A resposta será associada à {company.name} e ao produto {client.productName} para análise da experiência e eventual contato.</div>
              <span className="inline-submit">Enviar resposta</span>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

export function SurveyPage() {
  const { token = "" } = useParams();
  const [searchParams] = useSearchParams();
  const { responses, getCampaignByToken, submitResponse } = useRetention();
  const storedCampaign = getCampaignByToken(token);
  const fallbackClientId = searchParams.get("product") ?? searchParams.get("client") ?? (token.endsWith("-demo") ? token.slice(0, -5) : "");
  const client = cancelledClients.find((item) => item.id === (storedCampaign?.productId ?? fallbackClientId));
  const rewardType = searchParams.get("rewardType") as RewardConfig["type"] | null;
  const fallbackReward = rewardOptions.find((item) => item.type === rewardType) ?? rewardOptions[0];
  const campaignBase: SurveyCampaign | undefined = storedCampaign ?? (client ? {
    productId: client.id,
    status: "sent",
    subject: defaultSurveySubject,
    message: defaultSurveyMessage,
    reward: { ...fallbackReward, label: searchParams.get("reward") || fallbackReward.label },
    token,
  } : undefined);
  const campaign = campaignBase && searchParams.get("reward") ? { ...campaignBase, reward: { ...fallbackReward, label: searchParams.get("reward") || fallbackReward.label } } : campaignBase;
  const existingResponse = responses[token];
  const [reason, setReason] = useState<CancellationReason>(client?.reason ?? "Baixo valor percebido");
  const [missing, setMissing] = useState("");
  const [prevention, setPrevention] = useState("");
  const [returnIntent, setReturnIntent] = useState<"yes" | "maybe" | "no">("maybe");
  const [comment, setComment] = useState("");
  const [consent, setConsent] = useState(false);
  const response = existingResponse;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!consent || !missing.trim() || !prevention.trim()) return;
    submitResponse(token, { reason, missing: missing.trim(), prevention: prevention.trim(), returnIntent, comment: comment.trim(), consent: true }, campaign);
  };

  if (!campaign || !client) return <main className="public-survey-page"><section className="survey-card survey-invalid"><WarningCircle size={40} /><h1>Este link de pesquisa não está disponível.</h1><p>Confira o endereço recebido ou entre em contato com a empresa responsável.</p></section></main>;
  const company = getCompany(client.companyId)!;

  if (response) return (
    <main className="public-survey-page"><section className="survey-card survey-complete"><img src="/brand/globalsys-logo.svg" alt="Globalsys" /><span className="survey-success-icon"><CheckCircle size={36} weight="fill" /></span><small>Resposta registrada</small><h1>Obrigado por compartilhar sua experiência.</h1><p>Seu feedback será usado para melhorar o produto e o relacionamento com outros clientes.</p>{campaign.reward.type !== "none" && <div className="survey-reward"><Gift size={25} /><span><small>Benefício liberado por 30 dias</small><strong>{campaign.reward.label}</strong><code>FEEDBACK-2026</code></span></div>}<p className="survey-footnote">O benefício reconhece sua participação e não depende do conteúdo da avaliação.</p></section></main>
  );

  return (
    <main className="public-survey-page">
      <section className="survey-intro"><img src="/brand/globalsys-logo.svg" alt="Globalsys" /><span className="eyebrow"><ClipboardText size={16} /> Pesquisa de experiência</span><h1>Sua perspectiva pode melhorar as próximas experiências.</h1><p>Olá, equipe da {company.name}. Esta pesquisa é sobre o produto <strong>{client.productName}</strong>. São cinco perguntas e leva cerca de três minutos.</p>{campaign.reward.type !== "none" && <div><Gift size={19} /><span><small>Benefício pela participação</small><strong>{campaign.reward.label}</strong></span></div>}</section>
      <form className="survey-card survey-form" onSubmit={submit}>
        <div className="survey-question"><label htmlFor="survey-reason"><span>01</span><strong>Qual foi o principal motivo do cancelamento?</strong></label><select id="survey-reason" value={reason} onChange={(event) => setReason(event.target.value as CancellationReason)}>{cancellationReasons.map((item) => <option key={item}>{item}</option>)}</select></div>
        <div className="survey-question"><label htmlFor="survey-missing"><span>02</span><strong>O que estava faltando no produto ou serviço?</strong></label><textarea id="survey-missing" required rows={3} value={missing} onChange={(event) => setMissing(event.target.value)} /></div>
        <div className="survey-question"><label htmlFor="survey-prevention"><span>03</span><strong>O que poderia ter evitado o cancelamento?</strong></label><textarea id="survey-prevention" required rows={3} value={prevention} onChange={(event) => setPrevention(event.target.value)} /></div>
        <fieldset className="survey-question"><legend><span>04</span><strong>Você consideraria voltar no futuro?</strong></legend><div className="survey-choice-row">{([{"value":"yes","label":"Sim"},{"value":"maybe","label":"Talvez"},{"value":"no","label":"Não"}] as const).map((item) => <label key={item.value}><input type="radio" name="returnIntent" value={item.value} checked={returnIntent === item.value} onChange={() => setReturnIntent(item.value)} /><span>{item.label}</span></label>)}</div></fieldset>
        <div className="survey-question"><label htmlFor="survey-comment"><span>05</span><strong>Deseja acrescentar alguma observação?</strong><small>Opcional</small></label><textarea id="survey-comment" rows={3} value={comment} onChange={(event) => setComment(event.target.value)} /></div>
        <label className="survey-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required /><span>Entendo que esta resposta será associada à {company.name} e ao produto {client.productName} para análise da experiência e eventual contato. A participação é opcional.</span></label>
        <button className="primary-button survey-submit" type="submit">Enviar resposta <ArrowRight size={17} /></button>
      </form>
      <footer className="survey-public-footer"><ChartBar size={17} /> Ambiente demonstrativo. Nenhum dado é transmitido.</footer>
    </main>
  );
}
