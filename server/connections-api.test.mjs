import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { ensureShowcaseDemo, handleApi } from "./connections-api.mjs";
import { ensureProductRiskSchema } from "./product-risk.mjs";

const NOW = new Date("2026-09-19T15:00:00.000Z");

function createDatabase({ legacyTypeColumn = false } = {}) {
  const database = new DatabaseSync(":memory:");
  database.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE connection_applications (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      client_name TEXT NOT NULL,
      client_id TEXT,
      ${legacyTypeColumn ? "application_type TEXT NOT NULL CHECK (application_type IN ('internal', 'multiuser'))," : ""}
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
    CREATE TABLE portfolio_companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      normalized_name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );
    CREATE TABLE portfolio_products (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      company_name TEXT NOT NULL,
      name TEXT NOT NULL,
      normalized_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(company_id, normalized_name)
    );
    CREATE UNIQUE INDEX idx_connection_applications_unique_client
      ON connection_applications(client_id)
      WHERE client_id IS NOT NULL;
  `);
  ensureProductRiskSchema(database);
  return database;
}

async function startApi(database) {
  const encryptionKey = randomBytes(32);
  const server = createServer(async (request, response) => {
    try {
      const handled = await handleApi(request, response, database, encryptionKey);
      if (!handled) {
        response.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ error: "Endpoint não encontrado." }));
      }
    } catch (error) {
      response.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: String(error) }));
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

async function apiRequest(baseUrl, path, { method = "GET", body, credential } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(credential ? { Authorization: `Bearer ${credential}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json() };
}

test("bootstrap disponibiliza NexStock completo e idempotente em uma instalação nova", () => {
  const database = createDatabase();
  const encryptionKey = randomBytes(32);
  const first = ensureShowcaseDemo(database, encryptionKey, { now: NOW });
  const second = ensureShowcaseDemo(database, encryptionKey, { now: NOW });

  assert.equal(first.productId, "product_f3bede39f94b");
  assert.equal(first.applicationId, "app_nexstockdemo");
  assert.deepEqual(first.created, { company: true, product: true, application: true, features: 3, riskProfile: true });
  assert.deepEqual(second.created, { company: false, product: false, application: false, features: 0, riskProfile: false });
  assert.equal(second.seed.inserted, 0);
  assert.equal(second.seed.totalDemoEvents, first.seed.totalDemoEvents);
  assert.deepEqual(
    database.prepare(`
      SELECT name, event_name AS eventName
      FROM connection_features
      WHERE application_id = ?
      ORDER BY created_at ASC
    `).all(first.applicationId).map((row) => ({ ...row })),
    [
      { name: "Consulta de estoque", eventName: "estoque_consultado" },
      { name: "Cadastro de produto", eventName: "produto_cadastrado" },
      { name: "Geração de relatório", eventName: "relatorio_gerado" },
    ],
  );
  assert.deepEqual(
    { ...database.prepare(`
      SELECT name, company_name AS companyName
      FROM portfolio_products
      WHERE id = ?
    `).get(first.productId) },
    { name: "NexStock — Gestão de Estoque", companyName: "Nexora Distribuição" },
  );
  assert.ok(first.seed.totalDemoEvents > 0);
  const portfolioRisk = database.prepare(`
    SELECT source, plan FROM portfolio_product_risk_profiles WHERE product_id = ?
  `).get(first.productId);
  assert.deepEqual({ ...portfolioRisk }, { source: "demo", plan: "Enterprise" });
  database.close();
});

