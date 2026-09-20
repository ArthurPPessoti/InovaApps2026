import tempfile
import unittest
from pathlib import Path

import pandas as pd

from adaptive_analysis import (
    aggregate,
    as_of_sample,
    default_config,
    entity_table,
    parsed_dates,
    profile_workbook,
    risk_values,
    run_score,
    validate_config,
)


def panel_workbook(directory: Path, months: int = 24, cancel_at: dict[str, int] | None = None) -> Path:
    """Painel no formato que quebrava o split: quem cancela para de gerar linhas."""
    cancel_at = cancel_at or {}
    path = Path(directory) / "painel.xlsx"
    ids = [f"C{i:03d}" for i in range(60)]
    rows, status = [], []
    for entity in ids:
        last_month = cancel_at.get(entity, months)
        for month in range(1, last_month + 1):
            rows.append({
                "cliente_id": entity,
                "data_ref": f"2025-{month:02d}-01" if month <= 12 else f"2026-{month - 12:02d}-01",
                "dias_atraso": month,
                "uso_plataforma": 20 if entity in cancel_at else 90,
            })
        month = cancel_at.get(entity)
        cancelled = (f"2025-{month:02d}-01" if month and month <= 12 else f"2026-{month - 12:02d}-01") if month else None
        status.append({"cliente_id": entity, "situacao": "Cancelado" if month else "Ativo", "mes_cancelamento": cancelled})
    with pd.ExcelWriter(path) as writer:
        pd.DataFrame({"cliente_id": ids, "plano": ["a", "b"] * 30}).to_excel(writer, sheet_name="clientes", index=False)
        pd.DataFrame(rows).to_excel(writer, sheet_name="mensal", index=False)
        pd.DataFrame(status).to_excel(writer, sheet_name="situacao", index=False)
    return path


