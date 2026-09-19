export const DEMO_USER_ID = "user_001";

export function createInventoryActions({ tracker, userId = DEMO_USER_ID }) {
  return Object.freeze({
    "cadastrar-produto": async () => {
      const event = await tracker.track("produto_cadastrado", { userId });
      return {
        message: "Produto cadastrado com sucesso.",
        event,
      };
    },
    "consultar-estoque": async () => {
      const event = await tracker.track("estoque_consultado", { userId });
      return {
        message: "Estoque consultado com sucesso.",
        event,
      };
    },
    "gerar-relatorio": async () => {
      const event = await tracker.track("relatorio_gerado", { userId });
      return {
        message: "Relatório gerado com sucesso.",
        event,
      };
    },
  });
}
