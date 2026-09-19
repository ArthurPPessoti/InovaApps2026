export function normalizeAnalyticsFrom(value) {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 64) {
    throw new TypeError("Período inválido.");
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new TypeError("Período inválido.");
  }
  return parsed.toISOString();
}

function aggregateEvents(database, whereClause, parameters, from) {
  const timeClause = from ? "AND e.received_at >= ?" : "";
  const queryParameters = from ? [...parameters, from] : parameters;
  const metrics = database.prepare(`
    SELECT
      COUNT(*) AS total_events,
      COUNT(DISTINCT CASE
        WHEN e.user_id IS NOT NULL AND TRIM(e.user_id) <> '' THEN e.user_id
      END) AS unique_users,
      COUNT(DISTINCT e.event_name) AS features_used
    FROM connection_events e
    INNER JOIN connection_applications a ON a.id = e.application_id
    WHERE ${whereClause}
      ${timeClause}
  `).get(...queryParameters);

  const features = database.prepare(`
    SELECT
      e.event_name AS eventName,
      COALESCE(MAX(f.name), e.event_name) AS name,
      COUNT(*) AS usageCount,
      CASE WHEN COUNT(f.id) = 0 THEN 0 ELSE 1 END AS registered
    FROM connection_events e
    INNER JOIN connection_applications a ON a.id = e.application_id
    LEFT JOIN connection_features f
      ON f.application_id = e.application_id
      AND f.event_name = e.event_name
    WHERE ${whereClause}
      ${timeClause}
    GROUP BY e.event_name
    ORDER BY usageCount DESC, name COLLATE NOCASE ASC
  `).all(...queryParameters).map((feature) => ({
    ...feature,
    usageCount: Number(feature.usageCount),
    registered: Boolean(feature.registered),
  }));

  return {
    from,
    metrics: {
      totalEvents: Number(metrics.total_events),
      uniqueUsers: Number(metrics.unique_users),
      featuresUsed: Number(metrics.features_used),
    },
    features,
  };
}

export function getProductAnalyticsSummary(database, applicationId, from = null) {
  const application = database.prepare(`
    SELECT
      id,
      name,
      client_id AS clientId,
      CASE WHEN client_id IS NULL THEN NULL ELSE client_name END AS client
    FROM connection_applications
    WHERE id = ?
  `).get(applicationId);

  if (!application) return null;

  return {
    application,
    ...aggregateEvents(database, "e.application_id = ?", [applicationId], from),
  };
}

export function getClientProductAnalyticsSummary(database, clientId, from = null, applicationId = null) {
  const applications = database.prepare(`
    SELECT id, name
    FROM connection_applications
    WHERE client_id = ?
    ORDER BY name COLLATE NOCASE ASC
  `).all(clientId).map((application) => ({
    id: application.id,
    name: application.name,
  }));

  if (applicationId && !applications.some((application) => application.id === applicationId)) {
    return null;
  }

  const whereClause = applicationId
    ? "a.client_id = ? AND e.application_id = ?"
    : "a.client_id = ?";
  const parameters = applicationId ? [clientId, applicationId] : [clientId];

  return {
    clientId,
    applicationId,
    applications,
    ...aggregateEvents(database, whereClause, parameters, from),
  };
}