class AdaptiveAnalysisTests(unittest.TestCase):
    def test_profiles_arbitrary_csv_without_financial_data(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "visitas.csv"
            pd.DataFrame({
                "pessoa_codigo": ["A", "B", "C"],
                "ultima_visita": ["2026-01-01", "2026-02-01", "2026-03-01"],
                "dias_sem_voltar": [8, 42, 90],
                "grupo": ["novo", "recorrente", "recorrente"],
            }).to_csv(path, index=False)
            profile, _ = profile_workbook(path)
            self.assertTrue(profile["capabilities"]["time"])
            self.assertFalse(profile["capabilities"]["businessValue"])
            self.assertEqual(profile["format"], "csv")

    def test_score_reconstructs_from_observed_contributions(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "carteira.csv"
            pd.DataFrame({
                "cliente_id": ["A", "B", "C", "D"],
                "frequencia": [10, 7, 2, None],
                "dias_atraso": [0, 2, 20, 8],
                "segmento": ["x", "x", "y", "y"],
            }).to_csv(path, index=False)
            profile, frames = profile_workbook(path)
            config = default_config(profile)
            config["objective"]["confirmed"] = True
            validation = validate_config(profile, config)
            self.assertTrue(validation["valid"], validation["errors"])
            result = run_score(profile, frames, config)
            self.assertEqual(result["method"]["selected"], "weighted_score")
            self.assertEqual(len(result["entities"]), 4)
            for entity in result["entities"]:
                reconstructed = sum(factor["contribution"] for factor in entity["factors"])
                self.assertAlmostEqual(entity["estimate"], reconstructed, places=3)

    def test_multisheet_relationship_is_suggested(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "multi.xlsx"
            with pd.ExcelWriter(path) as writer:
                pd.DataFrame({"conta_id": ["1", "2", "3"], "plano": ["a", "b", "a"]}).to_excel(writer, sheet_name="contas", index=False)
                pd.DataFrame({"conta_id": ["1", "1", "2", "3"], "uso": [8, 7, 4, 1]}).to_excel(writer, sheet_name="eventos", index=False)
            profile, _ = profile_workbook(path)
            self.assertGreaterEqual(len(profile["relationships"]), 1)
            self.assertEqual(profile["relationships"][0]["leftColumn"], "conta_id")


class DateParsingTests(unittest.TestCase):
    def test_iso_dates_are_not_reparsed_as_dayfirst(self):
        # dayfirst=True lia 2025-12-01 como 12 de janeiro e descartava todo dia acima de 12.
        parsed = parsed_dates(pd.Series(["2025-12-01", "2025-01-30", "2025-11-05"]))
        self.assertEqual([str(value.date()) for value in parsed], ["2025-12-01", "2025-01-30", "2025-11-05"])
        self.assertEqual(int(parsed.isna().sum()), 0)

    def test_ambiguous_slash_dates_still_read_day_first(self):
        parsed = parsed_dates(pd.Series(["05/01/2025", "30/01/2025"]))
        self.assertEqual([str(value.date()) for value in parsed], ["2025-01-05", "2025-01-30"])


class MetricDefaultsTests(unittest.TestCase):
    def test_unknown_polarity_stays_informational(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "colunas.csv"
            pd.DataFrame({"cliente_id": ["A", "B", "C"], "indicador_xpto": [1, 5, 9], "dias_atraso": [0, 3, 9]}).to_csv(path, index=False)
            profile, _ = profile_workbook(path)
            by_column = {m["column"]: m for m in default_config(profile)["metrics"]}
            # Chutar "maior é pior" para nome desconhecido invertia SLA cumprido, NPS e reuniões realizadas.
            self.assertEqual(by_column["indicador_xpto"]["riskType"], "INFORMATIONAL")
            self.assertEqual(by_column["dias_atraso"]["riskType"], "HIGH_IS_RISK")

    def test_business_value_is_not_a_risk_metric(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "receita.csv"
            pd.DataFrame({"cliente_id": ["A", "B", "C"], "valor_mensal": [100, 500, 900], "dias_atraso": [0, 3, 9]}).to_csv(path, index=False)
            profile, _ = profile_workbook(path)
            by_column = {m["column"]: m for m in default_config(profile)["metrics"]}
            self.assertFalse(by_column["valor_mensal"]["included"])

    def test_panel_sheet_also_gets_a_trend_metric(self):
        with tempfile.TemporaryDirectory() as directory:
            profile, _ = profile_workbook(panel_workbook(Path(directory)))
            aggregations = {(m["column"], m["aggregation"]) for m in default_config(profile)["metrics"] if m["included"]}
            self.assertIn(("dias_atraso", "MEAN"), aggregations)
            self.assertIn(("dias_atraso", "TREND"), aggregations)
            self.assertNotIn(("plano", "TREND"), aggregations)

    def test_trend_without_enough_points_is_missing_not_a_level(self):
        self.assertTrue(pd.isna(aggregate(pd.Series([7.0]), "TREND")))
        self.assertAlmostEqual(aggregate(pd.Series([1.0, 3.0, 5.0]), "TREND"), 2.0)


class ObservationCutoffTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.path = panel_workbook(Path(self.directory.name), cancel_at={f"C{i:03d}": 4 + i for i in range(22)})
        self.profile, self.frames = profile_workbook(self.path)
        self.config = default_config(self.profile)
        self.config["objective"]["confirmed"] = True
        self.table = entity_table(self.frames, self.config)
        self.metrics = [m for m in self.config["metrics"] if m.get("included") and m["riskType"] != "INFORMATIONAL" and m["id"] in self.table]
        self.references = {m["id"]: self.table[m["id"]] for m in self.metrics}

    def tearDown(self):
        self.directory.cleanup()

    def sample(self, cutoff):
        return as_of_sample(self.frames, self.config, pd.Timestamp(cutoff), pd.Timedelta(days=90), self.metrics, self.references, ["cancelado"])

    def test_cutoff_hides_rows_after_the_cutoff(self):
        cutoff = pd.Timestamp("2025-06-01")
        limited = entity_table(self.frames, self.config, cutoff=cutoff)
        level = next(m["id"] for m in self.metrics if m["aggregation"] == "MEAN" and "atraso" in m["column"])
        active = "C059"  # nunca cancela, então é observado até o fim da base
        self.assertGreater(self.table.loc[self.table["__entity"].eq(active), "__last"].iloc[0], cutoff)
        # dias_atraso cresce com o mês: até 2025-06 a média cobre 1..6, contra 1..24 na fonte inteira.
        self.assertAlmostEqual(limited.loc[limited["__entity"].eq(active), level].iloc[0], 3.5)
        self.assertAlmostEqual(self.table.loc[self.table["__entity"].eq(active), level].iloc[0], 12.5)

    def test_sample_drops_entities_whose_outcome_already_happened(self):
        _, label, entities = self.sample("2025-10-01")
        # C000 cancelou em 2025-04, muito antes do corte: já não estava em risco.
        self.assertNotIn("C000", set(entities))
        self.assertGreater(int(label.sum()), 0)

    def test_temporal_split_keeps_events_on_both_sides(self):
        # Regressão: ordenar por última observação jogava os 22 cancelamentos no treino
        # e deixava validação e teste com zero positivos, matando o modo probabilístico.
        positives = [int(self.sample(cutoff)[1].sum()) for cutoff in ("2025-07-01", "2025-10-01", "2026-01-01")]
        self.assertTrue(all(count > 0 for count in positives), positives)

    def test_last_observation_never_becomes_a_predictor(self):
        features, _, _ = self.sample("2025-10-01")
        self.assertFalse([column for column in features.columns if str(column).startswith("__")])


class ScoreSemanticsTests(unittest.TestCase):
    def test_score_reports_relative_position_and_says_so(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "carteira.csv"
            pd.DataFrame({"cliente_id": list("ABCDE"), "dias_atraso": [0, 1, 2, 3, 40]}).to_csv(path, index=False)
            profile, frames = profile_workbook(path)
            config = default_config(profile)
            config["objective"]["confirmed"] = True
            result = run_score(profile, frames, config)
            self.assertTrue(all("percentile" in entity for entity in result["entities"]))
            self.assertAlmostEqual(max(e["percentile"] for e in result["entities"]), 1.0)
            self.assertTrue(any("nao mede saude absoluta" in limitation.replace("ã", "a").replace("ú", "u").replace("é", "e")
                                for limitation in result["limitations"]))

    def test_decomposition_stays_complete_beyond_eight_metrics(self):
        # Truncar em 8 fatores quebrava a garantia auditável: a soma deixava de ser o score.
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "muitas.csv"
            frame = {"cliente_id": [f"E{i:02d}" for i in range(12)]}
            for index in range(11):
                frame[f"dias_atraso_{index}"] = [(index + value) % 17 for value in range(12)]
            pd.DataFrame(frame).to_csv(path, index=False)
            profile, frames = profile_workbook(path)
            config = default_config(profile)
            config["objective"]["confirmed"] = True
            result = run_score(profile, frames, config)
            self.assertGreater(len(result["entities"][0]["factors"]), 8)
            for entity in result["entities"]:
                self.assertAlmostEqual(entity["estimate"], sum(f["contribution"] for f in entity["factors"]), places=3)

    def test_reference_series_fixes_the_scale_across_cutoffs(self):
        reference = pd.Series([0.0, 10.0, 20.0, 30.0, 40.0])
        subset = pd.Series([0.0, 10.0])
        anchored, _ = risk_values(subset, "HIGH_IS_RISK", reference)
        floating, _ = risk_values(subset, "HIGH_IS_RISK")
        self.assertLess(anchored.iloc[1], floating.iloc[1])


if __name__ == "__main__":
    unittest.main()
