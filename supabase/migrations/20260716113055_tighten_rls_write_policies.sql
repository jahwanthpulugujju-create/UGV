/*
# Tighten RLS Policies — Restrict Write Access

## Purpose
The previous migration used `USING (true)` / `WITH CHECK (true)` for INSERT/UPDATE/DELETE
policies scoped to `anon, authenticated`. This allows unrestricted writes from the public
anon key, bypassing row-level security.

## Changes
For every table (drones, telemetry, threat_events, launch_predictions, media):
- SELECT policies remain `TO anon, authenticated` (the no-auth frontend reads via anon key).
- INSERT/UPDATE/DELETE policies are now `TO authenticated` only.
- The simulation engine writes through the `ingest` edge function using the service role
  key, which bypasses RLS — so writes still work without requiring user auth.

## Security Impact
- Anon-key clients can READ all data but CANNOT insert, update, or delete.
- Only authenticated users (or the service role via edge functions) can write.
- This eliminates the "RLS Policy Always True" warnings for all write policies.
*/

-- Drones
DROP POLICY IF EXISTS "anon_insert_drones" ON drones;
DROP POLICY IF EXISTS "anon_update_drones" ON drones;
DROP POLICY IF EXISTS "anon_delete_drones" ON drones;

CREATE POLICY "auth_insert_drones" ON drones FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_drones" ON drones FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_drones" ON drones FOR DELETE
  TO authenticated USING (true);

-- Telemetry
DROP POLICY IF EXISTS "anon_insert_telemetry" ON telemetry;
DROP POLICY IF EXISTS "anon_update_telemetry" ON telemetry;
DROP POLICY IF EXISTS "anon_delete_telemetry" ON telemetry;

CREATE POLICY "auth_insert_telemetry" ON telemetry FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_telemetry" ON telemetry FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_telemetry" ON telemetry FOR DELETE
  TO authenticated USING (true);

-- Threat Events
DROP POLICY IF EXISTS "anon_insert_threat_events" ON threat_events;
DROP POLICY IF EXISTS "anon_update_threat_events" ON threat_events;
DROP POLICY IF EXISTS "anon_delete_threat_events" ON threat_events;

CREATE POLICY "auth_insert_threat_events" ON threat_events FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_threat_events" ON threat_events FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_threat_events" ON threat_events FOR DELETE
  TO authenticated USING (true);

-- Launch Predictions
DROP POLICY IF EXISTS "anon_insert_launch_predictions" ON launch_predictions;
DROP POLICY IF EXISTS "anon_update_launch_predictions" ON launch_predictions;
DROP POLICY IF EXISTS "anon_delete_launch_predictions" ON launch_predictions;

CREATE POLICY "auth_insert_launch_predictions" ON launch_predictions FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_launch_predictions" ON launch_predictions FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_launch_predictions" ON launch_predictions FOR DELETE
  TO authenticated USING (true);

-- Media
DROP POLICY IF EXISTS "anon_insert_media" ON media;
DROP POLICY IF EXISTS "anon_update_media" ON media;
DROP POLICY IF EXISTS "anon_delete_media" ON media;

CREATE POLICY "auth_insert_media" ON media FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_media" ON media FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_media" ON media FOR DELETE
  TO authenticated USING (true);
