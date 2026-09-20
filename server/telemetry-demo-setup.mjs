import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getApplication,
  insertApplication,
  loadEncryptionKey,
  openDatabase,
} from "./connections-api.mjs";
import { seedDemoTelemetry } from "./telemetry-demo-seed.mjs";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIRECTORY = resolve(SCRIPT_DIRECTORY, "..");
const DEMO_ENV_PATH = join(PROJECT_DIRECTORY, "demo-app", ".env");

export const TELEMETRY_DEMO_CLIENTS = Object.freeze([
  { clientId: "C002", productName: "Plano Avancado", client: "Plano Avancado · Cliente C002" },
  { clientId: "C039", productName: "Plano Avancado", client: "Plano Avancado · Cliente C039" },
  { clientId: "C067", productName: "Plano Avancado", client: "Plano Avancado · Cliente C067" },
  { clientId: "C068", productName: "Plano Essencial", client: "Plano Essencial · Cliente C068" },
  { clientId: "C071", productName: "Plano Enterprise", client: "Plano Enterprise · Cliente C071" },
  { clientId: "C080", productName: "Plano Enterprise", client: "Plano Enterprise · Cliente C080" },
]);

export const TELEMETRY_DEMO_FEATURES = Object.freeze([
  { name: "Acesso ao painel", eventName: "painel_acessado" },
  { name: "Exportação de relatório", eventName: "relatorio_exportado" },
  { name: "Automação executada", eventName: "automacao_executada" },
]);

function createFeatureId() {
  return `feature_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

function ensureFeatures(database, applicationId, now) {
  const insert = database.prepare(`
    INSERT OR IGNORE INTO connection_features (
      id, application_id, name, event_name, created_at
    ) VALUES (?, ?, ?, ?, ?)
  `);
  let created = 0;
  for (const feature of TELEMETRY_DEMO_FEATURES) {
    created += Number(insert.run(
      createFeatureId(),
      applicationId,
      feature.name,
      feature.eventName,
      now.toISOString(),
    ).changes);
  }
  return created;
}

function ensureFirstRealEvent(database, applicationId, now) {
  const existing = database.prepare(`
    SELECT 1
    FROM connection_events e
    INNER JOIN connection_features f
      ON f.application_id = e.application_id AND f.event_name = e.event_name
    WHERE e.application_id = ? AND e.data_origin = 'real'
    LIMIT 1
  `).get(applicationId);
  if (existing) {
    database.prepare(`
      UPDATE connection_applications
      SET integration_status = 'connected'
      WHERE id = ?
    `).run(applicationId);
    return false;
  }

  const receivedAt = now.toISOString();
  database.prepare(`
    INSERT INTO connection_events (
      id, application_id, event_name, user_id, received_at, data_origin
    ) VALUES (?, ?, 'painel_acessado', 'user_001', ?, 'real')
  `).run(`setup_evt_${applicationId}`, applicationId, receivedAt);
  database.prepare(`
    UPDATE connection_applications
    SET integration_status = 'connected', updated_at = ?
    WHERE id = ?
  `).run(receivedAt, applicationId);
  return true;
}

export function setupTelemetryDemo(database, encryptionKey, {
  now = new Date(),
  seedTelemetry = seedDemoTelemetry,
} = {}) {
  const results = [];

  for (const definition of TELEMETRY_DEMO_CLIENTS) {
    let application = database.prepare(`
      SELECT id FROM connection_applications WHERE client_id = ?
    `).get(definition.clientId);
    const applicationCreated = !application;
    if (!application) {
      const applicationId = insertApplication(database, encryptionKey, {
        legacyName: definition.productName,
        client: definition.client,
        clientId: definition.clientId,
        createdAt: now.toISOString(),
      });
      application = { id: applicationId };
    }

    const featuresCreated = ensureFeatures(database, application.id, now);
    const realEventCreated = ensureFirstRealEvent(database, application.id, now);
    const seed = seedTelemetry(database, { applicationId: application.id, now });
    results.push({
      clientId: definition.clientId,
      applicationId: application.id,
      applicationCreated,
      featuresCreated,
      realEventCreated,
      demoEventsInserted: Number(seed.inserted ?? 0),
      totalDemoEvents: Number(seed.totalDemoEvents ?? 0),
    });
  }

  const externalDemo = results.find((item) => item.clientId === "C067");
  const externalApplication = externalDemo
    ? getApplication(database, externalDemo.applicationId, encryptionKey)
    : null;
  return { results, externalApplication };
}

function updateEnvironmentFile(path, values) {
  const existingLines = existsSync(path)
    ? readFileSync(path, "utf8").split(/\r?\n/)
    : [];
  const pending = new Map(Object.entries(values));
  const updatedLines = existingLines
    .filter((line, index, lines) => line || index < lines.length - 1)
    .map((line) => {
      const match = line.match(/^([A-Z][A-Z0-9_]*)=/);
      if (!match || !pending.has(match[1])) return line;
      const value = pending.get(match[1]);
      pending.delete(match[1]);
      return `${match[1]}=${value}`;
    });
  for (const [name, value] of pending) updatedLines.push(`${name}=${value}`);
  writeFileSync(path, `${updatedLines.join("\n")}\n`, "utf8");
}

async function runCli() {
  const database = openDatabase();
  try {
    const encryptionKey = loadEncryptionKey();
    const setup = setupTelemetryDemo(database, encryptionKey);
    updateEnvironmentFile(DEMO_ENV_PATH, {
      DEMO_APPLICATION_ID: setup.externalApplication.id,
      DEMO_CREDENTIAL: setup.externalApplication.credential,
      DEMO_PLATFORM_ENDPOINT: process.env.DEMO_PLATFORM_ENDPOINT ?? "http://127.0.0.1:5173/api/events",
      DEMO_PORT: process.env.DEMO_PORT ?? "4174",
    });
    console.log(JSON.stringify({
      clients: setup.results,
      externalDemo: {
        clientId: "C067",
        applicationId: setup.externalApplication.id,
        environmentFile: DEMO_ENV_PATH,
      },
    }, null, 2));
  } finally {
    database.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli().catch((error) => {
    console.error(`[setup:telemetry-demo] ${error.message}`);
    process.exitCode = 1;
  });
}
