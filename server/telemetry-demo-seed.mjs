import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { ensureTelemetryEventSchema } from "./telemetry-schema.mjs";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const DATABASE_PATH = join(SCRIPT_DIRECTORY, "..", ".data", "connections", "connections.sqlite");
const SEED_VERSION = "temporal-v2";
const LEGACY_SEED_VERSION = "temporal-v1";
const DEMO_USER_COUNT = 120;
const DEMO_BUSINESS_FEATURES = [
  { name: "Consulta de estoque", eventName: "estoque_consultado" },
  { name: "Cadastro de produto", eventName: "produto_cadastrado" },
  { name: "Geração de relatório", eventName: "relatorio_gerado" },
];

function deterministicNumber(key) {
  return Number.parseInt(createHash("sha256").update(key).digest("hex").slice(0, 8), 16);
}

function saoPauloDateParts(date) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
}

function calendarMonth(year, month, offset) {
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function monthKey(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function featurePattern(featureIndex, monthSequence, noise) {
  if (featureIndex === 0) return Math.max(20, 150 + (noise % 15) - 7);
  if (featureIndex === 1) return Math.max(20, 55 + (monthSequence * 5) + (noise % 7));
  if (featureIndex === 2) {
    return monthSequence < 18
      ? 185 + (noise % 13)
      : Math.max(55, 230 - ((monthSequence - 18) * 18));
  }
  return Math.max(20, 105 + Math.round(Math.sin(monthSequence / 2) * 16) + (noise % 9));
}

function activeUsers(featureIndex, monthSequence) {
  if (featureIndex === 0) return 74 + (monthSequence % 7);
  if (featureIndex === 1) return Math.min(110, 35 + (monthSequence * 3));
  if (featureIndex === 2) return Math.max(52, 100 - (Math.max(0, monthSequence - 18) * 7));
  return 62 + (monthSequence % 13);
}

function resolveSeedTarget(database, requestedApplicationId) {
  const where = requestedApplicationId ? "WHERE a.id = ?" : "WHERE a.client_id IS NOT NULL";
  const parameters = requestedApplicationId ? [requestedApplicationId] : [];
  const target = database.prepare(`
    SELECT
      a.id AS applicationId,
      a.client_id AS clientId,
      COUNT(f.id) AS featureCount
    FROM connection_applications a
    LEFT JOIN connection_features f ON f.application_id = a.id
    ${where}
    GROUP BY a.id
    ORDER BY featureCount DESC, a.created_at ASC
    LIMIT 1
  `).get(...parameters);

  if (!target) throw new Error("Nenhuma conexão compatível foi encontrada para o seed.");
  if (!target.clientId) throw new Error("A conexão escolhida não está vinculada a um produto.");
  if (Number(target.featureCount) < 3) {
    throw new Error("Cadastre pelo menos três funcionalidades na conexão antes de executar o seed temporal.");
  }
  return target;
}

function listSeedFeatures(database, applicationId) {
  return database.prepare(`
    SELECT id, name, event_name AS eventName
    FROM connection_features
    WHERE application_id = ?
    ORDER BY created_at ASC, id ASC
  `).all(applicationId);
}

function migrateLegacySeed(database, target, features) {
  const legacySeed = database.prepare(`
    SELECT COUNT(*) AS count
    FROM telemetry_demo_seeds
    WHERE application_id = ? AND seed_version = ?
  `).get(target.applicationId, LEGACY_SEED_VERSION);
  if (Number(legacySeed.count) === 0) return { migrated: false, removedDemoEvents: 0 };

  DEMO_BUSINESS_FEATURES.forEach((definition, index) => {
    const feature = features[index];
    const conflictingFeature = database.prepare(`
      SELECT id
      FROM connection_features
      WHERE application_id = ? AND event_name = ? AND id <> ?
    `).get(target.applicationId, definition.eventName, feature.id);
    if (conflictingFeature) {
      throw new Error(`A funcionalidade ${definition.eventName} já existe fora do conjunto controlado pelo seed.`);
    }
  });

  DEMO_BUSINESS_FEATURES.forEach((definition, index) => {
    database.prepare(`
      UPDATE connection_features
      SET name = ?, event_name = ?
      WHERE id = ? AND application_id = ?
    `).run(definition.name, definition.eventName, features[index].id, target.applicationId);
  });

  const removedDemoEvents = Number(database.prepare(`
    DELETE FROM connection_events
    WHERE application_id = ?
      AND data_origin = 'demo'
      AND id GLOB 'demo_evt_*'
  `).run(target.applicationId).changes);
  database.prepare(`
    DELETE FROM telemetry_demo_seeds
    WHERE application_id = ? AND seed_version = ?
  `).run(target.applicationId, LEGACY_SEED_VERSION);
  return { migrated: true, removedDemoEvents };
}

export function seedDemoTelemetry(database, { applicationId, now = new Date() } = {}) {
  ensureTelemetryEventSchema(database);
  const target = resolveSeedTarget(database, applicationId);
  let features = listSeedFeatures(database, target.applicationId);
  const anchor = saoPauloDateParts(now);
  const anchorMonth = monthKey(anchor.year, anchor.month);
  const seedKey = `${SEED_VERSION}:${target.applicationId}:${anchorMonth}`;
  const insertEvent = database.prepare(`
    INSERT OR IGNORE INTO connection_events (
      id, application_id, event_name, user_id, received_at, data_origin
    ) VALUES (?, ?, ?, ?, ?, 'demo')
  `);
  let generated = 0;
  let inserted = 0;
  let migration = { migrated: false, removedDemoEvents: 0 };

  database.exec("BEGIN IMMEDIATE");
  try {
    migration = migrateLegacySeed(database, target, features);
    if (migration.migrated) features = listSeedFeatures(database, target.applicationId);

    for (let monthOffset = -24; monthOffset <= 0; monthOffset += 1) {
      const monthSequence = monthOffset + 24;
      const currentMonth = calendarMonth(anchor.year, anchor.month, monthOffset);
      const totalDays = daysInMonth(currentMonth.year, currentMonth.month);
      const elapsedDays = monthOffset === 0 ? Math.max(1, anchor.day - 1) : totalDays;

      features.forEach((feature, featureIndex) => {
        const noise = deterministicNumber(`${feature.eventName}:${monthKey(currentMonth.year, currentMonth.month)}`);
        const monthlyTarget = featurePattern(featureIndex, monthSequence, noise);
        const eventCount = monthOffset === 0
          ? Math.max(1, Math.round(monthlyTarget * (elapsedDays / totalDays)))
          : monthlyTarget;
        const userPopulation = Math.min(DEMO_USER_COUNT, activeUsers(featureIndex, monthSequence));

        for (let index = 0; index < eventCount; index += 1) {
          const eventKey = `${target.applicationId}:${feature.eventName}:${monthKey(currentMonth.year, currentMonth.month)}:${index}`;
          const random = deterministicNumber(eventKey);
          const day = 1 + (random % elapsedDays);
          const hour = 7 + (Math.floor(random / 31) % 15);
          const minute = Math.floor(random / 997) % 60;
          const second = Math.floor(random / 7919) % 60;
          const timestamp = new Date(
            `${monthKey(currentMonth.year, currentMonth.month)}-${String(day).padStart(2, "0")}`
            + `T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}-03:00`,
          ).toISOString();
          const userNumber = 1 + (deterministicNumber(`${eventKey}:user`) % userPopulation);
          const eventId = `demo_evt_${createHash("sha256").update(`${SEED_VERSION}:${eventKey}`).digest("hex").slice(0, 24)}`;
          generated += 1;
          inserted += Number(insertEvent.run(
            eventId,
            target.applicationId,
            feature.eventName,
            `user_${String(userNumber).padStart(3, "0")}`,
            timestamp,
          ).changes);
        }
      });
    }

    database.prepare(`
      INSERT INTO telemetry_demo_seeds (
        seed_key, seed_version, application_id, anchor_month, event_count, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(seed_key) DO UPDATE SET
        seed_version = excluded.seed_version,
        event_count = excluded.event_count,
        completed_at = excluded.completed_at
    `).run(seedKey, SEED_VERSION, target.applicationId, anchorMonth, generated, now.toISOString());
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }

  const firstAndLast = database.prepare(`
    SELECT
      MIN(received_at) AS firstEventAt,
      MAX(received_at) AS lastEventAt,
      COUNT(DISTINCT user_id) AS userCount
    FROM connection_events
    WHERE application_id = ? AND data_origin = 'demo'
  `).get(target.applicationId);

  return {
    seedKey,
    applicationId: target.applicationId,
    clientId: target.clientId,
    generated,
    inserted,
    migratedLegacySeed: migration.migrated,
    removedLegacyDemoEvents: migration.removedDemoEvents,
    totalDemoEvents: Number(database.prepare(`
      SELECT COUNT(*) AS count FROM connection_events
      WHERE application_id = ? AND data_origin = 'demo'
    `).get(target.applicationId).count),
    firstEventAt: firstAndLast.firstEventAt,
    lastEventAt: firstAndLast.lastEventAt,
    userCount: Number(firstAndLast.userCount),
    maximumUserPool: DEMO_USER_COUNT,
    features: features.map((feature, index) => ({
      name: feature.name,
      eventName: feature.eventName,
      pattern: index === 0 ? "stable" : index === 1 ? "growth" : index === 2 ? "decline" : "seasonal",
    })),
  };
}

function readApplicationId(argumentsList) {
  const index = argumentsList.indexOf("--application-id");
  if (index === -1) return undefined;
  const value = argumentsList[index + 1]?.trim();
  if (!value) throw new Error("Informe o Application ID após --application-id.");
  return value;
}

async function runCli() {
  const database = new DatabaseSync(DATABASE_PATH);
  database.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
  try {
    const result = seedDemoTelemetry(database, {
      applicationId: readApplicationId(process.argv.slice(2)),
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    database.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli().catch((error) => {
    console.error(`[seed:telemetry-demo] ${error.message}`);
    process.exitCode = 1;
  });
}