test("perfil comercial classifica somente o produto informado", async (context) => {
  const database = createDatabase();
  database.prepare(`
    INSERT INTO portfolio_companies (id, name, normalized_name, created_at)
    VALUES ('company_test', 'Empresa teste', 'empresa teste', ?)
  `).run(NOW.toISOString());
  const insertProduct = database.prepare(`
    INSERT INTO portfolio_products (id, company_id, company_name, name, normalized_name, created_at)
    VALUES (?, 'company_test', 'Empresa teste', ?, ?, ?)
  `);
  insertProduct.run("product_one", "Produto um", "produto um", NOW.toISOString());
  insertProduct.run("product_two", "Produto dois", "produto dois", NOW.toISOString());

  const api = await startApi(database);
  context.after(async () => {
    await api.close();
    database.close();
  });

  const saved = await apiRequest(api.baseUrl, "/api/portfolio/products/product_one/risk-profile", {
    method: "PUT",
    body: {
      segment: "Logística",
      plan: "Enterprise",
      monthlyRevenue: 25_000,
      slaPercent: 76,
      nps: 5,
      openTickets: 6,
      criticalTickets: 2,
      paymentDelayDays: 12,
    },
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.riskProfile.productId, "product_one");
  assert.equal(saved.body.riskProfile.source, "manual");
  assert.equal(saved.body.riskProfile.riskLevel, "Médio");

  const portfolio = await apiRequest(api.baseUrl, "/api/portfolio");
  assert.deepEqual(Object.keys(portfolio.body.riskByProduct), ["product_one"]);
  assert.equal(portfolio.body.riskByProduct.product_one.monthlyRevenue, 25_000);
  assert.equal(portfolio.body.riskByProduct.product_two, undefined);

  const invalid = await apiRequest(api.baseUrl, "/api/portfolio/products/product_two/risk-profile", {
    method: "PUT",
    body: {
      segment: "Logística",
      plan: "Básico",
      monthlyRevenue: 1_000,
      slaPercent: 90,
      nps: 8,
      openTickets: 1,
      criticalTickets: 2,
      paymentDelayDays: 0,
    },
  });
  assert.equal(invalid.status, 400);
  assert.equal(portfolio.body.riskByProduct.product_two, undefined);
});

test("conecta produto sem nome independente e preserva telemetria, credencial, vínculo e usuários", async (context) => {
  const database = createDatabase();
  const api = await startApi(database);
  context.after(async () => {
    await api.close();
    database.close();
  });

  const created = await apiRequest(api.baseUrl, "/api/connections/applications", {
    method: "POST",
    body: {
      clientId: "atlas-logistica",
      client: "Sistema de Pesagem · Atlas Logística",
      productName: "Sistema de Pesagem",
    },
  });

  assert.equal(created.status, 201);
  assert.match(created.body.application.id, /^app_[a-z0-9]+$/);
  assert.equal(created.body.application.clientId, "atlas-logistica");
  assert.equal(created.body.application.status, "waiting_integration");
  assert.equal("type" in created.body.application, false);
  assert.equal("name" in created.body.application, false);
  assert.match(created.body.application.credential, /^conn_sk_/);

  const applicationId = created.body.application.id;
  const credential = created.body.application.credential;
  const feature = await apiRequest(api.baseUrl, `/api/connections/applications/${applicationId}/features`, {
    method: "POST",
    body: { name: "Consultar estoque", eventName: "estoque_consultado" },
  });
  assert.equal(feature.status, 201);
  assert.equal(feature.body.application.features[0].eventName, "estoque_consultado");

  const withUser = await apiRequest(api.baseUrl, "/api/events", {
    method: "POST",
    credential,
    body: { application_id: applicationId, event: "estoque_consultado", user_id: "user_001" },
  });
  const withoutUser = await apiRequest(api.baseUrl, "/api/events", {
    method: "POST",
    credential,
    body: { application_id: applicationId, event: "relatorio_gerado" },
  });
  const trackerTest = await apiRequest(api.baseUrl, "/api/events", {
    method: "POST",
    credential,
    body: { application_id: applicationId, event: "tracker_test_event", user_id: "user_tracker" },
  });
  assert.equal(withUser.status, 202);
  assert.equal(withUser.body.event.user_id, "user_001");
  assert.equal(withoutUser.status, 202);
  assert.equal(withoutUser.body.event.user_id, null);
  assert.equal(trackerTest.status, 202);

  const invalidCredential = await apiRequest(api.baseUrl, "/api/events", {
    method: "POST",
    credential: "conn_sk_invalid_test_only",
    body: { application_id: applicationId, event: "estoque_consultado" },
  });
  assert.equal(invalidCredential.status, 403);
  assert.equal(invalidCredential.body.error, "Credencial inválida para esta aplicação.");

  const detail = await apiRequest(api.baseUrl, `/api/connections/applications/${applicationId}`);
  assert.equal(detail.body.application.id, applicationId);
  assert.equal(detail.body.application.clientId, "atlas-logistica");
  assert.equal(detail.body.application.credential, credential);
  assert.equal(detail.body.application.status, "connected");
  assert.equal(detail.body.application.featureCount, 1);
  assert.equal(detail.body.application.eventCount, 3);
  assert.equal("type" in detail.body.application, false);
  assert.equal("name" in detail.body.application, false);

  const events = await apiRequest(api.baseUrl, `/api/connections/applications/${applicationId}/events`);
  assert.deepEqual(events.body.events.map((event) => event.userId).sort(), [null, "user_001", "user_tracker"]);
  assert.deepEqual(
    events.body.events.map((event) => event.event).sort(),
    ["estoque_consultado", "relatorio_gerado", "tracker_test_event"],
  );

  const analytics = await apiRequest(api.baseUrl, `/api/product-analytics/applications/${applicationId}/summary`);
  assert.deepEqual(analytics.body.metrics, { totalEvents: 1, uniqueUsers: 1, featuresUsed: 1 });
  assert.deepEqual(analytics.body.features.map((item) => item.eventName), ["estoque_consultado"]);
});

test("banco legado aceita nova aplicação sem expor nem exigir classificação", async (context) => {
  const database = createDatabase({ legacyTypeColumn: true });
  const api = await startApi(database);
  context.after(async () => {
    await api.close();
    database.close();
  });

  const created = await apiRequest(api.baseUrl, "/api/connections/applications", {
    method: "POST",
    body: {
      clientId: "produto-legado",
      client: "Produto legado · Empresa Demo",
      productName: "Produto legado",
    },
  });

  assert.equal(created.status, 201);
  assert.equal("type" in created.body.application, false);
  const stored = database.prepare("SELECT application_type FROM connection_applications WHERE id = ?")
    .get(created.body.application.id);
  assert.equal(stored.application_type, "internal");
});

test("rejeita uma segunda conexão para o mesmo produto sem criar Application ID ou credencial", async (context) => {
  const database = createDatabase();
  const api = await startApi(database);
  context.after(async () => {
    await api.close();
    database.close();
  });

  const input = {
    clientId: "product_single_connection",
    client: "Produto Único · Empresa Demo",
    productName: "Produto Único",
  };
  const first = await apiRequest(api.baseUrl, "/api/connections/applications", {
    method: "POST",
    body: input,
  });
  const second = await apiRequest(api.baseUrl, "/api/connections/applications", {
    method: "POST",
    body: input,
  });

  assert.equal(first.status, 201);
  assert.equal(second.status, 409);
  assert.equal(second.body.code, "PRODUCT_ALREADY_CONNECTED");
  assert.equal("application" in second.body, false);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM connection_applications").get().count, 1);
});

test("não aceita o antigo nome livre como substituto do produto", async (context) => {
  const database = createDatabase();
  const api = await startApi(database);
  context.after(async () => {
    await api.close();
    database.close();
  });

  const response = await apiRequest(api.baseUrl, "/api/connections/applications", {
    method: "POST",
    body: {
      name: "Nome independente antigo",
      clientId: "product_without_name",
      client: "Produto · Empresa",
    },
  });

  assert.equal(response.status, 400);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM connection_applications").get().count, 0);
});

test("cria produto para empresa existente e impede produto duplicado", async (context) => {
  const database = createDatabase();
  const api = await startApi(database);
  context.after(async () => {
    await api.close();
    database.close();
  });

  const created = await apiRequest(api.baseUrl, "/api/connections/applications", {
    method: "POST",
    body: {
      newProduct: {
        name: "Gestão de Frota",
        company: { mode: "existing", id: "atlas-logistica", name: "Atlas Logística" },
      },
    },
  });

  assert.equal(created.status, 201);
  assert.match(created.body.portfolio.product.id, /^product_[a-z0-9]+$/);
  assert.equal(created.body.application.clientId, created.body.portfolio.product.id);
  assert.equal(created.body.portfolio.company.id, "atlas-logistica");
  assert.equal(created.body.portfolio.company.created, false);
  assert.match(created.body.application.credential, /^conn_sk_/);

  const portfolio = await apiRequest(api.baseUrl, "/api/portfolio");
  assert.equal(portfolio.body.companies.length, 0);
  assert.equal(portfolio.body.products.length, 1);
  assert.equal(portfolio.body.products[0].companyId, "atlas-logistica");

  const duplicate = await apiRequest(api.baseUrl, "/api/connections/applications", {
    method: "POST",
    body: {
      newProduct: {
        name: "  gestao de frota  ",
        company: { mode: "existing", id: "atlas-logistica", name: "Atlas Logística" },
      },
    },
  });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.code, "PRODUCT_EXISTS");
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM connection_applications").get().count, 1);
});

