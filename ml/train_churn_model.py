from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    log_loss,
    roc_auc_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


REQUIRED_COLUMNS = {
    "clientes": {
        "cliente_id",
        "segmento",
        "porte",
        "plano",
        "valor_mensal",
        "sla_contratado_h",
        "inicio_contrato",
    },
    "atendimento_mensal": {
        "cliente_id",
        "mes_ref",
        "chamados_abertos",
        "chamados_criticos",
        "chamados_reabertos",
        "pct_sla_cumprido",
        "tempo_medio_resolucao_h",
        "reclamacoes_formais",
        "uso_plataforma_pct",
        "dias_atraso_pagamento",
        "reunioes_previstas",
        "reunioes_realizadas",
    },
    "pesquisas_nps": {
        "cliente_id",
        "mes_ref",
        "respondeu",
        "nota_nps",
        "classificacao_nps",
    },
    "situacao_clientes": {"cliente_id", "situacao", "mes_cancelamento"},
}

CURRENT_NUMERIC_COLUMNS = [
    "valor_mensal",
    "sla_contratado_h",
    "tenure_months",
    "chamados_abertos",
    "chamados_criticos",
    "chamados_reabertos",
    "pct_sla_cumprido",
    "tempo_medio_resolucao_h",
    "reclamacoes_formais",
    "uso_plataforma_pct",
    "dias_atraso_pagamento",
    "meeting_completion",
    "latest_nps",
    "latest_nps_answered",
    "months_since_nps",
]

TREND_COLUMNS = [
    "chamados_abertos",
    "chamados_criticos",
    "chamados_reabertos",
    "pct_sla_cumprido",
    "tempo_medio_resolucao_h",
    "reclamacoes_formais",
    "uso_plataforma_pct",
    "dias_atraso_pagamento",
    "meeting_completion",
]

CATEGORICAL_COLUMNS = ["segmento", "porte", "plano", "latest_nps_classification"]

FEATURE_LABELS = {
    "valor_mensal": "Receita mensal",
    "sla_contratado_h": "SLA contratado",
    "tenure_months": "Tempo de contrato",
    "chamados_abertos": "Chamados abertos",
    "chamados_criticos": "Chamados críticos",
    "chamados_reabertos": "Chamados reabertos",
    "pct_sla_cumprido": "SLA cumprido",
    "tempo_medio_resolucao_h": "Tempo médio de resolução",
    "reclamacoes_formais": "Reclamações formais",
    "uso_plataforma_pct": "Uso da plataforma",
    "dias_atraso_pagamento": "Atraso de pagamento",
    "meeting_completion": "Reuniões realizadas",
    "latest_nps": "Último NPS",
    "latest_nps_answered": "Resposta ao NPS",
    "months_since_nps": "Meses desde o último NPS",
    "segmento": "Segmento",
    "porte": "Porte",
    "plano": "Plano",
    "latest_nps_classification": "Classificação do NPS",
}


@dataclass(frozen=True)
class PreparedData:
    snapshots: pd.DataFrame
    supervised: pd.DataFrame
    current: pd.DataFrame
    numeric_features: list[str]
    categorical_features: list[str]
    observed_until: pd.Period


def inspect_source(path: Path) -> dict[str, Any]:
    if path.suffix.lower() == ".csv":
        frame = pd.read_csv(path)
        sources = [("__csv__", frame)]
        source_format = "csv"
    else:
        with pd.ExcelFile(path) as workbook:
            sources = [(name, pd.read_excel(workbook, sheet_name=name)) for name in workbook.sheet_names]
        source_format = "xlsx"
    return {
        "fileName": path.name,
        "format": source_format,
        "sheets": [
            {
                "name": name,
                "columns": [str(column) for column in frame.columns],
                "sample": json.loads(frame.head(3).to_json(orient="records", date_format="iso")),
                "rows": int(len(frame)),
            }
            for name, frame in sources
        ],
    }


