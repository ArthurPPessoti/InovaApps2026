import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTrackerTestCommand,
  TRACKER_CREDENTIAL_PLACEHOLDER,
  trackerTestCommandButtonLabel,
} from "./trackerTestCommand.ts";

test("gera comando pronto quando a credencial ja esta disponivel", () => {
  const result = buildTrackerTestCommand("app_test123", "conn_sk_example_not_secret");
  assert.equal(result.ready, true);
  assert.match(result.command, /TRACKER_APPLICATION_ID = "app_test123"/);
  assert.match(result.command, /TRACKER_CREDENTIAL = "conn_sk_example_not_secret"/);
  assert.match(result.command, /TRACKER_EVENT = "tracker_test_event"/);
  assert.match(result.command, /TRACKER_USER_ID = "user_001"/);
  assert.match(result.command, /npm run test:tracker:real/);
  assert.ok(!result.command.includes(TRACKER_CREDENTIAL_PLACEHOLDER));
});

test("gera modelo inequivoco quando a credencial nao esta disponivel", () => {
  const result = buildTrackerTestCommand("app_test123");
  assert.equal(result.ready, false);
  assert.match(result.command, /TRACKER_CREDENTIAL = "<SUA_CREDENCIAL>"/);
  assert.ok(!result.command.includes("<cole a credencial acima>"));
  assert.equal(trackerTestCommandButtonLabel(result, false), "Copiar modelo de comando");
  assert.equal(trackerTestCommandButtonLabel(result, true), "Modelo copiado");
});

test("rotulo deixa claro quando o comando esta pronto e confirma a copia", () => {
  const command = buildTrackerTestCommand("app_test123", "conn_sk_example_not_secret");
  assert.equal(trackerTestCommandButtonLabel(command, false), "Copiar comando pronto");
  assert.equal(trackerTestCommandButtonLabel(command, true), "Comando copiado");
});
