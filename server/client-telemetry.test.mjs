import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import {
  getClientTelemetry,
  linkApplicationToClient,
} from "./client-telemetry.mjs";

function createDatabase() {
  const database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE TABLE connection_applications (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      client_name TEXT NOT NULL,
      client_id TEXT,
      integration_status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE connection_features (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      name TEXT NOT NULL,
      event_name TEXT NOT NULL
    );
    CREATE TABLE connection_events (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      event_name TEXT NOT NULL,
      user_id TEXT,
      received_at TEXT NOT NULL
    );
  `);
  return database;
}

function insertApplication(database, id, name, clientId = null) {
  database.prepare(`
    INSERT INTO connection_applications
      (id, name, client_name, client_id, integration_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'connected', '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z')
  `).run(id, name, clientId ? `Cliente ${clientId}` : "Nome legado", clientId);
}

function insertEvent(database, id, applicationId, eventName, receivedAt) {
  database.prepare("INSERT INTO connection_events VALUES (?, ?, ?, ?, ?)")
    .run(id, applicationId, eventName, "user_001", receivedAt);
}

test("aplicação antiga permanece sem vínculo e seus eventos são preservados ao vinculá-la", () => {
  const database = createDatabase();
  insertApplication(database, "app_legacy", "Aplicação legada");
  insertEvent(database, "evt_legacy", "app_legacy", "relatorio_gerado", "2026-09-19T12:00:00.000Z");

  assert.deepEqual(getClientTelemetry(database, "client_a"), {
    clientId: "client_a",
    applications: [],
    events: [],
  });

  assert.equal(linkApplicationToClient(database, "app_legacy", "client_a", "Produto A · Empresa", "2026-09-19T13:00:00.000Z"), true);
  const telemetry = getClientTelemetry(database, "client_a");
  assert.equal(telemetry.applications.length, 1);
  assert.equal(telemetry.events[0].id, "evt_legacy");
  database.close();
});

test("reúne múltiplas aplicações e mantém isolamento entre clientes", () => {
  const database = createDatabase();
  insertApplication(database, "app_a1", "Estoque", "client_a");
  insertApplication(database, "app_a2", "Portal", "client_a");
  insertApplication(database, "app_b1", "Financeiro", "client_b");
  database.prepare("INSERT INTO connection_features VALUES (?, ?, ?, ?)")
    .run("feature_1", "app_a1", "Gerar relatório", "relatorio_gerado");
  insertEvent(database, "evt_a1", "app_a1", "relatorio_gerado", "2026-09-19T12:00:00.000Z");
  insertEvent(database, "evt_a2", "app_a2", "portal_aberto", "2026-09-19T13:00:00.000Z");
  insertEvent(database, "evt_b1", "app_b1", "boleto_pago", "2026-09-19T14:00:00.000Z");

  const telemetry = getClientTelemetry(database, "client_a");
  assert.equal(telemetry.applications.length, 2);
  assert.deepEqual(telemetry.events.map((event) => event.id), ["evt_a2", "evt_a1"]);
  assert.equal(telemetry.events[1].name, "Gerar relatório");
  assert.ok(telemetry.events.every((event) => event.applicationId !== "app_b1"));
  database.close();
});

test("distingue cliente sem aplicação de cliente com aplicação sem eventos", () => {
  const database = createDatabase();
  insertApplication(database, "app_empty", "Aplicação sem eventos", "client_a");

  assert.equal(getClientTelemetry(database, "client_none").applications.length, 0);
  const telemetry = getClientTelemetry(database, "client_a");
  assert.equal(telemetry.applications.length, 1);
  assert.equal(telemetry.events.length, 0);
  database.close();
});