def read_source_tables(path: Path, mapping: dict[str, Any] | None = None) -> dict[str, pd.DataFrame]:
    mapping = mapping or {}
    sheet_mapping = mapping.get("sheets", {})
    column_mapping = mapping.get("columns", {})
    if path.suffix.lower() == ".csv":
        source_frames = {"__csv__": pd.read_csv(path)}
    else:
        with pd.ExcelFile(path) as workbook:
            source_frames = {name: pd.read_excel(workbook, sheet_name=name) for name in workbook.sheet_names}

    tables: dict[str, pd.DataFrame] = {}
    for canonical_sheet in REQUIRED_COLUMNS:
        source_name = sheet_mapping.get(canonical_sheet, canonical_sheet)
        if source_name not in source_frames:
            continue
        frame = source_frames[source_name].copy()
        configured = column_mapping.get(canonical_sheet, {})
        if configured:
            frame = frame.rename(columns={source: target for target, source in configured.items() if source})
        tables[canonical_sheet] = frame
    return tables


def validate_workbook(path: Path, mapping: dict[str, Any] | None = None) -> dict[str, Any]:
    inspection = inspect_source(path)
    tables = read_source_tables(path, mapping)
    missing_sheets = sorted(set(REQUIRED_COLUMNS) - set(tables))
    missing_columns: dict[str, list[str]] = {}
    for sheet, required in REQUIRED_COLUMNS.items():
        if sheet not in tables:
            continue
        missing = sorted(required - set(tables[sheet].columns.astype(str)))
        if missing:
            missing_columns[sheet] = missing

    return {
        "compatible": not missing_sheets and not missing_columns,
        "missingSheets": missing_sheets,
        "missingColumns": missing_columns,
        "availableSheets": [sheet["name"] for sheet in inspection["sheets"]],
    }


def _period(value: Any) -> pd.Period | pd.NaT:
    if pd.isna(value) or str(value).strip() == "":
        return pd.NaT
    return pd.Period(str(value), freq="M")


def _months_between(later: pd.Period, earlier: pd.Period) -> int:
    return (later.year - earlier.year) * 12 + later.month - earlier.month


def prepare_data(path: Path, horizon_months: int = 3, mapping: dict[str, Any] | None = None) -> PreparedData:
    compatibility = validate_workbook(path, mapping)
    if not compatibility["compatible"]:
        raise ValueError(json.dumps(compatibility, ensure_ascii=False))

    tables = read_source_tables(path, mapping)
    clients = tables["clientes"].drop_duplicates("cliente_id", keep="last")
    monthly = tables["atendimento_mensal"].dropna(subset=["cliente_id", "mes_ref"])
    nps = tables["pesquisas_nps"].dropna(subset=["cliente_id", "mes_ref"])
    status = tables["situacao_clientes"].drop_duplicates("cliente_id", keep="last")

    clients["inicio_contrato"] = pd.to_datetime(clients["inicio_contrato"], errors="coerce")
    monthly["month"] = monthly["mes_ref"].map(_period)
    nps["nps_month"] = nps["mes_ref"].map(_period)
    status["cancel_month"] = status["mes_cancelamento"].map(_period)
    observed_until = monthly["month"].max()

    snapshots = monthly.merge(clients, on="cliente_id", how="left", validate="many_to_one")
    snapshots = snapshots.merge(
        status[["cliente_id", "situacao", "cancel_month"]],
        on="cliente_id",
        how="left",
        validate="many_to_one",
    )
    snapshots = snapshots.sort_values(["cliente_id", "month"]).reset_index(drop=True)
    snapshots["tenure_months"] = snapshots.apply(
        lambda row: _months_between(row["month"], pd.Period(row["inicio_contrato"], freq="M")),
        axis=1,
    )
    snapshots["meeting_completion"] = np.where(
        snapshots["reunioes_previstas"].eq(1),
        snapshots["reunioes_realizadas"],
        np.nan,
    )

    for column in TREND_COLUMNS:
        grouped = snapshots.groupby("cliente_id", sort=False)[column]
        snapshots[f"{column}_mean_3m"] = grouped.transform(
            lambda values: values.rolling(3, min_periods=1).mean()
        )
        snapshots[f"{column}_delta_3m"] = grouped.transform(lambda values: values - values.shift(2))

    latest_nps_rows: list[dict[str, Any]] = []
    nps_by_client = {
        client_id: frame.sort_values("nps_month")
        for client_id, frame in nps.groupby("cliente_id", sort=False)
    }
    for row in snapshots[["cliente_id", "month"]].itertuples(index=False):
        available = nps_by_client.get(row.cliente_id)
        known = available[available["nps_month"] <= row.month] if available is not None else None
        if known is None or known.empty:
            latest_nps_rows.append(
                {
                    "latest_nps": np.nan,
                    "latest_nps_answered": 0,
                    "latest_nps_classification": "Sem pesquisa",
                    "months_since_nps": np.nan,
                }
            )
            continue
        latest = known.iloc[-1]
        latest_nps_rows.append(
            {
                "latest_nps": latest["nota_nps"],
                "latest_nps_answered": int(latest["respondeu"]),
                "latest_nps_classification": str(latest["classificacao_nps"]),
                "months_since_nps": _months_between(row.month, latest["nps_month"]),
            }
        )
    snapshots = pd.concat([snapshots, pd.DataFrame(latest_nps_rows)], axis=1)

    snapshots["churn_90d"] = snapshots.apply(
        lambda row: int(
            pd.notna(row["cancel_month"])
            and row["cancel_month"] > row["month"]
            and row["cancel_month"] <= row["month"] + horizon_months
        ),
        axis=1,
    )
    snapshots["history_months"] = snapshots.groupby("cliente_id").cumcount() + 1

    numeric_features = CURRENT_NUMERIC_COLUMNS + [
        f"{column}_{suffix}"
        for column in TREND_COLUMNS
        for suffix in ("mean_3m", "delta_3m")
    ]
    categorical_features = CATEGORICAL_COLUMNS.copy()

    training_cutoff = observed_until - horizon_months
    supervised = snapshots[
        snapshots["month"].le(training_cutoff)
        & snapshots["history_months"].ge(3)
        & (snapshots["cancel_month"].isna() | snapshots["month"].lt(snapshots["cancel_month"]))
    ].copy()
    active_ids = set(status.loc[status["situacao"].eq("Ativo"), "cliente_id"])
    current = snapshots[
        snapshots["month"].eq(observed_until) & snapshots["cliente_id"].isin(active_ids)
    ].copy()

    return PreparedData(
        snapshots=snapshots,
        supervised=supervised,
        current=current,
        numeric_features=numeric_features,
        categorical_features=categorical_features,
        observed_until=observed_until,
    )


