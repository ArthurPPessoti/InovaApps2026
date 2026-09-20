export const DEMO_USER_ID = "user_001";

export function createInventoryActions({ tracker, userId = DEMO_USER_ID }) {
  return Object.freeze({
    "acessar-painel": async () => {
      const event = await tracker.track("painel_acessado", { userId });
      return {
        message: "Painel acessado com sucesso.",
        event,
      };
    },
    "exportar-relatorio": async () => {
      const event = await tracker.track("relatorio_exportado", { userId });
      return {
        message: "Relatório exportado com sucesso.",
        event,
      };
    },
    "executar-automacao": async () => {
      const event = await tracker.track("automacao_executada", { userId });
      return {
        message: "Automação executada com sucesso.",
        event,
      };
    },
  });
}
