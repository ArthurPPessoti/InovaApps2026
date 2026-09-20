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

export function discardLegacyApplications() {
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
