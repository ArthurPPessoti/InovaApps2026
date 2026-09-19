import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle,
  ClockCountdown,
  CurrencyCircleDollar,
  Gauge,
  Lightbulb,
  Pulse,
  Smiley,
  Ticket,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RiskBadge, Variation, formatCurrency } from "../components/StatusUI";
import { getCompany, products, watchProducts } from "../data/mockData";

function DetailTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => <span key={item.name}><i style={{ backgroundColor: item.color }} />{item.name}: {item.value}%</span>)}
    </div>
  );
}

export function ClientDetailPage() {
  const { clienteId } = useParams();
  const location = useLocation();
  const client = [...products, ...watchProducts].find((item) => item.id === clienteId);
  const backTarget = (location.state as { from?: string } | null)?.from ?? "/#clientes";

  if (!client) {
    return (
      <section className="not-found">
        <WarningCircle size={40} weight="duotone" />
        <h1>Cliente não encontrado</h1>
        <p>O registro solicitado não existe nos dados demonstrativos.</p>
        <Link className="primary-button" to="/">Voltar ao dashboard</Link>
      </section>
    );
  }
  const company = getCompany(client.companyId)!;

  const metricCards = [
    { label: "Uso atual", value: `${client.usage}%`, helper: "do padrão histórico", icon: Gauge },
    { label: "SLA cumprido", value: `${client.sla}%`, helper: "no mês atual", icon: ClockCountdown },
    { label: "NPS", value: client.nps === null ? "Sem resposta" : String(client.nps), helper: client.nps === null ? "pesquisa mais recente" : "última pesquisa", icon: Smiley },
    { label: "Chamados abertos", value: String(client.openTickets), helper: "em acompanhamento", icon: Ticket },
    { label: "Reuniões", value: client.meetings, helper: "realizadas no período", icon: CalendarCheck },
    { label: "Atraso", value: `${client.paymentDelay} dias`, helper: "pagamento atual", icon: CurrencyCircleDollar },
  ];

  return (
    <div className="client-detail-page">
      <Link className="back-link" to={backTarget}><ArrowLeft size={18} /> Voltar à carteira</Link>

      <section className="client-hero">
        <div className="client-heading">
          <span className="eyebrow"><Pulse size={16} weight="fill" /> Visão individual</span>
          <div className="client-title-row">
            <div>
              <h1>{client.productName}</h1>
              <p><Link to={`/empresas/${company.id}`}>{company.name}</Link> · {company.segment} · {client.plan}</p>
            </div>
            <RiskBadge level={client.riskLevel} score={client.riskScore} />
          </div>
        </div>
        <div className="client-value">
          <span>Receita mensal</span>
          <strong>{formatCurrency(client.monthlyRevenue)}</strong>
          <small>Contrato recorrente</small>
        </div>
      </section>

      <section className="explanation-panel">
        <div className="explanation-icon"><Lightbulb size={25} weight="duotone" /></div>
        <div>
          <span>Por que este produto exige atenção?</span>
          <h2>{client.primarySignal}</h2>
          <p>{client.explanation}</p>
        </div>
      </section>

      <section className="client-metrics" aria-label="Indicadores do cliente">
        {metricCards.map(({ label, value, helper, icon: Icon }) => (
          <article key={label} className="client-metric">
            <Icon size={20} weight="duotone" />
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{helper}</small>
          </article>
        ))}
      </section>

      <section className="detail-main-grid">
        <article className="panel trend-panel">
          <div className="panel-heading">
            <div><span>Últimos seis meses</span><h2>Uso e qualidade do serviço</h2></div>
            <div className="chart-legend"><span><i className="legend-dot legend-dot--cyan" /> Uso</span><span><i className="legend-dot legend-dot--blue" /> SLA</span></div>
          </div>
          <div className="detail-chart" aria-label="Evolução de uso e SLA">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={client.usageAndSla} margin={{ top: 18, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#8593ae", fontSize: 12 }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: "#8593ae", fontSize: 12 }} />
                <Tooltip content={<DetailTooltip />} />
                <Line isAnimationActive={false} type="monotone" dataKey="uso" name="Uso" stroke="#00f3ff" strokeWidth={3} dot={{ r: 3, fill: "#00f3ff", strokeWidth: 0 }} />
                <Line isAnimationActive={false} type="monotone" dataKey="sla" name="SLA" stroke="#4779ff" strokeWidth={2.5} dot={{ r: 3, fill: "#4779ff", strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel actions-panel">
          <div className="panel-heading"><div><span>Próximos passos</span><h2>Ações sugeridas</h2></div></div>
          <div className="actions-list">
            {client.actions.map((action, index) => (
              <div key={action.id} className="action-item">
                <span className="action-index">{index + 1}</span>
                <div><strong>{action.title}</strong><p>{action.detail}</p><small>{action.owner} · {action.urgency}</small></div>
              </div>
            ))}
          </div>
          <p className="decision-note">Sugestões demonstrativas para apoiar a decisão da equipe.</p>
        </article>
      </section>

      <section className="panel feature-panel">
        <div className="panel-heading feature-panel-heading">
          <div><span>Tracking funcional</span><h2>Saúde das funcionalidades</h2></div>
          <p>Uma função crítica pode gerar atenção mesmo quando o acesso geral permanece estável.</p>
        </div>
        <div className="features-list">
          {client.features.map((feature) => (
            <article key={feature.id} className="feature-row">
              <div className={`feature-status-icon feature-status-icon--${feature.status.toLowerCase().replace("í", "i")}`}>
                {feature.status === "Saudável" ? <CheckCircle size={20} weight="fill" /> : <WarningCircle size={20} weight="fill" />}
              </div>
              <div className="feature-copy"><strong>{feature.name}</strong><span>{feature.note}</span></div>
              <div className="health-meter" aria-label={`Saúde: ${feature.health}%`}><span style={{ width: `${feature.health}%` }} /></div>
              <strong className="health-value">{feature.health}%</strong>
              <Variation value={feature.variation} />
              <small className="last-activity">{feature.lastActivity}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="detail-bottom-grid">
        <article className="panel">
          <div className="panel-heading"><div><span>Evidências</span><h2>Linha do tempo de sinais</h2></div></div>
          <div className="timeline">
            {client.signals.map((signal) => (
              <div key={signal.id} className="timeline-item">
                <span className={`timeline-marker timeline-marker--${signal.severity.toLowerCase().replace("é", "e")}`} />
                <div><strong>{signal.title}</strong><p>{signal.detail}</p><small>{signal.timestamp} · {signal.feature}</small></div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading"><div><span>Telemetria</span><h2>Eventos recentes</h2></div></div>
          <div className="event-list">
            {client.events.map((event) => (
              <div key={event.id} className="event-item">
                <span className={`event-result event-result--${event.result.toLowerCase()}`} aria-hidden="true" />
                <div><strong>{event.action}</strong><span>{event.feature} · {event.context}</span></div>
                <small>{event.timestamp}</small>
              </div>
            ))}
          </div>
        </article>
      </section>

      <footer className="mock-footer">
        <UsersThree size={18} /> Produto de {company.name}. Dados demonstrativos; nenhuma classificação representa uma previsão real.
      </footer>
    </div>
  );
}
