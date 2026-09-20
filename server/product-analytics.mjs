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
      COUNT(DISTINCT e.event_name) AS features_used,
      SUM(CASE WHEN e.data_origin = 'real' THEN 1 ELSE 0 END) AS real_events,
      SUM(CASE WHEN e.data_origin = 'demo' THEN 1 ELSE 0 END) AS demo_events
    FROM connection_events e
    INNER JOIN connection_applications a ON a.id = e.application_id
    INNER JOIN connection_features f
      ON f.application_id = e.application_id
      AND f.event_name = e.event_name
    WHERE ${whereClause}
      ${timeClause}
  `).get(...queryParameters);

  const features = database.prepare(`
    SELECT
      e.event_name AS eventName,
      MAX(f.name) AS name,
      COUNT(*) AS usageCount,
      1 AS registered
    FROM connection_events e
    INNER JOIN connection_applications a ON a.id = e.application_id
    INNER JOIN connection_features f
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
    dataOrigins: {
      realEvents: Number(metrics.real_events ?? 0),
      demoEvents: Number(metrics.demo_events ?? 0),
      includesDemo: Number(metrics.demo_events ?? 0) > 0,
    },
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
    SELECT id
    FROM connection_applications
    WHERE client_id = ?
    ORDER BY id ASC
  `).all(clientId).map((application) => ({ id: application.id }));

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

export const TEMPORAL_ANALYTICS_TIME_ZONE = "America/Sao_Paulo";
const TEMPORAL_PERIOD_MONTHS = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
};

const zonedDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TEMPORAL_ANALYTICS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function getZonedParts(date) {
  const parts = Object.fromEntries(
    zonedDateFormatter.formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return parts;
}

function zonedDateTimeToUtc({ year, month, day, hour = 0, minute = 0, second = 0, millisecond = 0 }) {
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  let candidate = targetAsUtc;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = getZonedParts(new Date(candidate));
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
      millisecond,
    );
    const difference = targetAsUtc - actualAsUtc;
    candidate += difference;
    if (difference === 0) break;
  }
  return new Date(candidate);
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function shiftZonedMonths(date, monthOffset) {
  const parts = getZonedParts(date);
  const targetMonth = new Date(Date.UTC(parts.year, parts.month - 1 + monthOffset, 1));
  const year = targetMonth.getUTCFullYear();
  const month = targetMonth.getUTCMonth() + 1;
  return zonedDateTimeToUtc({
    year,
    month,
    day: Math.min(parts.day, daysInMonth(year, month)),
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
    millisecond: date.getUTCMilliseconds(),
  });
}

function startOfZonedMonth(date, monthOffset = 0) {
  const parts = getZonedParts(date);
  const targetMonth = new Date(Date.UTC(parts.year, parts.month - 1 + monthOffset, 1));
  return zonedDateTimeToUtc({
    year: targetMonth.getUTCFullYear(),
    month: targetMonth.getUTCMonth() + 1,
    day: 1,
  });
}

function monthKey(date) {
  const parts = getZonedParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}`;
}

function formatWindowLabel(start, end) {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TEMPORAL_ANALYTICS_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return `${formatter.format(start)} – ${formatter.format(new Date(end.getTime() - 1))}`;
}

export function normalizeTemporalPeriod(value) {
  if (value === "monthly" || value === "quarterly" || value === "semiannual" || value === "annual") {
    return value;
  }
  throw new TypeError("Período temporal inválido.");
}

