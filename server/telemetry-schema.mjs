export function ensureTelemetryEventSchema(database) {
  const eventColumns = database.prepare("PRAGMA table_info(connection_events)").all();
  if (!eventColumns.some((column) => column.name === "data_origin")) {
    database.exec(`
      ALTER TABLE connection_events
      ADD COLUMN data_origin TEXT NOT NULL DEFAULT 'real'
        CHECK (data_origin IN ('real', 'demo'));
    `);
  }

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_connection_events_application_event_time
      ON connection_events(application_id, event_name, received_at DESC);

    CREATE TABLE IF NOT EXISTS telemetry_demo_seeds (
      seed_key TEXT PRIMARY KEY,
      seed_version TEXT NOT NULL DEFAULT 'temporal-v1',
      application_id TEXT NOT NULL,
      anchor_month TEXT NOT NULL,
      event_count INTEGER NOT NULL,
      completed_at TEXT NOT NULL,
      FOREIGN KEY(application_id) REFERENCES connection_applications(id) ON DELETE CASCADE
    );
  `);
  const seedColumns = database.prepare("PRAGMA table_info(telemetry_demo_seeds)").all();
  if (!seedColumns.some((column) => column.name === "seed_version")) {
    database.exec(`
      ALTER TABLE telemetry_demo_seeds
      ADD COLUMN seed_version TEXT NOT NULL DEFAULT 'temporal-v1';
    `);
  }
}
