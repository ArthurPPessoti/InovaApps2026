const CALCULATION_VERSION = "commercial-operational-v1";

const clamp = (value, minimum = 0, maximum = 100) => Math.min(maximum, Math.max(minimum, value));

function requiredText(value, label, maximumLength = 80) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) throw new TypeError(`${label} é obrigatório.`);
  if (normalized.length > maximumLength) throw new TypeError(`${label} deve ter até ${maximumLength} caracteres.`);
  return normalized;
}

function requiredNumber(value, label, minimum, maximum, { integer = false } = {}) {
  if (value === "" || value === null || value === undefined) {
    throw new TypeError(`${label} é obrigatório.`);
  }
  const normalized = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(normalized)) throw new TypeError(`${label} deve ser um número válido.`);
  if (integer && !Number.isInteger(normalized)) throw new TypeError(`${label} deve ser um número inteiro.`);
  if (normalized < minimum || normalized > maximum) {
    throw new TypeError(`${label} deve estar entre ${minimum} e ${maximum}.`);
  }
  return normalized;
}

export function normalizeProductRiskInput(input) {
  if (!input || typeof input !== "object") throw new TypeError("Informe os dados comerciais e operacionais do produto.");

  const profile = {
    segment: requiredText(input.segment, "Segmento"),
    plan: requiredText(input.plan, "Plano"),
    monthlyRevenue: requiredNumber(input.monthlyRevenue, "Receita mensal", 0.01, 1_000_000_000),
    slaPercent: requiredNumber(input.slaPercent, "SLA", 0, 100),
    nps: requiredNumber(input.nps, "NPS", 0, 10),
    openTickets: requiredNumber(input.openTickets, "Chamados abertos", 0, 1_000_000, { integer: true }),
    criticalTickets: requiredNumber(input.criticalTickets, "Chamados críticos", 0, 1_000_000, { integer: true }),
    paymentDelayDays: requiredNumber(input.paymentDelayDays, "Dias de atraso", 0, 3_650, { integer: true }),
  };

  if (profile.criticalTickets > profile.openTickets) {
    throw new TypeError("Chamados críticos não podem superar o total de chamados abertos.");
  }
  return profile;
}

export function calculateProductRisk(input) {
  const profile = normalizeProductRiskInput(input);
  const components = [
    {
      key: "sla",
      contribution: clamp(((95 - profile.slaPercent) / 35) * 100) * 0.35,
      signal: `SLA informado em ${profile.slaPercent}%`,
    },
    {
      key: "nps",
      contribution: clamp(((8 - profile.nps) / 8) * 100) * 0.25,
      signal: `NPS informado em ${profile.nps}`,
    },
    {
      key: "tickets",
      contribution: clamp((profile.openTickets * 5) + (profile.criticalTickets * 25)) * 0.25,
      signal: profile.criticalTickets
        ? `${profile.criticalTickets} chamado(s) crítico(s) entre ${profile.openTickets} aberto(s)`
        : `${profile.openTickets} chamado(s) aberto(s), nenhum crítico`,
    },
    {
      key: "payment",
      contribution: clamp((profile.paymentDelayDays / 30) * 100) * 0.15,
      signal: profile.paymentDelayDays
        ? `${profile.paymentDelayDays} dia(s) de atraso informado(s)`
        : "Pagamento informado como em dia",
    },
  ];
  const riskScore = Math.round(components.reduce((total, component) => total + component.contribution, 0));
  const riskLevel = riskScore >= 70 ? "Alto" : riskScore >= 45 ? "Médio" : "Baixo";
  const leadingComponent = [...components].sort((left, right) => right.contribution - left.contribution)[0];
  const primarySignal = leadingComponent.contribution > 0
    ? leadingComponent.signal
    : "Indicadores informados dentro das faixas esperadas";

  return {
    riskScore,
    riskLevel,
    primarySignal,
    calculationVersion: CALCULATION_VERSION,
  };
}

export function ensureProductRiskSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS portfolio_product_risk_profiles (
      product_id TEXT PRIMARY KEY,
      source TEXT NOT NULL CHECK (source IN ('demo', 'manual')),
      segment TEXT NOT NULL,
      plan TEXT NOT NULL,
      monthly_revenue REAL NOT NULL CHECK (monthly_revenue > 0),
      sla_percent REAL NOT NULL CHECK (sla_percent >= 0 AND sla_percent <= 100),
      nps REAL NOT NULL CHECK (nps >= 0 AND nps <= 10),
      open_tickets INTEGER NOT NULL CHECK (open_tickets >= 0),
      critical_tickets INTEGER NOT NULL CHECK (critical_tickets >= 0 AND critical_tickets <= open_tickets),
      payment_delay_days INTEGER NOT NULL CHECK (payment_delay_days >= 0),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(product_id) REFERENCES portfolio_products(id) ON DELETE CASCADE
    );
  `);
}

function mapProductRiskProfile(row) {
  if (!row) return null;
  const values = {
    segment: row.segment,
    plan: row.plan,
    monthlyRevenue: Number(row.monthlyRevenue),
    slaPercent: Number(row.slaPercent),
    nps: Number(row.nps),
    openTickets: Number(row.openTickets),
    criticalTickets: Number(row.criticalTickets),
    paymentDelayDays: Number(row.paymentDelayDays),
  };
  return {
    productId: row.productId,
    source: row.source,
    ...values,
    ...calculateProductRisk(values),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const SELECT_PROFILE = `
  SELECT
    product_id AS productId,
    source,
    segment,
    plan,
    monthly_revenue AS monthlyRevenue,
    sla_percent AS slaPercent,
    nps,
    open_tickets AS openTickets,
    critical_tickets AS criticalTickets,
    payment_delay_days AS paymentDelayDays,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM portfolio_product_risk_profiles
`;

export function getProductRiskProfile(database, productId) {
  return mapProductRiskProfile(database.prepare(`${SELECT_PROFILE} WHERE product_id = ?`).get(productId));
}

export function getProductRiskProfiles(database) {
  return Object.fromEntries(
    database.prepare(SELECT_PROFILE).all().map((row) => {
      const profile = mapProductRiskProfile(row);
      return [profile.productId, profile];
    }),
  );
}

export function upsertProductRiskProfile(database, productId, input, {
  source = "manual",
  now = new Date(),
} = {}) {
  if (source !== "manual" && source !== "demo") throw new TypeError("Origem do perfil de risco inválida.");
  const profile = normalizeProductRiskInput(input);
  const timestamp = now.toISOString();
  database.prepare(`
    INSERT INTO portfolio_product_risk_profiles (
      product_id, source, segment, plan, monthly_revenue, sla_percent, nps,
      open_tickets, critical_tickets, payment_delay_days, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(product_id) DO UPDATE SET
      source = excluded.source,
      segment = excluded.segment,
      plan = excluded.plan,
      monthly_revenue = excluded.monthly_revenue,
      sla_percent = excluded.sla_percent,
      nps = excluded.nps,
      open_tickets = excluded.open_tickets,
      critical_tickets = excluded.critical_tickets,
      payment_delay_days = excluded.payment_delay_days,
      updated_at = excluded.updated_at
  `).run(
    productId,
    source,
    profile.segment,
    profile.plan,
    profile.monthlyRevenue,
    profile.slaPercent,
    profile.nps,
    profile.openTickets,
    profile.criticalTickets,
    profile.paymentDelayDays,
    timestamp,
    timestamp,
  );
  return getProductRiskProfile(database, productId);
}
