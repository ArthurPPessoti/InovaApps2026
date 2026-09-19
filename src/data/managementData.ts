import type { ManagementFinancialPoint, PortfolioHealthPoint, RenewalMock, RetentionCase } from "../types";

export const managementOwners = ["Marina Costa", "Paulo Nunes", "Ana Lima", "Caio Martins"];

export const initialRetentionCases: RetentionCase[] = [
  { id: "case-atlas", productId: "atlas-logistica", title: "Recuperar adoção da pesagem", owner: "Marina Costa", dueDate: "2026-09-18", stage: "detected", note: "Validar as duas unidades sem atividade.", createdAt: "2026-09-12", dataSource: "mock" },
  { id: "case-horizonte", productId: "clinica-horizonte", title: "Plano emergencial de SLA", owner: "Paulo Nunes", dueDate: "2026-09-19", stage: "detected", note: "Revisar chamados críticos com a liderança.", createdAt: "2026-09-13", dataSource: "mock" },
  { id: "case-varejo", productId: "varejo-nova", title: "Reativar gestores no Analytics", owner: "Ana Lima", dueDate: "2026-09-18", stage: "contacted", note: "Contato inicial realizado; aguardando agenda.", createdAt: "2026-09-10", dataSource: "mock" },
  { id: "case-orion", productId: "industria-orion", title: "Estabilizar integração ERP", owner: "Caio Martins", dueDate: "2026-09-22", stage: "contacted", note: "Diagnóstico técnico compartilhado.", createdAt: "2026-09-11", dataSource: "mock" },
  { id: "case-delta", productId: "educacional-delta", title: "Retomar governança do projeto", owner: "Marina Costa", dueDate: "2026-09-17", stage: "in_progress", note: "Nova reunião executiva proposta.", createdAt: "2026-09-08", dataSource: "mock" },
  { id: "case-prisma", productId: "servicos-prisma", title: "Revisar automações prioritárias", owner: "Paulo Nunes", dueDate: "2026-09-24", stage: "in_progress", note: "Workshop de valor agendado.", createdAt: "2026-09-09", dataSource: "mock" },
  { id: "case-rotas", productId: "rotas-sul", title: "Recuperar confiança no suporte", owner: "Ana Lima", dueDate: "2026-09-16", stage: "recovered", note: "Chamados críticos resolvidos e NPS reagendado.", createdAt: "2026-09-02", dataSource: "mock" },
  { id: "case-aurora", productId: "grupo-aurora", title: "Ampliar adoção das recomendações", owner: "Caio Martins", dueDate: "2026-09-15", stage: "recovered", note: "Treinamento concluído com os gestores.", createdAt: "2026-09-01", dataSource: "mock" },
];

export const managementFinancialSeries: ManagementFinancialPoint[] = [
  { month: "Abr", atRisk: 82, recovered: 45, lost: 12 },
  { month: "Mai", atRisk: 96, recovered: 58, lost: 16.2 },
  { month: "Jun", atRisk: 110, recovered: 52, lost: 31 },
  { month: "Jul", atRisk: 88, recovered: 61, lost: 9.8 },
  { month: "Ago", atRisk: 134, recovered: 76, lost: 21 },
  { month: "Set", atRisk: 126, recovered: 74, lost: 30.5 },
];

export const portfolioHealthSeries: PortfolioHealthPoint[] = [
  { month: "Abr", score: 72, target: 75, event: "Reajuste" },
  { month: "Mai", score: 69, target: 75, event: "Versão 3" },
  { month: "Jun", score: 63, target: 75, event: "Incidente" },
  { month: "Jul", score: 65, target: 75 },
  { month: "Ago", score: 68, target: 75, event: "Campanha" },
  { month: "Set", score: 71, target: 75 },
];

export const renewalMocks: RenewalMock[] = [
  { id: "renewal-atlas", productId: "atlas-logistica", dueInDays: 30, renewalDate: "19/10/2026", hasPlan: true, dataSource: "mock" },
  { id: "renewal-horizonte", productId: "clinica-horizonte", dueInDays: 30, renewalDate: "28/10/2026", hasPlan: false, dataSource: "mock" },
  { id: "renewal-orion", productId: "industria-orion", dueInDays: 60, renewalDate: "12/11/2026", hasPlan: true, dataSource: "mock" },
  { id: "renewal-delta", productId: "educacional-delta", dueInDays: 60, renewalDate: "26/11/2026", hasPlan: false, dataSource: "mock" },
  { id: "renewal-prisma", productId: "servicos-prisma", dueInDays: 90, renewalDate: "08/12/2026", hasPlan: true, dataSource: "mock" },
  { id: "renewal-aurora", productId: "grupo-aurora", dueInDays: 90, renewalDate: "17/12/2026", hasPlan: false, dataSource: "mock" },
];

export const managementDemoToday = "2026-09-19";

export function productFamily(productName: string) {
  if (productName.includes("Analytics")) return "Analytics";
  if (productName.includes("Suporte")) return "Suporte";
  if (productName.includes("Pesagem") || productName.includes("Operações")) return "Operações";
  if (productName.includes("RPA")) return "Automação";
  if (productName.includes("Integração")) return "Integrações";
  if (productName.includes("Inteligência Artificial")) return "IA";
  return "Transformação";
}
