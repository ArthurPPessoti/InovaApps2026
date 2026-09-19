import type {
  ConnectedApplication,
  IntegrationEvent,
  LinkApplicationClientInput,
  NewApplicationInput,
  NewFeatureInput,
} from "./types";

const LEGACY_STORAGE_KEY = "inovaapps:connections:applications:v1";

async function request<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error ?? "Não foi possível concluir a solicitação.");
  }
  return body as T;
}

export async function migrateLegacyApplications() {
  const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!stored) return;

  let applications: unknown;
  try {
    applications = JSON.parse(stored);
  } catch {
    return;
  }

  if (!Array.isArray(applications) || applications.length === 0) {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return;
  }

  await request("/api/connections/applications/import", {
    method: "POST",
    body: JSON.stringify({ applications }),
  });
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

export async function listApplications() {
  const response = await request<{ applications: ConnectedApplication[] }>(
    "/api/connections/applications",
  );
  return response.applications;
}

export async function getApplication(applicationId: string) {
  const response = await request<{ application: ConnectedApplication }>(
    `/api/connections/applications/${applicationId}`,
  );
  return response.application;
}

export async function createApplication(input: NewApplicationInput) {
  const response = await request<{ application: ConnectedApplication }>(
    "/api/connections/applications",
    { method: "POST", body: JSON.stringify(input) },
  );
  return response.application;
}

export async function addFeature(applicationId: string, input: NewFeatureInput) {
  const response = await request<{ application: ConnectedApplication }>(
    `/api/connections/applications/${applicationId}/features`,
    { method: "POST", body: JSON.stringify(input) },
  );
  return response.application;
}

export async function linkApplicationClient(applicationId: string, input: LinkApplicationClientInput) {
  const response = await request<{ application: ConnectedApplication }>(
    `/api/connections/applications/${applicationId}/client`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
  return response.application;
}

export async function listEvents(applicationId: string) {
  const response = await request<{ events: IntegrationEvent[] }>(
    `/api/connections/applications/${applicationId}/events`,
  );
  return response.events;
}
