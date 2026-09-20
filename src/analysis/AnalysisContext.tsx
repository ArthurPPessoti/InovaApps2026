import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import type { ChurnAnalysis } from "../churn/types";
import type { AdaptiveAnalysisResult, AnalysisConfig, WorkbookProfile } from "./types";

const EVENT = "inovaapps:analysis-v2";
const configKey = (accountId: string) => `inovaapps.analysis.config.v2:${accountId}`;
const resultKey = (accountId: string) => `inovaapps.analysis.result.v2:${accountId}`;
const historyKey = (accountId: string) => `inovaapps.analysis.history.v2:${accountId}`;

function parse<T>(value: string | null): T | null {
  try { return value ? JSON.parse(value) as T : null; } catch { return null; }
}

function legacyAdapter(legacy: ChurnAnalysis): AdaptiveAnalysisResult {
  const profile: WorkbookProfile = {
    fileName: legacy.source.fileName, format: "xlsx", sheets: [], totalRows: legacy.source.entities,
    quality: legacy.predictions.reduce((sum, item) => sum + item.dataCoverage, 0) / Math.max(legacy.predictions.length, 1),
    observedFrom: legacy.source.observedFrom, observedUntil: legacy.source.observedUntil, relationships: [],
    capabilities: { time: true, businessValue: true, segment: true, target: true, history: true, owner: false, contact: false, location: false, telemetry: false },
    objectiveSuggestions: [{ id: "churn-90", label: "Antecipar cancelamento", behavior: "cancelar o contrato", eventPolarity: "negative", horizonDays: legacy.model.horizonDays, rationale: "Desfecho histórico disponível na base demonstrativa." }], warnings: [],
  };
  const config: AnalysisConfig = {
    schemaVersion: "2.0", id: `demo-${legacy.model.version}`, createdAt: legacy.generatedAt,
    objective: { entitySheet: "clientes", entityColumn: "cliente_id", entityLabel: "cliente", entityLabelPlural: "clientes", behavior: "cancelar o contrato", eventPolarity: "negative", targetSheet: "situacao_clientes", targetColumn: "situacao_atual", positiveValues: ["Cancelado"], horizonDays: legacy.model.horizonDays, confirmed: true },
    relationships: [], metrics: legacy.model.globalFactors.map((factor, index) => ({ id: factor.feature, sheet: "base consolidada", column: factor.feature, meaning: factor.label, role: "METRIC", included: true, riskType: factor.direction === "increases_risk" ? "HIGH_IS_RISK" : "LOW_IS_RISK", aggregation: "RECENT_MEAN", importance: index < 2 ? "HIGH" : "MEDIUM", scale: "AUTO", missingStrategy: "EXCLUDE", confidence: .9, rationale: "Métrica do modelo demonstrativo validado." })), methodPreference: "AUTO", priorityMode: "expected_impact", importanceMode: "qualitative", minimumCoverage: .5, sampleConsent: false,
  };
  const distribution = { ...legacy.summary.distribution, INSUFFICIENT: 0 };
  return {
    schemaVersion: "2.0", runId: `legacy-${legacy.model.version}`, generatedAt: legacy.generatedAt,
    source: { fileName: legacy.source.fileName, rows: legacy.source.entities }, config, profile,
    method: { selected: "calibrated_probability", label: "Probabilidade calibrada", reason: legacy.readiness.reason, quality: { brierScore: legacy.model.test.brierScore ?? undefined, rocAuc: legacy.model.test.rocAuc ?? undefined, calibrated: true } },
    summary: { analyzedEntities: legacy.summary.analyzedEntities, attentionEntities: legacy.summary.highOrCriticalEntities, highEntities: legacy.predictions.filter((item) => ["HIGH", "CRITICAL"].includes(item.probabilityBand)).length, averageEstimate: legacy.summary.averageProbability, averageCoverage: profile.quality, totalBusinessValue: legacy.summary.totalMonthlyRevenue, expectedImpact: legacy.summary.expectedMonthlyRevenueAtRisk, distribution },
    entities: legacy.predictions.map((item) => ({ id: item.subjectId, displayName: item.subjectId, estimate: item.probability, estimateKind: "probability", band: item.probabilityBand, coverage: item.dataCoverage, businessValue: item.monthlyRevenue, expectedImpact: item.expectedMonthlyRevenueAtRisk, segment: item.segment, factors: item.topFactors.map((factor) => ({ metricId: factor.feature, label: factor.label, observedValue: null, reference: "comparação com o histórico da carteira", contribution: Math.abs(factor.contribution ?? factor.coefficient ?? 0), direction: factor.direction, origin: "base consolidada", observed: true })), missingData: [], context: { plano: item.plan, segmento: item.segment, uso_atual: item.evidence.usage.current, sla_atual: item.evidence.service.slaCurrent, nps: item.evidence.relationship.latestNps, atraso_pagamento: item.evidence.financial.paymentDelayDays }, recommendations: ["Validar o contexto com o responsável pela conta.", "Usar as evidências como perguntas, nunca como certeza."] })),
    modules: [
      { id: "entities", title: "Clientes analisados", kind: "kpi", reason: "Disponível para qualquer fonte." },
      { id: "quality", title: "Qualidade e cobertura", kind: "quality", reason: "Disponível para qualquer fonte." },
      { id: "distribution", title: "Distribuição de risco", kind: "distribution", reason: "Resultado ativo." },
      { id: "ranking", title: "Prioridades", kind: "ranking", reason: "Resultado ativo." },
      { id: "factors", title: "Fatores principais", kind: "factors", reason: "Contribuições explicáveis." },
      { id: "financial", title: "Impacto financeiro", kind: "financial", reason: "A fonte possui receita." },
      { id: "timeline", title: "Evolução e tendências", kind: "timeline", reason: "A fonte possui tempo." },
      { id: "segments", title: "Comparação por segmento", kind: "segments", reason: "A fonte possui segmentos." },
      { id: "calibration", title: "Qualidade da probabilidade", kind: "calibration", reason: "Probabilidade aprovada." },
    ], limitations: legacy.limitations,
  };
}

