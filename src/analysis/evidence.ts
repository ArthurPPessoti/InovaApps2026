import type { AdaptiveAnalysisResult } from "./types";

type Entity = AdaptiveAnalysisResult["entities"][number];

export interface MetricContribution {
  metricId: string;
  label: string;
  /** Pontos que a métrica adiciona, em média, ao score de 0 a 100. */
  points: number;
  /** Fatia desses pontos dentro do score médio da carteira. */
  share: number;
  observedIn: number;
}

/**
 * Média das contribuições por métrica. Como a soma das contribuições de uma
 * entidade reconstrói o score dela, a soma destes pontos reconstrói o score médio.
 */
export function metricContributions(entities: Entity[]): MetricContribution[] {
  if (!entities.length) return [];
  const totals = new Map<string, { label: string; sum: number; observedIn: number }>();
  for (const entity of entities) {
    for (const factor of entity.factors) {
      const current = totals.get(factor.metricId) ?? { label: factor.label, sum: 0, observedIn: 0 };
      current.sum += factor.contribution;
      current.observedIn += 1;
      totals.set(factor.metricId, current);
    }
  }
  const rows = [...totals].map(([metricId, value]) => ({
    metricId,
    label: value.label,
    points: (value.sum / entities.length) * 100,
    observedIn: value.observedIn,
  }));
  const total = rows.reduce((sum, row) => sum + row.points, 0);
  return rows
    .map((row) => ({ ...row, share: total > 0 ? row.points / total : 0 }))
    .sort((a, b) => b.points - a.points);
}

export interface SegmentComparison {
  segment: string;
  count: number;
  /** Score ou probabilidade média do grupo, de 0 a 100. */
  average: number;
  attention: number;
}

/** Comparação por grupo: o módulo `segments` que o motor declara quando a fonte tem segmento. */
export function segmentComparison(entities: Entity[]): SegmentComparison[] {
  const groups = new Map<string, Entity[]>();
  for (const entity of entities) {
    if (!entity.segment) continue;
    groups.set(entity.segment, [...(groups.get(entity.segment) ?? []), entity]);
  }
  return [...groups]
    .map(([segment, members]) => ({
      segment,
      count: members.length,
      average: (members.reduce((sum, item) => sum + item.estimate, 0) / members.length) * 100,
      attention: members.filter((item) => ["ATTENTION", "HIGH", "CRITICAL"].includes(item.band)).length,
    }))
    .sort((a, b) => b.average - a.average);
}

export interface MissingMetric {
  label: string;
  missing: number;
  share: number;
}

/** Quais métricas mais faltam. Peso ausente é peso redistribuído, então isto explica a cobertura. */
export function missingCoverage(entities: Entity[]): MissingMetric[] {
  if (!entities.length) return [];
  const counts = new Map<string, number>();
  for (const entity of entities) {
    for (const label of entity.missingData) counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts]
    .map(([label, missing]) => ({ label, missing, share: missing / entities.length }))
    .sort((a, b) => b.missing - a.missing);
}

/**
 * Quanto do score de uma entidade as contribuições listadas reconstroem.
 * Vale 1 quando a decomposição está completa, que é a garantia auditável do método.
 */
export function reconstruction(entity: Entity): number {
  if (entity.estimate === 0) return 1;
  const sum = entity.factors.reduce((total, factor) => total + factor.contribution, 0);
  return sum / entity.estimate;
}
