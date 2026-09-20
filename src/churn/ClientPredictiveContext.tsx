import { ArrowRight, Brain, CheckCircle, EnvelopeSimple, Phone, Pulse, Sparkle, WarningCircle } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TechnologyTelemetry } from "./technologySignals";
import type { ChurnAnalysis, ChurnPrediction } from "./types";

type AnalysisView = "diagnosis" | "usage" | "health" | "scenarios" | "history";

function percent(value: number) {
  return `${(value * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function compactFactorLabel(label: string) {
  const normalized = label.toLocaleLowerCase("pt-BR");
  if (normalized.includes("reclama")) return "Reclamações";
  if (normalized.includes("resolu") && normalized.includes("varia")) return "Piora no tempo de resolução";
  if (normalized.includes("resolu")) return "Tempo de resolução";
  if (normalized.includes("nps")) return "Satisfação (NPS)";
  if (normalized.includes("uso")) return "Uso da solução";
  if (normalized.includes("chamado")) return "Chamados de suporte";
  if (normalized.includes("atras")) return "Atraso financeiro";
  if (normalized.includes("reuni")) return "Reuniões realizadas";
  if (normalized.includes("plano")) return "Plano contratado";
  if (normalized.includes("porte")) return "Porte da empresa";
  return label.length > 32 ? `${label.slice(0, 29)}...` : label;
}

function diagnosisFor(prediction: ChurnPrediction) {
  const { evidence } = prediction;
  if ((evidence.service.slaCurrent ?? 100) < 80 || (evidence.service.criticalTickets ?? 0) > 0) return {
    title: "O atendimento é o principal ponto de atenção",
    detail: `O SLA está em ${evidence.service.slaCurrent?.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) ?? "nível não informado"}%${(evidence.service.criticalTickets ?? 0) > 0 ? ` e há ${evidence.service.criticalTickets} chamado(s) crítico(s)` : ""}.`,
    missing: "Recuperar a previsibilidade do atendimento e confirmar se os prazos estão reduzindo o valor percebido.",
  };
  if ((evidence.usage.change3m ?? 0) < -5) return {
    title: "O cliente está usando menos a solução",
    detail: `O uso variou ${evidence.usage.change3m?.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} pontos nos últimos três meses.`,
    missing: "Entender qual resultado deixou de ser alcançado e se existe uma barreira de produto, processo ou treinamento.",
  };
  if ((evidence.relationship.latestNps ?? 10) <= 6) return {
    title: "A experiência recente está abaixo do esperado",
    detail: `A última nota de satisfação foi ${evidence.relationship.latestNps ?? "não informada"}.`,
    missing: "Ouvir o cliente antes de propor uma solução e identificar o episódio que mais afetou a confiança.",
  };
  if ((evidence.financial.paymentDelayDays ?? 0) > 0) return {
    title: "Há um sinal financeiro que merece validação",
    detail: `O pagamento registra ${evidence.financial.paymentDelayDays} dia(s) de atraso.`,
    missing: "Separar uma dificuldade financeira de uma insatisfação com o serviço antes de definir a abordagem.",
  };
  return {
    title: "O risco vem da combinação de sinais moderados",
    detail: "Nenhum indicador isolado explica a classificação; o resultado surge da combinação dos dados disponíveis.",
    missing: "Validar prioridades, percepção de valor e próximos marcos do relacionamento em uma conversa consultiva.",
  };
}

function contactStrategy(prediction: ChurnPrediction, telemetry?: TechnologyTelemetry) {
  const evidence = prediction.evidence;
  if ((evidence.service.slaCurrent ?? 100) < 80 || (evidence.service.criticalTickets ?? 0) > 0) return {
    urgency: prediction.probability >= .25 ? "Hoje" : "Em até 2 dias",
    channel: "Ligação ou reunião breve, seguida de e-mail",
    icon: Phone,
    objective: "Reconhecer o impacto operacional, ouvir o cliente e combinar um plano verificável de recuperação.",
    tone: "Empático, responsável e direto. Comece pela experiência, não pela renovação.",
    subject: "Podemos revisar sua experiência e os próximos passos?",
    message: "Olá! Percebemos que alguns resultados recentes podem não estar no nível esperado e queremos entender sua experiência diretamente. Podemos conversar por 20 minutos para revisar as prioridades e combinar próximos passos concretos?",
  };
  const criticalFeature = telemetry?.features.find((feature) => feature.critical && feature.change <= -20);
  if (criticalFeature) return {
    urgency: criticalFeature.status === "Crítico" ? "Em até 2 dias" : "Nesta semana",
    channel: "Conversa consultiva com o responsável da conta",
    icon: Phone,
    objective: `Entender se a etapa relacionada a ${criticalFeature.name.toLocaleLowerCase("pt-BR")} ainda entrega valor e identificar barreiras de processo, integração ou treinamento.`,
    tone: "Curioso e colaborativo. Fale sobre resultados esperados, sem citar eventos individuais de uso.",
    subject: "Podemos revisar uma etapa importante da sua operação?",
    message: "Olá! Queremos entender se todas as etapas da solução continuam apoiando as prioridades da sua equipe e se existe alguma barreira ou necessidade ainda não atendida. Podemos marcar uma conversa rápida para revisar o processo e identificar oportunidades de melhoria?",
  };
  if ((evidence.usage.change3m ?? 0) < -5) return {
    urgency: "Nesta semana",
    channel: "E-mail consultivo com convite para conversa",
    icon: EnvelopeSimple,
    objective: "Descobrir onde o cliente deixou de perceber valor e quais resultados ainda espera alcançar.",
    tone: "Curioso e consultivo, sem sugerir que o comportamento individual foi monitorado.",
    subject: "Como podemos gerar mais valor para sua operação?",
    message: "Olá! Queremos entender se a solução continua apoiando as prioridades da sua equipe e se existe alguma barreira ou necessidade ainda não atendida. Podemos marcar uma conversa rápida para ouvir seu contexto e revisar oportunidades de valor?",
  };
  if ((evidence.relationship.latestNps ?? 10) <= 6) return {
    urgency: "Em até 2 dias",
    channel: "Contato pessoal pelo responsável da conta",
    icon: Phone,
    objective: "Reconhecer a insatisfação e abrir espaço para escuta antes de oferecer uma solução.",
    tone: "Humilde, acolhedor e sem defesa automática.",
    subject: "Queremos ouvir sua experiência",
    message: "Olá! Sua experiência é importante para nós e queremos entender onde poderíamos ter entregado mais valor. Você teria alguns minutos para compartilhar seu contexto? Primeiro queremos ouvir; depois, com sua concordância, combinamos possíveis próximos passos.",
  };
  return {
    urgency: "Nesta semana",
    channel: "E-mail seguido de contato do responsável",
    icon: EnvelopeSimple,
    objective: "Validar o contexto e proteger o valor percebido antes da próxima decisão contratual.",
    tone: "Consultivo, objetivo e sem tratar a previsão como fato consumado.",
    subject: "Podemos revisar suas prioridades?",
    message: "Olá! Gostaríamos de revisar como a solução está apoiando suas prioridades atuais e entender se existe algo que deveríamos ajustar. Podemos conversar por alguns minutos nesta semana?",
  };
}

export function ClientPredictiveContext({ prediction, analysis, telemetry }: { prediction: ChurnPrediction; analysis: ChurnAnalysis; telemetry?: TechnologyTelemetry }) {
  const strategy = contactStrategy(prediction, telemetry);
  const diagnosis = diagnosisFor(prediction);
  const ContactIcon = strategy.icon;
  const [activeView, setActiveView] = useState<AnalysisView>("diagnosis");
  const [subject, setSubject] = useState(strategy.subject);
  const [message, setMessage] = useState(strategy.message);
  const [reviewed, setReviewed] = useState(false);
  const average = analysis.summary.averageProbability;
  const segment = analysis.predictions.filter((item) => item.segment === prediction.segment);
  const segmentAverage = segment.reduce((sum, item) => sum + item.probability, 0) / Math.max(segment.length, 1);
  const percentile = analysis.predictions.filter((item) => item.probability <= prediction.probability).length / Math.max(analysis.predictions.length, 1);
  const comparison = [
    { name: "Cliente atual", value: Math.round(prediction.probability * 1000) / 10, color: "#ff6b78" },
    { name: "Empresas parecidas", value: Math.round(segmentAverage * 1000) / 10, color: "#ffba49" },
    { name: "Toda a carteira", value: Math.round(average * 1000) / 10, color: "#00f3ff" },
  ];
  const factors = prediction.topFactors.slice(0, 6).map((factor) => ({
    name: compactFactorLabel(factor.label),
    value: Math.max(.01, Math.abs(factor.contribution ?? factor.coefficient ?? .1)),
    direction: factor.direction,
  }));
  const maxFactor = Math.max(...factors.map((item) => item.value), 1);
  const factorChart = factors.map((item) => ({ ...item, value: Math.round(item.value / maxFactor * 100) }));
  const operational = [
    { name: "Uso da solução", value: Math.max(0, Math.min(100, prediction.evidence.usage.current ?? 0)), color: "#00f3ff" },
    { name: "Cumprimento do SLA", value: Math.max(0, Math.min(100, prediction.evidence.service.slaCurrent ?? 0)), color: "#0156fc" },
    { name: "Satisfação (NPS)", value: Math.max(0, Math.min(100, (prediction.evidence.relationship.latestNps ?? 0) * 10)), color: "#1d8cff" },
    { name: "Reuniões realizadas", value: prediction.evidence.relationship.meetingsPlanned ? Math.min(100, (prediction.evidence.relationship.meetingsCompleted ?? 0) / prediction.evidence.relationship.meetingsPlanned * 100) : 50, color: "#00bcd4" },
    { name: "Saúde financeira", value: Math.max(0, 100 - (prediction.evidence.financial.paymentDelayDays ?? 0) * 4), color: "#00ff91" },
  ];
  const scenarios = [
    { name: "Situação atual", value: Math.round(prediction.probability * 1000) / 10, color: "#ffba49" },
    { name: "Se os indicadores melhorarem", value: Math.round(prediction.probability * .72 * 1000) / 10, color: "#00ff91" },
    { name: "Se os indicadores piorarem", value: Math.round(Math.min(.99, prediction.probability * 1.35) * 1000) / 10, color: "#ff3355" },
  ];
  const similar = useMemo(() => analysis.historicalChurn.filter((item) => item.segment === prediction.segment).map((item) => {
    const usageDistance = Math.abs((item.evidenceBeforeCancellation.usage.current ?? 50) - (prediction.evidence.usage.current ?? 50));
    const slaDistance = Math.abs((item.evidenceBeforeCancellation.service.slaCurrent ?? 70) - (prediction.evidence.service.slaCurrent ?? 70));
    const npsDistance = Math.abs((item.evidenceBeforeCancellation.relationship.latestNps ?? 5) - (prediction.evidence.relationship.latestNps ?? 5)) * 5;
    return { ...item, similarity: Math.max(0, Math.round(100 - (usageDistance + slaDistance + npsDistance) / 3)) };
  }).sort((a, b) => b.similarity - a.similarity).slice(0, 3), [analysis, prediction]);
  const facts = [
    prediction.evidence.usage.change3m != null ? `O uso variou ${prediction.evidence.usage.change3m.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} pontos nos últimos três meses.` : null,
    prediction.evidence.service.slaCurrent != null ? `O SLA atual registrado é ${prediction.evidence.service.slaCurrent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%.` : null,
    prediction.evidence.relationship.latestNps != null ? `A última nota de satisfação registrada foi ${prediction.evidence.relationship.latestNps}.` : null,
  ].filter(Boolean) as string[];
  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  const views: { id: AnalysisView; label: string }[] = [
    { id: "diagnosis", label: "Por que está em risco" },
    ...(telemetry ? [{ id: "usage" as const, label: "Uso do produto" }] : []),
    { id: "health", label: "O que está faltando" },
    { id: "scenarios", label: "O que pode acontecer" },
    { id: "history", label: "Casos parecidos" },
  ];

  return <section className="client-predictive-context">
    <article className="client-diagnosis-summary">
      <div className="diagnosis-icon"><Brain size={24} weight="duotone" /></div>
      <div className="diagnosis-copy"><span>Diagnóstico em linguagem simples</span><h2>{diagnosis.title}</h2><p>{diagnosis.detail}</p></div>
      <div className="diagnosis-next"><small>O que precisa ser resolvido</small><strong>{diagnosis.missing}</strong></div>
    </article>

    <article className="panel analysis-workspace">
      <header className="analysis-workspace-heading">
        <div><span>Entenda os dados</span><h2>Cada visão responde a uma pergunta</h2><p>Os gráficos usam a mesma execução de {analysis.predictionRun.asOfDate}. Selecione o assunto que deseja investigar.</p></div>
        <div className="analysis-legend"><span><i className="legend-dot legend-dot--risk" /> Aumenta o risco</span><span><i className="legend-dot legend-dot--positive" /> Protege o relacionamento</span><span><i className="legend-dot legend-dot--reference" /> Serve como comparação</span></div>
      </header>
      <div className="analysis-tabs" role="tablist" aria-label="Visões da análise do cliente">
        {views.map((view) => <button key={view.id} type="button" role="tab" aria-selected={activeView === view.id} className={activeView === view.id ? "is-active" : ""} onClick={() => setActiveView(view.id)}>{view.label}</button>)}
      </div>

      {activeView === "diagnosis" && <div className="analysis-panel" role="tabpanel">
        <div className="analysis-question"><span>Pergunta 1</span><h3>Este cliente está mais em risco que os demais?</h3><p><strong>Resposta:</strong> ele está acima de {Math.round(percentile * 100)}% da carteira. Quanto maior a barra, maior a probabilidade estimada.</p></div>
        <div className="analysis-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={comparison} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}><CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false}/><XAxis dataKey="name" tick={{ fill: "#b9b9b9", fontSize: 11 }}/><YAxis unit="%" tick={{ fill: "#9aa7bd", fontSize: 10 }}/><Tooltip formatter={(value) => [`${value}%`, "Probabilidade estimada"]}/><Bar dataKey="value" radius={[7,7,0,0]}>{comparison.map((item) => <Cell key={item.name} fill={item.color}/>)}</Bar></BarChart></ResponsiveContainer></div>
        <div className="analysis-question"><span>Pergunta 2</span><h3>Quais dados mais pesaram nessa classificação?</h3><p><strong>Como ler:</strong> barras vermelhas elevam o risco; verdes ajudam a proteger. O tamanho mostra a força relativa dentro desta previsão.</p></div>
        <div className="analysis-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={factorChart} layout="vertical" margin={{ left: 44, right: 16 }}><CartesianGrid stroke="rgba(255,255,255,.06)" horizontal={false}/><XAxis type="number" hide/><YAxis type="category" dataKey="name" width={150} tick={{ fill: "#d5dbea", fontSize: 10 }}/><Tooltip formatter={(value) => [`${value} de 100`, "Força relativa"]}/><Bar dataKey="value" radius={[0,6,6,0]}>{factorChart.map((item) => <Cell key={item.name} fill={item.direction === "increases_risk" ? "#ff6b78" : "#00ff91"}/>)}</Bar></BarChart></ResponsiveContainer></div>
      </div>}

      {activeView === "usage" && telemetry && <div className="usage-analysis-panel" role="tabpanel">
        <section className="usage-reading">
          <span><Pulse size={15} weight="fill" /> Leitura da telemetria</span>
          <h3>O acesso continua, mas uma parte importante perdeu uso</h3>
          <p>{telemetry.summary}</p>
          <div><small>O que pode estar acontecendo</small><strong>{telemetry.valueGap}</strong></div>
          <div className="usage-guidance"><small>Como investigar sem causar desconforto</small><strong>{telemetry.internalGuidance}</strong></div>
        </section>

        <section className="usage-chart-card">
          <header><div><span>Evolução em seis meses</span><h3>O cliente está usando menos o produto?</h3></div><small>Índice normalizado de uso</small></header>
          <div className="usage-line-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={telemetry.series} margin={{ top: 12, right: 18, left: -14, bottom: 0 }}><CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false}/><XAxis dataKey="month" tick={{ fill: "#b9b9b9", fontSize: 10 }} axisLine={false} tickLine={false}/><YAxis domain={[0, 100]} tick={{ fill: "#8593ae", fontSize: 9 }} axisLine={false} tickLine={false}/><Tooltip formatter={(value, name) => [`${value} de 100`, name === "generalUse" ? "Uso geral" : name === "criticalFeature" ? "Função crítica" : "Usuários ativos"]}/><Line type="monotone" dataKey="generalUse" name="Uso geral" stroke="#00f3ff" strokeWidth={3} dot={{ r: 3, fill: "#00f3ff" }}/><Line type="monotone" dataKey="criticalFeature" name="Função crítica" stroke="#ff6b78" strokeWidth={3} dot={{ r: 3, fill: "#ff6b78" }}/><Line type="monotone" dataKey="activeUsers" name="Usuários ativos" stroke="#ffba49" strokeWidth={2} strokeDasharray="6 5" dot={false}/></LineChart></ResponsiveContainer></div>
          <div className="usage-chart-legend"><span><i className="legend-dot legend-dot--reference"/> Uso geral</span><span><i className="legend-dot legend-dot--risk"/> Função crítica</span><span><i className="legend-dot legend-dot--attention"/> Usuários ativos</span></div>
        </section>

        <section className="feature-usage-list">
          <header><span>Funções acompanhadas</span><h3>Onde o uso está saudável ou deteriorando?</h3></header>
          {telemetry.features.map((feature) => <div key={feature.name} className={`feature-usage-row feature-usage-row--${feature.status === "Crítico" ? "critical" : feature.status === "Atenção" ? "attention" : "healthy"}`}><div><strong>{feature.name}</strong><small>{feature.critical ? "Função crítica para este cliente" : `Última atividade há ${feature.lastActivityDays} dia(s)`}</small></div><span>{feature.current}/100</span><b>{feature.change > 0 ? "+" : ""}{feature.change}%</b><em>{feature.status}</em></div>)}
        </section>

        <section className="tracking-event-list">
          <header><span>Atividade recente</span><h3>O que aconteceu no produto</h3></header>
          {telemetry.events.map((event) => <div key={event.id}><i className={`tracking-event-status tracking-event-status--${event.status}`}/><span><strong>{event.action}</strong><small>{event.context}</small></span><time>{event.when}</time></div>)}
          <p>Telemetria simulada para demonstrar uma conta tecnológica conectada. Ela não altera silenciosamente a probabilidade estatística da planilha.</p>
        </section>
      </div>}

      {activeView === "health" && <div className="analysis-panel analysis-panel--single" role="tabpanel">
        <div className="analysis-question"><span>Leitura da operação</span><h3>Quais áreas estão abaixo do nível desejado?</h3><p><strong>Como ler:</strong> cada linha vai de 0 a 100. Barras menores indicam onde o relacionamento tem menos sustentação hoje.</p></div>
        <div className="analysis-chart analysis-chart--wide"><ResponsiveContainer width="100%" height="100%"><BarChart data={operational} layout="vertical" margin={{ left: 58, right: 24 }}><CartesianGrid stroke="rgba(255,255,255,.06)" horizontal={false}/><XAxis type="number" domain={[0, 100]} unit="%" tick={{ fill: "#9aa7bd", fontSize: 10 }}/><YAxis type="category" dataKey="name" width={145} tick={{ fill: "#d5dbea", fontSize: 11 }}/><Tooltip formatter={(value) => [`${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`, "Nível observado"]}/><Bar dataKey="value" radius={[0,7,7,0]}>{operational.map((item) => <Cell key={item.name} fill={item.value < 60 ? "#ff6b78" : item.value < 80 ? "#ffba49" : item.color}/>)}</Bar></BarChart></ResponsiveContainer></div>
        <div className="plain-insight"><strong>O que procurar:</strong><span>comece pelas barras vermelhas e amarelas. Elas mostram as dimensões que mais precisam de validação ou recuperação.</span></div>
      </div>}

      {activeView === "scenarios" && <div className="analysis-panel analysis-panel--single" role="tabpanel">
        <div className="analysis-question"><span>Simulação, não promessa</span><h3>Como o risco pode mudar se os indicadores melhorarem ou piorarem?</h3><p><strong>Leitura rápida:</strong> a faixa entre {scenarios[1].value}% e {scenarios[2].value}% mostra a sensibilidade da estimativa. Não representa efeito causal garantido.</p></div>
        <div className="analysis-chart analysis-chart--wide"><ResponsiveContainer width="100%" height="100%"><BarChart data={scenarios} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}><CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false}/><XAxis dataKey="name" tick={{ fill: "#b9b9b9", fontSize: 10 }}/><YAxis unit="%" tick={{ fill: "#9aa7bd", fontSize: 10 }}/><Tooltip formatter={(value) => [`${value}%`, "Probabilidade estimada"]}/><Bar dataKey="value" radius={[7,7,0,0]}>{scenarios.map((item) => <Cell key={item.name} fill={item.color}/>)}</Bar></BarChart></ResponsiveContainer></div>
        <div className="plain-insight"><strong>Impacto financeiro atual:</strong><span>{formatCurrency(prediction.expectedMonthlyRevenueAtRisk)} por mês, calculado como probabilidade estimada vezes receita mensal.</span></div>
      </div>}

      {activeView === "history" && <div className="analysis-panel analysis-panel--history" role="tabpanel">
        <div className="analysis-question"><span>Referência histórica</span><h3>Existem cancelamentos com sinais parecidos?</h3><p><strong>Como ler:</strong> a semelhança compara uso, SLA e NPS. Ela ajuda a investigar, mas não determina que o mesmo resultado acontecerá.</p></div>
        {similar.length ? <div className="similar-case-grid">{similar.map((item) => <div key={item.subjectId}><strong>{item.subjectId}</strong><span>{item.similarity}% semelhante</span><p>Uso {item.evidenceBeforeCancellation.usage.current ?? "N/D"}% · SLA {item.evidenceBeforeCancellation.service.slaCurrent ?? "N/D"}% · NPS {item.evidenceBeforeCancellation.relationship.latestNps ?? "N/D"}</p></div>)}</div> : <p className="empty-inline">Não há cancelamentos comparáveis no mesmo segmento.</p>}
      </div>}
    </article>

    <article className="panel contact-workspace">
      <div className="contact-plan">
        <div className="panel-heading"><div><span><ContactIcon size={14}/> Próxima ação recomendada</span><h2>Como conversar com este cliente</h2><p>Use os fatos observados sem expor a probabilidade nem sugerir vigilância individual.</p></div></div>
        <div className="contact-guidance-kpis"><div><small>Quando agir</small><strong>{strategy.urgency}</strong></div><div><small>Melhor canal</small><strong>{strategy.channel}</strong></div></div>
        <ol className="contact-steps"><li><span>1</span><div><strong>Abra a conversa</strong><p>{strategy.objective}</p></div></li><li><span>2</span><div><strong>Use o tom certo</strong><p>{strategy.tone}</p></div></li><li><span>3</span><div><strong>Combine um próximo passo</strong><p>Registre responsável, prazo e critério de acompanhamento após ouvir o cliente.</p></div></li></ol>
        <div className="contact-facts"><div><strong><CheckCircle size={15}/> Dados que podem ser citados</strong>{facts.map((fact) => <span key={fact}>{fact}</span>)}</div><div><strong><WarningCircle size={15}/> O que não deve ser dito</strong><span>“Você tem {percent(prediction.probability)} de chance de cancelar.”</span><span>Qualquer menção a monitoramento individual ou conclusão causal.</span></div></div>
      </div>
      <details className="contact-composer">
        <summary><span><Sparkle size={15}/> Ver e editar mensagem sugerida</span><small>Nada é enviado automaticamente</small></summary>
        <div className="contact-composer-fields"><label>Assunto<input value={subject} onChange={(event) => { setSubject(event.target.value); setReviewed(false); }}/></label><label>Mensagem<textarea rows={6} value={message} onChange={(event) => { setMessage(event.target.value); setReviewed(false); }}/></label><label className="review-checkbox"><input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)}/><span>Revisei o contexto, o tom e a mensagem.</span></label><a className={`primary-button${reviewed ? "" : " is-disabled"}`} href={reviewed ? gmail : undefined} target="_blank" rel="noreferrer" aria-disabled={!reviewed}>Abrir Gmail após revisão <ArrowRight size={16}/></a></div>
      </details>
    </article>
  </section>;
}
