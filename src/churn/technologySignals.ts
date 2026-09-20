import type { ChurnAnalysis, ChurnPrediction } from "./types";

export interface ConnectedSignal {
  id: string;
  clientId: string;
  dimension: "Uso" | "Atendimento" | "Relacionamento" | "Financeiro" | "Funcionalidade";
  severity: "Alto" | "Médio";
  title: string;
  detail: string;
  source: "spreadsheet" | "product-telemetry";
  feature?: string;
  variation?: number;
}

export interface TechnologyTelemetry {
  clientId: string;
  productName: string;
  summary: string;
  valueGap: string;
  internalGuidance: string;
  series: Array<{ month: string; generalUse: number; criticalFeature: number; activeUsers: number }>;
  features: Array<{
    name: string;
    current: number;
    previous: number;
    change: number;
    status: "Saudável" | "Atenção" | "Crítico";
    critical: boolean;
    lastActivityDays: number;
  }>;
  events: Array<{ id: string; when: string; action: string; context: string; status: "success" | "attention" | "error" }>;
}

const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
const featureNames = ["Fluxo principal", "Exportação de relatórios", "Integração com ERP", "Automação operacional"];

function clamp(value: number, minimum = 0, maximum = 100) {
  return Math.max(minimum, Math.min(maximum, Math.round(value)));
}

function seedFor(value: string) {
  return [...value].reduce((sum, character) => sum + character.charCodeAt(0), 0);
}

export function technologyTelemetryFor(prediction: ChurnPrediction, index = 0): TechnologyTelemetry {
  const seed = seedFor(prediction.subjectId) + index * 7;
  const generalUse = prediction.evidence.usage.current ?? 72;
  const criticalName = featureNames[seed % featureNames.length];
  const criticalDrop = 24 + seed % 39;
  const criticalCurrent = clamp(76 - criticalDrop);
  const activeCurrent = clamp(generalUse - 8 + seed % 12);
  const featureRows = [
    { name: "Login e acesso", current: clamp(generalUse + 9), previous: clamp(generalUse + 11), change: -2, critical: false, lastActivityDays: 0 },
    ...featureNames.map((name, featureIndex) => {
      const isCritical = name === criticalName;
      const change = isCritical ? -criticalDrop : featureIndex % 2 ? -(6 + seed % 9) : 3 + seed % 8;
      const previous = isCritical ? clamp(criticalCurrent - change) : clamp(62 + (seed + featureIndex * 11) % 28);
      return { name, current: clamp(previous * (1 + change / 100)), previous, change, critical: isCritical, lastActivityDays: isCritical ? 9 + seed % 15 : featureIndex + 1 };
    }),
  ];
  const features = featureRows.map((feature) => ({
    ...feature,
    status: (feature.change <= -35 ? "Crítico" : feature.change <= -12 ? "Atenção" : "Saudável") as "Saudável" | "Atenção" | "Crítico",
  }));
  const series = months.map((month, monthIndex) => {
    const progress = monthIndex / (months.length - 1);
    return {
      month,
      generalUse: clamp(generalUse + 7 - progress * 7),
      criticalFeature: clamp(criticalCurrent + criticalDrop * (1 - progress)),
      activeUsers: clamp(activeCurrent + 5 - progress * 5),
    };
  });
  const criticalFeature = features.find((feature) => feature.critical)!;
  return {
    clientId: prediction.subjectId,
    productName: prediction.plan,
    summary: `Os acessos continuam ativos, mas ${criticalFeature.name} caiu ${Math.abs(criticalFeature.change)}% e está sem atividade relevante há ${criticalFeature.lastActivityDays} dias.`,
    valueGap: `A queda está concentrada em ${criticalFeature.name}; isso pode indicar barreira de processo, integração, treinamento ou valor percebido nessa etapa específica.`,
    internalGuidance: `Pergunte se ${criticalFeature.name.toLocaleLowerCase("pt-BR")} ainda atende ao fluxo da equipe e qual resultado deixou de ser alcançado. Não cite dias, cliques ou monitoramento individual.`,
    series,
    features,
    events: [
      { id: `${prediction.subjectId}-login`, when: "Hoje, 08:42", action: "Login realizado", context: "Acesso normal à conta", status: "success" },
      { id: `${prediction.subjectId}-report`, when: "Há 2 dias", action: "Relatório exportado", context: "Fluxo concluído com sucesso", status: "success" },
      { id: `${prediction.subjectId}-critical`, when: `Há ${criticalFeature.lastActivityDays} dias`, action: `${criticalFeature.name} utilizada pela última vez`, context: `Frequência ${Math.abs(criticalFeature.change)}% menor que no período anterior`, status: "attention" },
      { id: `${prediction.subjectId}-integration`, when: "Há 12 dias", action: "Tentativa de integração", context: "Uma execução não foi concluída", status: "error" },
    ],
  };
}

