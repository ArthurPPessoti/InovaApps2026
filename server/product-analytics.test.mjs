import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import {
  getClientProductAnalyticsSummary,
  getProductAnalyticsSummary,
  normalizeAnalyticsFrom,
} from "./product-analytics.mjs";

function createDatabase() {
  const database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE TABLE connection_applications (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      client_name TEXT NOT NULL,
      client_id TEXT
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
      received_at TEXT NOT NULL,
      data_origin TEXT NOT NULL DEFAULT 'real'
    );
  `);
  database.prepare("INSERT INTO connection_applications VALUES (?, ?, ?, ?)")
    .run("app_stock", "Sistema de Estoque", "Empresa Demo", "client_stock");
  database.prepare("INSERT INTO connection_applications VALUES (?, ?, ?, ?)")
    .run("app_other", "Outro sistema", "Empresa Demo", "client_other");
  database.prepare("INSERT INTO connection_applications VALUES (?, ?, ?, ?)")
    .run("app_portal", "Portal do cliente", "Empresa Demo", "client_stock");
  database.prepare("INSERT INTO connection_features VALUES (?, ?, ?, ?)")
    .run("feature_report", "app_stock", "Gerar relatório", "relatorio_gerado");
  database.prepare("INSERT INTO connection_features VALUES (?, ?, ?, ?)")
    .run("feature_login", "app_portal", "Entrar no portal", "login_realizado");
  return database;
}

function insertEvent(database, id, applicationId, eventName, userId, receivedAt) {
  database.prepare(`
    INSERT INTO connection_events (id, application_id, event_name, user_id, received_at)
    VALUES (?, ?, ?, ?, ?)
  `)
    .run(id, applicationId, eventName, userId, receivedAt);
}

test("agrega somente eventos de funcionalidades monitoradas e resolve o nome amigável", () => {
  const database = createDatabase();
  insertEvent(database, "evt_1", "app_stock", "relatorio_gerado", "user_001", "2026-09-19T12:00:00.000Z");
  insertEvent(database, "evt_2", "app_stock", "relatorio_gerado", "user_001", "2026-09-19T13:00:00.000Z");
  insertEvent(database, "evt_3", "app_stock", "estoque_consultado", "technical_user", "2026-09-19T14:00:00.000Z");
  insertEvent(database, "evt_other", "app_other", "relatorio_gerado", "user_999", "2026-09-19T15:00:00.000Z");

  const result = getProductAnalyticsSummary(database, "app_stock");

  assert.deepEqual(result.metrics, { totalEvents: 2, uniqueUsers: 1, featuresUsed: 1 });
  assert.deepEqual(result.features, [
    { eventName: "relatorio_gerado", name: "Gerar relatório", usageCount: 2, registered: true },
  ]);
  database.close();
});

test("filtra pelo timestamp real e mantém a aplicação isolada", () => {
  const database = createDatabase();
  insertEvent(database, "evt_old", "app_stock", "relatorio_gerado", "user_old", "2026-08-01T12:00:00.000Z");
  insertEvent(database, "evt_new", "app_stock", "relatorio_gerado", "user_new", "2026-09-19T12:00:00.000Z");
  insertEvent(database, "evt_other", "app_other", "evento_externo", "user_other", "2026-09-19T13:00:00.000Z");

  const from = normalizeAnalyticsFrom("2026-09-01T00:00:00-03:00");
  const result = getProductAnalyticsSummary(database, "app_stock", from);

  assert.equal(from, "2026-09-01T03:00:00.000Z");
  assert.deepEqual(result.metrics, { totalEvents: 1, uniqueUsers: 1, featuresUsed: 1 });
  assert.equal(result.features[0].usageCount, 1);
  database.close();
});

test("rejeita início de período inválido", () => {
  assert.throws(() => normalizeAnalyticsFrom("ontem"), /Período inválido/);
});

test("agrega somente as aplicações vinculadas ao cliente", () => {
  const database = createDatabase();
  insertEvent(database, "evt_stock", "app_stock", "relatorio_gerado", "user_001", "2026-09-19T12:00:00.000Z");
  insertEvent(database, "evt_portal_1", "app_portal", "login_realizado", "user_001", "2026-09-19T13:00:00.000Z");
  insertEvent(database, "evt_portal_2", "app_portal", "login_realizado", "user_002", "2026-09-19T14:00:00.000Z");
  insertEvent(database, "evt_other", "app_other", "evento_externo", "user_999", "2026-09-19T15:00:00.000Z");

  const result = getClientProductAnalyticsSummary(database, "client_stock");

  assert.deepEqual(result.metrics, { totalEvents: 3, uniqueUsers: 2, featuresUsed: 2 });
  assert.deepEqual(result.applications, [
    { id: "app_portal" },
    { id: "app_stock" },
  ]);
  assert.deepEqual(result.features, [
    { eventName: "login_realizado", name: "Entrar no portal", usageCount: 2, registered: true },
    { eventName: "relatorio_gerado", name: "Gerar relatório", usageCount: 1, registered: true },
  ]);
  database.close();
});

test("permite filtrar uma aplicação pertencente ao cliente", () => {
  const database = createDatabase();
  insertEvent(database, "evt_stock", "app_stock", "relatorio_gerado", "user_001", "2026-09-19T12:00:00.000Z");
  insertEvent(database, "evt_portal", "app_portal", "login_realizado", "user_002", "2026-09-19T13:00:00.000Z");

  const result = getClientProductAnalyticsSummary(database, "client_stock", null, "app_portal");

  assert.deepEqual(result.metrics, { totalEvents: 1, uniqueUsers: 1, featuresUsed: 1 });
  assert.equal(result.features[0].eventName, "login_realizado");
  assert.equal(getClientProductAnalyticsSummary(database, "client_stock", null, "app_other"), null);
  database.close();
});

test("retorna estado vazio quando o cliente não possui aplicações", () => {
  const database = createDatabase();
  const result = getClientProductAnalyticsSummary(database, "client_without_apps");

  assert.deepEqual(result.applications, []);
  assert.deepEqual(result.metrics, { totalEvents: 0, uniqueUsers: 0, featuresUsed: 0 });
  assert.deepEqual(result.features, []);
  database.close();
});
