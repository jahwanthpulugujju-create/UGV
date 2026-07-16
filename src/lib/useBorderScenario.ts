import { useEffect, useRef, useState, useCallback } from 'react';

export type MotherboardStatus = 'active' | 'detected' | 'neutralized';
export type BorderDroneStatus = 'incoming' | 'hovering' | 'disabled' | 'retreating';

export interface BorderDrone {
  id: string;
  trackId: string;
  motherboardId: string;
  lat: number;
  lng: number;
  altitude: number;
  speed: number;
  heading: number;
  status: BorderDroneStatus;
  threatLevel: 'medium' | 'high' | 'critical';
  confidence: number;
  trail: { lat: number; lng: number; t: number }[];
  screenPos: { x: number; y: number };
  screenTrail: { x: number; y: number; t: number }[];
}

export interface Motherboard {
  id: string;
  trackId: string;
  lat: number;
  lng: number;
  thermalSignature: number;
  status: MotherboardStatus;
  droneCount: number;
  detectedAt: number | null;
  neutralizedAt: number | null;
  screenPos: { x: number; y: number };
  scanProgress: number;
}

export interface NeutralizationLog {
  id: string;
  motherboardId: string;
  trackId: string;
  timestamp: number;
  dronesDisabled: number;
  status: 'initiated' | 'jamming' | 'successful' | 'failed';
}

export interface BorderSystemStatus {
  mode: 'monitoring' | 'alert';
  totalDrones: number;
  activeDrones: number;
  disabledDrones: number;
  motherboardsDetected: number;
  motherboardsNeutralized: number;
  threatLevel: 'safe' | 'elevated' | 'high' | 'critical';
  scanActive: boolean;
  uptime: number;
}

let mbCounter = 0;
let droneCounter = 0;

function rand(min: number, max: number) { return Math.random() * (max - min) + min; }

// India-Pakistan border near Rajasthan/Gujarat sector
const BORDER_LAT = 27.0;
const BORDER_LNG = 70.0;

// Screen projection: map lat/lng to 0-1 canvas coords
// Pakistan is "west" (lower lng), India is "east" (higher lng)
function projectToScreen(lat: number, lng: number): { x: number; y: number } {
  const x = (lng - (BORDER_LNG - 0.15)) / 0.3;
  const y = ((BORDER_LAT + 0.15) - lat) / 0.3;
  return { x: Math.max(0.02, Math.min(0.98, x)), y: Math.max(0.02, Math.min(0.98, y)) };
}

function spawnMotherboard(): Motherboard {
  mbCounter++;
  const lat = BORDER_LAT + rand(-0.08, 0.08);
  const lng = BORDER_LNG - rand(0.06, 0.12); // west of border = Pakistan side
  const pos = projectToScreen(lat, lng);
  return {
    id: crypto.randomUUID(),
    trackId: `MBS-${String(mbCounter).padStart(3, '0')}`,
    lat,
    lng,
    thermalSignature: rand(0.75, 0.95),
    status: 'active',
    droneCount: 0,
    detectedAt: null,
    neutralizedAt: null,
    screenPos: pos,
    scanProgress: 0,
  };
}

function spawnDrone(mb: Motherboard): BorderDrone {
  droneCounter++;
  // drones start near the motherboard and fly toward the border (east)
  const lat = mb.lat + rand(-0.01, 0.01);
  const lng = mb.lng + rand(-0.005, 0.005);
  const pos = projectToScreen(lat, lng);
  const speed = rand(15, 30);
  const heading = rand(70, 110); // heading east toward border

  return {
    id: crypto.randomUUID(),
    trackId: `TRK-${String(droneCounter).padStart(4, '0')}`,
    motherboardId: mb.id,
    lat,
    lng,
    altitude: rand(80, 300),
    speed,
    heading,
    status: 'incoming',
    threatLevel: 'critical',
    confidence: rand(0.82, 0.98),
    trail: [{ lat, lng, t: Date.now() }],
    screenPos: pos,
    screenTrail: [{ x: pos.x, y: pos.y, t: Date.now() }],
  };
}

