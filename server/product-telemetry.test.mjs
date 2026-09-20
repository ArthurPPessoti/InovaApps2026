import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { getProductTelemetryByProduct } from "./product-telemetry.mjs";

function createDatabase() {
  const database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE TABLE connection_applications (
      id TEXT PRIMARY KEY,
      client_id TEXT
    );
    CREATE TABLE connection_features (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      name TEXT NOT NULL,
      event_name TEXT NOT NULL
    );
  `);
  return database;
}

test("agrega conexao e funcionalidades por produto sem inferir vinculos legados", () => {
  const database = createDatabase();
  const insertApplication = database.prepare("INSERT INTO connection_applications VALUES (?, ?)");
  insertApplication.run("app_three", "mock_product");
  insertApplication.run("app_one", "persisted_product");
  insertApplication.run("app_zero", "connected_without_features");
  insertApplication.run("app_legacy", null);

  const insertFeature = database.prepare("INSERT INTO connection_features VALUES (?, ?, ?, ?)");
  insertFeature.run("feature_1", "app_three", "Feature 1", "feature_1");
  insertFeature.run("feature_2", "app_three", "Feature 2", "feature_2");
  insertFeature.run("feature_3", "app_three", "Feature 3", "feature_3");
  insertFeature.run("feature_4", "app_one", "Feature 4", "feature_4");
  insertFeature.run("feature_legacy", "app_legacy", "Legacy", "legacy_event");

  assert.deepEqual(getProductTelemetryByProduct(database), {
    connected_without_features: {
      connected: true,
      applicationId: "app_zero",
      featureCount: 0,
    },
    mock_product: {
      connected: true,
      applicationId: "app_three",
      featureCount: 3,
    },
    persisted_product: {
      connected: true,
      applicationId: "app_one",
      featureCount: 1,
    },
  });
  assert.equal("product_without_connection" in getProductTelemetryByProduct(database), false);
  database.close();
});
