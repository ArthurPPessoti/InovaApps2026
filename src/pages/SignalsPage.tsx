import {
  ArrowRight,
  ClockCountdown,
  CurrencyCircleDollar,
  EyeSlash,
  Funnel,
  Pulse,
  TrendDown,
  WarningDiamond,
} from "@phosphor-icons/react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RiskBadge, Variation, formatCurrency } from "../components/StatusUI";
import { allSignals, clients, watchClients } from "../data/mockData";
import { cancelledClients } from "../retention/RetentionContext";
import type { CancellationReason, ClientMock, SignalDimension } from "../types";
import { ChartTooltip } from "./DashboardPage";

const reasonDimension: Record<CancellationReason, SignalDimension> = {
  "Falta de integração": "Integração",
  Estabilidade: "Integração",
  Atendimento: "Atendimento",
  "Baixo valor percebido": "Uso",
  "Mudança estratégica": "Relacionamento",
  "Preço e orçamento": "Financeiro",
};

const dimensions: SignalDimension[] = ["Uso", "Integração", "Atendimento", "Relacionamento", "Financeiro"];
const allClients = [...clients, ...watchClients];
const signalClients = [...new Map(allSignals.map(({ client }) => [client.id, client])).values()];
const revenueWithSignals = signalClients.reduce((sum, client) => sum + client.monthlyRevenue, 0);
const highSignals = allSignals.filter((signal) => signal.severity === "Alto").length;
const criticalFeatures = allClients.flatMap((client) => client.features.filter((feature) => feature.status === "Crítico").map((feature) => ({ feature, client })));
const averageLeadTime = Math.round(cancelledClients.reduce((sum, client) => sum + client.firstSignalDays, 0) / cancelledClients.length);

const clientsByDimension = (dimension: SignalDimension) =>
  signalClients.filter((client) => client.signals.some((signal) => signal.dimension === dimension));

const revenueByDimension = dimensions
  .map((dimension) => ({ dimension, receita: Math.round(clientsByDimension(dimension).reduce((sum, client) => sum + client.monthlyRevenue, 0) / 1000) }))
  .filter((item) => item.receita > 0)
  .sort((a, b) => b.receita - a.receita);

const steepestDrops = allClients
  .flatMap((client) => client.features.filter((feature) => feature.variation <= -30).map((feature) => ({ feature, client })))
  .sort((a, b) => a.feature.variation - b.feature.variation)
  .slice(0, 6);

const severityClass = (severity: string) => severity.toLowerCase().replace("é", "e");

