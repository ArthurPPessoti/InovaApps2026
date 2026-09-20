import type { ChurnAnalysis, ChurnBand } from "./types";

const GLOBALSYS_CLIENT_ID = /^C\d+$/i;

export function isGlobalSysClientId(value: string) {
  return GLOBALSYS_CLIENT_ID.test(value.trim());
}

export function selectGlobalSysAnalysis(analysis: ChurnAnalysis): ChurnAnalysis {
  const predictions = analysis.predictions.filter((item) => isGlobalSysClientId(item.subjectId));
  const historicalChurn = analysis.historicalChurn.filter((item) => isGlobalSysClientId(item.subjectId));
  const distribution: Record<ChurnBand, number> = { LOW: 0, ATTENTION: 0, HIGH: 0, CRITICAL: 0 };

  predictions.forEach((item) => {
    distribution[item.probabilityBand] += 1;
  });

  const totalMonthlyRevenue = predictions.reduce((total, item) => total + item.monthlyRevenue, 0);
  const expectedMonthlyRevenueAtRisk = predictions.reduce(
    (total, item) => total + item.expectedMonthlyRevenueAtRisk,
    0,
  );

  return {
    ...analysis,
    source: {
      ...analysis.source,
      entities: predictions.length + historicalChurn.length,
      activeEntities: predictions.length,
      cancelledEntities: historicalChurn.length,
    },
    summary: {
      ...analysis.summary,
      analyzedEntities: predictions.length,
      totalMonthlyRevenue,
      expectedMonthlyRevenueAtRisk,
      portfolioProbabilityWeighted: totalMonthlyRevenue
        ? expectedMonthlyRevenueAtRisk / totalMonthlyRevenue
        : 0,
      averageProbability: predictions.length
        ? predictions.reduce((total, item) => total + item.probability, 0) / predictions.length
        : 0,
      highOrCriticalEntities: predictions.filter((item) => (
        item.probabilityBand === "HIGH" || item.probabilityBand === "CRITICAL"
      )).length,
      distribution,
    },
    predictions,
    historicalChurn,
  };
}