def make_pipeline(numeric_features: list[str], categorical_features: list[str], c_value: float) -> Pipeline:
    preprocessor = ColumnTransformer(
        transformers=[
            (
                "numeric",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="median", add_indicator=True)),
                        ("scale", StandardScaler()),
                    ]
                ),
                numeric_features,
            ),
            (
                "categorical",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("onehot", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                categorical_features,
            ),
        ]
    )
    return Pipeline(
        [
            ("prepare", preprocessor),
            ("model", LogisticRegression(C=c_value, max_iter=2_000, solver="liblinear")),
        ]
    )


def probability_band(probability: float) -> str:
    if probability >= 0.50:
        return "CRITICAL"
    if probability >= 0.25:
        return "HIGH"
    if probability >= 0.10:
        return "ATTENTION"
    return "LOW"


def _safe_metric(metric: Any, *args: Any, **kwargs: Any) -> float | None:
    try:
        return round(float(metric(*args, **kwargs)), 6)
    except ValueError:
        return None


def _json_number(value: Any, digits: int = 2) -> float | int | None:
    if pd.isna(value):
        return None
    number = float(value)
    return int(number) if number.is_integer() else round(number, digits)


def row_evidence(row: Any) -> dict[str, Any]:
    return {
        "usage": {
            "current": _json_number(row.uso_plataforma_pct),
            "average3m": _json_number(row.uso_plataforma_pct_mean_3m),
            "change3m": _json_number(row.uso_plataforma_pct_delta_3m),
            "unit": "%",
        },
        "service": {
            "slaCurrent": _json_number(row.pct_sla_cumprido),
            "slaAverage3m": _json_number(row.pct_sla_cumprido_mean_3m),
            "slaChange3m": _json_number(row.pct_sla_cumprido_delta_3m),
            "openTickets": _json_number(row.chamados_abertos),
            "criticalTickets": _json_number(row.chamados_criticos),
            "reopenedTickets": _json_number(row.chamados_reabertos),
            "resolutionHours": _json_number(row.tempo_medio_resolucao_h),
            "formalComplaints": _json_number(row.reclamacoes_formais),
        },
        "relationship": {
            "latestNps": _json_number(row.latest_nps),
            "npsClassification": str(row.latest_nps_classification),
            "monthsSinceNps": _json_number(row.months_since_nps),
            "meetingsPlanned": _json_number(row.reunioes_previstas),
            "meetingsCompleted": _json_number(row.reunioes_realizadas),
        },
        "financial": {
            "paymentDelayDays": _json_number(row.dias_atraso_pagamento),
            "monthlyRevenue": _json_number(row.valor_mensal),
        },
    }