export function useBorderScenario() {
  const [motherboards, setMotherboards] = useState<Motherboard[]>([]);
  const [drones, setDrones] = useState<BorderDrone[]>([]);
  const [neutralizationLog, setNeutralizationLog] = useState<NeutralizationLog[]>([]);
  const [status, setStatus] = useState<BorderSystemStatus>({
    mode: 'monitoring',
    totalDrones: 0,
    activeDrones: 0,
    disabledDrones: 0,
    motherboardsDetected: 0,
    motherboardsNeutralized: 0,
    threatLevel: 'safe',
    scanActive: false,
    uptime: 0,
  });
  const [scanning, setScanning] = useState(false);
  const [scanTarget, setScanTarget] = useState<string | null>(null);
  const startTimeRef = useRef(Date.now());
  const initializedRef = useRef(false);

  // Initialize scenario with 2-3 motherboards on Pakistan side
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initialMBs: Motherboard[] = [];
    const count = 3;
    for (let i = 0; i < count; i++) {
      initialMBs.push(spawnMotherboard());
    }

    // Spawn 2-3 drones per motherboard
    const initialDrones: BorderDrone[] = [];
    for (const mb of initialMBs) {
      mb.droneCount = Math.floor(rand(2, 4));
      for (let i = 0; i < mb.droneCount; i++) {
        initialDrones.push(spawnDrone(mb));
      }
    }

    setMotherboards(initialMBs);
    setDrones(initialDrones);
  }, []);

  // Simulation tick
  useEffect(() => {
    const tick = setInterval(() => {
      setDrones((prev) => {
        return prev.map((d) => {
          if (d.status === 'disabled') return d;

          const dt = 0.05;
          const speedMps = d.speed;
          // convert speed to degrees (approx)
          const dLng = (speedMps * dt * Math.cos((d.heading * Math.PI) / 180)) / 111000;
          const dLat = (speedMps * dt * Math.sin((d.heading * Math.PI) / 180)) / 111000;

          let newLng = d.lng + dLng;
          let newLat = d.lat + dLat;
          let newStatus: BorderDroneStatus = d.status;
          let newSpeed = d.speed;

          // Check if drone crossed the border
          if (newLng >= BORDER_LNG) {
            newStatus = 'hovering';
            newSpeed = 0;
            newLng = BORDER_LNG + rand(-0.002, 0.002);
          }

          // Check if its motherboard was neutralized
          const mb = motherboardsRef.current.find((m) => m.id === d.motherboardId);
          if (mb && mb.status === 'neutralized') {
            newStatus = 'disabled';
            newSpeed = 0;
          }

          const pos = projectToScreen(newLat, newLng);
          const now = Date.now();
          const newTrail = [...d.trail, { lat: newLat, lng: newLng, t: now }].slice(-50);
          const newScreenTrail = [...d.screenTrail, { x: pos.x, y: pos.y, t: now }].slice(-50);

          return {
            ...d,
            lat: newLat,
            lng: newLng,
            speed: newSpeed,
            status: newStatus,
            screenPos: pos,
            trail: newTrail,
            screenTrail: newScreenTrail,
          };
        });
      });

      // Occasionally spawn new drones from active motherboards
      setDrones((prevDrones) => {
        let result = prevDrones;
        for (const mb of motherboardsRef.current) {
          if (mb.status !== 'active') continue;
          const mbDrones = prevDrones.filter((d) => d.motherboardId === mb.id && d.status !== 'disabled');
          if (mbDrones.length < 4 && Math.random() < 0.03) {
            result = [...result, spawnDrone(mb)];
          }
        }
        return result;
      });

      setStatus((s) => {
        const active = dronesRef.current.filter((d) => d.status !== 'disabled').length;
        const disabled = dronesRef.current.filter((d) => d.status === 'disabled').length;
        const detected = motherboardsRef.current.filter((m) => m.status === 'detected' || m.status === 'neutralized').length;
        const neutralized = motherboardsRef.current.filter((m) => m.status === 'neutralized').length;
        const incoming = dronesRef.current.filter((d) => d.status === 'incoming').length;
        const hovering = dronesRef.current.filter((d) => d.status === 'hovering').length;

        let threat: BorderSystemStatus['threatLevel'] = 'safe';
        if (hovering > 0 || neutralized > 0) threat = 'critical';
        else if (incoming > 3) threat = 'high';
        else if (incoming > 0) threat = 'elevated';

        return {
          ...s,
          mode: threat === 'critical' || threat === 'high' ? 'alert' : 'monitoring',
          totalDrones: active + disabled,
          activeDrones: active,
          disabledDrones: disabled,
          motherboardsDetected: detected,
          motherboardsNeutralized: neutralized,
          threatLevel: threat,
          uptime: Math.floor((Date.now() - startTimeRef.current) / 1000),
        };
      });
    }, 100);

    return () => clearInterval(tick);
  }, []);

  // refs for accessing latest state inside tick
  const motherboardsRef = useRef(motherboards);
  const dronesRef = useRef(drones);
  useEffect(() => { motherboardsRef.current = motherboards; }, [motherboards]);
  useEffect(() => { dronesRef.current = drones; }, [drones]);

  // Thermal scan to detect a motherboard
  const startThermalScan = useCallback((mbId: string) => {
    setScanning(true);
    setScanTarget(mbId);
    setMotherboards((prev) => prev.map((m) => m.id === mbId ? { ...m, scanProgress: 0 } : m));

    const scanInterval = setInterval(() => {
      setMotherboards((prev) => prev.map((m) => {
        if (m.id !== mbId) return m;
        const progress = m.scanProgress + 2;
        if (progress >= 100) {
          return { ...m, scanProgress: 100, status: 'detected', detectedAt: Date.now() };
        }
        return { ...m, scanProgress: progress };
      }));
    }, 50);

    setTimeout(() => {
      clearInterval(scanInterval);
      setScanning(false);
      setScanTarget(null);
    }, 2600);
  }, []);

  // Neutralize a detected motherboard
  const neutralizeMotherboard = useCallback((mbId: string) => {
    const mb = motherboardsRef.current.find((m) => m.id === mbId);
    if (!mb || (mb.status !== 'detected' && mb.status !== 'active')) return;

    const logId = crypto.randomUUID();
    const dronesDisabled = dronesRef.current.filter((d) => d.motherboardId === mbId && d.status !== 'disabled').length;

    // Add neutralization log
    const logEntry: NeutralizationLog = {
      id: logId,
      motherboardId: mbId,
      trackId: mb.trackId,
      timestamp: Date.now(),
      dronesDisabled,
      status: 'initiated',
    };
    setNeutralizationLog((prev) => [logEntry, ...prev].slice(0, 50));

    // Phase 1: jamming
    setTimeout(() => {
      setNeutralizationLog((prev) => prev.map((l) => l.id === logId ? { ...l, status: 'jamming' } : l));
    }, 600);

    // Phase 2: neutralized
    setTimeout(() => {
      setMotherboards((prev) => prev.map((m) => m.id === mbId ? { ...m, status: 'neutralized', neutralizedAt: Date.now() } : m));
      setDrones((prev) => prev.map((d) => d.motherboardId === mbId ? { ...d, status: 'disabled', speed: 0 } : d));
      setNeutralizationLog((prev) => prev.map((l) => l.id === logId ? { ...l, status: 'successful' } : l));
    }, 1500);
  }, []);

  const resetScenario = useCallback(() => {
    mbCounter = 0;
    droneCounter = 0;
    const newMBs: Motherboard[] = [];
    for (let i = 0; i < 3; i++) newMBs.push(spawnMotherboard());
    const newDrones: BorderDrone[] = [];
    for (const mb of newMBs) {
      mb.droneCount = Math.floor(rand(2, 4));
      for (let i = 0; i < mb.droneCount; i++) newDrones.push(spawnDrone(mb));
    }
    setMotherboards(newMBs);
    setDrones(newDrones);
    setNeutralizationLog([]);
    startTimeRef.current = Date.now();
  }, []);

  return {
    motherboards,
    drones,
    neutralizationLog,
    status,
    scanning,
    scanTarget,
    startThermalScan,
    neutralizeMotherboard,
    resetScenario,
  };
}
