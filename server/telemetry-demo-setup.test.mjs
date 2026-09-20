import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { ensureTelemetryEventSchema } from "./telemetry-schema.mjs";
import {
  setupTelemetryDemo,
  TELEMETRY_DEMO_CLIENTS,
  TELEMETRY_DEMO_FEATURES,
} from "./telemetry-demo-setup.mjs";

function createDatabase() {
  const database = new DatabaseSync(":memory:");
  database.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE connection_applications (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      client_name TEXT NOT NULL,
      client_id TEXT UNIQUE,
      integration_status TEXT NOT NULL DEFAULT 'waiting_integration',
      credential_hash TEXT NOT NULL,
      credential_encrypted TEXT NOT NULL,
      credential_iv TEXT NOT NULL,
      credential_tag TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE connection_features (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      name TEXT NOT NULL,
      event_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(application_id, event_name),
      FOREIGN KEY(application_id) REFERENCES connection_applications(id) ON DELETE CASCADE
    );
    CREATE TABLE connection_events (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      event_name TEXT NOT NULL,
      user_id TEXT,
      received_at TEXT NOT NULL,
      data_origin TEXT NOT NULL DEFAULT 'real',
      FOREIGN KEY(application_id) REFERENCES connection_applications(id) ON DELETE CASCADE
    );
  `);
  ensureTelemetryEventSchema(database);
  return database;
}

test("setup cria os seis exemplos e pode ser repetido sem duplicar conexões", () => {
  const database = createDatabase();
  const encryptionKey = randomBytes(32);
  const now = new Date("2026-09-20T12:00:00.000Z");
  const seedCalls = [];
  const seedTelemetry = (_database, options) => {
    seedCalls.push(options.applicationId);
    return { inserted: 0, totalDemoEvents: 0 };
  };

  const first = setupTelemetryDemo(database, encryptionKey, { now, seedTelemetry });
  const second = setupTelemetryDemo(database, encryptionKey, { now, seedTelemetry });

  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM connection_applications").get().count, TELEMETRY_DEMO_CLIENTS.length);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM connection_features").get().count, TELEMETRY_DEMO_CLIENTS.length * TELEMETRY_DEMO_FEATURES.length);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM connection_events WHERE data_origin = 'real'").get().count, TELEMETRY_DEMO_CLIENTS.length);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM connection_applications WHERE integration_status = 'connected'").get().count, TELEMETRY_DEMO_CLIENTS.length);
  assert.ok(first.results.every((item) => item.applicationCreated && item.featuresCreated === 3 && item.realEventCreated));
  assert.ok(second.results.every((item) => !item.applicationCreated && item.featuresCreated === 0 && !item.realEventCreated));
  assert.equal(new Set(seedCalls).size, TELEMETRY_DEMO_CLIENTS.length);
  assert.match(first.externalApplication.credential, /^conn_sk_/);
  assert.equal(second.externalApplication.id, first.externalApplication.id);
  database.close();
});
