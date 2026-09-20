import type { ChurnAnalysis, ChurnBand, ChurnEvidence, ChurnPrediction } from "./types";

export const churnBandLabel: Record<ChurnBand, string> = {
  LOW: "Baixo",
  ATTENTION: "Atenção",
  HIGH: "Alto",
  CRITICAL: "Crítico",
};

export const churnBandThreshold: Record<ChurnBand, string> = {
  LOW: "abaixo de 10%",
  ATTENTION: "de 10% a 24,9%",
  HIGH: "de 25% a 49,9%",
  CRITICAL: "50% ou mais",
};

export function isAttention(prediction: ChurnPrediction) {
  return prediction.probabilityBand !== "LOW";
}

export function primaryRiskReason(prediction: ChurnPrediction) {
  const factor = prediction.topFactors.find((item) => item.direction === "increases_risk") ?? prediction.topFactors[0];
  return factor?.label ?? "Combinação dos indicadores disponíveis";
}

export function segmentRisk(analysis: ChurnAnalysis) {
  const grouped = new Map<string, { segment: string; clients: number; attention: number; expectedRevenue: number }>();
  analysis.predictions.forEach((prediction) => {
    const current = grouped.get(prediction.segment) ?? { segment: prediction.segment, clients: 0, attention: 0, expectedRevenue: 0 };
    current.clients += 1;
    current.attention += Number(isAttention(prediction));
    current.expectedRevenue += prediction.expectedMonthlyRevenueAtRisk;
    grouped.set(prediction.segment, current);
  });
  return [...grouped.values()].sort((a, b) => b.expectedRevenue - a.expectedRevenue);
}

export function evidenceHighlights(evidence: ChurnEvidence) {
  const highlights: Array<{ label: string; value: string; tone: "risk" | "neutral" | "positive" }> = [];
  const usageChange = evidence.usage.change3m;
  if (usageChange != null) highlights.push({ label: "Variação de uso em 3 meses", value: `${usageChange > 0 ? "+" : ""}${usageChange}%`, tone: usageChange < 0 ? "risk" : "positive" });
  const sla = evidence.service.slaCurrent;
  if (sla != null) highlights.push({ label: "SLA cumprido", value: `${sla}%`, tone: sla < 85 ? "risk" : "positive" });
  const critical = evidence.service.criticalTickets;
  if (critical != null) highlights.push({ label: "Chamados críticos", value: String(critical), tone: critical > 0 ? "risk" : "positive" });
  const nps = evidence.relationship.latestNps;
  if (nps != null) highlights.push({ label: "Último NPS", value: String(nps), tone: nps <= 6 ? "risk" : nps >= 9 ? "positive" : "neutral" });
  const delay = evidence.financial.paymentDelayDays;
  if (delay != null) highlights.push({ label: "Atraso financeiro", value: `${delay} dias`, tone: delay > 0 ? "risk" : "positive" });
  return highlights;
}

export function suggestedActions(prediction: ChurnPrediction) {
  const actions: string[] = [];
  const evidence = prediction.evidence;
  if ((evidence.usage.change3m ?? 0) < 0) actions.push("Validar com o cliente o que provocou a redução recente de uso.");
  if ((evidence.service.slaCurrent ?? 100) < 85 || (evidence.service.criticalTickets ?? 0) > 0) actions.push("Revisar os chamados críticos e combinar um plano de recuperação do atendimento.");
  if ((evidence.relationship.latestNps ?? 10) <= 6) actions.push("Abrir uma conversa de relacionamento sobre os pontos que reduziram a satisfação.");
  if ((evidence.financial.paymentDelayDays ?? 0) > 0) actions.push("Alinhar a situação financeira antes que o atraso afete a continuidade do contrato.");
  if (!actions.length) actions.push("Revisar os fatores combinados com o responsável pela conta antes do próximo contato.");
  return actions.slice(0, 3);
}
