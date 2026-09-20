import type { ProductTelemetrySummary } from "./productTelemetry";
import { formatMonitoredFeatures } from "./productTelemetry";
import "./product-telemetry.css";

export function ProductTelemetryStatus({ telemetry }: { telemetry: ProductTelemetrySummary }) {
  return (
    <div className={`product-telemetry-status ${telemetry.connected ? "product-telemetry-status--connected" : "product-telemetry-status--disconnected"}`}>
      <span className="product-telemetry-status__connection">
        <i aria-hidden="true" />
        {telemetry.connected ? "Telemetria conectada" : "Telemetria não conectada"}
      </span>
      <small>{formatMonitoredFeatures(telemetry)}</small>
    </div>
  );
}
