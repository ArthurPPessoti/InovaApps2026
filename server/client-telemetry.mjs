export function linkApplicationToClient(database, applicationId, clientId, clientName, updatedAt) {
  const result = database.prepare(`
    UPDATE connection_applications
    SET client_id = ?, client_name = ?, updated_at = ?
    WHERE id = ?
  `).run(clientId, clientName, updatedAt, applicationId);
  return result.changes > 0;
}

export function getClientTelemetry(database, clientId, eventLimit = 50) {
  const applications = database.prepare(`
    SELECT
      a.id,
      a.name,
      a.integration_status AS status,
      COUNT(e.id) AS eventCount
    FROM connection_applications a
    LEFT JOIN connection_events e ON e.application_id = a.id
    WHERE a.client_id = ?
    GROUP BY a.id
    ORDER BY a.created_at ASC
  `).all(clientId).map((application) => ({
    ...application,
    eventCount: Number(application.eventCount),
  }));

  if (applications.length === 0) {
    return { clientId, applications: [], events: [] };
  }

  const safeLimit = Math.max(1, Math.min(200, Number(eventLimit) || 50));
  const events = database.prepare(`
    SELECT
      e.id,
      e.application_id AS applicationId,
      a.name AS applicationName,
      e.event_name AS eventName,
      COALESCE(f.name, e.event_name) AS name,
      CASE WHEN f.id IS NULL THEN 0 ELSE 1 END AS registered,
      e.user_id AS userId,
      e.received_at AS receivedAt
    FROM connection_events e
    JOIN connection_applications a ON a.id = e.application_id
    LEFT JOIN connection_features f
      ON f.application_id = e.application_id
      AND f.event_name = e.event_name
    WHERE a.client_id = ?
    ORDER BY e.received_at DESC
    LIMIT ?
  `).all(clientId, safeLimit).map((event) => ({
    ...event,
    registered: Boolean(event.registered),
  }));

  return { clientId, applications, events };
}