export function spreadsheetSignals(prediction: ChurnPrediction): ConnectedSignal[] {
  const signals: ConnectedSignal[] = [];
  const evidence = prediction.evidence;
  if ((evidence.usage.change3m ?? 0) <= -10) signals.push({ id: `usage-${prediction.subjectId}`, clientId: prediction.subjectId, dimension: "Uso", severity: (evidence.usage.change3m ?? 0) <= -25 ? "Alto" : "Médio", title: "Uso registrado em queda", detail: `Variação de ${evidence.usage.change3m?.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p. em três meses.`, source: "spreadsheet" });
  if ((evidence.service.slaCurrent ?? 100) < 85) signals.push({ id: `sla-${prediction.subjectId}`, clientId: prediction.subjectId, dimension: "Atendimento", severity: (evidence.service.slaCurrent ?? 100) < 75 ? "Alto" : "Médio", title: "SLA abaixo do esperado", detail: `Cumprimento atual de ${evidence.service.slaCurrent?.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%.`, source: "spreadsheet" });
  if ((evidence.service.criticalTickets ?? 0) > 0) signals.push({ id: `tickets-${prediction.subjectId}`, clientId: prediction.subjectId, dimension: "Atendimento", severity: (evidence.service.criticalTickets ?? 0) >= 2 ? "Alto" : "Médio", title: "Chamados críticos em aberto", detail: `${evidence.service.criticalTickets} chamado(s) crítico(s) no período atual.`, source: "spreadsheet" });
  if ((evidence.relationship.latestNps ?? 10) <= 6) signals.push({ id: `nps-${prediction.subjectId}`, clientId: prediction.subjectId, dimension: "Relacionamento", severity: "Alto", title: "NPS detrator", detail: `Última nota registrada: ${evidence.relationship.latestNps}.`, source: "spreadsheet" });
  if ((evidence.financial.paymentDelayDays ?? 0) > 0) signals.push({ id: `delay-${prediction.subjectId}`, clientId: prediction.subjectId, dimension: "Financeiro", severity: (evidence.financial.paymentDelayDays ?? 0) >= 15 ? "Alto" : "Médio", title: "Pagamento em atraso", detail: `${evidence.financial.paymentDelayDays} dia(s) de atraso registrados.`, source: "spreadsheet" });
  return signals;
}

function telemetrySignals(prediction: ChurnPrediction, index: number): ConnectedSignal[] {
  return technologyTelemetryFor(prediction, index).features
    .filter((feature) => feature.change <= -12)
    .map((feature) => ({
      id: `telemetry-${prediction.subjectId}-${feature.name}`,
      clientId: prediction.subjectId,
      dimension: "Funcionalidade",
      severity: feature.status === "Crítico" ? "Alto" : "Médio",
      title: `${feature.name} perdeu frequência de uso`,
      detail: `A telemetria do produto registrou variação de ${feature.change}% no período atual.`,
      source: "product-telemetry",
      feature: feature.name,
      variation: feature.change,
    }));
}

export function connectedSignals(analysis: ChurnAnalysis, includeProductTelemetry: boolean) {
  const observed = analysis.predictions.flatMap(spreadsheetSignals);
  const telemetry = includeProductTelemetry ? analysis.predictions.slice(0, 12).flatMap(telemetrySignals) : [];
  return [...observed, ...telemetry];
}

export function clientTechnologyTelemetry(analysis: ChurnAnalysis, clientId: string) {
  const index = analysis.predictions.findIndex((item) => item.subjectId === clientId);
  const prediction = analysis.predictions[index];
  return prediction ? technologyTelemetryFor(prediction, Math.max(index, 0)) : undefined;
}
