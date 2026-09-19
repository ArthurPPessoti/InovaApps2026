import type { ClientTelemetry } from "./types";

export async function getClientTelemetry(clientId: string) {
  const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}/telemetry`, {
    headers: { Accept: "application/json" },
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? "Não foi possível carregar os eventos reais do cliente.");
  }
  return body as ClientTelemetry;
}