def evaluate(model: Pipeline, frame: pd.DataFrame, features: list[str]) -> dict[str, Any]:
    truth = frame["churn_90d"].to_numpy()
    probabilities = model.predict_proba(frame[features])[:, 1]
    latest = frame.assign(probability=probabilities).sort_values("month").groupby("cliente_id").tail(1)
    top_k = min(10, len(latest))
    ranked = latest.nlargest(top_k, "probability")
    positives = int(latest["churn_90d"].sum())
    precision_at_k = float(ranked["churn_90d"].mean()) if top_k else 0.0
    recall_at_k = float(ranked["churn_90d"].sum() / positives) if positives else 0.0
    base_rate = float(latest["churn_90d"].mean()) if len(latest) else 0.0
    revenue_positive = float(latest.loc[latest["churn_90d"].eq(1), "valor_mensal"].sum())
    revenue_captured = float(ranked.loc[ranked["churn_90d"].eq(1), "valor_mensal"].sum())

    calibration_frame = pd.DataFrame({"truth": truth, "probability": probabilities})
    calibration_frame["bin"] = pd.qcut(calibration_frame["probability"], q=5, duplicates="drop")
    calibration = [
        {
            "meanProbability": round(float(group["probability"].mean()), 6),
            "observedRate": round(float(group["truth"].mean()), 6),
            "count": int(len(group)),
        }
        for _, group in calibration_frame.groupby("bin", observed=True)
    ]

    return {
        "snapshots": int(len(frame)),
        "entities": int(frame["cliente_id"].nunique()),
        "positiveSnapshots": int(truth.sum()),
        "positiveEntitiesLatestSnapshot": positives,
        "prAuc": _safe_metric(average_precision_score, truth, probabilities),
        "rocAuc": _safe_metric(roc_auc_score, truth, probabilities),
        "brierScore": _safe_metric(brier_score_loss, truth, probabilities),
        "logLoss": _safe_metric(log_loss, truth, probabilities, labels=[0, 1]),
        "precisionAt10": round(precision_at_k, 6),
        "recallAt10": round(recall_at_k, 6),
        "liftAt10": round(precision_at_k / base_rate, 6) if base_rate else None,
        "revenueCapturedAt10": round(revenue_captured / revenue_positive, 6) if revenue_positive else None,
        "calibration": calibration,
    }


def _feature_label(transformed_name: str) -> str:
    raw = transformed_name.split("__", 1)[-1]
    display_values = {
        "Avancado": "Avançado",
        "Medio": "Médio",
        "Saude": "Saúde",
        "Educacao": "Educação",
        "Logistica": "Logística",
        "Servicos": "Serviços",
    }
    for key, label in sorted(FEATURE_LABELS.items(), key=lambda item: len(item[0]), reverse=True):
        if raw == key:
            return label
        if raw.startswith(f"{key}_"):
            suffix = raw.removeprefix(f"{key}_")
            if suffix == "mean_3m":
                return f"{label}, média de 3 meses"
            if suffix == "delta_3m":
                return f"{label}, variação em 3 meses"
            return f"{label}: {display_values.get(suffix, suffix)}"
    if raw.startswith("missingindicator_"):
        return f"Ausência de {raw.removeprefix('missingindicator_').replace('_', ' ')}"
    return raw.replace("_", " ")


