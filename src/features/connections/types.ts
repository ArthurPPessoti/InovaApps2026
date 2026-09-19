export type ApplicationType = "internal" | "multiuser";
export type IntegrationStatus = "waiting_integration" | "connected";

export interface MonitoredFeature {
  id: string;
  name: string;
  eventName: string;
  createdAt: string;
}

export interface ConnectedApplication {
  id: string;
  name: string;
  clientId: string | null;
  client: string | null;
  type: ApplicationType;
  status: IntegrationStatus;
  createdAt: string;
  features: MonitoredFeature[];
  featureCount: number;
  eventCount: number;
  lastEventAt: string | null;
  credential?: string;
}

export interface IntegrationEvent {
  id: string;
  applicationId: string;
  event: string;
  userId: string | null;
  receivedAt: string;
}

export interface NewApplicationInput {
  name: string;
  clientId: string;
  client: string;
  type: ApplicationType;
}

export interface LinkApplicationClientInput {
  clientId: string;
  client: string;
}

export interface NewFeatureInput {
  name: string;
  eventName: string;
}
