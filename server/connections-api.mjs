import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  getClientTelemetry,
  linkApplicationToClient,
} from "./client-telemetry.mjs";
import {
  getClientProductAnalyticsSummary,
  getProductAnalyticsSummary,
  normalizeAnalyticsFrom,
} from "./product-analytics.mjs";

const DATA_DIRECTORY = join(process.cwd(), ".data", "connections");
const DATABASE_PATH = join(DATA_DIRECTORY, "connections.sqlite");
const ENCRYPTION_KEY_PATH = join(DATA_DIRECTORY, "credential.key");

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function sendJson(response, status, payload) {
  response.writeHead(status, JSON_HEADERS);
  response.end(JSON.stringify(payload));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 64_000) {
        reject(new Error("Payload maior que 64 KB."));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("JSON inválido."));
      }
    });
    request.on("error", reject);
  });
}

function createId(prefix) {
  return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

function createCredential() {
  return `conn_sk_${randomBytes(24).toString("base64url")}`;
}

function hashCredential(credential) {
  return createHash("sha256").update(credential, "utf8").digest("hex");
}

function credentialsMatch(receivedCredential, storedHash) {
  const receivedHash = Buffer.from(hashCredential(receivedCredential), "hex");
  const expectedHash = Buffer.from(storedHash, "hex");
  return receivedHash.length === expectedHash.length && timingSafeEqual(receivedHash, expectedHash);
}

function loadEncryptionKey() {
  mkdirSync(DATA_DIRECTORY, { recursive: true });
  if (!existsSync(ENCRYPTION_KEY_PATH)) {
    writeFileSync(ENCRYPTION_KEY_PATH, randomBytes(32), { flag: "wx", mode: 0o600 });
  }

  const key = readFileSync(ENCRYPTION_KEY_PATH);
  if (key.length !== 32) throw new Error("Chave local de credenciais inválida.");
  return key;
}

function encryptCredential(credential, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(credential, "utf8"), cipher.final()]);
  return {
    encrypted: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

function decryptCredential(row, key) {
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(row.credential_iv, "base64"));
  decipher.setAuthTag(Buffer.from(row.credential_tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(row.credential_encrypted, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function openDatabase() {
  mkdirSync(DATA_DIRECTORY, { recursive: true });
  const database = new DatabaseSync(DATABASE_PATH);
  database.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
  database.exec(`
    CREATE TABLE IF NOT EXISTS connection_applications (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      client_name TEXT NOT NULL,
      application_type TEXT NOT NULL CHECK (application_type IN ('internal', 'multiuser')),
      integration_status TEXT NOT NULL DEFAULT 'waiting_integration'
        CHECK (integration_status IN ('waiting_integration', 'connected')),
      credential_hash TEXT NOT NULL,
      credential_encrypted TEXT NOT NULL,
      credential_iv TEXT NOT NULL,
      credential_tag TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS connection_features (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      name TEXT NOT NULL,
      event_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(application_id, event_name),
      FOREIGN KEY(application_id) REFERENCES connection_applications(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS connection_events (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      event_name TEXT NOT NULL,
      user_id TEXT,
      received_at TEXT NOT NULL,
      FOREIGN KEY(application_id) REFERENCES connection_applications(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_connection_events_application_time
      ON connection_events(application_id, received_at DESC);
  `);
  const applicationColumns = database.prepare("PRAGMA table_info(connection_applications)").all();
  if (!applicationColumns.some((column) => column.name === "client_id")) {
    database.exec("ALTER TABLE connection_applications ADD COLUMN client_id TEXT;");
  }
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_connection_applications_client
      ON connection_applications(client_id);
  `);
  return database;
}

function listApplications(database) {
  return database.prepare(`
    SELECT
      a.*,
      COUNT(DISTINCT f.id) AS feature_count,
      COUNT(DISTINCT e.id) AS event_count,
      MAX(e.received_at) AS last_event_at
    FROM connection_applications a
    LEFT JOIN connection_features f ON f.application_id = a.id
    LEFT JOIN connection_events e ON e.application_id = a.id
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `).all().map(mapApplication);
}

function mapApplication(row) {
  return {
    id: row.id,
    name: row.name,
    clientId: row.client_id ?? null,
    client: row.client_id ? row.client_name : null,
    type: row.application_type,
    status: row.integration_status,
    createdAt: row.created_at,
    featureCount: Number(row.feature_count ?? 0),
    eventCount: Number(row.event_count ?? 0),
    lastEventAt: row.last_event_at ?? null,
  };
}

function getApplication(database, applicationId, encryptionKey, includeCredential = true) {
  const row = database.prepare(`
    SELECT
      a.*,
      COUNT(DISTINCT f.id) AS feature_count,
      COUNT(DISTINCT e.id) AS event_count,
      MAX(e.received_at) AS last_event_at
    FROM connection_applications a
    LEFT JOIN connection_features f ON f.application_id = a.id
    LEFT JOIN connection_events e ON e.application_id = a.id
    WHERE a.id = ?
    GROUP BY a.id
  `).get(applicationId);

  if (!row) return null;

  const features = database.prepare(`
    SELECT id, name, event_name AS eventName, created_at AS createdAt
    FROM connection_features
    WHERE application_id = ?
    ORDER BY created_at ASC
  `).all(applicationId);

  return {
    ...mapApplication(row),
    features,
    ...(includeCredential ? { credential: decryptCredential(row, encryptionKey) } : {}),
  };
}

function insertApplication(database, encryptionKey, input, preservedId) {
  const now = new Date().toISOString();
  const credential = createCredential();
  const encryptedCredential = encryptCredential(credential, encryptionKey);
  const applicationId = preservedId ?? createId("app");

  database.prepare(`
    INSERT INTO connection_applications (
      id, name, client_name, client_id, application_type, integration_status,
      credential_hash, credential_encrypted, credential_iv, credential_tag,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'waiting_integration', ?, ?, ?, ?, ?, ?)
  `).run(
    applicationId,
    input.name,
    input.client,
    input.clientId ?? null,
    input.type,
    hashCredential(credential),
    encryptedCredential.encrypted,
    encryptedCredential.iv,
    encryptedCredential.tag,
    input.createdAt ?? now,
    now,
  );

  return applicationId;
}

function normalizeApplicationInput(body) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const client = typeof body.client === "string" ? body.client.trim() : "";
  const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
  const type = body.type === "internal" || body.type === "multiuser" ? body.type : "";
  return { name, client, clientId, type };
}

function normalizeFeatureInput(body) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const eventName = typeof body.eventName === "string" ? body.eventName.trim().toLowerCase() : "";
  return { name, eventName };
}

function isEventName(value) {
  return /^[a-z][a-z0-9_]{2,63}$/.test(value);
}

async function handleApi(request, response, database, encryptionKey) {
  const url = new URL(request.url ?? "/", "http://localhost");
  const method = request.method ?? "GET";

  if (method === "GET" && url.pathname === "/api/connections/applications") {
    sendJson(response, 200, { applications: listApplications(database) });
    return true;
  }

  if (method === "POST" && url.pathname === "/api/connections/applications") {
    const input = normalizeApplicationInput(await readJson(request));
    if (!input.name || !input.client || !input.clientId || !input.type) {
      sendJson(response, 400, { error: "Informe nome, cliente relacionado e tipo da aplicação." });
      return true;
    }

    const applicationId = insertApplication(database, encryptionKey, input);
    sendJson(response, 201, { application: getApplication(database, applicationId, encryptionKey) });
    return true;
  }

  if (method === "POST" && url.pathname === "/api/connections/applications/import") {
    const body = await readJson(request);
    const applications = Array.isArray(body.applications) ? body.applications : [];
    let imported = 0;

    database.exec("BEGIN IMMEDIATE");
    try {
      for (const candidate of applications) {
        const input = normalizeApplicationInput(candidate ?? {});
        if (!input.name || !input.client || !input.type) continue;

        const preservedId = typeof candidate.id === "string" && /^app_[a-zA-Z0-9]+$/.test(candidate.id)
          ? candidate.id
          : createId("app");
        const alreadyExists = database.prepare("SELECT 1 FROM connection_applications WHERE id = ?").get(preservedId);
        if (alreadyExists) continue;

        const applicationId = insertApplication(database, encryptionKey, {
          ...input,
          createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : undefined,
        }, preservedId);

        const features = Array.isArray(candidate.features) ? candidate.features : [];
        for (const featureCandidate of features) {
          const feature = normalizeFeatureInput(featureCandidate ?? {});
          if (!feature.name || !isEventName(feature.eventName)) continue;
          database.prepare(`
            INSERT OR IGNORE INTO connection_features (id, application_id, name, event_name, created_at)
            VALUES (?, ?, ?, ?, ?)
          `).run(
            typeof featureCandidate.id === "string" ? featureCandidate.id : createId("feature"),
            applicationId,
            feature.name,
            feature.eventName,
            typeof featureCandidate.createdAt === "string" ? featureCandidate.createdAt : new Date().toISOString(),
          );
        }
        imported += 1;
      }
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }

    sendJson(response, 200, { imported, applications: listApplications(database) });
    return true;
  }

  const applicationMatch = url.pathname.match(/^\/api\/connections\/applications\/(app_[a-zA-Z0-9]+)$/);
  if (method === "GET" && applicationMatch) {
    const application = getApplication(database, applicationMatch[1], encryptionKey);
    if (!application) {
      sendJson(response, 404, { error: "Aplicação não encontrada." });
      return true;
    }
    sendJson(response, 200, { application });
    return true;
  }

  const featureMatch = url.pathname.match(/^\/api\/connections\/applications\/(app_[a-zA-Z0-9]+)\/features$/);
  if (method === "POST" && featureMatch) {
    const application = getApplication(database, featureMatch[1], encryptionKey, false);
    if (!application) {
      sendJson(response, 404, { error: "Aplicação não encontrada." });
      return true;
    }

    const input = normalizeFeatureInput(await readJson(request));
    if (!input.name || !isEventName(input.eventName)) {
      sendJson(response, 400, { error: "Informe um nome e um identificador de evento válido." });
      return true;
    }

    try {
      database.prepare(`
        INSERT INTO connection_features (id, application_id, name, event_name, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(createId("feature"), application.id, input.name, input.eventName, new Date().toISOString());
    } catch (error) {
      if (String(error).includes("UNIQUE")) {
        sendJson(response, 409, { error: "Este identificador de evento já está cadastrado." });
        return true;
      }
      throw error;
    }

    sendJson(response, 201, { application: getApplication(database, application.id, encryptionKey) });
    return true;
  }

  const eventsMatch = url.pathname.match(/^\/api\/connections\/applications\/(app_[a-zA-Z0-9]+)\/events$/);
  if (method === "GET" && eventsMatch) {
    const exists = database.prepare("SELECT 1 FROM connection_applications WHERE id = ?").get(eventsMatch[1]);
    if (!exists) {
      sendJson(response, 404, { error: "Aplicação não encontrada." });
      return true;
    }

    const events = database.prepare(`
      SELECT
        id,
        application_id AS applicationId,
        event_name AS event,
        user_id AS userId,
        received_at AS receivedAt
      FROM connection_events
      WHERE application_id = ?
      ORDER BY received_at DESC
      LIMIT 200
    `).all(eventsMatch[1]);
    sendJson(response, 200, { events });
    return true;
  }

  const clientLinkMatch = url.pathname.match(/^\/api\/connections\/applications\/(app_[a-zA-Z0-9]+)\/client$/);
  if (method === "PATCH" && clientLinkMatch) {
    const body = await readJson(request);
    const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
    const clientName = typeof body.client === "string" ? body.client.trim() : "";
    if (!clientId || clientId.length > 128 || !clientName || clientName.length > 200) {
      sendJson(response, 400, { error: "Selecione um cliente válido da carteira." });
      return true;
    }

    const linked = linkApplicationToClient(
      database,
      clientLinkMatch[1],
      clientId,
      clientName,
      new Date().toISOString(),
    );
    if (!linked) {
      sendJson(response, 404, { error: "Aplicação não encontrada." });
      return true;
    }
    sendJson(response, 200, {
      application: getApplication(database, clientLinkMatch[1], encryptionKey),
    });
    return true;
  }

  const analyticsMatch = url.pathname.match(/^\/api\/product-analytics\/applications\/(app_[a-zA-Z0-9]+)\/summary$/);
  if (method === "GET" && analyticsMatch) {
    let from;
    try {
      from = normalizeAnalyticsFrom(url.searchParams.get("from"));
    } catch (error) {
      sendJson(response, 400, { error: error.message });
      return true;
    }

    const summary = getProductAnalyticsSummary(database, analyticsMatch[1], from);
    if (!summary) {
      sendJson(response, 404, { error: "Aplicação não encontrada." });
      return true;
    }
    sendJson(response, 200, summary);
    return true;
  }

  const clientAnalyticsMatch = url.pathname.match(/^\/api\/product-analytics\/clients\/([^/]+)\/summary$/);
  if (method === "GET" && clientAnalyticsMatch) {
    let clientId;
    let from;
    try {
      clientId = decodeURIComponent(clientAnalyticsMatch[1]).trim();
      from = normalizeAnalyticsFrom(url.searchParams.get("from"));
    } catch (error) {
      sendJson(response, 400, { error: error.message });
      return true;
    }

    const applicationId = url.searchParams.get("application_id")?.trim() || null;
    if (!clientId || clientId.length > 128) {
      sendJson(response, 400, { error: "Identificador de cliente inválido." });
      return true;
    }
    if (applicationId && !/^app_[a-zA-Z0-9]+$/.test(applicationId)) {
      sendJson(response, 400, { error: "Application ID inválido." });
      return true;
    }

    const summary = getClientProductAnalyticsSummary(database, clientId, from, applicationId);
    if (!summary) {
      sendJson(response, 404, { error: "A aplicação selecionada não pertence a este cliente." });
      return true;
    }
    sendJson(response, 200, summary);
    return true;
  }

  const clientTelemetryMatch = url.pathname.match(/^\/api\/clients\/([^/]+)\/telemetry$/);
  if (method === "GET" && clientTelemetryMatch) {
    let clientId;
    try {
      clientId = decodeURIComponent(clientTelemetryMatch[1]).trim();
    } catch {
      sendJson(response, 400, { error: "Identificador de cliente inválido." });
      return true;
    }
    if (!clientId || clientId.length > 128) {
      sendJson(response, 400, { error: "Identificador de cliente inválido." });
      return true;
    }
    sendJson(response, 200, getClientTelemetry(database, clientId));
    return true;
  }

  if (method === "POST" && url.pathname === "/api/events") {
    const body = await readJson(request);
    const applicationId = typeof body.application_id === "string" ? body.application_id.trim() : "";
    const eventName = typeof body.event === "string" ? body.event.trim() : "";
    const userId = typeof body.user_id === "string" && body.user_id.trim() ? body.user_id.trim() : null;
    const authorization = request.headers.authorization ?? "";
    const credential = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? "";

    if (!applicationId) {
      sendJson(response, 400, { error: "application_id é obrigatório." });
      return true;
    }
    if (!eventName || eventName.length > 128) {
      sendJson(response, 400, { error: "event é obrigatório e deve ter até 128 caracteres." });
      return true;
    }
    if (!credential) {
      sendJson(response, 401, { error: "Credencial Bearer não informada." });
      return true;
    }

    const applicationRow = database.prepare(`
      SELECT id, credential_hash FROM connection_applications WHERE id = ?
    `).get(applicationId);
    if (!applicationRow) {
      sendJson(response, 404, { error: "Application ID não encontrado." });
      return true;
    }
    if (!credentialsMatch(credential, applicationRow.credential_hash)) {
      sendJson(response, 403, { error: "Credencial inválida para esta aplicação." });
      return true;
    }

    const eventId = createId("evt");
    const receivedAt = new Date().toISOString();
    database.exec("BEGIN IMMEDIATE");
    try {
      database.prepare(`
        INSERT INTO connection_events (id, application_id, event_name, user_id, received_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(eventId, applicationId, eventName, userId, receivedAt);
      database.prepare(`
        UPDATE connection_applications
        SET integration_status = 'connected', updated_at = ?
        WHERE id = ?
      `).run(receivedAt, applicationId);
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }

    sendJson(response, 202, {
      accepted: true,
      event: {
        id: eventId,
        application_id: applicationId,
        event: eventName,
        user_id: userId,
        received_at: receivedAt,
      },
    });
    return true;
  }

  return false;
}

function installMiddleware(server) {
  const database = openDatabase();
  const encryptionKey = loadEncryptionKey();

  server.httpServer?.once("close", () => database.close());
  server.middlewares.use(async (request, response, next) => {
    if (!request.url?.startsWith("/api/")) {
      next();
      return;
    }

    try {
      const handled = await handleApi(request, response, database, encryptionKey);
      if (!handled) sendJson(response, 404, { error: "Endpoint não encontrado." });
    } catch (error) {
      console.error("[connections-api]", error);
      if (!response.headersSent) {
        sendJson(response, 500, { error: "Não foi possível processar a solicitação." });
      }
    }
  });
}

export function connectionsApiPlugin() {
  return {
    name: "connections-api",
    configureServer: installMiddleware,
    configurePreviewServer: installMiddleware,
  };
}
