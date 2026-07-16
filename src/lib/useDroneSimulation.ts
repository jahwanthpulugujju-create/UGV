import { useEffect, useRef, useState, useCallback } from 'react';
import type { Drone, DroneType, ThreatLevel, DroneStatus, SystemStatus, ThreatEvent } from './types';
const INGEST_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest`;
const INGEST_HEADERS = {
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

async function ingest(payload: { type: string; drone?: object; telemetry?: object; threat_event?: object }) {
  try {
    await fetch(INGEST_URL, { method: 'POST', headers: INGEST_HEADERS, body: JSON.stringify(payload) });
  } catch {
    // non-fatal — simulation continues
  }
}

const DRONE_TYPES: DroneType[] = ['recon', 'attack', 'commercial', 'fpv'];
const DRONE_NAMES: Record<DroneType, string> = {
  recon: 'Reconnaissance',
  attack: 'Attack',
  commercial: 'Commercial',
  fpv: 'FPV',
  unknown: 'Unknown',
};

const BASE_LAT = 34.0522;
const BASE_LNG = -118.2437;

let trackCounter = 1000;

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function threatFromType(type: DroneType, confidence: number): ThreatLevel {
  if (type === 'attack' && confidence > 0.8) return 'critical';
  if (type === 'attack') return 'high';
  if (type === 'fpv' && confidence > 0.75) return 'high';
  if (type === 'fpv') return 'medium';
  if (type === 'recon' && confidence > 0.8) return 'high';
  if (type === 'recon') return 'medium';
  return 'low';
}

function spawnDrone(): Drone {
  const type = pick(DRONE_TYPES);
  const confidence = rand(0.72, 0.98);
  const trackId = `TRK-${trackCounter++}`;
  const angle = rand(0, Math.PI * 2);
  const speed = rand(8, 25);
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;
  const startX = rand(0.1, 0.9);
  const startY = rand(0.1, 0.9);
  const gpsOffsetLat = rand(-0.02, 0.02);
  const gpsOffsetLng = rand(-0.02, 0.02);

  return {
    id: crypto.randomUUID(),
    trackId,
    confidence,
    type,
    status: 'detected',
    threatLevel: threatFromType(type, confidence),
    firstSeen: Date.now(),
    lastSeen: Date.now(),
    bbox: {
      x: startX,
      y: startY,
      width: rand(0.04, 0.09),
      height: rand(0.04, 0.09),
    },
    gps: { lat: BASE_LAT + gpsOffsetLat, lng: BASE_LNG + gpsOffsetLng },
    altitude: rand(50, 400),
    heading: (angle * 180) / Math.PI,
    speed,
    velocity: { vx, vy },
    trail: [{ x: startX, y: startY, t: Date.now() }],
    gpsTrail: [{ lat: BASE_LAT + gpsOffsetLat, lng: BASE_LNG + gpsOffsetLng, t: Date.now() }],
    launchEstimate: null,
    thermalSignature: rand(0.6, 0.99),
  };
}

function computeLaunchEstimate(drone: Drone): { lat: number; lng: number; confidence: number } {
  if (drone.gpsTrail.length < 3) return { lat: BASE_LAT, lng: BASE_LNG, confidence: 0 };

  const trail = drone.gpsTrail;
  const n = Math.min(trail.length, 10);
  const recent = trail.slice(-n);

  let sumLat = 0, sumLng = 0, sumT = 0;
  for (const p of recent) { sumLat += p.lat; sumLng += p.lng; sumT += p.t; }
  const meanLat = sumLat / n;
  const meanLng = sumLng / n;
  const meanT = sumT / n;

  let sumDLatT = 0, sumDLngT = 0, sumDT2 = 0;
  for (const p of recent) {
    const dt = (p.t - meanT) / 1000;
    sumDLatT += (p.lat - meanLat) * dt;
    sumDLngT += (p.lng - meanLng) * dt;
    sumDT2 += dt * dt;
  }

  const velLat = sumDT2 > 0 ? sumDLatT / sumDT2 : 0;
  const velLng = sumDT2 > 0 ? sumDLngT / sumDT2 : 0;

  const projectionTime = 120;
  const estLat = meanLat - velLat * projectionTime;
  const estLng = meanLng - velLng * projectionTime;

  const confidence = Math.min(0.95, 0.4 + n * 0.05);
  return { lat: estLat, lng: estLng, confidence };
}

export function useDroneSimulation() {
  const [drones, setDrones] = useState<Drone[]>([]);
  const [events, setEvents] = useState<ThreatEvent[]>([]);
  const [status, setStatus] = useState<SystemStatus>({
    online: true,
    rgbCamera: true,
    thermalCamera: true,
    inferenceLatency: 47,
    trackingFps: 30,
    uptime: 0,
    activeDrones: 0,
    totalDetections: 0,
  });
  const startTimeRef = useRef(Date.now());
  const totalDetectionsRef = useRef(0);
  const syncedRef = useRef<Set<string>>(new Set());

  const persistDrone = useCallback(async (drone: Drone) => {
    if (syncedRef.current.has(drone.id)) return;
    syncedRef.current.add(drone.id);
    totalDetectionsRef.current += 1;

    await ingest({
      type: 'drone',
      drone: {
        id: drone.id,
        track_id: drone.trackId,
        confidence: drone.confidence,
        type: drone.type,
        status: drone.status,
        threat_level: drone.threatLevel,
        first_seen: new Date(drone.firstSeen).toISOString(),
        last_seen: new Date(drone.lastSeen).toISOString(),
      },
    });

    await ingest({
      type: 'threat_event',
      threat_event: {
        drone_id: drone.id,
        severity: drone.threatLevel,
        description: `${DRONE_NAMES[drone.type]} drone detected — Track ${drone.trackId} — Confidence ${(drone.confidence * 100).toFixed(1)}%`,
        timestamp: new Date(drone.firstSeen).toISOString(),
      },
    });
  }, []);

  const persistTelemetry = useCallback(async (drone: Drone) => {
    await ingest({
      type: 'telemetry',
      telemetry: {
        drone_id: drone.id,
        latitude: drone.gps.lat,
        longitude: drone.gps.lng,
        altitude: drone.altitude,
        heading: drone.heading,
        speed: drone.speed,
        timestamp: new Date(drone.lastSeen).toISOString(),
      },
    });
  }, []);

  useEffect(() => {
    const tick = setInterval(() => {
      setDrones((prev) => {
        let updated = prev.map((d) => {
          const dt = 0.05;
          let newVx = d.velocity.vx + rand(-1, 1);
          let newVy = d.velocity.vy + rand(-1, 1);
          const sp = Math.sqrt(newVx * newVx + newVy * newVy);
          if (sp > 30) { newVx = (newVx / sp) * 30; newVy = (newVy / sp) * 30; }
          if (sp < 5) { newVx = (newVx / sp) * 5; newVy = (newVy / sp) * 5; }

          let nx = d.bbox.x + newVx * dt * 0.01;
          let ny = d.bbox.y + newVy * dt * 0.01;

          if (nx < 0) { nx = 0; newVx = Math.abs(newVx); }
          if (nx > 1 - d.bbox.width) { nx = 1 - d.bbox.width; newVx = -Math.abs(newVx); }
          if (ny < 0) { ny = 0; newVy = Math.abs(newVy); }
          if (ny > 1 - d.bbox.height) { ny = 1 - d.bbox.height; newVy = -Math.abs(newVy); }

          const dLat = newVy * dt * 0.0001;
          const dLng = newVx * dt * 0.0001;
          const newLat = d.gps.lat + dLat;
          const newLng = d.gps.lng + dLng;
          const now = Date.now();

          const newTrail = [...d.trail, { x: nx, y: ny, t: now }].slice(-60);
          const newGpsTrail = [...d.gpsTrail, { lat: newLat, lng: newLng, t: now }].slice(-60);

          const newConfidence = Math.min(0.99, Math.max(0.6, d.confidence + rand(-0.02, 0.02)));
          const newHeading = (Math.atan2(newVy, newVx) * 180) / Math.PI;
          const newSpeed = Math.sqrt(newVx * newVx + newVy * newVy);
          const newThermal = Math.min(0.99, Math.max(0.5, d.thermalSignature + rand(-0.03, 0.03)));

          let newStatus: DroneStatus = d.status;
          if (d.status === 'detected' && now - d.firstSeen > 1000) newStatus = 'tracking';

          const updatedDrone: Drone = {
            ...d,
            bbox: { ...d.bbox, x: nx, y: ny },
            gps: { lat: newLat, lng: newLng },
            velocity: { vx: newVx, vy: newVy },
            trail: newTrail,
            gpsTrail: newGpsTrail,
            confidence: newConfidence,
            heading: newHeading,
            speed: newSpeed,
            thermalSignature: newThermal,
            lastSeen: now,
            status: newStatus,
            altitude: Math.max(20, d.altitude + rand(-2, 2)),
          };

          if (newGpsTrail.length >= 5) {
            updatedDrone.launchEstimate = computeLaunchEstimate(updatedDrone);
          }

          return updatedDrone;
        });

        if (Math.random() < 0.08 && updated.length < 6) {
          const newDrone = spawnDrone();
          updated = [...updated, newDrone];
          persistDrone(newDrone);

          const newEvent: ThreatEvent = {
            id: crypto.randomUUID(),
            drone_id: newDrone.id,
            track_id: newDrone.trackId,
            severity: newDrone.threatLevel,
            description: `${DRONE_NAMES[newDrone.type]} drone detected — Track ${newDrone.trackId}`,
            timestamp: newDrone.firstSeen,
          };
          setEvents((e) => [newEvent, ...e].slice(0, 100));
        }

        updated = updated.filter((d) => Date.now() - d.lastSeen < 30000);

        for (const d of updated) {
          if (Math.random() < 0.1) persistTelemetry(d);
        }

        return updated;
      });

      setStatus((s) => ({
        ...s,
        inferenceLatency: Math.round(rand(35, 65)),
        trackingFps: Math.round(rand(28, 32)),
        uptime: Math.floor((Date.now() - startTimeRef.current) / 1000),
        activeDrones: drones.length,
        totalDetections: totalDetectionsRef.current,
      }));
    }, 100);

    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissDrone = useCallback((id: string) => {
    setDrones((prev) => prev.filter((d) => d.id !== id));
  }, []);

  return { drones, events, status, dismissDrone };
}
