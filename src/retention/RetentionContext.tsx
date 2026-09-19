import { createContext, type ReactNode, useContext, useState } from "react";
import type {
  CancellationReason,
  CancelledClientMock,
  RewardConfig,
  SurveyCampaign,
  SurveyResponse,
} from "../types";

const STORAGE_KEY = "inovaapps.mock.retention.v1";

export const defaultSurveySubject = "Podemos aprender com a sua experiência?";
export const defaultSurveyMessage = "Queremos entender como foi sua experiência e onde poderíamos ter entregado mais valor. Sua resposta será usada para melhorar nosso produto e atendimento.";

export const cancellationReasons: CancellationReason[] = [
  "Falta de integração",
  "Atendimento",
  "Preço e orçamento",
  "Baixo valor percebido",
  "Estabilidade",
  "Mudança estratégica",
];

export const rewardOptions: RewardConfig[] = [
  { type: "consulting", label: "15 dias de consultoria gratuita", validDays: 30 },
  { type: "diagnostic", label: "Sessão de diagnóstico", validDays: 30 },
  { type: "credit", label: "Crédito demonstrativo de R$ 250", validDays: 30 },
  { type: "none", label: "Sem benefício", validDays: 30 },
  { type: "custom", label: "Benefício personalizado", validDays: 30 },
];