test("cria empresa, produto e aplicação na mesma transação e reutiliza a empresa", async (context) => {
  const database = createDatabase();
  const api = await startApi(database);
  context.after(async () => {
    await api.close();
    database.close();
  });

  const first = await apiRequest(api.baseUrl, "/api/connections/applications", {
    method: "POST",
    body: {
      newProduct: {
        name: "Gestão de Frota",
        company: { mode: "new", name: "Transportadora XPTO" },
      },
    },
  });
  assert.equal(first.status, 201);
  assert.match(first.body.portfolio.company.id, /^company_[a-z0-9]+$/);
  assert.equal(first.body.portfolio.company.created, true);

  const duplicateCompany = await apiRequest(api.baseUrl, "/api/connections/applications", {
    method: "POST",
    body: {
      newProduct: {
        name: "Portal de Transportadoras",
        company: { mode: "new", name: "transportadora xpto" },
      },
    },
  });
  assert.equal(duplicateCompany.status, 409);
  assert.equal(duplicateCompany.body.code, "COMPANY_EXISTS");

  const second = await apiRequest(api.baseUrl, "/api/connections/applications", {
    method: "POST",
    body: {
      newProduct: {
        name: "Portal de Transportadoras",
        company: {
          mode: "existing",
          id: first.body.portfolio.company.id,
          name: first.body.portfolio.company.name,
        },
      },
    },
  });
  assert.equal(second.status, 201);

  const portfolio = await apiRequest(api.baseUrl, "/api/portfolio");
  assert.equal(portfolio.body.companies.length, 1);
  assert.equal(portfolio.body.products.length, 2);
  assert.ok(portfolio.body.products.every((product) => product.companyId === first.body.portfolio.company.id));

  const event = await apiRequest(api.baseUrl, "/api/events", {
    method: "POST",
    credential: first.body.application.credential,
    body: {
      application_id: first.body.application.id,
      event: "teste_integracao",
      user_id: "user_test_001",
    },
  });
  assert.equal(event.status, 202);
  const storedEvent = database.prepare(`
    SELECT data_origin AS origin
    FROM connection_events
    WHERE id = ?
  `).get(event.body.event.id);
  assert.equal(storedEvent.origin, "real");

  const analytics = await apiRequest(
    api.baseUrl,
    `/api/product-analytics/clients/${first.body.portfolio.product.id}/summary`,
  );
  assert.deepEqual(analytics.body.metrics, { totalEvents: 0, uniqueUsers: 0, featuresUsed: 0 });
});

