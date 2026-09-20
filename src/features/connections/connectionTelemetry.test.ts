import assert from "node:assert/strict";
import test from "node:test";
import { connectionTelemetryByClient } from "./connectionTelemetry.ts";
import type { ConnectedApplication } from "./types.ts";

function application(
  clientId: string | null,
  status: ConnectedApplication["status"],
  featureCount = 0,
): ConnectedApplication {
  return {
    id: `app_${clientId ?? "legacy"}_${status}`,
    clientId,
    client: clientId,
    status,
    createdAt: "2026-09-20T00:00:00.000Z",
    features: [],
    featureCount,
    eventCount: status === "connected" ? 1 : 0,
    lastEventAt: status === "connected" ? "2026-09-20T00:00:00.000Z" : null,
  };
}

test("diferencia conexão configurada de telemetria efetivamente conectada", () => {
  const telemetry = connectionTelemetryByClient([
    application("C001", "waiting_integration", 2),
    application("C002", "connected", 3),
    application(null, "connected", 1),
  ]);

  assert.deepEqual(telemetry.get("C001"), {
    connected: false,
    applicationId: "app_C001_waiting_integration",
    featureCount: 2,
  });
  assert.deepEqual(telemetry.get("C002"), {
    connected: true,
    applicationId: "app_C002_connected",
    featureCount: 3,
  });
  assert.equal(telemetry.has(""), false);
});
