import type { ProductTelemetrySummary } from "../portfolio/productTelemetry";
import type { ConnectedApplication } from "./types";

export function connectionTelemetryByClient(
  applications: ConnectedApplication[],
): Map<string, ProductTelemetrySummary> {
  const telemetry = new Map<string, ProductTelemetrySummary>();

  applications.forEach((application) => {
    if (!application.clientId) return;
    const current = telemetry.get(application.clientId);
    const candidate = {
      connected: application.status === "connected",
      applicationId: application.id,
      featureCount: application.featureCount,
    };
    if (!current || candidate.connected) telemetry.set(application.clientId, candidate);
  });

  return telemetry;
}
