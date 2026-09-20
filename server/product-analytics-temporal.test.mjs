import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import {
  getTemporalProductAnalytics,
  resolveTemporalWindows,
} from "./product-analytics.mjs";
import { ensureTelemetryEventSchema } from "./telemetry-schema.mjs";

const NOW = new Date("2026-09-19T15:00:00.000Z");

function createDatabase({ legacyEvents = false } = {}) {
  const database = new DatabaseSync(":memory:");
  database.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE connection_applications (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      client_name TEXT NOT NULL,
      client_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE connection_features (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      name TEXT NOT NULL,
      event_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE connection_events (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      event_name TEXT NOT NULL,
      user_id TEXT,
      received_at TEXT NOT NULL
      ${legacyEvents ? "" : ", data_origin TEXT NOT NULL DEFAULT 'real'"}
    );
    CREATE TABLE portfolio_products (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      company_name TEXT NOT NULL,
      name TEXT NOT NULL
    );
  `);
  ensureTelemetryEventSchema(database);
  database.prepare("INSERT INTO connection_applications VALUES (?, ?, ?, ?, ?)")
    .run("app_a", "Legado A", "Produto A · Empresa A", "product_a", "2026-01-01T00:00:00.000Z");
  database.prepare("INSERT INTO connection_applications VALUES (?, ?, ?, ?, ?)")
    .run("app_b", "Legado B", "Produto B · Empresa B", "product_b", "2026-01-01T00:00:00.000Z");
  database.prepare("INSERT INTO portfolio_products VALUES (?, ?, ?, ?)")
    .run("product_a", "company_a", "Empresa A", "Produto A");
  database.prepare("INSERT INTO portfolio_products VALUES (?, ?, ?, ?)")
    .run("product_b", "company_b", "Empresa B", "Produto B");
  database.prepare("INSERT INTO connection_features VALUES (?, ?, ?, ?, ?)")
    .run("feature_report", "app_a", "Gerar relatório", "relatorio_gerado", "2026-01-01T00:00:00.000Z");
  database.prepare("INSERT INTO connection_features VALUES (?, ?, ?, ?, ?)")
    .run("feature_stock", "app_a", "Consultar estoque", "estoque_consultado", "2026-01-01T00:00:00.000Z");
  return database;
}

function insertEvent(database, {
  id,
  applicationId = "app_a",
  eventName = "relatorio_gerado",
  userId = "user_001",
  receivedAt,
  origin = "real",
}) {
  database.prepare(`
    INSERT INTO connection_events (
      id, application_id, event_name, user_id, received_at, data_origin
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, applicationId, eventName, userId, receivedAt, origin);
}

test("mensal usa month-to-date equivalente em São Paulo", () => {
  const windows = resolveTemporalWindows("monthly", NOW);
  assert.equal(windows.current.start, "2026-09-01T03:00:00.000Z");
  assert.equal(windows.previous.start, "2026-08-01T03:00:00.000Z");
  assert.equal(windows.previous.end, "2026-08-19T15:00:00.000Z");
});

test("trimestral usa três meses-calendário com progresso equivalente", () => {
  const windows = resolveTemporalWindows("quarterly", NOW);
  assert.equal(windows.current.start, "2026-07-01T03:00:00.000Z");
  assert.equal(windows.previous.start, "2026-04-01T03:00:00.000Z");
  assert.equal(windows.previous.end, "2026-06-19T15:00:00.000Z");
});

test("semestral usa seis meses-calendário com progresso equivalente", () => {
  const windows = resolveTemporalWindows("semiannual", NOW);
  assert.equal(windows.current.start, "2026-04-01T03:00:00.000Z");
  assert.equal(windows.previous.start, "2025-10-01T03:00:00.000Z");
  assert.equal(windows.previous.end, "2026-03-19T15:00:00.000Z");
});

test("anual usa janela móvel exata de doze meses", () => {
  const windows = resolveTemporalWindows("annual", NOW);
  assert.equal(windows.current.start, "2025-09-19T15:00:00.000Z");
  assert.equal(windows.previous.start, "2024-09-19T15:00:00.000Z");
  assert.equal(windows.previous.end, windows.current.start);
});

test("compara período atual com período anterior equivalente", () => {
  const database = createDatabase();
  insertEvent(database, { id: "previous", receivedAt: "2026-08-10T12:00:00.000Z" });
  insertEvent(database, { id: "current_1", receivedAt: "2026-09-10T12:00:00.000Z" });
  insertEvent(database, { id: "current_2", receivedAt: "2026-09-11T12:00:00.000Z" });
  const result = getTemporalProductAnalytics(database, "product_a", "monthly", NOW);
  assert.deepEqual(result.summary.events, { current: 2, previous: 1, absoluteChange: 1, percentageChange: 100 });
  database.close();
});

test("calcula usuários únicos", () => {
  const database = createDatabase();
  insertEvent(database, { id: "one", receivedAt: "2026-09-10T12:00:00.000Z", userId: "user_001" });
  insertEvent(database, { id: "two", receivedAt: "2026-09-11T12:00:00.000Z", userId: "user_001" });
  insertEvent(database, { id: "three", receivedAt: "2026-09-12T12:00:00.000Z", userId: "user_002" });
  assert.equal(getTemporalProductAnalytics(database, "product_a", "monthly", NOW).summary.uniqueUsers.current, 2);
  database.close();
});

test("ignora NULL em user_id", () => {
  const database = createDatabase();
  insertEvent(database, { id: "null_user", receivedAt: "2026-09-10T12:00:00.000Z", userId: null });
  assert.equal(getTemporalProductAnalytics(database, "product_a", "monthly", NOW).summary.uniqueUsers.current, 0);
  database.close();
});

test("ignora user_id vazio ou com espaços", () => {
  const database = createDatabase();
  insertEvent(database, { id: "empty_user", receivedAt: "2026-09-10T12:00:00.000Z", userId: "" });
  insertEvent(database, { id: "spaces_user", receivedAt: "2026-09-11T12:00:00.000Z", userId: "   " });
  assert.equal(getTemporalProductAnalytics(database, "product_a", "monthly", NOW).summary.uniqueUsers.current, 0);
  database.close();
});

test("frequência média usa apenas eventos com usuário identificado", () => {
  const database = createDatabase();
  insertEvent(database, { id: "one", receivedAt: "2026-09-10T12:00:00.000Z", userId: "user_001" });
  insertEvent(database, { id: "two", receivedAt: "2026-09-11T12:00:00.000Z", userId: "user_001" });
  insertEvent(database, { id: "three", receivedAt: "2026-09-12T12:00:00.000Z", userId: "user_002" });
  insertEvent(database, { id: "four", receivedAt: "2026-09-13T12:00:00.000Z", userId: null });
  assert.equal(getTemporalProductAnalytics(database, "product_a", "monthly", NOW).summary.frequencyPerUser.current, 1.5);
  database.close();
});

test("período anterior zero retorna percentual nulo", () => {
  const database = createDatabase();
  insertEvent(database, { id: "current", receivedAt: "2026-09-10T12:00:00.000Z" });
  const change = getTemporalProductAnalytics(database, "product_a", "monthly", NOW).summary.events;
  assert.equal(change.previous, 0);
  assert.equal(change.percentageChange, null);
  database.close();
});

test("agrega métricas por funcionalidade", () => {
  const database = createDatabase();
  insertEvent(database, { id: "report", receivedAt: "2026-09-10T12:00:00.000Z" });
  insertEvent(database, { id: "stock", eventName: "estoque_consultado", receivedAt: "2026-09-11T12:00:00.000Z" });
  const features = getTemporalProductAnalytics(database, "product_a", "monthly", NOW).features;
  assert.deepEqual(features.map((feature) => feature.eventName).sort(), ["estoque_consultado", "relatorio_gerado"]);
  database.close();
});

test("resolve nome amigável cadastrado da funcionalidade", () => {
  const database = createDatabase();
  insertEvent(database, { id: "report", receivedAt: "2026-09-10T12:00:00.000Z" });
  assert.equal(getTemporalProductAnalytics(database, "product_a", "monthly", NOW).features[0].name, "Gerar relatório");
  database.close();
});

test("série histórica retorna doze meses e preenche meses sem evento", () => {
  const database = createDatabase();
  insertEvent(database, { id: "march", receivedAt: "2026-03-10T12:00:00.000Z" });
  const history = getTemporalProductAnalytics(database, "product_a", "monthly", NOW).history;
  assert.equal(history.length, 12);
  assert.equal(history.find((item) => item.month === "2026-03").events, 1);
  assert.equal(history.find((item) => item.month === "2026-04").events, 0);
  database.close();
});

test("calcula quedas consecutivas usando meses completos", () => {
  const database = createDatabase();
  [["2026-06", 5], ["2026-07", 4], ["2026-08", 3]].forEach(([month, count]) => {
    for (let index = 0; index < count; index += 1) {
      insertEvent(database, { id: `${month}_${index}`, receivedAt: `${month}-10T12:00:00.000Z` });
    }
  });
  const feature = getTemporalProductAnalytics(database, "product_a", "quarterly", NOW).features[0];
  assert.equal(feature.consecutiveDeclines, 2);
  database.close();
});

test("mantém isolamento entre produtos", () => {
  const database = createDatabase();
  insertEvent(database, { id: "a", receivedAt: "2026-09-10T12:00:00.000Z" });
  insertEvent(database, { id: "b", applicationId: "app_b", receivedAt: "2026-09-10T12:00:00.000Z" });
  assert.equal(getTemporalProductAnalytics(database, "product_a", "monthly", NOW).summary.events.current, 1);
  database.close();
});

test("mantém eventos técnicos armazenados, mas fora de todas as análises de produto", () => {
  const database = createDatabase();
  insertEvent(database, {
    id: "tracker_current",
    eventName: "tracker_test_event",
    receivedAt: "2026-09-10T12:00:00.000Z",
  });
  insertEvent(database, {
    id: "tracker_history",
    eventName: "tracker_test_event",
    receivedAt: "2026-08-10T12:00:00.000Z",
  });

  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM connection_events").get().count, 2);
  const result = getTemporalProductAnalytics(database, "product_a", "monthly", NOW);
  assert.equal(result.analysisAvailability.status, "waiting_for_events");
  assert.equal(result.analysisAvailability.totalProductEvents, 0);
  assert.deepEqual(result.summary.events, { current: 0, previous: 0, absoluteChange: 0, percentageChange: null });
  assert.equal(result.summary.uniqueUsers.current, 0);
  assert.equal(result.summary.featuresUsed.current, 0);
  assert.equal(result.summary.frequencyPerUser.current, 0);
  assert.deepEqual(result.features, []);
  assert.ok(result.history.every((month) => month.events === 0 && month.uniqueUsers === 0));
  database.close();
});

test("distingue produto sem conexão de conexão sem funcionalidades", () => {
  const database = createDatabase();
  database.prepare("INSERT INTO portfolio_products VALUES (?, ?, ?, ?)")
    .run("product_c", "company_c", "Empresa C", "Produto C");

  const withoutConnection = getTemporalProductAnalytics(database, "product_c", "monthly", NOW);
  const withoutFeatures = getTemporalProductAnalytics(database, "product_b", "monthly", NOW);
  assert.equal(withoutConnection.analysisAvailability.status, "no_connection");
  assert.equal(withoutConnection.analysisAvailability.hasConnection, false);
  assert.equal(withoutFeatures.analysisAvailability.status, "no_features");
  assert.equal(withoutFeatures.analysisAvailability.hasConnection, true);
  database.close();
});

test("distingue espera por evento válido de histórico comparável insuficiente", () => {
  const database = createDatabase();
  const waiting = getTemporalProductAnalytics(database, "product_a", "monthly", NOW);
  assert.equal(waiting.analysisAvailability.status, "waiting_for_events");
  assert.equal(waiting.analysisAvailability.monitoredFeatures, 2);

  insertEvent(database, { id: "current_only", receivedAt: "2026-09-10T12:00:00.000Z" });
  const forming = getTemporalProductAnalytics(database, "product_a", "monthly", NOW);
  assert.equal(forming.analysisAvailability.status, "insufficient_history");
  assert.equal(forming.analysisAvailability.totalProductEvents, 1);
  assert.equal(forming.analysisAvailability.currentPeriodEvents, 1);
  assert.equal(forming.analysisAvailability.previousPeriodEvents, 0);
  database.close();
});

for (const [period, previousDate] of [
  ["monthly", "2026-08-10T12:00:00.000Z"],
  ["quarterly", "2026-05-10T12:00:00.000Z"],
  ["semiannual", "2026-02-10T12:00:00.000Z"],
  ["annual", "2025-01-10T12:00:00.000Z"],
]) {
  test(`libera análise ${period} somente com base anterior equivalente`, () => {
    const database = createDatabase();
    insertEvent(database, { id: `${period}_previous`, receivedAt: previousDate });
    insertEvent(database, { id: `${period}_current`, receivedAt: "2026-09-10T12:00:00.000Z" });
    const result = getTemporalProductAnalytics(database, "product_a", period, NOW);
    assert.equal(result.analysisAvailability.status, "ready");
    assert.equal(result.analysisAvailability.previousPeriodEvents, 1);
    assert.equal(result.analysisAvailability.currentPeriodEvents, 1);
    database.close();
  });
}

test("calcula a disponibilidade de cada seletor com sua própria janela anterior", () => {
  const database = createDatabase();
  insertEvent(database, { id: "monthly_previous", receivedAt: "2026-08-10T12:00:00.000Z" });
  insertEvent(database, { id: "current", receivedAt: "2026-09-10T12:00:00.000Z" });
  assert.equal(getTemporalProductAnalytics(database, "product_a", "monthly", NOW).analysisAvailability.status, "ready");
  assert.equal(getTemporalProductAnalytics(database, "product_a", "quarterly", NOW).analysisAvailability.status, "insufficient_history");

  insertEvent(database, { id: "quarterly_previous", receivedAt: "2026-05-10T12:00:00.000Z" });
  assert.equal(getTemporalProductAnalytics(database, "product_a", "quarterly", NOW).analysisAvailability.status, "ready");
  assert.equal(getTemporalProductAnalytics(database, "product_a", "semiannual", NOW).analysisAvailability.status, "insufficient_history");

  insertEvent(database, { id: "semiannual_previous", receivedAt: "2026-02-10T12:00:00.000Z" });
  assert.equal(getTemporalProductAnalytics(database, "product_a", "semiannual", NOW).analysisAvailability.status, "ready");
  assert.equal(getTemporalProductAnalytics(database, "product_a", "annual", NOW).analysisAvailability.status, "insufficient_history");

  insertEvent(database, { id: "annual_previous", receivedAt: "2025-01-10T12:00:00.000Z" });
  assert.equal(getTemporalProductAnalytics(database, "product_a", "annual", NOW).analysisAvailability.status, "ready");
  database.close();
});

test("produto sem eventos retorna métricas zeradas", () => {
  const database = createDatabase();
  const result = getTemporalProductAnalytics(database, "product_a", "monthly", NOW);
  assert.equal(result.summary.events.current, 0);
  assert.equal(result.analysisAvailability.status, "waiting_for_events");
  assert.deepEqual(result.features, []);
  database.close();
});

test("produto apenas com eventos reais identifica a origem", () => {
  const database = createDatabase();
  insertEvent(database, { id: "real", receivedAt: "2026-09-10T12:00:00.000Z", origin: "real" });
  const origins = getTemporalProductAnalytics(database, "product_a", "monthly", NOW).dataOrigins;
  assert.deepEqual(origins, { realEvents: 1, demoEvents: 0, includesDemo: false });
  database.close();
});

test("produto apenas com eventos demo identifica a origem", () => {
  const database = createDatabase();
  insertEvent(database, { id: "demo", receivedAt: "2026-09-10T12:00:00.000Z", origin: "demo" });
  const origins = getTemporalProductAnalytics(database, "product_a", "monthly", NOW).dataOrigins;
  assert.deepEqual(origins, { realEvents: 0, demoEvents: 1, includesDemo: true });
  database.close();
});

test("mistura eventos reais e demo nas agregações", () => {
  const database = createDatabase();
  insertEvent(database, { id: "real", receivedAt: "2026-09-10T12:00:00.000Z", origin: "real" });
  insertEvent(database, { id: "demo", receivedAt: "2026-09-11T12:00:00.000Z", origin: "demo" });
  const result = getTemporalProductAnalytics(database, "product_a", "monthly", NOW);
  assert.equal(result.summary.events.current, 2);
  assert.deepEqual(result.dataOrigins, { realEvents: 1, demoEvents: 1, includesDemo: true });
  database.close();
});

test("migração preserva eventos existentes e os classifica como reais", () => {
  const database = createDatabase({ legacyEvents: true });
  database.prepare(`
    INSERT INTO connection_events (id, application_id, event_name, user_id, received_at)
    VALUES ('legacy', 'app_a', 'relatorio_gerado', 'user_001', '2026-09-10T12:00:00.000Z')
  `).run();
  const row = database.prepare("SELECT id, data_origin AS origin FROM connection_events WHERE id = 'legacy'").get();
  assert.deepEqual({ ...row }, { id: "legacy", origin: "real" });
  database.close();
});
