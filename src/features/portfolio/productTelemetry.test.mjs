import assert from "node:assert/strict";
import test from "node:test";
import {
  formatMonitoredFeatures,
  matchesTelemetryFilter,
  productTelemetryFor,
} from "./productTelemetry.ts";

const connected = (featureCount) => ({ connected: true, applicationId: "app_test", featureCount });
const disconnected = { connected: false, applicationId: null, featureCount: 0 };

test("pluraliza funcionalidades monitoradas nos tres estados", () => {
  assert.equal(formatMonitoredFeatures(connected(0)), "0 funcionalidades monitoradas");
  assert.equal(formatMonitoredFeatures(connected(1)), "1 funcionalidade monitorada");
  assert.equal(formatMonitoredFeatures(connected(3)), "3 funcionalidades monitoradas");
  assert.equal(formatMonitoredFeatures(disconnected), "Nenhuma funcionalidade monitorada");
});

test("filtro de telemetria preserva todos e separa conectados", () => {
  assert.equal(matchesTelemetryFilter(connected(0), "all"), true);
  assert.equal(matchesTelemetryFilter(disconnected, "all"), true);
  assert.equal(matchesTelemetryFilter(connected(0), "connected"), true);
  assert.equal(matchesTelemetryFilter(disconnected, "connected"), false);
  assert.equal(matchesTelemetryFilter(connected(3), "disconnected"), false);
  assert.equal(matchesTelemetryFilter(disconnected, "disconnected"), true);
});

test("resolve igualmente produtos mock e persistidos pelo id explicito", () => {
  const telemetryByProduct = {
    mock_product: connected(3),
    persisted_product: connected(0),
  };
  assert.deepEqual(productTelemetryFor(telemetryByProduct, "mock_product"), connected(3));
  assert.deepEqual(productTelemetryFor(telemetryByProduct, "persisted_product"), connected(0));
  assert.deepEqual(productTelemetryFor(telemetryByProduct, "without_connection"), disconnected);
});