def local_factors(model: Pipeline, frame: pd.DataFrame, limit: int = 6) -> list[list[dict[str, Any]]]:
    transformed = model.named_steps["prepare"].transform(frame)
    transformed_array = transformed.toarray() if hasattr(transformed, "toarray") else np.asarray(transformed)
    coefficients = model.named_steps["model"].coef_[0]
    names = model.named_steps["prepare"].get_feature_names_out()
    contributions = transformed_array * coefficients
    results: list[list[dict[str, Any]]] = []

    for row in contributions:
        indices = np.argsort(np.abs(row))[::-1][:limit]
        results.append(
            [
                {
                    "feature": str(names[index]),
                    "label": _feature_label(str(names[index])),
                    "direction": "increases_risk" if row[index] >= 0 else "reduces_risk",
                    "contribution": round(float(row[index]), 6),
                }
                for index in indices
            ]
        )
    return results


def train(path: Path, mapping: dict[str, Any] | None = None) -> dict[str, Any]:
    prepared = prepare_data(path, mapping=mapping)
    features = prepared.numeric_features + prepared.categorical_features
    supervised = prepared.supervised
    train_frame = supervised[supervised["month"].le(pd.Period("2025-09", freq="M"))]
    validation_frame = supervised[supervised["month"].between(pd.Period("2025-10", freq="M"), pd.Period("2025-12", freq="M"))]
    test_frame = supervised[supervised["month"].between(pd.Period("2026-01", freq="M"), pd.Period("2026-03", freq="M"))]

    candidates: list[tuple[float, float]] = []
    for c_value in (0.05, 0.1, 0.5, 1.0):
        candidate = make_pipeline(prepared.numeric_features, prepared.categorical_features, c_value)
        candidate.fit(train_frame[features], train_frame["churn_90d"])
        probabilities = candidate.predict_proba(validation_frame[features])[:, 1]
        score = average_precision_score(validation_frame["churn_90d"], probabilities)
        candidates.append((float(score), c_value))
    _, selected_c = max(candidates, key=lambda item: item[0])

    evaluation_model = make_pipeline(prepared.numeric_features, prepared.categorical_features, selected_c)
    train_and_validation = pd.concat([train_frame, validation_frame], ignore_index=True)
    evaluation_model.fit(train_and_validation[features], train_and_validation["churn_90d"])
    test_metrics = evaluate(evaluation_model, test_frame, features)

    final_model = make_pipeline(prepared.numeric_features, prepared.categorical_features, selected_c)
    final_model.fit(supervised[features], supervised["churn_90d"])
    probabilities = final_model.predict_proba(prepared.current[features])[:, 1]
    factors = local_factors(final_model, prepared.current[features])

    predictions = []
    for row, probability, row_factors in zip(
        prepared.current.itertuples(index=False), probabilities, factors, strict=True
    ):
        predictions.append(
            {
                "subjectId": row.cliente_id,
                "segment": row.segmento,
                "plan": row.plano,
                "monthlyRevenue": int(row.valor_mensal),
                "probability": round(float(probability), 6),
                "probabilityBand": probability_band(float(probability)),
                "expectedMonthlyRevenueAtRisk": round(float(probability * row.valor_mensal), 2),
                "dataCoverage": round(
                    float(1 - prepared.current.loc[prepared.current["cliente_id"].eq(row.cliente_id), features].isna().mean(axis=1).iloc[0]),
                    6,
                ),
                "topFactors": row_factors,
                "evidence": row_evidence(row),
            }
        )
    predictions.sort(key=lambda item: item["expectedMonthlyRevenueAtRisk"], reverse=True)

    total_revenue = sum(item["monthlyRevenue"] for item in predictions)
    expected_revenue_at_risk = sum(item["expectedMonthlyRevenueAtRisk"] for item in predictions)
    distribution = {
        band: sum(item["probabilityBand"] == band for item in predictions)
        for band in ("LOW", "ATTENTION", "HIGH", "CRITICAL")
    }

    feature_names = final_model.named_steps["prepare"].get_feature_names_out()
    coefficients = final_model.named_steps["model"].coef_[0]
    importance_indices = np.argsort(np.abs(coefficients))[::-1][:12]
    global_factors = [
        {
            "feature": str(feature_names[index]),
            "label": _feature_label(str(feature_names[index])),
            "direction": "increases_risk" if coefficients[index] >= 0 else "reduces_risk",
            "coefficient": round(float(coefficients[index]), 6),
        }
        for index in importance_indices
    ]

    source_hash = hashlib.sha256(path.read_bytes()).hexdigest()
    cancelled_count = int((prepared.snapshots[["cliente_id", "situacao"]].drop_duplicates()["situacao"] == "Cancelado").sum())
    cancelled_snapshots = (
        prepared.snapshots[
            prepared.snapshots["cancel_month"].notna()
            & prepared.snapshots["month"].lt(prepared.snapshots["cancel_month"])
        ]
        .sort_values(["cliente_id", "month"])
        .groupby("cliente_id", as_index=False)
        .tail(1)
    )
    historical_churn = [
        {
            "subjectId": row.cliente_id,
            "segment": row.segmento,
            "plan": row.plano,
            "monthlyRevenue": int(row.valor_mensal),
            "cancelledMonth": str(row.cancel_month),
            "lastObservedMonth": str(row.month),
            "evidenceBeforeCancellation": row_evidence(row),
        }
        for row in cancelled_snapshots.itertuples(index=False)
    ]
    return {
        "schemaVersion": "1.0",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": {
            "fileName": path.name,
            "sha256": source_hash,
            "observedFrom": str(prepared.snapshots["month"].min()),
            "observedUntil": str(prepared.observed_until),
            "entities": int(prepared.snapshots["cliente_id"].nunique()),
            "cancelledEntities": cancelled_count,
            "activeEntities": int(len(prepared.current)),
        },
        "readiness": {
            "stage": "active",
            "reason": "Análise calculada com histórico e desfecho disponíveis.",
            "isProductionReady": False,
        },
        "model": {
            "name": "Churn 90 dias",
            "version": "churn-90d-v1",
            "algorithm": "LogisticRegression",
            "selectedC": selected_c,
            "horizonDays": 90,
            "trainedUntil": str(prepared.supervised["month"].max()),
            "independentChurnEvents": cancelled_count,
            "trainingSnapshots": int(len(supervised)),
            "test": test_metrics,
            "globalFactors": global_factors,
        },
        "predictionRun": {
            "asOfDate": f"{prepared.observed_until}-30",
            "horizonDays": 90,
            "status": "completed",
        },
        "summary": {
            "analyzedEntities": len(predictions),
            "totalMonthlyRevenue": round(total_revenue, 2),
            "expectedMonthlyRevenueAtRisk": round(expected_revenue_at_risk, 2),
            "portfolioProbabilityWeighted": round(expected_revenue_at_risk / total_revenue, 6) if total_revenue else 0,
            "averageProbability": round(float(np.mean(probabilities)), 6),
            "highOrCriticalEntities": distribution["HIGH"] + distribution["CRITICAL"],
            "distribution": distribution,
        },
        "predictions": predictions,
        "historicalChurn": historical_churn,
        "limitations": [
            "O conjunto possui somente 22 cancelamentos independentes.",
            "A base permite validação por cliente, não por produto contratado.",
            "Probabilidades cobrem somente o horizonte de 90 dias.",
            "Cenários de recuperação continuam sendo simulações, não efeito causal estimado.",
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Treina o modelo de churn de 90 dias do INOVAAPPS.")
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--mapping", type=Path)
    parser.add_argument("--inspect", action="store_true")
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()

    mapping = json.loads(args.mapping.read_text(encoding="utf-8")) if args.mapping else None
    if args.inspect:
        serialized = json.dumps(inspect_source(args.input), ensure_ascii=False, indent=2)
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(serialized + "\n", encoding="utf-8", newline="\n")
        print(serialized)
        return

    compatibility = validate_workbook(args.input, mapping)
    if args.validate_only or not compatibility["compatible"]:
        print(json.dumps({"readiness": compatibility}, ensure_ascii=False))
        if not compatibility["compatible"]:
            raise SystemExit(2)
        return

    result = train(args.input, mapping)
    serialized = json.dumps(result, ensure_ascii=False, indent=2)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(serialized + "\n", encoding="utf-8", newline="\n")
    print(serialized)


if __name__ == "__main__":
    main()
