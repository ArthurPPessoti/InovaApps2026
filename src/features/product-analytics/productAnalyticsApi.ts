import type {
  AnalyticsApplication,
  ClientProductAnalyticsSummary,
  ProductAnalyticsSummary,
} from "./types";

async function request<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? "Não foi possível carregar o Product Analytics.");
  }
  return body as T;
}

export async function listAnalyticsApplications() {
  const response = await request<{ applications: AnalyticsApplication[] }>(
    "/api/connections/applications",
  );
  return response.applications;
}

export async function getProductAnalyticsSummary(applicationId: string, from: string | null) {
  const query = from ? `?from=${encodeURIComponent(from)}` : "";
  return request<ProductAnalyticsSummary>(
    `/api/product-analytics/applications/${encodeURIComponent(applicationId)}/summary${query}`,
  );
}

export async function getClientProductAnalyticsSummary(
  clientId: string,
  from: string | null,
  applicationId: string,
) {
  const query = new URLSearchParams();
  if (from) query.set("from", from);
  if (applicationId) query.set("application_id", applicationId);
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return request<ClientProductAnalyticsSummary>(
    `/api/product-analytics/clients/${encodeURIComponent(clientId)}/summary${suffix}`,
  );
}
