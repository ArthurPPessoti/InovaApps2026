import assert from "node:assert/strict";
import test from "node:test";
import { createInventoryActions, DEMO_USER_ID } from "./actions.mjs";

test("cada funcionalidade envia o event name esperado pelo tracker", async () => {
  const calls = [];
  const tracker = {
    async track(event, options) {
      calls.push({ event, options });
      return { id: `evt_${calls.length}`, event, user_id: options.userId };
    },
  };
  const actions = createInventoryActions({ tracker });

  await actions["cadastrar-produto"]();
  await actions["consultar-estoque"]();
  await actions["gerar-relatorio"]();

  assert.deepEqual(calls, [
    { event: "produto_cadastrado", options: { userId: DEMO_USER_ID } },
    { event: "estoque_consultado", options: { userId: DEMO_USER_ID } },
    { event: "relatorio_gerado", options: { userId: DEMO_USER_ID } },
  ]);
});

test("falha do tracker é propagada pela funcionalidade", async () => {
  const tracker = {
    async track() {
      throw new Error("API indisponível");
    },
  };
  const actions = createInventoryActions({ tracker });

  await assert.rejects(actions["gerar-relatorio"](), /API indisponível/);
});
