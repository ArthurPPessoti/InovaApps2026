import type { AdaptiveAnalysisResult, AnalysisConfig, AssistantMessage, AssistantTurn, SourceProfileResponse, WorkbookProfile } from "./types";

async function jsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json() as T | { error: string };
  if (!response.ok) throw new Error("error" in (payload as object) ? (payload as { error: string }).error : "Falha na análise.");
  return payload as T;
}

export async function profileSource(file: File): Promise<SourceProfileResponse> {
  return jsonResponse(await fetch("/api/analysis/sources", { method: "POST", headers: { "Content-Type": "application/octet-stream", "X-File-Name": encodeURIComponent(file.name) }, body: file }));
}

export async function validateAnalysis(sourceToken: string, config: AnalysisConfig) {
  return jsonResponse<{ valid: boolean; errors: string[]; warnings: string[] }>(await fetch("/api/analysis/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceToken, config }) }));
}

export async function runAnalysis(sourceToken: string, config: AnalysisConfig): Promise<AdaptiveAnalysisResult> {
  return jsonResponse(await fetch("/api/analysis/runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceToken, config }) }));
}

export async function askAnalysisAssistant(input: { profile: WorkbookProfile; config: AnalysisConfig; messages: AssistantMessage[] }): Promise<AssistantTurn> {
  return jsonResponse(await fetch("/api/analysis/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
}

export async function createContactDraft(entity: AdaptiveAnalysisResult["entities"][number], objective: AnalysisConfig["objective"]) {
  return jsonResponse<Record<string, unknown>>(await fetch("/api/analysis/contact-draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity, objective }) }));
}
