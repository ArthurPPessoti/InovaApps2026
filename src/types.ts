export type RiskLevel = "Alto" | "Médio" | "Baixo";

export type DataSource = "mock";

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
}

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
