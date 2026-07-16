import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface IngestPayload {
  type: "drone" | "telemetry" | "threat_event";
  drone?: {
    id: string;
    track_id: string;
    confidence: number;
    type: string;
    status: string;
    threat_level: string;
    first_seen: string;
    last_seen: string;
  };
  telemetry?: {
    drone_id: string;
    latitude: number;
    longitude: number;
    altitude: number;
    heading: number;
    speed: number;
    timestamp: string;
  };
  threat_event?: {
    drone_id: string;
    severity: string;
    description: string;
    timestamp: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    if (url.pathname.endsWith("/ingest") && req.method === "POST") {
      return await handleIngest(req);
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

async function handleIngest(req: Request): Promise<Response> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: IngestPayload;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (body.type === "drone" && body.drone) {
    const { error } = await supabase.from("drones").upsert({
      id: body.drone.id,
      track_id: body.drone.track_id,
      confidence: body.drone.confidence,
      type: body.drone.type,
      status: body.drone.status,
      threat_level: body.drone.threat_level,
      first_seen: body.drone.first_seen,
      last_seen: body.drone.last_seen,
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (body.type === "telemetry" && body.telemetry) {
    const { error } = await supabase.from("telemetry").insert({
      drone_id: body.telemetry.drone_id,
      latitude: body.telemetry.latitude,
      longitude: body.telemetry.longitude,
      altitude: body.telemetry.altitude,
      heading: body.telemetry.heading,
      speed: body.telemetry.speed,
      timestamp: body.telemetry.timestamp,
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (body.type === "threat_event" && body.threat_event) {
    const { error } = await supabase.from("threat_events").insert({
      drone_id: body.threat_event.drone_id,
      severity: body.threat_event.severity,
      description: body.threat_event.description,
      timestamp: body.threat_event.timestamp,
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ error: "Unknown payload type" }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
