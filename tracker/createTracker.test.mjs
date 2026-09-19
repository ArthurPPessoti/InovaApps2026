import assert from "node:assert/strict";
import test from "node:test";
import { createTracker, TrackerHttpError, TrackerNetworkError } from "./createTracker.mjs";

const config = {
  applicationId: "app_test123",
  credential: "conn_sk_test123",
  endpoint: "http://127.0.0.1:5173/api/events",
};

test("track envia o contrato esperado com userId", async () => {
  let capturedRequest;
  const tracker = createTracker({
    ...config,
    fetchImplementation: async (url, init) => {
      capturedRequest = { url, init };
      return {
        ok: true,
        status: 202,
        json: async () => ({
          accepted: true,
          event: { id: "evt_1", event: "relatorio_gerado" },
        }),
      };
    },
  });

  const result = await tracker.track("relatorio_gerado", { userId: "user_001" });
  assert.equal(result.id, "evt_1");
  assert.equal(capturedRequest.url, config.endpoint);
  assert.equal(capturedRequest.init.headers.Authorization, `Bearer ${config.credential}`);
  assert.deepEqual(JSON.parse(capturedRequest.init.body), {
    application_id: config.applicationId,
    event: "relatorio_gerado",
    user_id: "user_001",
  });
});

test("track omite user_id quando userId não é informado", async () => {
  let payload;
  const tracker = createTracker({
    ...config,
    fetchImplementation: async (_url, init) => {
      payload = JSON.parse(init.body);
      return {
        ok: true,
        status: 202,
        json: async () => ({ accepted: true, event: { id: "evt_2" } }),
      };
    },
  });

  await tracker.track("relatorio_gerado");
  assert.deepEqual(payload, {
    application_id: config.applicationId,
    event: "relatorio_gerado",
  });
});

test("track informa erro HTTP sem fingir sucesso", async () => {
  const tracker = createTracker({
    ...config,
    fetchImplementation: async () => ({
      ok: false,
      status: 403,
      json: async () => ({ error: "Credencial inválida para esta aplicação." }),
    }),
  });

  await assert.rejects(
    tracker.track("relatorio_gerado"),
    (error) => error instanceof TrackerHttpError && error.status === 403,
  );
});

test("track diferencia falha de rede", async () => {
  const tracker = createTracker({
    ...config,
    fetchImplementation: async () => {
      throw new Error("connection refused");
    },
  });

  await assert.rejects(tracker.track("relatorio_gerado"), TrackerNetworkError);
});