export const cancelledClients: CancelledClientMock[] = [
  {
    id: "mercado-leste",
    name: "Mercado Leste",
    segment: "Varejo",
    plan: "Enterprise",
    solution: "Plataforma de Operações",
    cancelledAt: "12/09/2026",
    cancellationMonth: "Set",
    monthlyRevenueLost: 18000,
    reason: "Falta de integração",
    firstSignalDays: 54,
    relationshipHistory: [
      { date: "12 set", title: "Contrato encerrado", detail: "Cancelamento confirmado após reunião de encerramento." },
      { date: "28 ago", title: "Integração citada", detail: "A equipe informou dificuldade para consolidar dados entre sistemas." },
      { date: "20 jul", title: "Primeiro sinal", detail: "Queda contínua no volume operacional acompanhado." },
    ],
    technologySignals: ["Chamadas da integração caíram 48%", "Três erros críticos em sete dias", "Acesso principal permaneceu estável"],
    dataSignals: ["Volume operacional caiu 48%", "Coluna de ocorrências subiu por três períodos", "Receita permaneceu estável até o encerramento"],
    lifecycleStatus: "cancelled",
    dataSource: "mock",
  },
  {
    id: "clinica-vida",
    name: "Clínica Vida",
    segment: "Saúde",
    plan: "Business",
    solution: "Suporte Dedicado",
    cancelledAt: "03/09/2026",
    cancellationMonth: "Set",
    monthlyRevenueLost: 12500,
    reason: "Atendimento",
    firstSignalDays: 41,
    relationshipHistory: [
      { date: "03 set", title: "Contrato encerrado", detail: "O cliente confirmou insatisfação com prazos de atendimento." },
      { date: "19 ago", title: "Chamados reabertos", detail: "Quatro solicitações voltaram para a fila de suporte." },
      { date: "24 jul", title: "Primeiro sinal", detail: "SLA caiu abaixo do nível contratado." },
    ],
    technologySignals: ["SLA caiu para 68%", "Quatro chamados reabertos", "NPS detrator no último ciclo"],
    dataSignals: ["SLA registrado em 68%", "Quatro ocorrências foram reabertas", "NPS caiu de 7 para 3"],
    lifecycleStatus: "cancelled",
    dataSource: "mock",
  },
  {
    id: "transportes-norte",
    name: "Transportes Norte",
    segment: "Logística",
    plan: "Enterprise",
    solution: "Analytics",
    cancelledAt: "18/08/2026",
    cancellationMonth: "Ago",
    monthlyRevenueLost: 21000,
    reason: "Preço e orçamento",
    firstSignalDays: 63,
    relationshipHistory: [
      { date: "18 ago", title: "Contrato encerrado", detail: "A operação reduziu orçamento e consolidou fornecedores." },
      { date: "02 ago", title: "Renegociação", detail: "A proposta de redução de escopo não foi aceita." },
      { date: "16 jun", title: "Primeiro sinal", detail: "O financeiro solicitou revisão de valores." },
    ],
    technologySignals: ["Uso permaneceu estável", "Nenhuma falha crítica registrada", "Solicitação comercial sem relação com produto"],
    dataSignals: ["Receita do cliente caiu em dois períodos", "Dias de atraso subiram para 18", "Atividade permaneceu estável"],
    lifecycleStatus: "cancelled",
    dataSource: "mock",
  },
  {
    id: "escola-conecta",
    name: "Escola Conecta",
    segment: "Educação",
    plan: "Growth",
    solution: "Transformação Digital",
    cancelledAt: "29/07/2026",
    cancellationMonth: "Jul",
    monthlyRevenueLost: 9800,
    reason: "Baixo valor percebido",
    firstSignalDays: 72,
    relationshipHistory: [
      { date: "29 jul", title: "Contrato encerrado", detail: "A direção informou que não percebeu retorno suficiente." },
      { date: "10 jul", title: "Reunião cancelada", detail: "A revisão de resultados foi adiada pela terceira vez." },
      { date: "18 mai", title: "Primeiro sinal", detail: "Engajamento caiu de forma consistente." },
    ],
    technologySignals: ["Usuários ativos caíram 57%", "Função principal sem uso por 24 dias", "Três reuniões de valor não realizadas"],
    dataSignals: ["Atividade caiu 57%", "Nenhuma reunião registrada no período", "NPS não foi respondido"],
    lifecycleStatus: "cancelled",
    dataSource: "mock",
  },
  {
    id: "industria-vale",
    name: "Indústria Vale",
    segment: "Indústria",
    plan: "Enterprise",
    solution: "Integração e DevOps",
    cancelledAt: "14/06/2026",
    cancellationMonth: "Jun",
    monthlyRevenueLost: 31000,
    reason: "Estabilidade",
    firstSignalDays: 35,
    relationshipHistory: [
      { date: "14 jun", title: "Contrato encerrado", detail: "A operação migrou após recorrência de indisponibilidade." },
      { date: "27 mai", title: "Incidente crítico", detail: "Uma interrupção afetou o fechamento mensal." },
      { date: "10 mai", title: "Primeiro sinal", detail: "A taxa de falhas superou o limite acordado." },
    ],
    technologySignals: ["46 falhas em sete dias", "Disponibilidade caiu para 96,8%", "Dois incidentes críticos"],
    dataSignals: ["Ocorrências cresceram por três períodos", "SLA caiu para 74%", "Dois registros foram classificados como críticos"],
    lifecycleStatus: "cancelled",
    dataSource: "mock",
  },
  {
    id: "grupo-central",
    name: "Grupo Central",
    segment: "Serviços",
    plan: "Business",
    solution: "Inteligência Artificial",
    cancelledAt: "22/05/2026",
    cancellationMonth: "Mai",
    monthlyRevenueLost: 16200,
    reason: "Baixo valor percebido",
    firstSignalDays: 67,
    relationshipHistory: [
      { date: "22 mai", title: "Contrato encerrado", detail: "O projeto foi retirado das prioridades do grupo." },
      { date: "30 abr", title: "Patrocinador mudou", detail: "A nova liderança solicitou revisão do investimento." },
      { date: "16 mar", title: "Primeiro sinal", detail: "Menos equipes passaram a consultar os resultados." },
    ],
    technologySignals: ["Usuários ativos caíram 44%", "Recomendações aceitas caíram 31%", "Patrocinador executivo sem acesso por 45 dias"],
    dataSignals: ["Contatos ativos caíram 44%", "Indicador de adoção caiu 31%", "Sem reunião executiva por 45 dias"],
    lifecycleStatus: "cancelled",
    dataSource: "mock",
  },
];

