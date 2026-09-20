export type ChurnBand = "LOW" | "ATTENTION" | "HIGH" | "CRITICAL";

export type CanonicalDataset = "clientes" | "atendimento_mensal" | "pesquisas_nps" | "situacao_clientes";

export interface SpreadsheetInspection {
  fileName: string;
  format: "xlsx" | "csv";
  sheets: Array<{ name: string; columns: string[]; sample: Array<Record<string, unknown>>; rows: number }>;
}

export interface SpreadsheetMapping {
  sheets: Record<CanonicalDataset, string>;
  columns: Record<CanonicalDataset, Record<string, string>>;
}

export interface ChurnFactor {
  feature: string;
  label: string;
  direction: "increases_risk" | "reduces_risk";
  contribution?: number;
  coefficient?: number;
}

export interface ChurnPrediction {
  subjectId: string;
  segment: string;
  plan: string;
  monthlyRevenue: number;
  probability: number;
  probabilityBand: ChurnBand;
  expectedMonthlyRevenueAtRisk: number;
  dataCoverage: number;
  topFactors: ChurnFactor[];
  evidence: ChurnEvidence;
}

export interface ChurnEvidence {
  usage: { current: number | null; average3m: number | null; change3m: number | null; unit: "%" };
  service: {
    slaCurrent: number | null;
    slaAverage3m: number | null;
    slaChange3m: number | null;
    openTickets: number | null;
    criticalTickets: number | null;
    reopenedTickets: number | null;
    resolutionHours: number | null;
    formalComplaints: number | null;
  };
  relationship: {
    latestNps: number | null;
    npsClassification: string;
    monthsSinceNps: number | null;
    meetingsPlanned: number | null;
    meetingsCompleted: number | null;
  };
  financial: { paymentDelayDays: number | null; monthlyRevenue: number | null };
}

export interface HistoricalChurn {
  subjectId: string;
  segment: string;
  plan: string;
  monthlyRevenue: number;
  cancelledMonth: string;
  lastObservedMonth: string;
  evidenceBeforeCancellation: ChurnEvidence;
}

export interface ChurnAnalysis {
  schemaVersion: string;
  generatedAt: string;
  source: {
    fileName: string;
    sha256: string;
    observedFrom: string;
    observedUntil: string;
    entities: number;
    cancelledEntities: number;
    activeEntities: number;
  };
  readiness: {
    stage: "active" | "production";
    reason: string;
    isProductionReady: boolean;
  };
  model: {
    name: string;
    version: string;
    algorithm: string;
    horizonDays: number;
    trainedUntil: string;
    independentChurnEvents: number;
    trainingSnapshots: number;
    test: {
      snapshots: number;
      entities: number;
      positiveSnapshots: number;
      prAuc: number | null;
      rocAuc: number | null;
      brierScore: number | null;
      precisionAt10: number;
      recallAt10: number;
      liftAt10: number | null;
      revenueCapturedAt10: number | null;
      calibration: Array<{ meanProbability: number; observedRate: number; count: number }>;
    };
    globalFactors: ChurnFactor[];
  };
  predictionRun: { asOfDate: string; horizonDays: number; status: string };
  summary: {
    analyzedEntities: number;
    totalMonthlyRevenue: number;
    expectedMonthlyRevenueAtRisk: number;
    portfolioProbabilityWeighted: number;
    averageProbability: number;
    highOrCriticalEntities: number;
    distribution: Record<ChurnBand, number>;
  };
  predictions: ChurnPrediction[];
  historicalChurn: HistoricalChurn[];
  limitations: string[];
}
