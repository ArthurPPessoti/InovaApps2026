import type { Aggregation, ImportanceLevel, MetricConfig, MetricRiskType, SemanticRole } from "./types";

export const roleLabels: Record<SemanticRole, string> = {
  ENTITY_ID: "Identificador",
  TIME: "Data",
  TARGET: "Resultado observado",
  METRIC: "Indicador",
  CONTEXT: "Contexto",
  BUSINESS_VALUE: "Valor financeiro",
  STATUS_FILTER: "Situação",
  OWNER: "Responsável",
  CONTACT: "Contato",
  IGNORE: "Não usar",
};

export const riskTypeLabels: Record<MetricRiskType, string> = {
  HIGH_IS_RISK: "Quanto maior, maior o risco",
  LOW_IS_RISK: "Quanto menor, maior o risco",
  TARGET_RANGE: "Risco fora de uma faixa saudável",
  BINARY_RISK: "Sim ou não",
  CATEGORICAL_RISK: "Depende da categoria",
  TREND_RISK: "Mudança ao longo do tempo",
  INFORMATIONAL: "Só informativo",
};

export const aggregationLabels: Record<Aggregation, string> = {
  FIRST: "Primeiro valor",
  LATEST: "Último valor",
  MEAN: "Média",
  RECENT_MEAN: "Média recente",
  SUM: "Soma",
  MIN: "Mínimo",
  MAX: "Máximo",
  TREND: "Tendência",
};

export const importanceLabels: Record<ImportanceLevel, string> = {
  VERY_LOW: "Muito baixa",
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

export type MetricScope = "usadas" | "ignoradas" | "todas";

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR").trim();

export function filterMetrics(metrics: MetricConfig[], { scope, search }: { scope: MetricScope; search: string }) {
  const term = normalize(search);
  return metrics.filter((metric) => {
    if (scope === "usadas" && !metric.included) return false;
    if (scope === "ignoradas" && metric.included) return false;
    if (!term) return true;
    return [metric.column, metric.meaning, metric.sheet].some((field) => normalize(String(field ?? "")).includes(term));
  });
}

export interface MetricGroup {
  sheet: string;
  metrics: MetricConfig[];
  usedCount: number;
}

// Agrupa por aba mantendo a ordem original da planilha; dentro do grupo, o que está em uso vem primeiro.
export function groupBySheet(metrics: MetricConfig[]): MetricGroup[] {
  const groups = new Map<string, MetricConfig[]>();
  for (const metric of metrics) {
    const list = groups.get(metric.sheet) ?? [];
    list.push(metric);
    groups.set(metric.sheet, list);
  }
  return [...groups.entries()].map(([sheet, list]) => ({
    sheet,
    metrics: list.slice().sort((a, b) => Number(b.included) - Number(a.included) || b.confidence - a.confidence),
    usedCount: list.filter((metric) => metric.included).length,
  }));
}
