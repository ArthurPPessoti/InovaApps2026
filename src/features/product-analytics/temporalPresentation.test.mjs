import assert from "node:assert/strict";
import test from "node:test";
import {
  ALL_FEATURES,
  buildFeatureChart,
  buildPeriodHighlights,
  getFeatureFilterMode,
  normalizeFeatureSelection,
  STABILITY_THRESHOLD_PERCENT,
} from "./temporalPresentation.ts";

function feature({
  eventName,
  name,
  current,
  previous,
  percentageChange,
  consecutiveDeclines = 0,
}) {
  return {
    eventName,
    name,
    registered: true,
    events: { current, previous, absoluteChange: current - previous, percentageChange },
    uniqueUsers: { current: 0, previous: 0, absoluteChange: 0, percentageChange: null },
    frequencyPerUser: { current: 0, previous: 0, absoluteChange: 0, percentageChange: null },
    consecutiveDeclines,
  };
}

const decline = feature({ eventName: "report", name: "Gerar relatório", current: 40, previous: 50, percentageChange: -20 });
const growth = feature({ eventName: "product", name: "Cadastrar produto", current: 112, previous: 100, percentageChange: 12 });
const stable = feature({ eventName: "stock", name: "Consultar estoque", current: 102, previous: 100, percentageChange: 2 });

test("gera destaques dinâmicos de queda, crescimento e estabilidade", () => {
  const highlights = buildPeriodHighlights([stable, growth, decline], "ready");
  assert.deepEqual(highlights.map((item) => item.kind), ["decline", "growth", "stable"]);
  assert.match(highlights[0].text, /Gerar relatório caiu 20,0%/);
  assert.match(highlights[1].text, /Cadastrar produto cresceu 12,0%/);
  assert.match(highlights[2].text, /Consultar estoque permaneceu próxima/);
  assert.equal(STABILITY_THRESHOLD_PERCENT, 5);
});

test("prioriza quedas mensais persistentes e deixa sua periodicidade explícita", () => {
  const persistent = feature({
    eventName: "persistent",
    name: "Exportar dados",
    current: 70,
    previous: 100,
    percentageChange: -30,
    consecutiveDeclines: 4,
  });
  const highlights = buildPeriodHighlights([decline, persistent, growth], "ready");
  assert.equal(highlights[0].eventName, "persistent");
  assert.match(highlights[0].text, /4 quedas mensais consecutivas/);
});

test("não inventa percentual quando o período anterior é zero", () => {
  const noBaseline = feature({ eventName: "new", name: "Nova função", current: 8, previous: 0, percentageChange: null });
  const [highlight] = buildPeriodHighlights([noBaseline], "ready");
  assert.equal(highlight.kind, "baseline");
  assert.match(highlight.text, /8 eventos.*sem base anterior/);
  assert.doesNotMatch(highlight.text, /%/);
});

test("não gera destaques sem funcionalidades ou sem histórico suficiente", () => {
  assert.deepEqual(buildPeriodHighlights([], "ready"), []);
  assert.deepEqual(buildPeriodHighlights([growth], "insufficient_history"), []);
  for (const status of ["no_connection", "no_features", "waiting_for_events"]) {
    assert.deepEqual(buildPeriodHighlights([growth], status), []);
  }
});

test("limita a três destaques com ordenação determinística", () => {
  const features = [
    feature({ eventName: "b", name: "Beta", current: 60, previous: 100, percentageChange: -40 }),
    feature({ eventName: "a", name: "Alfa", current: 60, previous: 100, percentageChange: -40 }),
    growth,
    stable,
  ];
  const highlights = buildPeriodHighlights(features, "ready");
  assert.equal(highlights.length, 3);
  assert.deepEqual(highlights.map((item) => item.eventName), ["a", "b", "product"]);
});

test("filtro Todas mantém todas as séries e filtro individual mantém apenas uma", () => {
  const features = [decline, growth, stable];
  const history = {
    granularity: "monthly",
    points: [{ start: "2026-09-01T03:00:00.000Z", eventCounts: { report: 4, product: 7, stock: 2 } }],
  };
  const all = buildFeatureChart(history, features, ALL_FEATURES);
  assert.equal(all.features.length, 3);
  assert.equal(all.granularity, "monthly");
  assert.deepEqual(all.data[0].values, { report: 4, product: 7, stock: 2 });

  const individual = buildFeatureChart(history, features, "stock");
  assert.deepEqual(individual.features.map((item) => item.eventName), ["stock"]);
  assert.deepEqual(individual.data[0].values, { stock: 2 });
});

test("reseta seleção quando a funcionalidade deixa de existir", () => {
  assert.equal(normalizeFeatureSelection("removed", [decline, growth]), ALL_FEATURES);
  assert.equal(buildFeatureChart({ granularity: "daily", points: [] }, [decline], "removed").selection, ALL_FEATURES);
});

test("adapta o controle a uma quantidade variável de funcionalidades", () => {
  assert.equal(getFeatureFilterMode(3), "chips");
  assert.equal(getFeatureFilterMode(6), "chips");
  assert.equal(getFeatureFilterMode(7), "select");
});
