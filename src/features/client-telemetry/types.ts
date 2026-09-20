export interface ClientTelemetryApplication {
  id: string;
  status: "waiting_integration" | "connected";
  eventCount: number;
}

export interface ClientTelemetryEvent {
  id: string;
  applicationId: string;
  eventName: string;
  name: string;
  registered: boolean;
  userId: string | null;
  receivedAt: string;
}

export interface ClientTelemetry {
  clientId: string;
  applications: ClientTelemetryApplication[];
  events: ClientTelemetryEvent[];
}