export function SignalsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const severity = searchParams.get("gravidade") ?? "Todas";
  const dimension = searchParams.get("dimensao") ?? "Todas";

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "Todas") next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const openClient = (clientId: string) => navigate(`/clientes/${clientId}`, { state: { from: `${location.pathname}${location.search}` } });

  const filteredSignals = allSignals.filter(
    (signal) => (severity === "Todas" || signal.severity === severity) && (dimension === "Todas" || signal.dimension === dimension),
  );

  return (
    <div className="dashboard-page signals-page">
      <section className="page-heading">
        <div>
          <span className="eyebrow"><Pulse size={16} weight="fill" /> Sinais da carteira</span>
          <h1>Onde o valor está escapando agora?</h1>
          <p>Mudanças de comportamento captadas pelo tracking, organizadas por impacto e comparadas com o que antecedeu saídas reais.</p>
        </div>
      </section>

      <section className="metrics-grid" aria-label="Resumo dos sinais">
        <article className="metric-card metric-card--primary">
          <div className="metric-icon"><Pulse size={22} weight="duotone" /></div>
          <span>Sinais ativos</span>
          <strong>{allSignals.length}</strong>
          <small>{highSignals} altos · {allSignals.length - highSignals} médios</small>
        </article>
        <article className="metric-card">
          <div className="metric-icon"><CurrencyCircleDollar size={22} weight="duotone" /></div>
          <span>Receita ligada aos sinais</span>
          <strong>{formatCurrency(revenueWithSignals)}</strong>
          <small>Mensal · {signalClients.length} clientes</small>
        </article>
        <article className="metric-card">
          <div className="metric-icon metric-icon--danger"><TrendDown size={22} weight="duotone" /></div>
          <span>Funções críticas em queda</span>
          <strong>{criticalFeatures.length}</strong>
          <small>Em {new Set(criticalFeatures.map(({ client }) => client.id)).size} clientes</small>
        </article>
        <article className="metric-card">
          <div className="metric-icon"><ClockCountdown size={22} weight="duotone" /></div>
          <span>Janela para agir</span>
          <strong>{averageLeadTime} dias</strong>
          <small>Média entre primeiro sinal e cancelamento</small>
        </article>
      </section>

      <section className="panel silent-panel" aria-labelledby="silent-title">
        <div className="panel-heading">
          <div>
            <span><EyeSlash size={12} weight="bold" /> Riscos silenciosos</span>
            <h2 id="silent-title">Contas saudáveis perdendo uma função crítica</h2>
            <p>A saúde geral ainda não mudou, por isso essas contas não aparecem na ordem de ação. É aqui que a perda de valor começa.</p>
          </div>
        </div>
        <div className="silent-grid">
          {watchClients.map((client) => <SilentRiskCard key={client.id} client={client} onOpen={openClient} />)}
        </div>
      </section>

      <section className="analytics-grid">
        <article className="panel panel--wide">
          <div className="panel-heading">
            <div><span>Concentração</span><h2>Receita mensal exposta por dimensão</h2><p>Em R$ mil. Um cliente conta uma vez em cada dimensão com sinal.</p></div>
          </div>
          <div className="segment-chart" aria-label="Gráfico de receita exposta por dimensão">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByDimension} layout="vertical" margin={{ top: 4, right: 12, left: 10, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,.05)" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#8593ae", fontSize: 11 }} />
                <YAxis dataKey="dimension" type="category" axisLine={false} tickLine={false} width={104} tick={{ fill: "#b9b9b9", fontSize: 11 }} />
                <Tooltip cursor={{ fill: "rgba(255,255,255,.03)" }} content={<ChartTooltip />} />
                <Bar isAnimationActive={false} dataKey="receita" name="R$ mil" fill="#0156fc" radius={[0, 8, 8, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div><span>Funcionalidades</span><h2>Maiores quedas de uso</h2></div>
          </div>
          <ul className="drop-list">
            {steepestDrops.map(({ feature, client }) => (
              <li key={`${client.id}-${feature.id}`}>
                <button type="button" onClick={() => openClient(client.id)}>
                  <span><strong>{feature.name}</strong><small>{client.name}</small></span>
                  <Variation value={feature.variation} />
                </button>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="signals-section">
        <div className="section-heading">
          <div><span>Aprendizado com cancelamentos</span><h2>Sinais que já antecederam saídas</h2></div>
          <p>Cada cliente que saiu deixou um rastro. Estes são os ativos que mostram o mesmo tipo de sinal hoje.</p>
        </div>
        <div className="precedent-grid">
          {cancelledClients.map((cancelled) => {
            const precedentDimension = reasonDimension[cancelled.reason];
            const matches = clientsByDimension(precedentDimension);
            return (
              <article key={cancelled.id} className="precedent-card">
                <div className="precedent-card__head">
                  <span className="dimension-tag">{precedentDimension}</span>
                  <small>{cancelled.firstSignalDays} dias de antecedência</small>
                </div>
                <strong>{cancelled.name}</strong>
                <p>Saiu por <em>{cancelled.reason.toLowerCase()}</em>. Tracking antes da saída: {cancelled.technologySignals[0]}.</p>
                <div className="precedent-card__matches">
                  {matches.length ? (
                    <>
                      <small><WarningDiamond size={14} weight="fill" /> {matches.length} {matches.length === 1 ? "ativo com sinal parecido" : "ativos com sinais parecidos"}</small>
                      <div>{matches.map((client) => <button key={client.id} type="button" className="client-chip" onClick={() => openClient(client.id)}>{client.name}</button>)}</div>
                    </>
                  ) : (
                    <small className="precedent-card__clear">Nenhum ativo com esse sinal hoje</small>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel clients-panel" aria-labelledby="feed-title">
        <div className="panel-heading panel-heading--clients">
          <div>
            <span>Tracking</span>
            <h2 id="feed-title">Todos os sinais</h2>
            <p>{filteredSignals.length} de {allSignals.length} sinais na seleção atual</p>
          </div>
          <div className="filters" aria-label="Filtros de sinais">
            <label className="select-control">
              <Funnel size={16} aria-hidden="true" />
              <span className="sr-only">Filtrar por gravidade</span>
              <select value={severity} onChange={(event) => setFilter("gravidade", event.target.value)}>
                <option value="Todas">Todas as gravidades</option><option>Alto</option><option>Médio</option>
              </select>
            </label>
            <label className="select-control">
              <span className="sr-only">Filtrar por dimensão</span>
              <select value={dimension} onChange={(event) => setFilter("dimensao", event.target.value)}>
                <option value="Todas">Todas as dimensões</option>{dimensions.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>
        </div>

        {filteredSignals.length ? (
          <div className="signal-feed-grid signal-feed-grid--panel">
            {filteredSignals.map((signal) => (
              <button key={signal.id} className="signal-feed-card" type="button" onClick={() => openClient(signal.client.id)}>
                <span className="signal-feed-card__tags">
                  <span className={`signal-severity signal-severity--${severityClass(signal.severity)}`}><Pulse size={16} weight="fill" /> {signal.severity}</span>
                  <span className="dimension-tag">{signal.dimension}</span>
                  {signal.client.riskLevel === "Baixo" && <span className="dimension-tag dimension-tag--silent">Silencioso</span>}
                </span>
                <strong>{signal.title}</strong>
                <p>{signal.detail}</p>
                <span className="signal-feed-card__client">{signal.client.name} · {formatCurrency(signal.client.monthlyRevenue)}/mês</span>
                <small>{signal.feature} · {signal.timestamp}</small>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Funnel size={30} weight="duotone" />
            <h3>Nenhum sinal nesta combinação</h3>
            <p>Altere a gravidade ou a dimensão selecionada.</p>
            <button type="button" className="secondary-button" onClick={() => setSearchParams({})}>Limpar filtros</button>
          </div>
        )}
      </section>
    </div>
  );
}

function SilentRiskCard({ client, onOpen }: { client: ClientMock; onOpen: (clientId: string) => void }) {
  const critical = client.features.find((feature) => feature.status === "Crítico");
  return (
    <article className="silent-card">
      <div className="silent-card__head">
        <div><strong>{client.name}</strong><small>{client.segment} · {client.solution}</small></div>
        <RiskBadge level={client.riskLevel} score={client.riskScore} />
      </div>
      {critical && (
        <div className="silent-card__drop">
          <span>{critical.name}</span>
          <Variation value={critical.variation} />
        </div>
      )}
      <p>{client.explanation}</p>
      <div className="silent-card__foot">
        <span>{formatCurrency(client.monthlyRevenue)}<small>/mês em jogo</small></span>
        <button type="button" className="table-action" onClick={() => onOpen(client.id)}>Ver cliente <ArrowRight size={16} /></button>
      </div>
    </article>
  );
}
