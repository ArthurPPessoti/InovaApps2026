export function getProductTelemetryByProduct(database) {
  const rows = database.prepare(`
    SELECT
      a.client_id AS productId,
      a.id AS applicationId,
      COUNT(f.id) AS featureCount
    FROM connection_applications a
    LEFT JOIN connection_features f ON f.application_id = a.id
    WHERE a.client_id IS NOT NULL
      AND TRIM(a.client_id) <> ''
    GROUP BY a.id, a.client_id
    ORDER BY a.client_id ASC
  `).all();

  return Object.fromEntries(rows.map((row) => [row.productId, {
    connected: true,
    applicationId: row.applicationId,
    featureCount: Number(row.featureCount),
  }]));
}
