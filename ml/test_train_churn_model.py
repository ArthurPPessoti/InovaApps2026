import unittest
from pathlib import Path

import pandas as pd

from train_churn_model import prepare_data, probability_band, train, validate_workbook


ROOT = Path(__file__).resolve().parents[1]
WORKBOOK = ROOT / "Informacoes_fornecidas" / "INOVAAPPS_base_de_dados.xlsx"


class ChurnTrainingTest(unittest.TestCase):
    def test_workbook_is_compatible(self):
        self.assertTrue(validate_workbook(WORKBOOK)["compatible"])

    def test_supervised_window_does_not_use_future_rows(self):
        prepared = prepare_data(WORKBOOK)
        self.assertEqual(prepared.observed_until, pd.Period("2026-06", freq="M"))
        self.assertLessEqual(prepared.supervised["month"].max(), pd.Period("2026-03", freq="M"))
        self.assertEqual(len(prepared.current), 58)
        self.assertFalse(
            (
                prepared.supervised["cancel_month"].notna()
                & prepared.supervised["month"].ge(prepared.supervised["cancel_month"])
            ).any()
        )

    def test_probability_bands_have_fixed_boundaries(self):
        self.assertEqual(probability_band(0.09), "LOW")
        self.assertEqual(probability_band(0.10), "ATTENTION")
        self.assertEqual(probability_band(0.25), "HIGH")
        self.assertEqual(probability_band(0.50), "CRITICAL")

    def test_result_connects_predictions_to_evidence_and_churn_history(self):
        result = train(WORKBOOK)
        self.assertEqual(len(result["predictions"]), 58)
        self.assertEqual(len(result["historicalChurn"]), 22)
        self.assertIn("usage", result["predictions"][0]["evidence"])
        self.assertIn("service", result["predictions"][0]["evidence"])


if __name__ == "__main__":
    unittest.main()
