import { useEffect, useState } from "react";
import type { ChurnAnalysis, SpreadsheetInspection, SpreadsheetMapping } from "./types";

const STORAGE_PREFIX = "inovaapps.churn.analysis.v1";
const ANALYSIS_EVENT = "inovaapps:churn-analysis";

function storageKey(accountId: string) {
  return `${STORAGE_PREFIX}:${accountId}`;
}

export function saveChurnAnalysis(accountId: string, analysis: ChurnAnalysis) {
  localStorage.setItem(storageKey(accountId), JSON.stringify(analysis));
  window.dispatchEvent(new CustomEvent(ANALYSIS_EVENT, { detail: { accountId } }));
}

function storedAnalysis(accountId: string): ChurnAnalysis | null {
  try {
    const raw = localStorage.getItem(storageKey(accountId));
    return raw ? JSON.parse(raw) as ChurnAnalysis : null;
  } catch {
    return null;
  }
}

export async function inspectSpreadsheet(file: File): Promise<SpreadsheetInspection> {
  const response = await fetch("/api/churn/inspect", {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream", "X-File-Name": encodeURIComponent(file.name) },
    body: file,
  });
  const payload = await response.json() as SpreadsheetInspection | { error: string };
  if (!response.ok) throw new Error("error" in payload ? payload.error : "Não foi possível ler a estrutura da planilha.");
  return payload as SpreadsheetInspection;
}

export async function analyzeSpreadsheet(file: File, mapping?: SpreadsheetMapping): Promise<ChurnAnalysis> {
  const response = await fetch("/api/churn/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "X-File-Name": encodeURIComponent(file.name),
      ...(mapping ? { "X-Column-Mapping": encodeURIComponent(JSON.stringify(mapping)) } : {}),
    },
    body: file,
  });
  const payload = await response.json() as ChurnAnalysis | { error: string };
  if (!response.ok) throw new Error("error" in payload ? payload.error : "Não foi possível analisar a planilha.");
  return payload as ChurnAnalysis;
}

async function bundledAnalysis() {
  const response = await fetch("/data/churn-model.json");
  if (!response.ok) throw new Error("O resultado do modelo não está disponível.");
  return response.json() as Promise<ChurnAnalysis>;
}

export function useChurnAnalysis(accountId?: string) {
  const [analysis, setAnalysis] = useState<ChurnAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const stored = accountId ? storedAnalysis(accountId) : null;
        const result = stored ?? (accountId?.startsWith("demo-") ? await bundledAnalysis() : null);
        if (active) {
          setAnalysis(result);
          setError("");
        }
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Falha ao carregar a análise.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    const refresh = (event: Event) => {
      if ((event as CustomEvent<{ accountId?: string }>).detail?.accountId === accountId) void load();
    };
    window.addEventListener(ANALYSIS_EVENT, refresh);
    return () => {
      active = false;
      window.removeEventListener(ANALYSIS_EVENT, refresh);
    };
  }, [accountId]);

  return { analysis, loading, error };
}
