/*
# Add Motherboard & Neutralization Tables

## Purpose
Supports the operational dashboard mode for India-Pakistan border drone detection.
Tracks drone motherboards (ground control stations) detected via thermal signatures,
and records neutralization events when an operator disables a motherboard.

## New Tables
1. `motherboards` — detected ground control stations controlling drone swarms
   - id, track_id, thermal_signature, gps, status, drone_count, first_detected, neutralized_at
2. `neutralization_events` — audit log of motherboard neutralization actions
   - id, motherboard_id, operator_id, method, status, timestamp

## Security
- SELECT open to anon, authenticated (no-auth app reads via anon key)
- INSERT/UPDATE/DELETE restricted to authenticated only (writes go through edge function)
*/

CREATE TABLE IF NOT EXISTS motherboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  thermal_signature real NOT NULL DEFAULT 0.8,
  status text NOT NULL DEFAULT 'active',
  drone_count integer NOT NULL DEFAULT 0,
  first_detected timestamptz NOT NULL DEFAULT now(),
  neutralized_at timestamptz
);

ALTER TABLE motherboards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_motherboards" ON motherboards;
CREATE POLICY "anon_select_motherboards" ON motherboards FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_motherboards" ON motherboards;
CREATE POLICY "auth_insert_motherboards" ON motherboards FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_motherboards" ON motherboards;
CREATE POLICY "auth_update_motherboards" ON motherboards FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_motherboards" ON motherboards;
CREATE POLICY "auth_delete_motherboards" ON motherboards FOR DELETE
  TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS neutralization_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  motherboard_id uuid NOT NULL REFERENCES motherboards(id) ON DELETE CASCADE,
  operator_id text NOT NULL DEFAULT 'OPERATOR-01',
  method text NOT NULL DEFAULT 'EW_JAMMER',
  status text NOT NULL DEFAULT 'successful',
  timestamp timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE neutralization_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_neutralization_events" ON neutralization_events;
CREATE POLICY "anon_select_neutralization_events" ON neutralization_events FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_neutralization_events" ON neutralization_events;
CREATE POLICY "auth_insert_neutralization_events" ON neutralization_events FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_neutralization_events" ON neutralization_events;
CREATE POLICY "auth_update_neutralization_events" ON neutralization_events FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_neutralization_events" ON neutralization_events;
CREATE POLICY "auth_delete_neutralization_events" ON neutralization_events FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_motherboards_status ON motherboards(status);
CREATE INDEX IF NOT EXISTS idx_neutralization_events_motherboard ON neutralization_events(motherboard_id);
