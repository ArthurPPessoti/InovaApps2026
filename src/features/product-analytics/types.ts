export type AnalyticsPeriod = "today" | "7d" | "30d" | "all";

export interface AnalyticsApplication {
  id: string;
  clientId: string | null;
  client: string | null;
}

export interface FeatureUsage {
  eventName: string;
  name: string;
  usageCount: number;
  registered: boolean;
}

export interface ProductAnalyticsData {
  from: string | null;
  dataOrigins: {
    realEvents: number;
    demoEvents: number;
    includesDemo: boolean;
  };
  metrics: {
    totalEvents: number;
    uniqueUsers: number;
    featuresUsed: number;
  };
  features: FeatureUsage[];
}

export interface ProductAnalyticsSummary extends ProductAnalyticsData {
  application: AnalyticsApplication;
}

export interface LinkedAnalyticsApplication {
  id: string;
}

export interface ClientProductAnalyticsSummary extends ProductAnalyticsData {
  clientId: string;
  applicationId: string | null;
  applications: LinkedAnalyticsApplication[];
}

export type TemporalAnalyticsPeriod = "monthly" | "quarterly" | "semiannual" | "annual";

export type AnalysisAvailabilityStatus =
  | "no_connection"
  | "no_features"
  | "waiting_for_events"
  | "insufficient_history"
  | "ready";

export interface MetricComparison {
  current: number;
  previous: number;
  absoluteChange: number;
  percentageChange: number | null;
}

export interface TemporalFeatureAnalytics {
  eventName: string;
  name: string;
  registered: boolean;
  events: MetricComparison;
  uniqueUsers: MetricComparison;
  frequencyPerUser: MetricComparison;
  consecutiveDeclines: number;
}

export interface TemporalProductAnalytics {
  product: {
    id: string;
    name: string;
    companyId: string;
    companyName: string;
  } | null;
  clientId: string;
  applicationIds: string[];
  period: {
    key: TemporalAnalyticsPeriod;
    timeZone: string;
    current: { start: string; end: string; label: string };
    previous: { start: string; end: string; label: string };
  };
  dataOrigins: {
    realEvents: number;
    demoEvents: number;
    includesDemo: boolean;
  };
  analysisAvailability: {
    status: AnalysisAvailabilityStatus;
    hasConnection: boolean;
    monitoredFeatures: number;
    firstProductEventAt: string | null;
    lastProductEventAt: string | null;
    totalProductEvents: number;
    currentPeriodEvents: number;
    previousPeriodEvents: number;
  };
  summary: {
    events: MetricComparison;
    uniqueUsers: MetricComparison;
    featuresUsed: MetricComparison;
    frequencyPerUser: MetricComparison;
  };
  features: TemporalFeatureAnalytics[];
  history: Array<{
    month: string;
    events: number;
    uniqueUsers: number;
  }>;
  featureHistory: {
    granularity: "daily" | "weekly" | "monthly";
    points: Array<{
      start: string;
      eventCounts: Record<string, number>;
    }>;
  };
}
