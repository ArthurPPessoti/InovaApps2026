export type RiskLevel = "Alto" | "Médio" | "Baixo";

export type DataSource = "mock";

export type CompanyProfile = "technology" | "general";

export type ClientLifecycleStatus = "active" | "attention" | "cancelled";

export type CancellationReason =
  | "Falta de integração"
  | "Atendimento"
  | "Preço e orçamento"
  | "Baixo valor percebido"
  | "Estabilidade"
  | "Mudança estratégica";

export type SurveyStatus = "not_sent" | "sent" | "responded";

export interface RewardConfig {
  type: "consulting" | "diagnostic" | "credit" | "none" | "custom";
  label: string;
  validDays: 30;
}

export interface SurveyCampaign {
  productId: string;
  status: SurveyStatus;
  subject: string;
  message: string;
  reward: RewardConfig;
  token?: string;
  sentAt?: string;
}

export interface SurveyResponse {
  reason: CancellationReason;
  missing: string;
  prevention: string;
  returnIntent: "yes" | "maybe" | "no";
  comment: string;
  consent: true;
  answeredAt: string;
}

export interface CancelledProductMock {
  id: string;
  companyId: string;
  productName: string;
  plan: string;
  cancelledAt: string;
  cancellationMonth: string;
  monthlyRevenueLost: number;
  reason: CancellationReason;
  firstSignalDays: number;
  relationshipHistory: Array<{ date: string; title: string; detail: string }>;
  technologySignals: string[];
  dataSignals: string[];
  lifecycleStatus: "cancelled";
  dataSource: DataSource;
}

export interface SpreadsheetMetadata {
  fileName: string;
  importedAt: string;
  rows: number;
}

export interface MockAccount {
  id: string;
  userName: string;
  email: string;
  companyName: string;
  segment: string;
  profile: CompanyProfile;
  onboardingComplete: true;
  spreadsheet?: SpreadsheetMetadata;
}

export interface TrendPoint {
  label: string;
  value: number;
}

export interface RiskSignal {
  id: string;
  title: string;
  detail: string;
  severity: RiskLevel;
  timestamp: string;
  feature: string;
  dimension: SignalDimension;
}

export type SignalDimension = "Uso" | "Integração" | "Atendimento" | "Relacionamento" | "Financeiro";

export interface TrackedFeature {
  id: string;
  name: string;
  status: "Saudável" | "Atenção" | "Crítico";
  health: number;
  variation: number;
  lastActivity: string;
  note: string;
}

export interface TrackingEvent {
  id: string;
  feature: string;
  action: string;
  result: "Sucesso" | "Alerta" | "Erro";
  timestamp: string;
  context: string;
}

export interface SuggestedAction {
  id: string;
  title: string;
  detail: string;
  owner: string;
  urgency: "Hoje" | "Esta semana" | "Monitorar";
}

export interface CompanyMock {
  id: string;
  name: string;
  segment: string;
  owner: string;
  nps: number | null;
  paymentDelay: number;
  relationshipRiskScore: number;
  dataSource: DataSource;
}

export interface ProductContractMock {
  id: string;
  companyId: string;
  productName: string;
  plan: string;
  priority: number;
  riskLevel: RiskLevel;
  riskScore: number;
  monthlyRevenue: number;
  strategicCriticality: 1 | 2 | 3 | 4 | 5;
  activeUsers: number;
  primarySignal: string;
  explanation: string;
  usage: number;
  sla: number;
  nps: number | null;
  openTickets: number;
  meetings: string;
  paymentDelay: number;
  trend: TrendPoint[];
  usageAndSla: Array<{ label: string; uso: number; sla: number }>;
  signals: RiskSignal[];
  features: TrackedFeature[];
  events: TrackingEvent[];
  actions: SuggestedAction[];
  dataSource: DataSource;
}

export interface CompanyProductContribution {
  product: ProductContractMock;
  weight: number;
  contribution: number;
}

export interface CompanyPortfolio {
  company: CompanyMock;
  products: ProductContractMock[];
  monthlyRevenue: number;
  productRiskScore: number;
  riskScore: number;
  riskLevel: RiskLevel;
  productsAtRisk: number;
  criticalAlert?: ProductContractMock;
  contributions: CompanyProductContribution[];
}

export interface PortfolioPoint {
  label: string;
  alto: number;
  medio: number;
  baixo: number;
}

export type RetentionCaseStage = "detected" | "contacted" | "in_progress" | "recovered";

export interface RetentionCase {
  id: string;
  productId: string;
  title: string;
  owner: string;
  dueDate: string;
  stage: RetentionCaseStage;
  note: string;
  createdAt: string;
  dataSource: DataSource;
}

export interface RenewalMock {
  id: string;
  productId: string;
  dueInDays: 30 | 60 | 90;
  renewalDate: string;
  hasPlan: boolean;
  dataSource: DataSource;
}

export interface ManagementFinancialPoint {
  month: string;
  atRisk: number;
  recovered: number;
  lost: number;
}

export interface PortfolioHealthPoint {
  month: string;
  score: number;
  target: number;
  event?: string;
}
