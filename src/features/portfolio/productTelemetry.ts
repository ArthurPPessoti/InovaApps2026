export interface ProductTelemetrySummary {
  connected: boolean;
  applicationId: string | null;
  featureCount: number;
}

export type TelemetryFilter = "all" | "connected" | "disconnected";

export const disconnectedProductTelemetry: ProductTelemetrySummary = {
  connected: false,
  applicationId: null,
  featureCount: 0,
};

export function productTelemetryFor(
  telemetryByProduct: Record<string, ProductTelemetrySummary> | undefined,
  productId: string,
): ProductTelemetrySummary {
  return {
    ...(telemetryByProduct?.[productId] ?? disconnectedProductTelemetry),
  };
}

export function formatMonitoredFeatures(telemetry: ProductTelemetrySummary) {
  if (!telemetry.connected) return "Nenhuma funcionalidade monitorada";
  if (telemetry.featureCount === 1) return "1 funcionalidade monitorada";
  return `${telemetry.featureCount} funcionalidades monitoradas`;
}

export function matchesTelemetryFilter(
  telemetry: ProductTelemetrySummary,
  filter: TelemetryFilter,
) {
  if (filter === "connected") return telemetry.connected;
  if (filter === "disconnected") return !telemetry.connected;
  return true;
}
