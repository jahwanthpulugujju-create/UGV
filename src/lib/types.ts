export type DroneType = 'recon' | 'attack' | 'commercial' | 'fpv' | 'unknown';
export type ThreatLevel = 'low' | 'medium' | 'high' | 'critical';
export type DroneStatus = 'detected' | 'tracking' | 'lost' | 'engaged';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Drone {
  id: string;
  trackId: string;
  confidence: number;
  type: DroneType;
  status: DroneStatus;
  threatLevel: ThreatLevel;
  firstSeen: number;
  lastSeen: number;
  bbox: BoundingBox;
  gps: { lat: number; lng: number };
  altitude: number;
  heading: number;
  speed: number;
  velocity: { vx: number; vy: number };
  trail: { x: number; y: number; t: number }[];
  gpsTrail: { lat: number; lng: number; t: number }[];
  launchEstimate: { lat: number; lng: number; confidence: number } | null;
  thermalSignature: number;
}

export interface ThreatEvent {
  id: string;
  drone_id: string;
  track_id: string;
  severity: ThreatLevel;
  description: string;
  timestamp: number;
}

export interface SystemStatus {
  online: boolean;
  rgbCamera: boolean;
  thermalCamera: boolean;
  inferenceLatency: number;
  trackingFps: number;
  uptime: number;
  activeDrones: number;
  totalDetections: number;
}