export function resolveTemporalWindows(period, now = new Date()) {
  const normalizedPeriod = normalizeTemporalPeriod(period);
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new TypeError("Data de referência inválida.");
  }

  let currentStart;
  let previousStart;
  let previousEnd;
  if (normalizedPeriod === "annual") {
    currentStart = shiftZonedMonths(now, -12);
    previousStart = shiftZonedMonths(now, -24);
    previousEnd = currentStart;
  } else {
    const months = TEMPORAL_PERIOD_MONTHS[normalizedPeriod];
    currentStart = startOfZonedMonth(now, -(months - 1));
    previousStart = startOfZonedMonth(currentStart, -months);
    previousEnd = shiftZonedMonths(now, -months);
  }

  return {
    key: normalizedPeriod,
    timeZone: TEMPORAL_ANALYTICS_TIME_ZONE,
    current: {
      start: currentStart.toISOString(),
      end: now.toISOString(),
      label: formatWindowLabel(currentStart, now),
    },
    previous: {
      start: previousStart.toISOString(),
      end: previousEnd.toISOString(),
      label: formatWindowLabel(previousStart, previousEnd),
    },
  };
}

function roundMetric(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function comparison(current, previous) {
  const normalizedCurrent = roundMetric(current);
  const normalizedPrevious = roundMetric(previous);
  const absoluteChange = roundMetric(normalizedCurrent - normalizedPrevious);
  return {
    current: normalizedCurrent,
    previous: normalizedPrevious,
    absoluteChange,
    percentageChange: normalizedPrevious === 0
      ? null
      : roundMetric((absoluteChange / normalizedPrevious) * 100),
  };
}

function frequency(eventCount, uniqueUsers) {
  return uniqueUsers === 0 ? 0 : roundMetric(eventCount / uniqueUsers);
}

function getMonthlyHistory(database, clientId, now) {
  const firstMonth = startOfZonedMonth(now, -11);
  const rows = database.prepare(`
    SELECT
      strftime('%Y-%m', e.received_at, '-3 hours') AS month,
      COUNT(*) AS events,
      COUNT(DISTINCT CASE
        WHEN e.user_id IS NOT NULL AND TRIM(e.user_id) <> '' THEN e.user_id
      END) AS uniqueUsers
    FROM connection_events e
    INNER JOIN connection_applications a ON a.id = e.application_id
    INNER JOIN connection_features f
      ON f.application_id = e.application_id
      AND f.event_name = e.event_name
    WHERE a.client_id = ?
      AND e.received_at >= ?
      AND e.received_at < ?
    GROUP BY month
    ORDER BY month ASC
  `).all(clientId, firstMonth.toISOString(), now.toISOString());
  const byMonth = new Map(rows.map((row) => [row.month, row]));
  return Array.from({ length: 12 }, (_, index) => {
    const month = monthKey(startOfZonedMonth(now, index - 11));
    const row = byMonth.get(month);
    return {
      month,
      events: Number(row?.events ?? 0),
      uniqueUsers: Number(row?.uniqueUsers ?? 0),
    };
  });
}

function shiftZonedDays(date, dayOffset) {
  const parts = getZonedParts(date);
  const targetDay = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + dayOffset));
  return zonedDateTimeToUtc({
    year: targetDay.getUTCFullYear(),
    month: targetDay.getUTCMonth() + 1,
    day: targetDay.getUTCDate(),
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
    millisecond: date.getUTCMilliseconds(),
  });
}

