import type { ThreatLevel, DroneType, DroneStatus } from './types';

export const THREAT_COLORS: Record<ThreatLevel, { bg: string; border: string; text: string; glow: string; dot: string }> = {
  low: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', text: 'text-emerald-400', glow: 'shadow-emerald-500/30', dot: 'bg-emerald-400' },
  medium: { bg: 'bg-amber-500/10', border: 'border-amber-500/40', text: 'text-amber-400', glow: 'shadow-amber-500/30', dot: 'bg-amber-400' },
  high: { bg: 'bg-orange-500/10', border: 'border-orange-500/40', text: 'text-orange-400', glow: 'shadow-orange-500/30', dot: 'bg-orange-400' },
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/40', text: 'text-red-400', glow: 'shadow-red-500/30', dot: 'bg-red-400' },
};

export const DRONE_TYPE_LABELS: Record<DroneType, string> = {
  recon: 'Reconnaissance',
  attack: 'Attack',
  commercial: 'Commercial',
  fpv: 'FPV Racer',
  unknown: 'Unknown',
};

export const DRONE_TYPE_ICONS: Record<DroneType, string> = {
  recon: 'RKN',
  attack: 'AK',
  commercial: 'CMR',
  fpv: 'FPV',
  unknown: '??',
};

export const STATUS_LABELS: Record<DroneStatus, string> = {
  detected: 'DETECTED',
  tracking: 'TRACKING',
  lost: 'LOST',
  engaged: 'ENGAGED',
};

export function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatTimeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 1) return 'now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function formatCoord(lat: number, lng: number): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}°${ns} ${Math.abs(lng).toFixed(4)}°${ew}`;
}
