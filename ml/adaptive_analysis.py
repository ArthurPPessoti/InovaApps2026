"""Motor genérico e determinístico da análise adaptativa INOVAAPPS.

O Gemini interpreta intenção; este módulo é a autoridade para tipos, validação,
agregações, score, cobertura e elegibilidade de probabilidade.
"""
from __future__ import annotations

import argparse
import json
import math
import re
import sys
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, roc_auc_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler


IMPORTANCE = {"VERY_LOW": 1.0, "LOW": 2.0, "MEDIUM": 4.0, "HIGH": 7.0, "CRITICAL": 10.0}
ID_HINTS = ("id", "codigo", "código", "cliente", "customer", "conta", "matricula", "matrícula", "cpf", "cnpj")
TIME_HINTS = ("data", "date", "mes", "mês", "ano", "periodo", "período", "timestamp", "visita", "compra", "acesso")
TARGET_HINTS = ("cancel", "churn", "status", "situacao", "situação", "renov", "retorn", "inadimpl", "desfecho", "ativo")
VALUE_HINTS = ("receita", "valor", "mrr", "fatur", "ticket", "preco", "preço", "mensalidade")
OWNER_HINTS = ("responsavel", "responsável", "owner", "gerente", "vendedor", "consultor")
CONTACT_HINTS = ("email", "e-mail", "telefone", "celular", "whatsapp")
SEGMENT_HINTS = ("segment", "categoria", "grupo", "setor", "plano", "produto")
LOCATION_HINTS = ("cidade", "estado", "uf", "regiao", "região", "bairro", "cep")
RISK_HIGH_HINTS = ("atras", "reclam", "chamado", "falha", "inadimpl", "erro", "devol", "cancel")
RISK_LOW_HINTS = ("uso", "acesso", "frequencia", "frequência", "satisf", "nps", "compra", "login", "atividade", "engaj")


def clean(value: Any) -> Any:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    if isinstance(value, (pd.Timestamp, datetime)):
        return value.isoformat()
    if isinstance(value, (np.integer, np.floating)):
        return value.item()
    return value