function getPeriodFeatureHistory(database, clientId, windows) {
  const granularity = windows.key === "monthly"
    ? "daily"
    : windows.key === "quarterly" ? "weekly" : "monthly";
  const periodStart = new Date(windows.current.start);
  const periodEnd = new Date(windows.current.end);
  const buckets = [];
  for (let index = 0; index < 400; index += 1) {
    const start = granularity === "daily"
      ? shiftZonedDays(periodStart, index)
      : granularity === "weekly"
        ? shiftZonedDays(periodStart, index * 7)
        : shiftZonedMonths(periodStart, index);
    if (start >= periodEnd) break;
    const candidateEnd = granularity === "daily"
      ? shiftZonedDays(periodStart, index + 1)
      : granularity === "weekly"
        ? shiftZonedDays(periodStart, (index + 1) * 7)
        : shiftZonedMonths(periodStart, index + 1);
    buckets.push({
      start,
      end: candidateEnd < periodEnd ? candidateEnd : periodEnd,
    });
  }

  if (buckets.length === 0) return { granularity, points: [] };
  const bucketValues = buckets.map(() => "(?, ?, ?)").join(", ");
  const parameters = buckets.flatMap((bucket, index) => [
    index,
    bucket.start.toISOString(),
    bucket.end.toISOString(),
  ]);
  parameters.push(clientId);
  const rows = database.prepare(`
    WITH buckets(bucketIndex, startAt, endAt) AS (
      VALUES ${bucketValues}
    )
    SELECT
      buckets.bucketIndex AS bucketIndex,
      e.event_name AS eventName,
      COUNT(*) AS events
    FROM buckets
    INNER JOIN connection_events e
      ON e.received_at >= buckets.startAt
      AND e.received_at < buckets.endAt
    INNER JOIN connection_applications a ON a.id = e.application_id
    INNER JOIN connection_features f
      ON f.application_id = e.application_id
      AND f.event_name = e.event_name
    WHERE a.client_id = ?
    GROUP BY buckets.bucketIndex, e.event_name
    ORDER BY buckets.bucketIndex ASC, e.event_name ASC
  `).all(...parameters);
  const countsByBucket = new Map();
  rows.forEach((row) => {
    if (!countsByBucket.has(row.bucketIndex)) countsByBucket.set(row.bucketIndex, {});
    countsByBucket.get(row.bucketIndex)[row.eventName] = Number(row.events);
  });
  return {
    granularity,
    points: buckets.map((bucket, index) => ({
      start: bucket.start.toISOString(),
      eventCounts: countsByBucket.get(index) ?? {},
    })),
  };
}

function getConsecutiveDeclines(database, clientId, now) {
  const completedEnd = startOfZonedMonth(now);
  const historyStart = startOfZonedMonth(completedEnd, -13);
  const rows = database.prepare(`
    SELECT
      e.event_name AS eventName,
      strftime('%Y-%m', e.received_at, '-3 hours') AS month,
      COUNT(*) AS events
    FROM connection_events e
    INNER JOIN connection_applications a ON a.id = e.application_id
    INNER JOIN connection_features f
      ON f.application_id = e.application_id
      AND f.event_name = e.event_name
    WHERE a.client_id = ?
      AND e.received_at >= ?
      AND e.received_at < ?
    GROUP BY e.event_name, month
  `).all(clientId, historyStart.toISOString(), completedEnd.toISOString());
  const monthKeys = Array.from({ length: 13 }, (_, index) => (
    monthKey(startOfZonedMonth(completedEnd, index - 13))
  ));
  const eventMonths = new Map();
  rows.forEach((row) => {
    if (!eventMonths.has(row.eventName)) eventMonths.set(row.eventName, new Map());
    eventMonths.get(row.eventName).set(row.month, Number(row.events));
  });

  const declines = new Map();
  eventMonths.forEach((counts, eventName) => {
    const values = monthKeys.map((key) => counts.get(key) ?? 0);
    let consecutive = 0;
    for (let index = values.length - 1; index > 0; index -= 1) {
      if (values[index] >= values[index - 1]) break;
      consecutive += 1;
    }
    declines.set(eventName, consecutive);
  });
  return declines;
}

