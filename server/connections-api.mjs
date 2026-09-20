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
  getTemporalProductAnalytics,
  normalizeAnalyticsFrom,
} from "./product-analytics.mjs";
import { getProductTelemetryByProduct } from "./product-telemetry.mjs";
import {
  ensureProductRiskSchema,
  getProductRiskProfiles,
  upsertProductRiskProfile,
} from "./product-risk.mjs";
import { seedDemoTelemetry } from "./telemetry-demo-seed.mjs";
import { ensureTelemetryEventSchema } from "./telemetry-schema.mjs";

const DATA_DIRECTORY = join(process.cwd(), ".data", "connections");
const DATABASE_PATH = join(DATA_DIRECTORY, "connections.sqlite");
const ENCRYPTION_KEY_PATH = join(DATA_DIRECTORY, "credential.key");
const LEGACY_APPLICATION_TYPE_VALUE = "internal";
const LEGACY_DEMO_CLEANUP_KEY = "remove-mixed-demo-portfolio-v1";
const SHOWCASE_DEMO = {
  company: {
    id: "company_nexora_demo",
    name: "Nexora Distribuição",
    normalizedName: "nexora distribuicao",
  },
  product: {
    id: "product_f3bede39f94b",
    name: "NexStock — Gestão de Estoque",
    normalizedName: "nexstock — gestao de estoque",
  },
  applicationId: "app_nexstockdemo",
  features: [
    { id: "feature_nexstock_01_stock", name: "Consulta de estoque", eventName: "estoque_consultado" },
    { id: "feature_nexstock_02_product", name: "Cadastro de produto", eventName: "produto_cadastrado" },
    { id: "feature_nexstock_03_report", name: "Geração de relatório", eventName: "relatorio_gerado" },
  ],
  riskProfile: {
    segment: "Distribuição",
    plan: "Enterprise",
    monthlyRevenue: 28_500,
    slaPercent: 76,
    nps: 5,
    openTickets: 6,
    criticalTickets: 2,
    paymentDelayDays: 12,
  },
};

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

    CREATE TABLE IF NOT EXISTS portfolio_companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      normalized_name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS portfolio_products (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      company_name TEXT NOT NULL,
      name TEXT NOT NULL,
      normalized_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(company_id, normalized_name)
    );

    CREATE INDEX IF NOT EXISTS idx_connection_events_application_time
      ON connection_events(application_id, received_at DESC);
    CREATE INDEX IF NOT EXISTS idx_portfolio_products_company
      ON portfolio_products(company_id);
  `);
  ensureTelemetryEventSchema(database);
  ensureProductRiskSchema(database);
  const applicationColumns = database.prepare("PRAGMA table_info(connection_applications)").all();
  if (!applicationColumns.some((column) => column.name === "client_id")) {
    database.exec("ALTER TABLE connection_applications ADD COLUMN client_id TEXT;");
  }
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_connection_applications_client
      ON connection_applications(client_id);
  `);
  const duplicateProductConnections = database.prepare(`
    SELECT client_id
    FROM connection_applications
    WHERE client_id IS NOT NULL
    GROUP BY client_id
    HAVING COUNT(*) > 1
  `).all();
  if (duplicateProductConnections.length === 0) {
    database.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_connection_applications_unique_client
        ON connection_applications(client_id)
        WHERE client_id IS NOT NULL;
    `);
  } else {
    console.warn(
      "[connections-api] Índice único por produto não criado: há client_id duplicado. Nenhum registro foi alterado.",
    );
  }
  cleanupLegacyDemoData(database);
  return database;
}

export function cleanupLegacyDemoData(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS connection_data_migrations (
      key TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
  const alreadyApplied = database.prepare(`
    SELECT 1 FROM connection_data_migrations WHERE key = ?
  `).get(LEGACY_DEMO_CLEANUP_KEY);
  if (alreadyApplied) return;

  database.exec("BEGIN IMMEDIATE");
  try {
    database.prepare(`
      DELETE FROM connection_applications
      WHERE client_id IS NULL
         OR client_id = 'atlas-logistica'
         OR client_id IN (
           SELECT id
           FROM portfolio_products
           WHERE id = 'product_f3bede39f94b'
              OR normalized_name IN ('ddd', 'fff', 'nexstock — gestao de estoque')
         )
    `).run();
    database.prepare(`
      DELETE FROM portfolio_products
      WHERE NOT EXISTS (
        SELECT 1 FROM connection_applications WHERE client_id = portfolio_products.id
      )
        AND (
          id = 'product_f3bede39f94b'
          OR normalized_name IN ('ddd', 'fff', 'nexstock — gestao de estoque')
        )
    `).run();
    database.prepare(`
      DELETE FROM portfolio_companies
      WHERE NOT EXISTS (
        SELECT 1 FROM portfolio_products WHERE company_id = portfolio_companies.id
      )
        AND normalized_name IN ('nexora distribuicao', 'dadadadd', 'ff')
    `).run();
    database.prepare(`
      INSERT INTO connection_data_migrations (key, applied_at) VALUES (?, ?)
    `).run(LEGACY_DEMO_CLEANUP_KEY, new Date().toISOString());
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function listApplications(database) {
  return database.prepare(`
    SELECT
      a.*,
      COUNT(DISTINCT f.id) AS feature_count,
      COUNT(DISTINCT CASE WHEN e.data_origin = 'real' THEN e.id END) AS event_count,
      MAX(CASE WHEN e.data_origin = 'real' THEN e.received_at END) AS last_event_at
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
    clientId: row.client_id ?? null,
    client: row.client_id ? row.client_name : null,
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
      COUNT(DISTINCT CASE WHEN e.data_origin = 'real' THEN e.id END) AS event_count,
      MAX(CASE WHEN e.data_origin = 'real' THEN e.received_at END) AS last_event_at
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

  const applicationColumns = database.prepare("PRAGMA table_info(connection_applications)").all();
  const hasLegacyTypeColumn = applicationColumns.some((column) => column.name === "application_type");
  const sharedValues = [
    applicationId,
    input.legacyName,
    input.client,
    input.clientId ?? null,
    hashCredential(credential),
    encryptedCredential.encrypted,
    encryptedCredential.iv,
    encryptedCredential.tag,
    input.createdAt ?? now,
    now,
  ];

  if (hasLegacyTypeColumn) {
    // Coluna legada mantida apenas por compatibilidade; não possui efeito.
    database.prepare(`
      INSERT INTO connection_applications (
        id, name, client_name, client_id, application_type, integration_status,
        credential_hash, credential_encrypted, credential_iv, credential_tag,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'waiting_integration', ?, ?, ?, ?, ?, ?)
    `).run(
      ...sharedValues.slice(0, 4),
      LEGACY_APPLICATION_TYPE_VALUE,
      ...sharedValues.slice(4),
    );
  } else {
    database.prepare(`
      INSERT INTO connection_applications (
        id, name, client_name, client_id, integration_status,
        credential_hash, credential_encrypted, credential_iv, credential_tag,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'waiting_integration', ?, ?, ?, ?, ?, ?)
    `).run(...sharedValues);
  }

  return applicationId;
}