def norm(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", "_", str(value).strip().lower()).strip("_")


def read_workbook(path: Path) -> dict[str, pd.DataFrame]:
    if path.suffix.lower() == ".csv":
        for encoding in ("utf-8-sig", "utf-8", "latin-1"):
            try:
                return {path.stem: pd.read_csv(path, encoding=encoding)}
            except UnicodeDecodeError:
                continue
        raise ValueError("Não foi possível identificar a codificação do CSV.")
    return pd.read_excel(path, sheet_name=None)


def physical_type(series: pd.Series) -> str:
    observed = series.dropna()
    if observed.empty:
        return "text"
    if pd.api.types.is_bool_dtype(observed):
        return "boolean"
    if pd.api.types.is_numeric_dtype(observed):
        unique = set(pd.to_numeric(observed, errors="coerce").dropna().unique().tolist())
        return "boolean" if unique <= {0, 1} else "number"
    if pd.api.types.is_datetime64_any_dtype(observed):
        return "date"
    if any(hint in norm(series.name) for hint in TIME_HINTS):
        converted = pd.to_datetime(observed, errors="coerce", dayfirst=True)
        if len(converted) and converted.notna().mean() >= 0.85:
            return "date"
    return "category" if observed.nunique() <= min(50, max(12, len(observed) * 0.2)) else "text"


def semantic_role(name: str, kind: str, unique_rate: float) -> tuple[str, float]:
    value = norm(name)
    if any(h in value for h in CONTACT_HINTS): return "CONTACT", .96
    if any(h in value for h in TIME_HINTS) and kind == "date": return "TIME", .94
    if any(h in value for h in OWNER_HINTS): return "OWNER", .91
    if any(h in value for h in VALUE_HINTS) and kind == "number": return "BUSINESS_VALUE", .88
    if any(h in value for h in TARGET_HINTS): return "TARGET", .78
    if unique_rate >= .2 and any(h == value or value.endswith(f"_{h}") for h in ID_HINTS): return "ENTITY_ID", .92
    if kind in ("number", "boolean"): return "METRIC", .72
    if any(h in value for h in SEGMENT_HINTS + LOCATION_HINTS): return "CONTEXT", .82
    if kind == "category": return "CONTEXT", .62
    return "IGNORE", .55


def pii(name: str, values: pd.Series) -> bool:
    named = any(h in norm(name) for h in CONTACT_HINTS + ("cpf", "cnpj", "nome", "name"))
    sample = " ".join(values.dropna().astype(str).head(20))
    patterned = bool(re.search(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b", sample))
    return named or patterned


def column_profile(name: str, series: pd.Series) -> dict[str, Any]:
    rows = max(len(series), 1)
    kind = physical_type(series)
    unique = int(series.nunique(dropna=True))
    unique_rate = unique / max(int(series.notna().sum()), 1)
    role, confidence = semantic_role(name, kind, unique_rate)
    result: dict[str, Any] = {
        "name": str(name), "physicalType": kind, "semanticRole": role,
        "semanticMeaning": str(name).replace("_", " ").strip().capitalize(),
        "missingRate": round(float(series.isna().sum() / rows), 4),
        "uniqueCount": unique, "uniqueRate": round(unique_rate, 4),
        "variability": round(min(1.0, unique / max(rows * .25, 1)), 4),
        "examples": [clean(v) for v in series.dropna().head(5).tolist()],
        "confidence": confidence, "possiblePersonalData": pii(name, series),
    }
    if kind == "number":
        numeric = pd.to_numeric(series, errors="coerce").dropna()
        if not numeric.empty:
            result["statistics"] = {"min": clean(numeric.min()), "max": clean(numeric.max()), "mean": clean(numeric.mean()), "median": clean(numeric.median())}
    return result


def relationship_candidates(frames: dict[str, pd.DataFrame], profiles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    for i, left in enumerate(profiles):
        for right in profiles[i + 1:]:
            for lc in left["columns"]:
                if lc["semanticRole"] != "ENTITY_ID": continue
                for rc in right["columns"]:
                    if rc["semanticRole"] != "ENTITY_ID": continue
                    ls = set(frames[left["name"]][lc["name"]].dropna().astype(str))
                    rs = set(frames[right["name"]][rc["name"]].dropna().astype(str))
                    overlap = len(ls & rs) / max(min(len(ls), len(rs)), 1)
                    name_match = 1.0 if norm(lc["name"]) == norm(rc["name"]) else .35
                    uniqueness = (lc["uniqueRate"] + rc["uniqueRate"]) / 2
                    confidence = .55 * overlap + .25 * uniqueness + .2 * name_match
                    if overlap >= .2:
                        candidates.append({"leftSheet": left["name"], "leftColumn": lc["name"], "rightSheet": right["name"], "rightColumn": rc["name"], "overlap": round(overlap, 3), "uniqueness": round(uniqueness, 3), "confidence": round(confidence, 3)})
    return sorted(candidates, key=lambda item: item["confidence"], reverse=True)[:20]


def objective_suggestions(profiles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    suggestions = []
    targets = [(s["name"], c) for s in profiles for c in s["columns"] if c["semanticRole"] == "TARGET"]
    for sheet, column in targets[:3]:
        name = norm(column["name"])
        if "inadimpl" in name: behavior, label = "tornar-se inadimplente", "Antecipar inadimplência"
        elif "retorn" in name: behavior, label = "não retornar", "Antecipar quem não retorna"
        elif "renov" in name: behavior, label = "não renovar", "Antecipar não renovação"
        else: behavior, label = "encerrar o relacionamento", "Antecipar encerramento"
        suggestions.append({"id": f"{norm(sheet)}.{norm(column['name'])}", "label": label, "behavior": behavior, "eventPolarity": "negative", "targetColumn": column["name"], "horizonDays": 90, "rationale": f"A coluna {column['name']} parece registrar um desfecho histórico."})
    if not suggestions:
        suggestions.append({"id": "generic-risk", "label": "Identificar entidades em risco", "behavior": "deixar de se relacionar", "eventPolarity": "negative", "horizonDays": 90, "rationale": "Não há desfecho histórico confiável; o sistema usará um score transparente."})
    return suggestions


def profile_workbook(path: Path, file_name: str | None = None) -> tuple[dict[str, Any], dict[str, pd.DataFrame]]:
    frames = read_workbook(path)
    sheets = []
    dates: list[pd.Timestamp] = []
    for sheet_name, frame in frames.items():
        frame.columns = [str(column).strip() for column in frame.columns]
        columns = [column_profile(column, frame[column]) for column in frame.columns]
        keys = [c["name"] for c in columns if c["semanticRole"] == "ENTITY_ID"]
        for column in columns:
            if column["physicalType"] == "date":
                dates.extend(pd.to_datetime(frame[column["name"]], errors="coerce", dayfirst=True).dropna().tolist())
        sheets.append({"name": str(sheet_name), "rows": int(len(frame)), "columns": columns, "candidateKeys": keys})
    all_columns = [c for s in sheets for c in s["columns"]]
    roles = {c["semanticRole"] for c in all_columns}
    capabilities = {
        "time": "TIME" in roles, "businessValue": "BUSINESS_VALUE" in roles,
        "segment": any(any(h in norm(c["name"]) for h in SEGMENT_HINTS) for c in all_columns),
        "target": "TARGET" in roles, "history": "TIME" in roles and sum(s["rows"] for s in sheets) > 1,
        "owner": "OWNER" in roles, "contact": "CONTACT" in roles,
        "location": any(any(h in norm(c["name"]) for h in LOCATION_HINTS) for c in all_columns),
        "telemetry": False,
    }
    quality = 1 - np.mean([c["missingRate"] for c in all_columns]) if all_columns else 0
    warnings = []
    if not any(s["candidateKeys"] for s in sheets): warnings.append("Nenhuma chave de entidade foi identificada com alta confiança.")
    if not capabilities["target"]: warnings.append("Sem desfecho histórico confirmado: a execução começará por Score de Risco.")
    relationships = relationship_candidates(frames, sheets)
    profile = {
        "fileName": file_name or path.name, "format": "csv" if path.suffix.lower() == ".csv" else "xlsx",
        "sheets": sheets, "totalRows": int(sum(len(f) for f in frames.values())), "quality": round(float(quality), 4),
        "relationships": relationships, "capabilities": capabilities,
        "objectiveSuggestions": objective_suggestions(sheets), "warnings": warnings,
    }
    if dates:
        profile["observedFrom"] = min(dates).date().isoformat()
        profile["observedUntil"] = max(dates).date().isoformat()
    return profile, frames


def default_config(profile: dict[str, Any]) -> dict[str, Any]:
    entity_sheet = next((s for s in profile["sheets"] if s["candidateKeys"]), profile["sheets"][0])
    entity_column = entity_sheet["candidateKeys"][0] if entity_sheet["candidateKeys"] else entity_sheet["columns"][0]["name"]
    suggestion = profile["objectiveSuggestions"][0]
    target_hit = next(((s["name"], c["name"]) for s in profile["sheets"] for c in s["columns"] if c["semanticRole"] == "TARGET"), (None, None))
    metrics = []
    for sheet in profile["sheets"]:
        for column in sheet["columns"]:
            included = column["semanticRole"] in ("METRIC", "BUSINESS_VALUE") and column["variability"] > 0
            name = norm(column["name"])
            risk_type = "HIGH_IS_RISK" if any(h in name for h in RISK_HIGH_HINTS) else "LOW_IS_RISK" if any(h in name for h in RISK_LOW_HINTS) else "INFORMATIONAL"
            if included and risk_type == "INFORMATIONAL": risk_type = "HIGH_IS_RISK"
            metrics.append({
                "id": f"{sheet['name']}::{column['name']}", "sheet": sheet["name"], "column": column["name"],
                "meaning": column["semanticMeaning"], "role": column["semanticRole"], "included": included,
                "riskType": risk_type, "aggregation": "MEAN" if column["physicalType"] == "number" else "LATEST",
                "importance": "MEDIUM", "scale": "AUTO", "missingStrategy": "EXCLUDE",
                "confidence": column["confidence"], "rationale": "Sugestão determinística baseada no tipo, nome e variabilidade da coluna.",
            })
    return {
        "schemaVersion": "2.0", "id": str(uuid.uuid4()), "createdAt": datetime.now(timezone.utc).isoformat(),
        "objective": {"entitySheet": entity_sheet["name"], "entityColumn": entity_column, "entityLabel": "cliente", "entityLabelPlural": "clientes", "behavior": suggestion["behavior"], "eventPolarity": "negative", "targetSheet": target_hit[0], "targetColumn": target_hit[1], "positiveValues": ["cancelado", "inativo", "sim", "1", "true"], "horizonDays": suggestion["horizonDays"], "confirmed": False},
        "relationships": profile["relationships"], "metrics": metrics, "methodPreference": "AUTO", "priorityMode": "estimate",
        "importanceMode": "qualitative", "minimumCoverage": .5, "sampleConsent": False,
    }


def validate_config(profile: dict[str, Any], config: dict[str, Any]) -> dict[str, Any]:
    errors, warnings = [], []
    objective = config.get("objective", {})
    sheet_map = {s["name"]: {c["name"]: c for c in s["columns"]} for s in profile["sheets"]}
    if not objective.get("confirmed"): errors.append("Confirme o objetivo e o horizonte antes de executar.")
    if objective.get("entitySheet") not in sheet_map or objective.get("entityColumn") not in sheet_map.get(objective.get("entitySheet"), {}): errors.append("A coluna de entidade não existe na fonte.")
    included = [m for m in config.get("metrics", []) if m.get("included") and m.get("riskType") != "INFORMATIONAL"]
    if not included: errors.append("Inclua ao menos uma métrica de risco.")
    for metric in included:
        if metric.get("sheet") not in sheet_map or metric.get("column") not in sheet_map.get(metric.get("sheet"), {}): errors.append(f"Métrica ausente: {metric.get('id')}.")
        weight = metric.get("numericWeight") if config.get("importanceMode") == "numeric" else IMPORTANCE.get(metric.get("importance"), 0)
        if weight is None or float(weight) <= 0: errors.append(f"O peso de {metric.get('meaning')} deve ser positivo.")
        if sheet_map.get(metric.get("sheet"), {}).get(metric.get("column"), {}).get("variability") == 0: warnings.append(f"{metric.get('meaning')} não possui variabilidade e não separa risco.")
    if objective.get("targetColumn") and objective.get("targetSheet") not in sheet_map: warnings.append("A aba do desfecho não foi localizada; o motor usará Score de Risco.")
    return {"valid": not errors, "errors": errors, "warnings": warnings}


def aggregate(series: pd.Series, method: str) -> Any:
    observed = series.dropna()
    if observed.empty: return np.nan
    numeric = pd.to_numeric(observed, errors="coerce")
    if method in ("MEAN", "RECENT_MEAN") and numeric.notna().any(): return numeric.mean()
    if method == "SUM" and numeric.notna().any(): return numeric.sum()
    if method == "MIN" and numeric.notna().any(): return numeric.min()
    if method == "MAX" and numeric.notna().any(): return numeric.max()
    if method == "TREND" and numeric.notna().sum() >= 2:
        values = numeric.dropna().to_numpy()
        return float(np.polyfit(np.arange(len(values)), values, 1)[0])
    return observed.iloc[-1] if method == "LATEST" else observed.iloc[0]


def entity_table(frames: dict[str, pd.DataFrame], config: dict[str, Any]) -> pd.DataFrame:
    objective = config["objective"]
    base_sheet, entity_col = objective["entitySheet"], objective["entityColumn"]
    base = pd.DataFrame({"__entity": frames[base_sheet][entity_col].dropna().astype(str).unique()})
    for metric in config["metrics"]:
        if not metric.get("included"): continue
        frame = frames[metric["sheet"]]
        key = entity_col if entity_col in frame.columns else None
        if key is None:
            rel = next((r for r in config.get("relationships", []) if r["leftSheet"] == metric["sheet"] and r["rightSheet"] == base_sheet), None)
            key = rel["leftColumn"] if rel else None
        if key is None:
            rel = next((r for r in config.get("relationships", []) if r["rightSheet"] == metric["sheet"] and r["leftSheet"] == base_sheet), None)
            key = rel["rightColumn"] if rel else None
        if key is None or metric["column"] not in frame.columns: continue
        grouped = frame.assign(__entity=frame[key].astype(str)).groupby("__entity", dropna=False)[metric["column"]].apply(lambda s: aggregate(s, metric["aggregation"])).rename(metric["id"])
        base = base.merge(grouped, how="left", left_on="__entity", right_index=True)
    context_columns = [c for c in frames[base_sheet].columns if semantic_role(c, physical_type(frames[base_sheet][c]), frames[base_sheet][c].nunique() / max(frames[base_sheet][c].notna().sum(), 1))[0] in ("CONTEXT", "OWNER", "BUSINESS_VALUE")]
    if context_columns:
        context = frames[base_sheet].assign(__entity=frames[base_sheet][entity_col].astype(str)).groupby("__entity")[context_columns].first()
        base = base.merge(context, how="left", left_on="__entity", right_index=True)
    target_sheet, target_column = objective.get("targetSheet"), objective.get("targetColumn")
    if target_sheet in frames and target_column in frames[target_sheet].columns:
        target_frame = frames[target_sheet]
        target_key = entity_col if entity_col in target_frame.columns else next((r["leftColumn"] for r in config.get("relationships", []) if r["leftSheet"] == target_sheet and r["rightSheet"] == base_sheet), None)
        if target_key is None:
            target_key = next((r["rightColumn"] for r in config.get("relationships", []) if r["rightSheet"] == target_sheet and r["leftSheet"] == base_sheet), None)
        if target_key:
            targets = target_frame.assign(__entity=target_frame[target_key].astype(str)).groupby("__entity")[target_column].last().rename("__target")
            base = base.merge(targets, how="left", left_on="__entity", right_index=True)
    time_candidates = [(sheet, column) for sheet, frame in frames.items() for column in frame.columns if physical_type(frame[column]) == "date"]
    for time_sheet, time_column in time_candidates:
        frame = frames[time_sheet]
        time_key = entity_col if entity_col in frame.columns else next((r["leftColumn"] for r in config.get("relationships", []) if r["leftSheet"] == time_sheet and r["rightSheet"] == base_sheet), None)
        if time_key is None:
            time_key = next((r["rightColumn"] for r in config.get("relationships", []) if r["rightSheet"] == time_sheet and r["leftSheet"] == base_sheet), None)
        if time_key:
            times = frame.assign(__entity=frame[time_key].astype(str), __parsed_time=pd.to_datetime(frame[time_column], errors="coerce", dayfirst=True)).groupby("__entity")["__parsed_time"].max().rename("__time")
            base = base.merge(times, how="left", left_on="__entity", right_index=True)
            break
    return base


def risk_values(series: pd.Series, risk_type: str) -> tuple[pd.Series, str]:
    numeric = pd.to_numeric(series, errors="coerce")
    if numeric.notna().sum() >= max(2, len(series) * .3):
        low, high = numeric.quantile(.05), numeric.quantile(.95)
        scaled = ((numeric - low) / max(float(high - low), 1e-9)).clip(0, 1)
        if risk_type == "LOW_IS_RISK": scaled = 1 - scaled
        return scaled, f"faixa observada {clean(low)}–{clean(high)}"
    categories = series.astype(str).str.lower()
    risky = categories.str.contains("cancel|inativ|atras|ruim|detrator|sim|true|1", regex=True)
    return risky.astype(float).where(series.notna()), "comparação categórica da própria base"


def band(estimate: float, coverage: float, minimum: float) -> str:
    if coverage < minimum: return "INSUFFICIENT"
    if estimate >= .75: return "CRITICAL"
    if estimate >= .55: return "HIGH"
    if estimate >= .3: return "ATTENTION"
    return "LOW"


def module_catalog(profile: dict[str, Any], method: str, low_coverage: bool) -> list[dict[str, str]]:
    caps = profile["capabilities"]
    modules = [
        {"id": "entities", "title": "Entidades analisadas", "kind": "kpi", "reason": "Disponível para qualquer fonte."},
        {"id": "quality", "title": "Qualidade e cobertura", "kind": "quality", "reason": "Disponível para qualquer fonte."},
        {"id": "distribution", "title": "Distribuição de risco", "kind": "distribution", "reason": "Resultado da execução ativa."},
        {"id": "ranking", "title": "Prioridades", "kind": "ranking", "reason": "Resultado da execução ativa."},
        {"id": "factors", "title": "Fatores principais", "kind": "factors", "reason": "Contribuições explicáveis."},
    ]
    conditional = [
        (caps["businessValue"], "financial", "Impacto financeiro", "financial", "A fonte possui valor financeiro."),
        (caps["time"], "timeline", "Evolução e tendências", "timeline", "A fonte possui dimensão temporal."),
        (caps["segment"], "segments", "Comparação por grupo", "segments", "A fonte possui segmentos."),
        (method != "weighted_score", "calibration", "Qualidade da probabilidade", "calibration", "O método probabilístico foi aprovado."),
        (low_coverage, "missing", "Dados faltantes", "missing", "Há entidades com baixa cobertura."),
    ]
    modules.extend({"id": i, "title": t, "kind": k, "reason": r} for enabled, i, t, k, r in conditional if enabled)
    return modules


def run_score(profile: dict[str, Any], frames: dict[str, pd.DataFrame], config: dict[str, Any]) -> dict[str, Any]:
    table = entity_table(frames, config)
    metrics = [m for m in config["metrics"] if m.get("included") and m.get("riskType") != "INFORMATIONAL" and m["id"] in table]
    risk_by_metric, reference_by_metric = {}, {}
    weights = {}
    for metric in metrics:
        risk_by_metric[metric["id"]], reference_by_metric[metric["id"]] = risk_values(table[metric["id"]], metric["riskType"])
        weights[metric["id"]] = float(metric.get("numericWeight") or IMPORTANCE[metric["importance"]])
    entities = []
    for index, row in table.iterrows():
        present = [m for m in metrics if pd.notna(risk_by_metric[m["id"]].iloc[index])]
        total_weight = sum(weights[m["id"]] for m in metrics) or 1
        observed_weight = sum(weights[m["id"]] for m in present)
        coverage = observed_weight / total_weight
        estimate = sum(float(risk_by_metric[m["id"]].iloc[index]) * weights[m["id"]] for m in present) / max(observed_weight, 1e-9)
        factors = []
        for metric in present:
            raw_risk = float(risk_by_metric[metric["id"]].iloc[index])
            contribution = raw_risk * weights[metric["id"]] / max(observed_weight, 1e-9)
            factors.append({"metricId": metric["id"], "label": metric["meaning"], "observedValue": clean(row.get(metric["id"])), "reference": reference_by_metric[metric["id"]], "contribution": round(contribution, 4), "direction": "increases_risk" if raw_risk >= .5 else "reduces_risk", "origin": metric["sheet"], "observed": True})
        factors.sort(key=lambda item: item["contribution"], reverse=True)
        context = {str(k): clean(v) for k, v in row.items() if k not in {"__entity", *[m["id"] for m in metrics]} and pd.notna(v)}
        business_value = next((float(v) for k, v in context.items() if any(h in norm(k) for h in VALUE_HINTS) and isinstance(v, (int, float))), None)
        estimate_kind = "score"
        entities.append({"id": str(row["__entity"]), "displayName": str(row["__entity"]), "estimate": round(float(estimate), 4), "estimateKind": estimate_kind, "band": band(estimate, coverage, config["minimumCoverage"]), "coverage": round(coverage, 4), "businessValue": business_value, "expectedImpact": round(business_value * estimate, 2) if business_value is not None else None, "segment": next((str(v) for k, v in context.items() if any(h in norm(k) for h in SEGMENT_HINTS)), None), "owner": next((str(v) for k, v in context.items() if any(h in norm(k) for h in OWNER_HINTS)), None), "factors": factors[:8], "missingData": [m["meaning"] for m in metrics if m not in present], "context": context, "recommendations": recommendations(factors)})
    entities.sort(key=lambda item: (item.get("expectedImpact") or item["estimate"], item["estimate"]), reverse=True)
    return build_result(profile, config, entities, "weighted_score", "Score de Risco", "Não há desfecho histórico validado em volume e qualidade suficientes para exibir probabilidade.")


def binary_target(series: pd.Series, positive_values: list[str]) -> pd.Series:
    positives = {norm(value) for value in positive_values}
    normalized = series.map(norm)
    return normalized.map(lambda value: 1 if value in positives or any(token in value for token in ("cancel", "inativ", "inadimpl", "nao_renov", "não_renov")) else 0)


def try_probability(profile: dict[str, Any], frames: dict[str, pd.DataFrame], config: dict[str, Any]) -> dict[str, Any] | None:
    def fallback(reason: str) -> None:
        profile["warnings"].append(f"Probabilidade não aprovada: {reason}")

    if config.get("methodPreference") == "SCORE":
        fallback("o usuário escolheu executar o Score de Risco.")
        return None
    if not profile["capabilities"]["time"]:
        fallback("não há dimensão temporal para um teste independente.")
        return None
    table = entity_table(frames, config)
    metrics = [m for m in config["metrics"] if m.get("included") and m.get("riskType") != "INFORMATIONAL" and m["id"] in table]
    if "__target" not in table:
        fallback("o desfecho histórico não pôde ser consolidado por entidade.")
        return None
    if "__time" not in table:
        fallback("não foi possível posicionar as entidades no tempo.")
        return None
    if len(table) < 50:
        fallback(f"a base possui {len(table)} entidades; são necessárias ao menos 50.")
        return None
    if not metrics:
        fallback("nenhuma métrica preditora foi confirmada.")
        return None
    labeled = table[table["__target"].notna() & table["__time"].notna()].copy().sort_values("__time")
    y = binary_target(labeled["__target"], config["objective"].get("positiveValues") or [])
    if y.sum() < 20 or (len(y) - y.sum()) < 20:
        fallback(f"foram encontrados {int(y.sum())} eventos positivos e {int(len(y) - y.sum())} negativos; o mínimo é 20 de cada.")
        return None
    risk_columns = []
    references = {}
    for metric in metrics:
        values, reference = risk_values(table[metric["id"]], metric["riskType"])
        risk_columns.append(values.rename(metric["id"]))
        references[metric["id"]] = reference
    risk_frame = pd.concat(risk_columns, axis=1)
    x = risk_frame.loc[labeled.index]
    train_end, validation_end = int(len(labeled) * .6), int(len(labeled) * .8)
    if train_end < 30 or validation_end <= train_end:
        fallback("o recorte temporal não deixou exemplos suficientes para treino e validação.")
        return None
    x_train, y_train = x.iloc[:train_end], y.iloc[:train_end]
    x_validation, y_validation = x.iloc[train_end:validation_end], y.iloc[train_end:validation_end]
    x_test, y_test = x.iloc[validation_end:], y.iloc[validation_end:]
    if any(part.nunique() < 2 or min(part.value_counts()) < 5 for part in (y_validation, y_test)):
        fallback("a validação ou o teste temporal não possui cinco exemplos de cada classe.")
        return None
    candidates = []
    for regularization in (.05, .2, 1.0, 5.0):
        model = make_pipeline(SimpleImputer(strategy="median", add_indicator=True), StandardScaler(), LogisticRegression(C=regularization, max_iter=2000, class_weight="balanced"))
        model.fit(x_train, y_train)
        validation_probability = model.predict_proba(x_validation)[:, 1]
        candidates.append((brier_score_loss(y_validation, validation_probability), model))
    _, model = min(candidates, key=lambda item: item[0])
    validation_probability = np.clip(model.predict_proba(x_validation)[:, 1], 1e-6, 1 - 1e-6)
    calibrator = LogisticRegression(C=1000, max_iter=1000).fit(np.log(validation_probability / (1 - validation_probability)).reshape(-1, 1), y_validation)
    test_raw = np.clip(model.predict_proba(x_test)[:, 1], 1e-6, 1 - 1e-6)
    test_probability = calibrator.predict_proba(np.log(test_raw / (1 - test_raw)).reshape(-1, 1))[:, 1]
    brier = float(brier_score_loss(y_test, test_probability))
    baseline = float(brier_score_loss(y_test, np.full(len(y_test), y_train.mean())))
    auc = float(roc_auc_score(y_test, test_probability))
    if brier >= baseline or auc <= .55:
        fallback(f"o teste obteve Brier {brier:.3f} contra baseline {baseline:.3f} e AUC {auc:.3f}.")
        return None
    all_raw = np.clip(model.predict_proba(risk_frame)[:, 1], 1e-6, 1 - 1e-6)
    probabilities = calibrator.predict_proba(np.log(all_raw / (1 - all_raw)).reshape(-1, 1))[:, 1]
    score_result = run_score(profile, frames, {**config, "methodPreference": "SCORE"})
    by_id = {entity["id"]: entity for entity in score_result["entities"]}
    for row_index, row in table.iterrows():
        entity = by_id.get(str(row["__entity"]))
        if entity:
            entity["estimate"] = round(float(probabilities[row_index]), 4)
            entity["estimateKind"] = "probability"
            entity["band"] = band(entity["estimate"], entity["coverage"], config["minimumCoverage"])
            entity["expectedImpact"] = round(entity["businessValue"] * entity["estimate"], 2) if entity.get("businessValue") is not None else None
    entities = sorted(by_id.values(), key=lambda item: (item.get("expectedImpact") or item["estimate"], item["estimate"]), reverse=True)
    result = build_result(profile, config, entities, "calibrated_probability", "Probabilidade calibrada", "A base possui desfecho, volume, separação temporal e desempenho superior ao baseline.")
    result["method"]["quality"] = {"brierScore": round(brier, 4), "baselineBrier": round(baseline, 4), "rocAuc": round(auc, 4), "calibrated": True}
    return result


def recommendations(factors: list[dict[str, Any]]) -> list[str]:
    labels = " ".join(norm(f["label"]) for f in factors[:3])
    if any(h in labels for h in ("chamado", "sla", "reclam", "satisf")): return ["Iniciar uma conversa empática de recuperação e escuta.", "Revisar pendências de atendimento antes do contato."]
    if any(h in labels for h in ("uso", "acesso", "frequ", "retorn")): return ["Fazer uma abordagem consultiva sobre valor percebido.", "Perguntar o que impediria a continuidade, sem mencionar monitoramento."]
    if any(h in labels for h in ("atras", "inadimpl", "pag")): return ["Usar tom neutro e financeiro.", "Confirmar contexto e opções antes de cobrar uma ação."]
    return ["Validar o contexto com o responsável pela conta.", "Usar os fatos observados como perguntas, não como conclusões."]


def build_result(profile: dict[str, Any], config: dict[str, Any], entities: list[dict[str, Any]], method: str, label: str, reason: str) -> dict[str, Any]:
    estimates = [e["estimate"] for e in entities]
    values = [e.get("businessValue") for e in entities if e.get("businessValue") is not None]
    impacts = [e.get("expectedImpact") for e in entities if e.get("expectedImpact") is not None]
    distribution = {key: sum(e["band"] == key for e in entities) for key in ("LOW", "ATTENTION", "HIGH", "CRITICAL", "INSUFFICIENT")}
    low_coverage = distribution["INSUFFICIENT"] > 0
    limitations = list(profile["warnings"])
    if method == "weighted_score": limitations.append("Score relativo à fonte e aos pesos confirmados; não representa probabilidade estatística.")
    if not profile["capabilities"]["businessValue"]: limitations.append("A fonte não contém valor financeiro; impacto monetário não é exibido.")
    return {"schemaVersion": "2.0", "runId": str(uuid.uuid4()), "generatedAt": datetime.now(timezone.utc).isoformat(), "source": {"fileName": profile["fileName"], "rows": profile["totalRows"]}, "config": config, "profile": profile, "method": {"selected": method, "label": label, "reason": reason}, "summary": {"analyzedEntities": len(entities), "attentionEntities": sum(e["band"] in ("ATTENTION", "HIGH", "CRITICAL") for e in entities), "highEntities": sum(e["band"] in ("HIGH", "CRITICAL") for e in entities), "averageEstimate": round(float(np.mean(estimates)) if estimates else 0, 4), "averageCoverage": round(float(np.mean([e["coverage"] for e in entities])) if entities else 0, 4), "totalBusinessValue": round(sum(values), 2) if values else None, "expectedImpact": round(sum(impacts), 2) if impacts else None, "distribution": distribution}, "entities": entities, "modules": module_catalog(profile, method, low_coverage), "limitations": limitations}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("profile", "validate", "run"))
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--file-name")
    parser.add_argument("--config")
    args = parser.parse_args()
    profile, frames = profile_workbook(Path(args.input), args.file_name)
    if args.command == "profile":
        payload = {"profile": profile, "suggestedConfig": default_config(profile)}
    else:
        if not args.config: raise ValueError("Configuração obrigatória.")
        config = json.loads(Path(args.config).read_text(encoding="utf-8"))
        validation = validate_config(profile, config)
        if args.command == "validate": payload = validation
        elif not validation["valid"]: raise ValueError("; ".join(validation["errors"]))
        else: payload = try_probability(profile, frames, config) or run_score(profile, frames, config)
    Path(args.output).write_text(json.dumps(payload, ensure_ascii=False, allow_nan=False), encoding="utf-8")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        raise
