import { Database, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import type { TrackingEvent } from "../../types";
import { getClientTelemetry } from "./clientTelemetryApi";
import type { ClientTelemetry } from "./types";
import "./client-telemetry.css";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

export function ClientRecentEvents({ clientId, demoEvents }: { clientId: string; demoEvents: TrackingEvent[] }) {
  const [telemetry, setTelemetry] = useState<ClientTelemetry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const result = await getClientTelemetry(clientId);
        if (active) {
          setTelemetry(result);
          setError("");
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar os eventos reais.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [clientId]);

  if (loading) {
    return <div className="client-telemetry-state"><SpinnerGap className="client-telemetry-spin" size={22} /> Carregando telemetria real...</div>;
  }

  if (error) {
    return <div className="client-telemetry-state client-telemetry-state--error" role="alert"><WarningCircle size={21} /> {error}</div>;
  }

  if (!telemetry?.applications.length) {
    if (demoEvents.length === 0) {
      return <div className="client-telemetry-state"><Database size={23} weight="duotone" /> Nenhuma aplicação conectada a este produto.</div>;
    }
    return (
      <>
        <div className="client-telemetry-demo-notice">
          <Database size={19} weight="duotone" />
          <span>Nenhuma aplicação real conectada. Exibindo somente eventos demonstrativos próprios deste produto.</span>
        </div>
        <div className="event-list client-telemetry-events">
          {demoEvents.map((event) => (
            <div key={event.id} className="event-item client-telemetry-event client-telemetry-event--demo">
              <span className={`event-result event-result--${event.result.toLowerCase()}`} aria-hidden="true" />
              <div>
                <strong>{event.feature}</strong>
                <code>{event.action}</code>
                <span>{event.context} · dado demonstrativo</span>
              </div>
              <small>{event.timestamp}</small>
            </div>
          ))}
        </div>
      </>
    );
  }

  if (!telemetry.events.length) {
    return <div className="client-telemetry-state"><Database size={23} weight="duotone" /> Nenhum evento recebido.</div>;
  }

  return (
    <div className="event-list client-telemetry-events">
      {telemetry.events.map((event) => (
        <div key={event.id} className="event-item client-telemetry-event">
          <span className="event-result event-result--sucesso" aria-hidden="true" />
          <div>
            <strong>{event.name}</strong>
            <code>{event.eventName}</code>
            <span>{event.applicationName}{event.userId ? ` · ${event.userId}` : " · usuário não informado"}</span>
          </div>
          <small>{formatDateTime(event.receivedAt)}</small>
        </div>
      ))}
    </div>
  );
}
