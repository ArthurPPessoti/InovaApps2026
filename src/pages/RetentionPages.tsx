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
  Lightbulb,
  PaperPlaneTilt,
  TrendDown,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";
import { type FormEvent, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { RiskBadge, formatCurrency } from "../components/StatusUI";
import { clients, portfolioSummary } from "../data/mockData";
import {
  cancellationReasons,
  cancelledClients,
  defaultSurveyMessage,
  defaultSurveySubject,
  rewardOptions,
  useRetention,
} from "../retention/RetentionContext";
import type { CancellationReason, RewardConfig, SurveyStatus } from "../types";

type ClientTab = "ativos" | "atencao" | "cancelados";

const statusLabel: Record<SurveyStatus, string> = {
  not_sent: "Não enviada",
  sent: "Enviada",
  responded: "Respondida",
};

function ActiveClients({ attentionOnly }: { attentionOnly: boolean }) {
  const { account } = useAuth();
  const visibleClients = attentionOnly ? clients.filter((client) => client.riskLevel !== "Baixo") : clients;

  return (
    <section className="panel clients-panel lifecycle-list-panel">
      <div className="panel-heading panel-heading--clients">
        <div>
          <span>{attentionOnly ? "Ordem de ação" : "Amostra monitorada"}</span>
          <h2>{attentionOnly ? "Clientes que exigem atenção" : "Clientes com contrato ativo"}</h2>
          <p>{attentionOnly ? `${visibleClients.length} clientes demonstrativos em atenção` : `${visibleClients.length} exemplos dos ${portfolioSummary.activeClients} clientes ativos`}</p>
        </div>
      </div>
      <div className="table-scroll">
        <table className="clients-table lifecycle-table">
          <thead><tr><th>Cliente</th><th>Segmento</th><th>Risco</th><th>Receita mensal</th><th>Evidência atual</th><th>Ação</th></tr></thead>
          <tbody>{visibleClients.map((client) => (
            <tr key={client.id}>
              <td><strong>{client.name}</strong><small>{client.plan}</small></td>
              <td>{client.segment}</td>
              <td><RiskBadge level={client.riskLevel} score={client.riskScore} /></td>
              <td className="revenue-cell">{formatCurrency(client.monthlyRevenue)}</td>
              <td className="signal-cell">{account?.profile === "technology" ? client.primarySignal : `SLA ${client.sla}% · NPS ${client.nps ?? "sem dado"}`}</td>
              <td><Link className="table-action" to={`/clientes/${client.id}`}>Ver cliente <ArrowRight size={14} /></Link></td>
            </tr>
          ))}</tbody>
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
              return <tr key={client.id}><td><strong>{client.name}</strong><small>{client.segment}</small></td><td>{client.cancelledAt}</td><td>{client.reason}</td><td className="lost-revenue">{formatCurrency(client.monthlyRevenueLost)}</td><td>{client.firstSignalDays} dias antes</td><td><span className={`survey-status survey-status--${status}`}>{statusLabel[status]}</span></td><td><Link className="table-action" to={`/clientes/cancelados/${client.id}`}>Abrir <ArrowRight size={14} /></Link></td></tr>;
            })}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function ClientsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("status") as ClientTab | null) ?? "atencao";
  const setTab = (next: ClientTab) => setSearchParams(next === "atencao" ? {} : { status: next }, { replace: true });

  return (
    <div className="clients-lifecycle-page">
      <header className="page-heading">
        <div><span className="eyebrow"><Buildings size={16} weight="duotone" /> Ciclo de relacionamento</span><h1>Clientes antes, durante e depois do risco.</h1><p>Acompanhe quem precisa de atenção e transforme cancelamentos em aprendizado para a carteira ativa.</p></div>
      </header>
      <div className="lifecycle-tabs" role="tablist" aria-label="Situação dos clientes">
        <button type="button" role="tab" aria-selected={tab === "ativos"} className={tab === "ativos" ? "active" : ""} onClick={() => setTab("ativos")}>Ativos <span>{portfolioSummary.activeClients}</span></button>
        <button type="button" role="tab" aria-selected={tab === "atencao"} className={tab === "atencao" ? "active" : ""} onClick={() => setTab("atencao")}>Em atenção <span>{portfolioSummary.attentionClients}</span></button>
        <button type="button" role="tab" aria-selected={tab === "cancelados"} className={tab === "cancelados" ? "active" : ""} onClick={() => setTab("cancelados")}>Cancelados <span>{cancelledClients.length}</span></button>
      </div>
      {tab === "cancelados" ? <CancelledClients /> : <ActiveClients attentionOnly={tab === "atencao"} />}
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
  const [rewardType, setRewardType] = useState<RewardConfig["type"]>(currentCampaign?.reward.type ?? "consulting");
  const [customReward, setCustomReward] = useState(currentCampaign?.reward.type === "custom" ? currentCampaign.reward.label : "");
  const [sentToken, setSentToken] = useState(currentCampaign?.token ?? "");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [previewMode, setPreviewMode] = useState<"email" | "survey">("email");

  if (!client) return <div className="not-found"><WarningCircle size={42} /><h1>Cliente cancelado não encontrado</h1><Link className="primary-button" to="/clientes?status=cancelados">Voltar aos clientes</Link></div>;

  const selectedReward = rewardOptions.find((item) => item.type === rewardType) ?? rewardOptions[0];
  const reward: RewardConfig = rewardType === "custom" ? { ...selectedReward, label: customReward.trim() || "Benefício personalizado" } : selectedReward;
  const signals = account?.profile === "technology" ? client.technologySignals : client.dataSignals;
  const surveyUrl = sentToken ? `${window.location.origin}/pesquisa/${sentToken}` : "";

  const submitCampaign = (event: FormEvent) => {
    event.preventDefault();
    if (rewardType === "custom" && !customReward.trim()) {
      setError("Descreva o benefício personalizado.");
      return;
    }
    setError("");
    setSentToken(sendSurvey(client.id, subject.trim(), message.trim(), reward));
  };

  const copyLink = () => {
    if (!surveyUrl) return;
    navigator.clipboard?.writeText(surveyUrl).catch(() => undefined);
    setCopied(true);
  };

  return (
    <div className="cancelled-detail-page">
      <Link className="back-link" to="/clientes?status=cancelados"><ArrowLeft size={16} /> Voltar aos cancelados</Link>
      <section className="cancelled-hero">
        <div><span className="eyebrow"><TrendDown size={16} /> Cancelamento confirmado</span><h1>{client.name}</h1><p>{client.segment} · {client.plan} · {client.solution}</p></div>
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
          <div className="panel-heading"><div><span>Envio manual</span><h2>Preparar pesquisa de saída</h2><p>Nenhum e-mail real será enviado.</p></div><EnvelopeSimple size={25} /></div>
          <label>Assunto<input required value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
          <label>Mensagem<textarea required rows={5} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
          <label>Benefício<select value={rewardType} onChange={(event) => setRewardType(event.target.value as RewardConfig["type"])}>{rewardOptions.map((item) => <option value={item.type} key={item.type}>{item.label}</option>)}</select></label>
          {rewardType === "custom" && <label>Descrição do benefício<input value={customReward} onChange={(event) => setCustomReward(event.target.value)} placeholder="Ex.: 2 horas de consultoria" /></label>}
          <div className="reward-validity"><CalendarBlank size={17} /> Validade demonstrativa de 30 dias</div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit"><PaperPlaneTilt size={17} /> Simular envio</button>
          {sentToken && <div className="campaign-sent" role="status"><CheckCircle size={18} weight="fill" /><div><strong>Pesquisa disponível</strong><small>O status foi salvo neste navegador.</small></div><button type="button" onClick={copyLink}><Copy size={16} /> {copied ? "Copiado" : "Copiar link"}</button><Link to={`/pesquisa/${sentToken}`} target="_blank">Abrir pesquisa <ArrowRight size={14} /></Link></div>}
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
            <div className="email-preview-content"><img src="/brand/globalsys-logo.svg" alt="Globalsys" /><small>Para: contato da {client.name}</small><h2>{subject}</h2><p>Olá, equipe da {client.name}.</p><p>{message}</p>{reward.type !== "none" && <div className="email-reward"><Gift size={21} /><span><small>Agradecimento pela participação</small><strong>{reward.label}</strong></span></div>}<span className="email-cta">Responder pesquisa</span><p className="email-privacy">O link identifica sua resposta para que possamos compreender a experiência e, se você permitir, entrar em contato. A participação é opcional.</p></div>
          ) : (
            <div className="survey-inline-preview">
              <img src="/brand/globalsys-logo.svg" alt="Globalsys" />
              <span className="eyebrow"><ClipboardText size={14} /> Pesquisa de experiência</span>
              <h2>Sua perspectiva pode melhorar as próximas experiências.</h2>
              <p>Olá, equipe da {client.name}. São cinco perguntas e leva cerca de três minutos.</p>
              {reward.type !== "none" && <div className="inline-preview-reward"><Gift size={18} /><span><small>Benefício pela participação</small><strong>{reward.label}</strong></span></div>}
              <div className="inline-question"><strong><span>01</span> Qual foi o principal motivo do cancelamento?</strong><select disabled><option>{client.reason}</option></select></div>
              <div className="inline-question"><strong><span>02</span> O que estava faltando no produto ou serviço?</strong><textarea disabled rows={2} placeholder="Campo de resposta" /></div>
              <div className="inline-question"><strong><span>03</span> O que poderia ter evitado o cancelamento?</strong><textarea disabled rows={2} placeholder="Campo de resposta" /></div>
              <div className="inline-question"><strong><span>04</span> Você consideraria voltar no futuro?</strong><div className="inline-options"><span>Sim</span><span>Talvez</span><span>Não</span></div></div>
              <div className="inline-question"><strong><span>05</span> Deseja acrescentar alguma observação?</strong><textarea disabled rows={2} placeholder="Campo opcional" /></div>
              <div className="inline-consent"><i /> A resposta será associada à {client.name} para análise da experiência e eventual contato.</div>
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
  const { responses, getCampaignByToken, submitResponse } = useRetention();
  const campaign = getCampaignByToken(token);
  const client = cancelledClients.find((item) => item.id === campaign?.clientId);
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
    submitResponse(token, { reason, missing: missing.trim(), prevention: prevention.trim(), returnIntent, comment: comment.trim(), consent: true });
  };

  if (!campaign || !client) return <main className="public-survey-page"><section className="survey-card survey-invalid"><WarningCircle size={40} /><h1>Este link de pesquisa não está disponível.</h1><p>Confira o endereço recebido ou entre em contato com a empresa responsável.</p></section></main>;

  if (response) return (
    <main className="public-survey-page"><section className="survey-card survey-complete"><img src="/brand/globalsys-logo.svg" alt="Globalsys" /><span className="survey-success-icon"><CheckCircle size={36} weight="fill" /></span><small>Resposta registrada</small><h1>Obrigado por compartilhar sua experiência.</h1><p>Seu feedback será usado para melhorar o produto e o relacionamento com outros clientes.</p>{campaign.reward.type !== "none" && <div className="survey-reward"><Gift size={25} /><span><small>Benefício liberado por 30 dias</small><strong>{campaign.reward.label}</strong><code>FEEDBACK-2026</code></span></div>}<p className="survey-footnote">O benefício reconhece sua participação e não depende do conteúdo da avaliação.</p></section></main>
  );

  return (
    <main className="public-survey-page">
      <section className="survey-intro"><img src="/brand/globalsys-logo.svg" alt="Globalsys" /><span className="eyebrow"><ClipboardText size={16} /> Pesquisa de experiência</span><h1>Sua perspectiva pode melhorar as próximas experiências.</h1><p>Olá, equipe da {client.name}. São cinco perguntas e leva cerca de três minutos.</p>{campaign.reward.type !== "none" && <div><Gift size={19} /><span><small>Benefício pela participação</small><strong>{campaign.reward.label}</strong></span></div>}</section>
      <form className="survey-card survey-form" onSubmit={submit}>
        <div className="survey-question"><label htmlFor="survey-reason"><span>01</span><strong>Qual foi o principal motivo do cancelamento?</strong></label><select id="survey-reason" value={reason} onChange={(event) => setReason(event.target.value as CancellationReason)}>{cancellationReasons.map((item) => <option key={item}>{item}</option>)}</select></div>
        <div className="survey-question"><label htmlFor="survey-missing"><span>02</span><strong>O que estava faltando no produto ou serviço?</strong></label><textarea id="survey-missing" required rows={3} value={missing} onChange={(event) => setMissing(event.target.value)} /></div>
        <div className="survey-question"><label htmlFor="survey-prevention"><span>03</span><strong>O que poderia ter evitado o cancelamento?</strong></label><textarea id="survey-prevention" required rows={3} value={prevention} onChange={(event) => setPrevention(event.target.value)} /></div>
        <fieldset className="survey-question"><legend><span>04</span><strong>Você consideraria voltar no futuro?</strong></legend><div className="survey-choice-row">{([{"value":"yes","label":"Sim"},{"value":"maybe","label":"Talvez"},{"value":"no","label":"Não"}] as const).map((item) => <label key={item.value}><input type="radio" name="returnIntent" value={item.value} checked={returnIntent === item.value} onChange={() => setReturnIntent(item.value)} /><span>{item.label}</span></label>)}</div></fieldset>
        <div className="survey-question"><label htmlFor="survey-comment"><span>05</span><strong>Deseja acrescentar alguma observação?</strong><small>Opcional</small></label><textarea id="survey-comment" rows={3} value={comment} onChange={(event) => setComment(event.target.value)} /></div>
        <label className="survey-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required /><span>Entendo que esta resposta será associada à {client.name} para análise da experiência e eventual contato. A participação é opcional.</span></label>
        <button className="primary-button survey-submit" type="submit">Enviar resposta <ArrowRight size={17} /></button>
      </form>
      <footer className="survey-public-footer"><ChartBar size={17} /> Ambiente demonstrativo. Nenhum dado é transmitido.</footer>
    </main>
  );
}
