import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { seedDemoTelemetry } from "./telemetry-demo-seed.mjs";
import { ensureTelemetryEventSchema } from "./telemetry-schema.mjs";

const NOW = new Date("2026-09-19T15:00:00.000Z");

function createDatabase() {
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
    );
  `);
  database.prepare("INSERT INTO connection_applications VALUES (?, ?, ?, ?, ?)")
    .run("app_seed", "Legacy name", "Produto Seed - Empresa", "product_seed", "2026-01-01T00:00:00.000Z");
  const insertFeature = database.prepare("INSERT INTO connection_features VALUES (?, ?, ?, ?, ?)");
  insertFeature.run("feature_stable", "app_seed", "Uso estavel", "uso_estavel", "2026-01-01T00:00:00.000Z");
  insertFeature.run("feature_growth", "app_seed", "Uso crescente", "uso_crescente", "2026-01-02T00:00:00.000Z");
  insertFeature.run("feature_decline", "app_seed", "Uso em queda", "uso_em_queda", "2026-01-03T00:00:00.000Z");
  database.prepare(`
    INSERT INTO connection_events (id, application_id, event_name, user_id, received_at)
    VALUES ('evt_real_existing', 'app_seed', 'uso_estavel', 'real_user', '2026-09-18T12:00:00.000Z')
  `).run();
  return database;
}

test("seed temporal e deterministico, distribuido e idempotente", () => {
  const database = createDatabase();
  const first = seedDemoTelemetry(database, { applicationId: "app_seed", now: NOW });
  const second = seedDemoTelemetry(database, { applicationId: "app_seed", now: NOW });

  assert.ok(first.inserted > 0);
  assert.equal(first.inserted, first.generated);
  assert.equal(second.inserted, 0);
  assert.equal(second.generated, first.generated);
  assert.equal(second.totalDemoEvents, first.totalDemoEvents);
  assert.deepEqual(first.features.map((feature) => feature.pattern), ["stable", "growth", "decline"]);

  const preservedReal = database.prepare(`
    SELECT data_origin AS origin
    FROM connection_events
    WHERE id = 'evt_real_existing'
  `).get();
  assert.equal(preservedReal.origin, "real");

  const coverage = database.prepare(`
    SELECT
      COUNT(DISTINCT strftime('%Y-%m', received_at, '-3 hours')) AS months,
      COUNT(DISTINCT user_id) AS users,
      MIN(received_at) AS firstEventAt,
      MAX(received_at) AS lastEventAt
    FROM connection_events
    WHERE application_id = 'app_seed' AND data_origin = 'demo'
  `).get();
  assert.equal(Number(coverage.months), 25);
  assert.ok(Number(coverage.users) > 1);
  assert.ok(Number(coverage.users) <= 120);
  assert.match(coverage.firstEventAt, /^2024-09-/);
  assert.match(coverage.lastEventAt, /^2026-09-/);

  const unknownEvents = database.prepare(`
    SELECT COUNT(*) AS count
    FROM connection_events e
    WHERE e.data_origin = 'demo'
      AND NOT EXISTS (
        SELECT 1
        FROM connection_features f
        WHERE f.application_id = e.application_id
          AND f.event_name = e.event_name
      )
  `).get();
  assert.equal(Number(unknownEvents.count), 0);

  const samples = database.prepare(`
    SELECT event_name AS eventName, COUNT(*) AS count
    FROM connection_events
    WHERE data_origin = 'demo'
      AND strftime('%Y-%m', received_at, '-3 hours') IN ('2025-01', '2026-08')
    GROUP BY event_name, strftime('%Y-%m', received_at, '-3 hours')
    ORDER BY eventName, strftime('%Y-%m', received_at, '-3 hours')
  `).all();
  const counts = new Map();
  for (const sample of samples) {
    const values = counts.get(sample.eventName) ?? [];
    values.push(Number(sample.count));
    counts.set(sample.eventName, values);
  }
  assert.ok(counts.get("uso_crescente")[1] > counts.get("uso_crescente")[0]);
  assert.ok(counts.get("uso_em_queda")[1] < counts.get("uso_em_queda")[0]);

  const seedRecords = database.prepare("SELECT COUNT(*) AS count FROM telemetry_demo_seeds").get();
  assert.equal(Number(seedRecords.count), 1);
  database.close();
});

test("seed exige aplicacao vinculada com pelo menos tres funcionalidades", () => {
  const database = createDatabase();
  database.prepare("DELETE FROM connection_features WHERE id <> 'feature_stable'").run();
  assert.throws(
    () => seedDemoTelemetry(database, { applicationId: "app_seed", now: NOW }),
    /pelo menos tr.s funcionalidades/i,
  );
  database.close();
});

test("migra somente o seed legado controlado para eventos semânticos e preserva eventos reais", () => {
  const database = createDatabase();
  ensureTelemetryEventSchema(database);
  const updates = [
    ["Teste de integração", "teste_integracao", "feature_stable"],
    ["Teste de regressão", "teste_regressao_conexao_produto", "feature_growth"],
    ["Relatório gerado", "relatorio_gerado", "feature_decline"],
  ];
  for (const [name, eventName, id] of updates) {
    database.prepare("UPDATE connection_features SET name = ?, event_name = ? WHERE id = ?")
      .run(name, eventName, id);
  }
  database.prepare("UPDATE connection_events SET event_name = 'teste_integracao' WHERE id = 'evt_real_existing'").run();
  database.prepare(`
    INSERT INTO connection_events (id, application_id, event_name, user_id, received_at, data_origin)
    VALUES
      ('demo_evt_legacy_one', 'app_seed', 'teste_integracao', 'demo_1', '2026-08-10T12:00:00.000Z', 'demo'),
      ('demo_evt_legacy_two', 'app_seed', 'teste_regressao_conexao_produto', 'demo_2', '2026-08-11T12:00:00.000Z', 'demo'),
      ('manual_demo_keep', 'app_seed', 'teste_integracao', 'demo_manual', '2026-08-12T12:00:00.000Z', 'demo')
  `).run();
  database.prepare(`
    INSERT INTO telemetry_demo_seeds (seed_key, application_id, anchor_month, event_count, completed_at)
    VALUES ('temporal-v1:app_seed:2026-09', 'app_seed', '2026-09', 2, '2026-09-19T15:00:00.000Z')
  `).run();

  const first = seedDemoTelemetry(database, { applicationId: "app_seed", now: NOW });
  const second = seedDemoTelemetry(database, { applicationId: "app_seed", now: NOW });

  assert.equal(first.migratedLegacySeed, true);
  assert.equal(first.removedLegacyDemoEvents, 2);
  assert.equal(second.migratedLegacySeed, false);
  assert.equal(second.inserted, 0);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM connection_events WHERE id GLOB 'demo_evt_legacy_*'").get().count, 0);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM connection_events WHERE id = 'manual_demo_keep'").get().count, 1);
  assert.deepEqual(
    { ...database.prepare("SELECT event_name AS eventName, data_origin AS origin FROM connection_events WHERE id = 'evt_real_existing'").get() },
    { eventName: "teste_integracao", origin: "real" },
  );
  assert.deepEqual(
    database.prepare("SELECT name, event_name AS eventName FROM connection_features WHERE application_id = 'app_seed' ORDER BY created_at").all()
      .map((row) => ({ ...row })),
    [
      { name: "Consulta de estoque", eventName: "estoque_consultado" },
      { name: "Cadastro de produto", eventName: "produto_cadastrado" },
      { name: "Geração de relatório", eventName: "relatorio_gerado" },
    ],
  );
  assert.equal(database.prepare(`
    SELECT COUNT(*) AS count
    FROM connection_events e
    WHERE e.id GLOB 'demo_evt_*'
      AND NOT EXISTS (
        SELECT 1 FROM connection_features f
        WHERE f.application_id = e.application_id AND f.event_name = e.event_name
      )
  `).get().count, 0);
  assert.deepEqual(
    database.prepare("SELECT seed_version AS version, COUNT(*) AS count FROM telemetry_demo_seeds GROUP BY seed_version").all()
      .map((row) => ({ ...row })),
    [{ version: "temporal-v2", count: 1 }],
  );
  database.close();
});