export function getTemporalProductAnalytics(database, clientId, period, now = new Date()) {
  const windows = resolveTemporalWindows(period, now);
  const applications = database.prepare(`
    SELECT id FROM connection_applications WHERE client_id = ? ORDER BY id
  `).all(clientId).map((application) => application.id);
  const product = database.prepare(`
    SELECT id, name, company_id AS companyId, company_name AS companyName
    FROM portfolio_products
    WHERE id = ?
  `).get(clientId) ?? null;
  const productEventCoverage = database.prepare(`
    SELECT
      COUNT(DISTINCT f.id) AS monitoredFeatures,
      COUNT(DISTINCT e.id) AS totalProductEvents,
      MIN(e.received_at) AS firstProductEventAt,
      MAX(e.received_at) AS lastProductEventAt
    FROM connection_applications a
    LEFT JOIN connection_features f ON f.application_id = a.id
    LEFT JOIN connection_events e
      ON e.application_id = f.application_id
      AND e.event_name = f.event_name
    WHERE a.client_id = ?
  `).get(clientId);

  const rangeParameters = [
    clientId,
    windows.current.start,
    windows.current.end,
    windows.previous.start,
    windows.previous.end,
  ];
  const metrics = database.prepare(`
    SELECT
      SUM(CASE WHEN e.received_at >= ?2 AND e.received_at < ?3 THEN 1 ELSE 0 END) AS currentEvents,
      SUM(CASE WHEN e.received_at >= ?4 AND e.received_at < ?5 THEN 1 ELSE 0 END) AS previousEvents,
      COUNT(DISTINCT CASE WHEN e.received_at >= ?2 AND e.received_at < ?3
        AND e.user_id IS NOT NULL AND TRIM(e.user_id) <> '' THEN e.user_id END) AS currentUsers,
      COUNT(DISTINCT CASE WHEN e.received_at >= ?4 AND e.received_at < ?5
        AND e.user_id IS NOT NULL AND TRIM(e.user_id) <> '' THEN e.user_id END) AS previousUsers,
      COUNT(DISTINCT CASE WHEN e.received_at >= ?2 AND e.received_at < ?3 THEN e.event_name END) AS currentFeatures,
      COUNT(DISTINCT CASE WHEN e.received_at >= ?4 AND e.received_at < ?5 THEN e.event_name END) AS previousFeatures,
      SUM(CASE WHEN e.received_at >= ?2 AND e.received_at < ?3
        AND e.user_id IS NOT NULL AND TRIM(e.user_id) <> '' THEN 1 ELSE 0 END) AS currentIdentifiedEvents,
      SUM(CASE WHEN e.received_at >= ?4 AND e.received_at < ?5
        AND e.user_id IS NOT NULL AND TRIM(e.user_id) <> '' THEN 1 ELSE 0 END) AS previousIdentifiedEvents,
      SUM(CASE WHEN e.received_at >= ?2 AND e.received_at < ?3 AND e.data_origin = 'real' THEN 1 ELSE 0 END) AS realEvents,
      SUM(CASE WHEN e.received_at >= ?2 AND e.received_at < ?3 AND e.data_origin = 'demo' THEN 1 ELSE 0 END) AS demoEvents
    FROM connection_events e
    INNER JOIN connection_applications a ON a.id = e.application_id
    INNER JOIN connection_features f
      ON f.application_id = e.application_id
      AND f.event_name = e.event_name
    WHERE a.client_id = ?1
      AND (
        (e.received_at >= ?2 AND e.received_at < ?3)
        OR (e.received_at >= ?4 AND e.received_at < ?5)
      )
  `).get(...rangeParameters);

  const currentEvents = Number(metrics.currentEvents ?? 0);
  const previousEvents = Number(metrics.previousEvents ?? 0);
  const currentUsers = Number(metrics.currentUsers ?? 0);
  const previousUsers = Number(metrics.previousUsers ?? 0);
  const currentIdentifiedEvents = Number(metrics.currentIdentifiedEvents ?? 0);
  const previousIdentifiedEvents = Number(metrics.previousIdentifiedEvents ?? 0);

  const declines = getConsecutiveDeclines(database, clientId, now);
  const features = database.prepare(`
    SELECT
      e.event_name AS eventName,
      MAX(f.name) AS name,
      1 AS registered,
      SUM(CASE WHEN e.received_at >= ?2 AND e.received_at < ?3 THEN 1 ELSE 0 END) AS currentEvents,
      SUM(CASE WHEN e.received_at >= ?4 AND e.received_at < ?5 THEN 1 ELSE 0 END) AS previousEvents,
      COUNT(DISTINCT CASE WHEN e.received_at >= ?2 AND e.received_at < ?3
        AND e.user_id IS NOT NULL AND TRIM(e.user_id) <> '' THEN e.user_id END) AS currentUsers,
      COUNT(DISTINCT CASE WHEN e.received_at >= ?4 AND e.received_at < ?5
        AND e.user_id IS NOT NULL AND TRIM(e.user_id) <> '' THEN e.user_id END) AS previousUsers,
      SUM(CASE WHEN e.received_at >= ?2 AND e.received_at < ?3
        AND e.user_id IS NOT NULL AND TRIM(e.user_id) <> '' THEN 1 ELSE 0 END) AS currentIdentifiedEvents,
      SUM(CASE WHEN e.received_at >= ?4 AND e.received_at < ?5
        AND e.user_id IS NOT NULL AND TRIM(e.user_id) <> '' THEN 1 ELSE 0 END) AS previousIdentifiedEvents
    FROM connection_events e
    INNER JOIN connection_applications a ON a.id = e.application_id
    INNER JOIN connection_features f
      ON f.application_id = e.application_id AND f.event_name = e.event_name
    WHERE a.client_id = ?1
      AND (
        (e.received_at >= ?2 AND e.received_at < ?3)
        OR (e.received_at >= ?4 AND e.received_at < ?5)
      )
    GROUP BY e.event_name
    ORDER BY currentEvents DESC, name COLLATE NOCASE ASC
  `).all(...rangeParameters).map((feature) => {
    const featureCurrentEvents = Number(feature.currentEvents ?? 0);
    const featurePreviousEvents = Number(feature.previousEvents ?? 0);
    const featureCurrentUsers = Number(feature.currentUsers ?? 0);
    const featurePreviousUsers = Number(feature.previousUsers ?? 0);
    return {
      eventName: feature.eventName,
      name: feature.name,
      registered: Boolean(feature.registered),
      events: comparison(featureCurrentEvents, featurePreviousEvents),
      uniqueUsers: comparison(featureCurrentUsers, featurePreviousUsers),
      frequencyPerUser: comparison(
        frequency(Number(feature.currentIdentifiedEvents ?? 0), featureCurrentUsers),
        frequency(Number(feature.previousIdentifiedEvents ?? 0), featurePreviousUsers),
      ),
      consecutiveDeclines: declines.get(feature.eventName) ?? 0,
    };
  });
  const monitoredFeatures = Number(productEventCoverage.monitoredFeatures ?? 0);
  const totalProductEvents = Number(productEventCoverage.totalProductEvents ?? 0);
  const analysisStatus = applications.length === 0
    ? "no_connection"
    : monitoredFeatures === 0
      ? "no_features"
      : totalProductEvents === 0
        ? "waiting_for_events"
        : previousEvents === 0
          ? "insufficient_history"
          : "ready";

  return {
    product,
    clientId,
    applicationIds: applications,
    period: windows,
    dataOrigins: {
      realEvents: Number(metrics.realEvents ?? 0),
      demoEvents: Number(metrics.demoEvents ?? 0),
      includesDemo: Number(metrics.demoEvents ?? 0) > 0,
    },
    analysisAvailability: {
      status: analysisStatus,
      hasConnection: applications.length > 0,
      monitoredFeatures,
      firstProductEventAt: productEventCoverage.firstProductEventAt ?? null,
      lastProductEventAt: productEventCoverage.lastProductEventAt ?? null,
      totalProductEvents,
      currentPeriodEvents: currentEvents,
      previousPeriodEvents: previousEvents,
    },
    summary: {
      events: comparison(currentEvents, previousEvents),
      uniqueUsers: comparison(currentUsers, previousUsers),
      featuresUsed: comparison(Number(metrics.currentFeatures ?? 0), Number(metrics.previousFeatures ?? 0)),
      frequencyPerUser: comparison(
        frequency(currentIdentifiedEvents, currentUsers),
        frequency(previousIdentifiedEvents, previousUsers),
      ),
    },
    features,
    history: getMonthlyHistory(database, clientId, now),
    featureHistory: getPeriodFeatureHistory(database, clientId, windows),
  };
}
