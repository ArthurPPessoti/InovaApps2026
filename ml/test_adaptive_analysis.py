import tempfile
import unittest
from pathlib import Path

import pandas as pd

from adaptive_analysis import default_config, profile_workbook, run_score, validate_config


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


if __name__ == "__main__":
    unittest.main()