interface AnalysisContextValue {
  result: AdaptiveAnalysisResult | null;
  config: AnalysisConfig | null;
  loading: boolean;
  saveExecution: (result: AdaptiveAnalysisResult) => void;
  saveConfigDraft: (config: AnalysisConfig) => void;
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const { account } = useAuth();
  const [result, setResult] = useState<AdaptiveAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const stored = account ? parse<AdaptiveAnalysisResult>(localStorage.getItem(resultKey(account.id))) : null;
      if (stored || !account?.id.startsWith("demo-")) {
        if (active) { setResult(stored); setLoading(false); }
        return;
      }
      try {
        const response = await fetch("/data/churn-model.json");
        if (!response.ok) throw new Error("Resultado demonstrativo indisponível.");
        const adapted = legacyAdapter(await response.json() as ChurnAnalysis);
        if (active) setResult(adapted);
      } finally { if (active) setLoading(false); }
    }
    void load();
    const refresh = () => void load();
    window.addEventListener(EVENT, refresh);
    return () => { active = false; window.removeEventListener(EVENT, refresh); };
  }, [account]);

  const value = useMemo<AnalysisContextValue>(() => ({
    result, config: account ? parse<AnalysisConfig>(localStorage.getItem(configKey(account.id))) ?? result?.config ?? null : result?.config ?? null, loading,
    saveConfigDraft(next) {
      if (!account) return;
      localStorage.setItem(configKey(account.id), JSON.stringify(next));
    },
    saveExecution(next) {
      if (!account) return;
      const previous = parse<AdaptiveAnalysisResult[]>(localStorage.getItem(historyKey(account.id))) ?? [];
      localStorage.setItem(configKey(account.id), JSON.stringify(next.config));
      localStorage.setItem(resultKey(account.id), JSON.stringify(next));
      localStorage.setItem(historyKey(account.id), JSON.stringify([next, ...previous].slice(0, 10)));
      setResult(next);
      window.dispatchEvent(new CustomEvent(EVENT));
    },
  }), [account, loading, result]);
  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAdaptiveAnalysis() {
  const value = useContext(AnalysisContext);
  if (!value) throw new Error("useAdaptiveAnalysis precisa estar dentro de AnalysisProvider");
  return value;
}
