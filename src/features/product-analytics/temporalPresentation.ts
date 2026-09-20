import type {
  AnalysisAvailabilityStatus,
  TemporalFeatureAnalytics,
  TemporalProductAnalytics,
} from "./types";

export const ALL_FEATURES = "all";
export const STABILITY_THRESHOLD_PERCENT = 5;
export const FEATURE_CHIP_LIMIT = 6;

export type PeriodHighlightKind = "decline" | "growth" | "stable" | "baseline";

export interface PeriodHighlight {
  eventName: string;
  kind: PeriodHighlightKind;
  text: string;
}

interface HighlightCandidate extends PeriodHighlight {
  priority: number;
  primaryRank: number;
  name: string;
}

function formatPercentage(value: number) {
  return Math.abs(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function declineCopy(feature: TemporalFeatureAnalytics) {
  const count = feature.consecutiveDeclines;
  const monthlyCopy = `${count} ${count === 1 ? "queda mensal consecutiva" : "quedas mensais consecutivas"}`;
  const percentageChange = feature.events.percentageChange;
  if (percentageChange !== null && percentageChange <= -STABILITY_THRESHOLD_PERCENT) {
    return `${feature.name} caiu ${formatPercentage(percentageChange)}% em relação ao período anterior e registra ${monthlyCopy}.`;
  }
  return `${feature.name} registra ${monthlyCopy}.`;
}

function toHighlightCandidate(feature: TemporalFeatureAnalytics): HighlightCandidate | null {
  if (feature.consecutiveDeclines > 0) {
    return {
      eventName: feature.eventName,
      kind: "decline",
      text: declineCopy(feature),
      priority: 0,
      primaryRank: feature.consecutiveDeclines,
      name: feature.name,
    };
  }

  const percentageChange = feature.events.percentageChange;
  if (percentageChange === null) {
    if (feature.events.current === 0) return null;
    const eventLabel = feature.events.current === 1 ? "evento" : "eventos";
    return {
      eventName: feature.eventName,
      kind: "baseline",
      text: `${feature.name} registrou ${feature.events.current.toLocaleString("pt-BR")} ${eventLabel} no período atual, sem base anterior para comparação.`,
      priority: 4,
      primaryRank: feature.events.current,
      name: feature.name,
    };
  }

  if (percentageChange <= -STABILITY_THRESHOLD_PERCENT) {
    return {
      eventName: feature.eventName,
      kind: "decline",
      text: `${feature.name} caiu ${formatPercentage(percentageChange)}% em relação ao período anterior.`,
      priority: 1,
      primaryRank: Math.abs(percentageChange),
      name: feature.name,
    };
  }

  if (percentageChange >= STABILITY_THRESHOLD_PERCENT) {
    return {
      eventName: feature.eventName,
      kind: "growth",
      text: `${feature.name} cresceu ${formatPercentage(percentageChange)}% em relação ao período anterior.`,
      priority: 2,
      primaryRank: percentageChange,
      name: feature.name,
    };
  }

  return {
    eventName: feature.eventName,
    kind: "stable",
    text: `${feature.name} permaneceu próxima ao período anterior (${formatPercentage(percentageChange)}% de variação).`,
    priority: 3,
    primaryRank: feature.events.current,
    name: feature.name,
  };
}

export function buildPeriodHighlights(
  features: TemporalFeatureAnalytics[],
  status: AnalysisAvailabilityStatus,
  limit = 3,
): PeriodHighlight[] {
  if (status !== "ready" || limit <= 0) return [];
  return features
    .map(toHighlightCandidate)
    .filter((candidate): candidate is HighlightCandidate => candidate !== null)
    .sort((left, right) => (
      left.priority - right.priority
      || right.primaryRank - left.primaryRank
      || left.name.localeCompare(right.name, "pt-BR")
      || left.eventName.localeCompare(right.eventName)
    ))
    .slice(0, limit)
    .map(({ eventName, kind, text }) => ({ eventName, kind, text }));
}

export function normalizeFeatureSelection(
  selectedFeature: string,
  features: TemporalFeatureAnalytics[],
) {
  if (selectedFeature === ALL_FEATURES) return ALL_FEATURES;
  return features.some((feature) => feature.eventName === selectedFeature)
    ? selectedFeature
    : ALL_FEATURES;
}

export function getFeatureFilterMode(featureCount: number) {
  return featureCount <= FEATURE_CHIP_LIMIT ? "chips" : "select";
}

export function buildFeatureChart(
  featureHistory: TemporalProductAnalytics["featureHistory"],
  features: TemporalFeatureAnalytics[],
  selectedFeature: string,
) {
  const selection = normalizeFeatureSelection(selectedFeature, features);
  const visibleFeatures = selection === ALL_FEATURES
    ? features
    : features.filter((feature) => feature.eventName === selection);
  return {
    selection,
    features: visibleFeatures,
    granularity: featureHistory.granularity,
    data: featureHistory.points.map((point) => ({
      start: point.start,
      values: Object.fromEntries(visibleFeatures.map((feature) => [
        feature.eventName,
        point.eventCounts[feature.eventName] ?? 0,
      ])),
    })),
  };
}