interface RetentionState {
  campaigns: Record<string, SurveyCampaign>;
  responses: Record<string, SurveyResponse>;
}

const campaign = (clientId: string, status: "sent" | "responded", reward: RewardConfig): SurveyCampaign => ({
  clientId,
  status,
  subject: defaultSurveySubject,
  message: defaultSurveyMessage,
  reward,
  token: `${clientId}-demo`,
  sentAt: "19/09/2026 às 10:15",
});

const initialState: RetentionState = {
  campaigns: {
    "mercado-leste": campaign("mercado-leste", "responded", rewardOptions[0]),
    "clinica-vida": campaign("clinica-vida", "sent", rewardOptions[1]),
    "transportes-norte": campaign("transportes-norte", "responded", rewardOptions[2]),
    "escola-conecta": campaign("escola-conecta", "responded", rewardOptions[0]),
    "industria-vale": campaign("industria-vale", "sent", rewardOptions[1]),
  },
  responses: {
    "mercado-leste-demo": { reason: "Falta de integração", missing: "Uma integração nativa com o ERP.", prevention: "Um plano claro para concluir a integração.", returnIntent: "yes", comment: "A equipe sempre foi próxima.", consent: true, answeredAt: "19/09/2026 às 11:20" },
    "transportes-norte-demo": { reason: "Preço e orçamento", missing: "Um plano menor para o momento atual.", prevention: "Flexibilidade comercial antes da renovação.", returnIntent: "no", comment: "A decisão foi financeira.", consent: true, answeredAt: "18/09/2026 às 16:10" },
    "escola-conecta-demo": { reason: "Baixo valor percebido", missing: "Acompanhamento dos resultados para a direção.", prevention: "Reuniões mais objetivas sobre retorno.", returnIntent: "maybe", comment: "Podemos conversar no próximo semestre.", consent: true, answeredAt: "17/09/2026 às 09:35" },
  },
};

interface RetentionContextValue extends RetentionState {
  sendSurvey: (clientId: string, subject: string, message: string, reward: RewardConfig) => string;
  submitResponse: (token: string, response: Omit<SurveyResponse, "answeredAt">) => void;
  getCampaignByToken: (token: string) => SurveyCampaign | undefined;
}

const RetentionContext = createContext<RetentionContextValue | null>(null);

function readState(): RetentionState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) as RetentionState : initialState;
  } catch {
    return initialState;
  }
}

export function RetentionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RetentionState>(readState);

  const persist = (next: RetentionState) => {
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const value: RetentionContextValue = {
    ...state,
    sendSurvey(clientId, subject, message, reward) {
      const token = `${clientId}-demo`;
      const status = state.responses[token] ? "responded" : "sent";
      persist({
        ...state,
        campaigns: {
          ...state.campaigns,
          [clientId]: { clientId, status, subject, message, reward, token, sentAt: new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date()) },
        },
      });
      return token;
    },
    submitResponse(token, response) {
      const activeCampaign = Object.values(state.campaigns).find((item) => item.token === token);
      if (!activeCampaign) return;
      persist({
        campaigns: { ...state.campaigns, [activeCampaign.clientId]: { ...activeCampaign, status: "responded" } },
        responses: { ...state.responses, [token]: { ...response, answeredAt: new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date()) } },
      });
    },
    getCampaignByToken(token) {
      return Object.values(state.campaigns).find((item) => item.token === token);
    },
  };

  return <RetentionContext.Provider value={value}>{children}</RetentionContext.Provider>;
}

export function useRetention() {
  const value = useContext(RetentionContext);
  if (!value) throw new Error("useRetention precisa estar dentro de RetentionProvider");
  return value;
}