function normalizeApplicationInput(body) {
  const client = typeof body.client === "string" ? body.client.trim() : "";
  const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
  const productName = typeof body.productName === "string" ? body.productName.trim() : "";
  return { client, clientId, productName };
}

function productAlreadyConnected(database, clientId, excludedApplicationId = null) {
  if (!clientId) return null;
  return excludedApplicationId
    ? database.prepare(`
      SELECT id FROM connection_applications WHERE client_id = ? AND id <> ?
    `).get(clientId, excludedApplicationId)
    : database.prepare(`
      SELECT id FROM connection_applications WHERE client_id = ?
    `).get(clientId);
}

function normalizeLookupName(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

function availableId(database, table, preferredId, prefix) {
  const exists = database.prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(preferredId);
  return exists ? createId(prefix) : preferredId;
}

export function ensureShowcaseDemo(database, encryptionKey, { now = new Date() } = {}) {
  const timestamp = now.toISOString();
  let product = database.prepare(`
    SELECT
      id,
      company_id AS companyId,
      company_name AS companyName,
      name,
      normalized_name AS normalizedName
    FROM portfolio_products
    WHERE id = ?
  `).get(SHOWCASE_DEMO.product.id);
  if (product?.normalizedName !== SHOWCASE_DEMO.product.normalizedName) product = null;
  let application = product
    ? database.prepare("SELECT id FROM connection_applications WHERE client_id = ?").get(product.id)
    : null;
  const created = { company: false, product: false, application: false, features: 0, riskProfile: false };

  database.exec("BEGIN IMMEDIATE");
  try {
    if (!product) {
      let company = database.prepare(`
        SELECT id, name
        FROM portfolio_companies
        WHERE normalized_name = ?
      `).get(SHOWCASE_DEMO.company.normalizedName);
      if (!company) {
        const companyId = availableId(
          database,
          "portfolio_companies",
          SHOWCASE_DEMO.company.id,
          "company",
        );
        database.prepare(`
          INSERT INTO portfolio_companies (id, name, normalized_name, created_at)
          VALUES (?, ?, ?, ?)
        `).run(
          companyId,
          SHOWCASE_DEMO.company.name,
          SHOWCASE_DEMO.company.normalizedName,
          timestamp,
        );
        company = { id: companyId, name: SHOWCASE_DEMO.company.name };
        created.company = true;
      }

      product = database.prepare(`
        SELECT id, company_id AS companyId, company_name AS companyName, name
        FROM portfolio_products
        WHERE company_id = ? AND normalized_name = ?
      `).get(company.id, SHOWCASE_DEMO.product.normalizedName);
      if (!product) {
        const productId = availableId(
          database,
          "portfolio_products",
          SHOWCASE_DEMO.product.id,
          "product",
        );
        database.prepare(`
          INSERT INTO portfolio_products (
            id, company_id, company_name, name, normalized_name, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          productId,
          company.id,
          company.name,
          SHOWCASE_DEMO.product.name,
          SHOWCASE_DEMO.product.normalizedName,
          timestamp,
        );
        product = {
          id: productId,
          companyId: company.id,
          companyName: company.name,
          name: SHOWCASE_DEMO.product.name,
        };
        created.product = true;
      }
    }

    application = database.prepare("SELECT id FROM connection_applications WHERE client_id = ?").get(product.id);
    if (!application) {
      const applicationId = availableId(
        database,
        "connection_applications",
        SHOWCASE_DEMO.applicationId,
        "app",
      );
      insertApplication(database, encryptionKey, {
        legacyName: product.name,
        client: `${product.name} · ${product.companyName}`,
        clientId: product.id,
        createdAt: timestamp,
      }, applicationId);
      application = { id: applicationId };
      created.application = true;
    }

    SHOWCASE_DEMO.features.forEach((feature, index) => {
      const exists = database.prepare(`
        SELECT id
        FROM connection_features
        WHERE application_id = ? AND event_name = ?
      `).get(application.id, feature.eventName);
      if (exists) return;
      const featureId = availableId(database, "connection_features", feature.id, "feature");
      database.prepare(`
        INSERT INTO connection_features (id, application_id, name, event_name, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        featureId,
        application.id,
        feature.name,
        feature.eventName,
        new Date(now.getTime() + index).toISOString(),
      );
      created.features += 1;
    });
    const existingRiskProfile = database.prepare(`
      SELECT 1 FROM portfolio_product_risk_profiles WHERE product_id = ?
    `).get(product.id);
    if (!existingRiskProfile) {
      upsertProductRiskProfile(database, product.id, SHOWCASE_DEMO.riskProfile, {
        source: "demo",
        now,
      });
      created.riskProfile = true;
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }

  const seed = seedDemoTelemetry(database, { applicationId: application.id, now });
  return {
    companyId: product.companyId,
    productId: product.id,
    applicationId: application.id,
    created,
    seed,
  };
}

function normalizeNewProductInput(body) {
  if (!body.newProduct || typeof body.newProduct !== "object") return null;
  const productName = typeof body.newProduct.name === "string" ? body.newProduct.name.trim() : "";
  const company = body.newProduct.company && typeof body.newProduct.company === "object"
    ? body.newProduct.company
    : {};
  const companyMode = company.mode === "existing" || company.mode === "new" ? company.mode : "";
  const companyId = typeof company.id === "string" ? company.id.trim() : "";
  const companyName = typeof company.name === "string" ? company.name.trim() : "";
  return { productName, companyMode, companyId, companyName };
}

function listPersistedPortfolio(database) {
  const companies = database.prepare(`
    SELECT id, name, created_at AS createdAt
    FROM portfolio_companies
    ORDER BY name COLLATE NOCASE ASC
  `).all();
  const products = database.prepare(`
    SELECT
      id,
      company_id AS companyId,
      company_name AS companyName,
      name AS productName,
      created_at AS createdAt
    FROM portfolio_products
    ORDER BY created_at ASC
  `).all();
  return {
    companies,
    products,
    telemetryByProduct: getProductTelemetryByProduct(database),
    riskByProduct: getProductRiskProfiles(database),
  };
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

  if (method === "GET" && url.pathname === "/api/portfolio") {
    sendJson(response, 200, listPersistedPortfolio(database));
    return true;
  }

  const productRiskMatch = url.pathname.match(/^\/api\/portfolio\/products\/([^/]+)\/risk-profile$/);
  if (method === "PUT" && productRiskMatch) {
    let productId;
    try {
      productId = decodeURIComponent(productRiskMatch[1]).trim();
    } catch {
      sendJson(response, 400, { error: "Identificador de produto inválido." });
      return true;
    }
    if (!productId || productId.length > 128) {
      sendJson(response, 400, { error: "Identificador de produto inválido." });
      return true;
    }
    const product = database.prepare("SELECT 1 FROM portfolio_products WHERE id = ?").get(productId);
    if (!product) {
      sendJson(response, 404, { error: "Produto não encontrado na carteira persistida." });
      return true;
    }

    try {
      const riskProfile = upsertProductRiskProfile(database, productId, await readJson(request), {
        source: "manual",
      });
      sendJson(response, 200, { riskProfile });
    } catch (error) {
      if (error instanceof TypeError) {
        sendJson(response, 400, { error: error.message });
        return true;
      }
      throw error;
    }
    return true;
  }

  if (method === "GET" && url.pathname === "/api/connections/applications") {
    sendJson(response, 200, { applications: listApplications(database) });
    return true;
  }

  if (method === "POST" && url.pathname === "/api/connections/applications") {
    const body = await readJson(request);
    const input = normalizeApplicationInput(body);
    const newProduct = normalizeNewProductInput(body);

    if (newProduct) {
      if (!newProduct.productName || !newProduct.companyMode || !newProduct.companyName
        || (newProduct.companyMode === "existing" && !newProduct.companyId)) {
        sendJson(response, 400, { error: "Informe a empresa e o nome do novo produto." });
        return true;
      }

      const now = new Date().toISOString();
      let companyId = newProduct.companyId;
      let createdCompany = false;
      database.exec("BEGIN IMMEDIATE");
      try {
        if (newProduct.companyMode === "new") {
          const normalizedCompanyName = normalizeLookupName(newProduct.companyName);
          const existingCompany = database.prepare(`
            SELECT id, name FROM portfolio_companies WHERE normalized_name = ?
          `).get(normalizedCompanyName);
          if (existingCompany) {
            database.exec("ROLLBACK");
            sendJson(response, 409, {
              error: "Esta empresa já foi cadastrada. Selecione-a como empresa existente.",
              code: "COMPANY_EXISTS",
              existingCompany,
            });
            return true;
          }
          companyId = createId("company");
          database.prepare(`
            INSERT INTO portfolio_companies (id, name, normalized_name, created_at)
            VALUES (?, ?, ?, ?)
          `).run(companyId, newProduct.companyName, normalizedCompanyName, now);
          createdCompany = true;
        }

        const normalizedProductName = normalizeLookupName(newProduct.productName);
        const existingProduct = database.prepare(`
          SELECT id, name AS productName, company_id AS companyId, company_name AS companyName
          FROM portfolio_products
          WHERE company_id = ? AND normalized_name = ?
        `).get(companyId, normalizedProductName);
        if (existingProduct) {
          database.exec("ROLLBACK");
          sendJson(response, 409, {
            error: "Este produto já existe para a empresa selecionada. Selecione o produto existente.",
            code: "PRODUCT_EXISTS",
            existingProduct,
          });
          return true;
        }

        const productId = createId("product");
        database.prepare(`
          INSERT INTO portfolio_products (
            id, company_id, company_name, name, normalized_name, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          productId,
          companyId,
          newProduct.companyName,
          newProduct.productName,
          normalizedProductName,
          now,
        );

        const client = `${newProduct.productName} · ${newProduct.companyName}`;
        const applicationId = insertApplication(database, encryptionKey, {
          legacyName: newProduct.productName,
          client,
          clientId: productId,
        });
        database.exec("COMMIT");

        sendJson(response, 201, {
          application: getApplication(database, applicationId, encryptionKey),
          portfolio: {
            company: { id: companyId, name: newProduct.companyName, created: createdCompany },
            product: { id: productId, productName: newProduct.productName, companyId, companyName: newProduct.companyName },
          },
        });
        return true;
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    }

    if (!input.productName || !input.client || !input.clientId) {
      sendJson(response, 400, { error: "Selecione um produto válido da carteira." });
      return true;
    }

    if (productAlreadyConnected(database, input.clientId)) {
      sendJson(response, 409, {
        error: "Este produto já possui uma conexão técnica.",
        code: "PRODUCT_ALREADY_CONNECTED",
      });
      return true;
    }

    let applicationId;
    try {
      applicationId = insertApplication(database, encryptionKey, {
        legacyName: input.productName,
        client: input.client,
        clientId: input.clientId,
      });
    } catch (error) {
      if (String(error).includes("UNIQUE")) {
        sendJson(response, 409, {
          error: "Este produto já possui uma conexão técnica.",
          code: "PRODUCT_ALREADY_CONNECTED",
        });
        return true;
      }
      throw error;
    }
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
        const legacyName = typeof candidate?.name === "string" ? candidate.name.trim() : "";
        const client = typeof candidate?.client === "string" ? candidate.client.trim() : "";
        const clientId = typeof candidate?.clientId === "string" ? candidate.clientId.trim() : "";
        if (!legacyName || !client) continue;

        const preservedId = typeof candidate.id === "string" && /^app_[a-zA-Z0-9]+$/.test(candidate.id)
          ? candidate.id
          : createId("app");
        const alreadyExists = database.prepare("SELECT 1 FROM connection_applications WHERE id = ?").get(preservedId);
        if (alreadyExists) continue;
        if (clientId && productAlreadyConnected(database, clientId)) continue;

        const applicationId = insertApplication(database, encryptionKey, {
          legacyName,
          client,
          clientId,
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
      WHERE application_id = ? AND data_origin = 'real'
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
      sendJson(response, 400, { error: "Selecione um produto válido da carteira." });
      return true;
    }

    if (productAlreadyConnected(database, clientId, clientLinkMatch[1])) {
      sendJson(response, 409, {
        error: "Este produto já possui uma conexão técnica.",
        code: "PRODUCT_ALREADY_CONNECTED",
      });
      return true;
    }

    let linked;
    try {
      linked = linkApplicationToClient(
        database,
        clientLinkMatch[1],
        clientId,
        clientName,
        new Date().toISOString(),
      );
    } catch (error) {
      if (String(error).includes("UNIQUE")) {
        sendJson(response, 409, {
          error: "Este produto já possui uma conexão técnica.",
          code: "PRODUCT_ALREADY_CONNECTED",
        });
        return true;
      }
      throw error;
    }
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

  const temporalAnalyticsMatch = url.pathname.match(/^\/api\/product-analytics\/clients\/([^/]+)\/temporal$/);
  if (method === "GET" && temporalAnalyticsMatch) {
    let clientId;
    try {
      clientId = decodeURIComponent(temporalAnalyticsMatch[1]).trim();
    } catch {
      sendJson(response, 400, { error: "Identificador de produto inválido." });
      return true;
    }
    if (!clientId || clientId.length > 128) {
      sendJson(response, 400, { error: "Identificador de produto inválido." });
      return true;
    }

    try {
      const summary = getTemporalProductAnalytics(
        database,
        clientId,
        url.searchParams.get("period") ?? "monthly",
      );
      sendJson(response, 200, summary);
    } catch (error) {
      if (error instanceof TypeError) {
        sendJson(response, 400, { error: error.message });
        return true;
      }
      throw error;
    }
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
        INSERT INTO connection_events (
          id, application_id, event_name, user_id, received_at, data_origin
        ) VALUES (?, ?, ?, ?, ?, 'real')
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
      if (!handled) next();
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

export { handleApi };
