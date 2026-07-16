/*
# UGV Drone Detection & Tracking System Schema

## Purpose
Tactical command center database for an autonomous ground-based drone detection platform.
Stores detected drones, telemetry streams, threat events, media evidence, and launch-point predictions.

## New Tables
1. `drones` — detected drone tracks with confidence, type, status, tracking metadata
2. `telemetry` — time-series GPS/altitude/heading/speed per drone (TimescaleDB-style hypertable)
3. `threat_events` — severity-tagged threat incidents linked to drones
4. `launch_predictions` — estimated operator/launch origin per drone with confidence
5. `media` — captured evidence (images/video) linked to drones

## Security
- Single-tenant (no auth). All tables use `TO anon, authenticated` with `USING (true)` because data is intentionally shared/public within the tactical system.
- RLS enabled on every table.
*/

-- Drones table
CREATE TABLE IF NOT EXISTS drones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id text NOT NULL,
  confidence real NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'unknown',
  status text NOT NULL DEFAULT 'tracking',
  threat_level text NOT NULL DEFAULT 'low',
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE drones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_drones" ON drones;
CREATE POLICY "anon_select_drones" ON drones FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_drones" ON drones;
CREATE POLICY "anon_insert_drones" ON drones FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_drones" ON drones;
CREATE POLICY "anon_update_drones" ON drones FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_drones" ON drones;
CREATE POLICY "anon_delete_drones" ON drones FOR DELETE TO anon, authenticated USING (true);

-- Telemetry table
CREATE TABLE IF NOT EXISTS telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drone_id uuid NOT NULL REFERENCES drones(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  altitude double precision NOT NULL DEFAULT 0,
  heading double precision NOT NULL DEFAULT 0,
  speed double precision NOT NULL DEFAULT 0,
  timestamp timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE telemetry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_telemetry" ON telemetry;
CREATE POLICY "anon_select_telemetry" ON telemetry FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_telemetry" ON telemetry;
CREATE POLICY "anon_insert_telemetry" ON telemetry FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_telemetry" ON telemetry;
CREATE POLICY "anon_update_telemetry" ON telemetry FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_telemetry" ON telemetry;
CREATE POLICY "anon_delete_telemetry" ON telemetry FOR DELETE TO anon, authenticated USING (true);

-- Threat events table
CREATE TABLE IF NOT EXISTS threat_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drone_id uuid NOT NULL REFERENCES drones(id) ON DELETE CASCADE,
  severity text NOT NULL DEFAULT 'medium',
  description text NOT NULL DEFAULT '',
  timestamp timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE threat_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_threat_events" ON threat_events;
CREATE POLICY "anon_select_threat_events" ON threat_events FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_threat_events" ON threat_events;
CREATE POLICY "anon_insert_threat_events" ON threat_events FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_threat_events" ON threat_events;
CREATE POLICY "anon_update_threat_events" ON threat_events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_threat_events" ON threat_events;
CREATE POLICY "anon_delete_threat_events" ON threat_events FOR DELETE TO anon, authenticated USING (true);

-- Launch predictions table
CREATE TABLE IF NOT EXISTS launch_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drone_id uuid NOT NULL REFERENCES drones(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  confidence real NOT NULL DEFAULT 0,
  timestamp timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE launch_predictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_launch_predictions" ON launch_predictions;
CREATE POLICY "anon_select_launch_predictions" ON launch_predictions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_launch_predictions" ON launch_predictions;
CREATE POLICY "anon_insert_launch_predictions" ON launch_predictions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_launch_predictions" ON launch_predictions;
CREATE POLICY "anon_update_launch_predictions" ON launch_predictions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_launch_predictions" ON launch_predictions;
CREATE POLICY "anon_delete_launch_predictions" ON launch_predictions FOR DELETE TO anon, authenticated USING (true);

-- Media table
CREATE TABLE IF NOT EXISTS media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drone_id uuid NOT NULL REFERENCES drones(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  timestamp timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_media" ON media;
CREATE POLICY "anon_select_media" ON media FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_media" ON media;
CREATE POLICY "anon_insert_media" ON media FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_media" ON media;
CREATE POLICY "anon_update_media" ON media FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_media" ON media;
CREATE POLICY "anon_delete_media" ON media FOR DELETE TO anon, authenticated USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_telemetry_drone_id ON telemetry(drone_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry(timestamp);
CREATE INDEX IF NOT EXISTS idx_threat_events_drone_id ON threat_events(drone_id);
CREATE INDEX IF NOT EXISTS idx_threat_events_timestamp ON threat_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_launch_predictions_drone_id ON launch_predictions(drone_id);
CREATE INDEX IF NOT EXISTS idx_drones_last_seen ON drones(last_seen);
CREATE INDEX IF NOT EXISTS idx_media_drone_id ON media(drone_id);
