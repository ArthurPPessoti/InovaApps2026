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
  clientId: string;
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

export interface CancelledClientMock {
  id: string;
  name: string;
  segment: string;
  plan: string;
  solution: string;
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

export interface ClientMock {
  id: string;
  name: string;
  segment: string;
  plan: string;
  solution: string;
  priority: number;
  riskLevel: RiskLevel;
  riskScore: number;
  monthlyRevenue: number;
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

export interface PortfolioPoint {
  label: string;
  alto: number;
  medio: number;
  baixo: number;
}