test("portfolio devolve telemetria consolidada para produtos mock e persistidos em uma unica resposta", async (context) => {
  const database = createDatabase();
  const api = await startApi(database);
  context.after(async () => {
    await api.close();
    database.close();
  });

  const mockProduct = await apiRequest(api.baseUrl, "/api/connections/applications", {
    method: "POST",
    body: {
      clientId: "atlas-logistica",
      client: "Sistema de Pesagem · Atlas Logística",
      productName: "Sistema de Pesagem",
    },
  });
  for (const [name, eventName] of [
    ["Pesagem", "pesagem_concluida"],
    ["Integração ERP", "integracao_erp"],
    ["Relatórios", "relatorios_gerados"],
  ]) {
    await apiRequest(api.baseUrl, `/api/connections/applications/${mockProduct.body.application.id}/features`, {
      method: "POST",
      body: { name, eventName },
    });
  }

  const persistedProduct = await apiRequest(api.baseUrl, "/api/connections/applications", {
    method: "POST",
    body: {
      newProduct: {
        name: "Gestão de Frota",
        company: { mode: "new", name: "Transportadora XPTO" },
      },
    },
  });
  await apiRequest(
    api.baseUrl,
    `/api/connections/applications/${persistedProduct.body.application.id}/features`,
    { method: "POST", body: { name: "Rotas", eventName: "rotas_consultadas" } },
  );

  const withoutFeatures = await apiRequest(api.baseUrl, "/api/connections/applications", {
    method: "POST",
    body: {
      clientId: "produto-sem-features",
      client: "Produto sem features · Empresa",
      productName: "Produto sem features",
    },
  });
  assert.equal(withoutFeatures.status, 201);

  database.prepare(`
    INSERT INTO connection_applications (
      id, name, client_name, client_id, integration_status,
      credential_hash, credential_encrypted, credential_iv, credential_tag,
      created_at, updated_at
    ) VALUES (?, ?, ?, NULL, 'waiting_integration', ?, ?, ?, ?, ?, ?)
  `).run(
    "app_legacy_without_client",
    "Legada",
    "Conexão sem vínculo",
    "hash",
    "encrypted",
    "iv",
    "tag",
    "2026-09-20T00:00:00.000Z",
    "2026-09-20T00:00:00.000Z",
  );

  const portfolio = await apiRequest(api.baseUrl, "/api/portfolio");
  assert.equal(portfolio.status, 200);
  assert.deepEqual(portfolio.body.telemetryByProduct["atlas-logistica"], {
    connected: true,
    applicationId: mockProduct.body.application.id,
    featureCount: 3,
  });
  assert.deepEqual(portfolio.body.telemetryByProduct[persistedProduct.body.portfolio.product.id], {
    connected: true,
    applicationId: persistedProduct.body.application.id,
    featureCount: 1,
  });
  assert.deepEqual(portfolio.body.telemetryByProduct["produto-sem-features"], {
    connected: true,
    applicationId: withoutFeatures.body.application.id,
    featureCount: 0,
  });
  assert.equal("produto-sem-conexao" in portfolio.body.telemetryByProduct, false);
  assert.ok(!Object.values(portfolio.body.telemetryByProduct)
    .some((summary) => summary.applicationId === "app_legacy_without_client"));
});
