export type AnalyticsPeriod = "today" | "7d" | "30d" | "all";

export interface AnalyticsApplication {
  id: string;
  name: string;
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
  name: string;
}

export interface ClientProductAnalyticsSummary extends ProductAnalyticsData {
  clientId: string;
  applicationId: string | null;
  applications: LinkedAnalyticsApplication[];
}
