import type { Drone } from '../lib/types';
import { THREAT_COLORS, formatCoord } from '../lib/utils';
import { MapPin, Rocket, Route, TrendingDown } from 'lucide-react';

interface Props {
  drone: Drone | null;
}

export function LaunchEstimation({ drone }: Props) {
  if (!drone || !drone.launchEstimate) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-slate-700/50 px-3 py-2">
          <Rocket className="h-4 w-4 text-amber-400" />
          <h2 className="text-xs font-bold tracking-wider text-white">LAUNCH POINT ESTIMATION</h2>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-slate-600">
          <Rocket className="h-8 w-8" />
          <p className="text-xs">Insufficient tracking data</p>
          <p className="text-[10px] text-slate-700">Requires 5+ telemetry points</p>
        </div>
      </div>
    );
  }

  const c = THREAT_COLORS[drone.threatLevel];
  const est = drone.launchEstimate;
  const distance = haversine(drone.gps.lat, drone.gps.lng, est.lat, est.lng);
  const bearing = bearingTo(drone.gps.lat, drone.gps.lng, est.lat, est.lng);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-700/50 px-3 py-2">
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-amber-400" />
          <h2 className="text-xs font-bold tracking-wider text-white">LAUNCH POINT ESTIMATION</h2>
        </div>
        <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${c.bg} ${c.text}`}>
          {drone.trackId}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {/* estimated origin */}
        <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
          <div className="mb-1.5 flex items-center gap-1.5">
            <MapPin className="h-3 w-3 text-amber-400" />
            <p className="text-[10px] tracking-widest text-amber-400">ESTIMATED ORIGIN</p>
          </div>
          <p className="font-mono text-sm text-slate-200">{formatCoord(est.lat, est.lng)}</p>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <p className="text-[9px] text-slate-500">DISTANCE</p>
              <p className="font-mono text-sm font-bold text-amber-400">{distance.toFixed(0)} m</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-500">BEARING</p>
              <p className="font-mono text-sm font-bold text-amber-400">{((bearing + 360) % 360).toFixed(0)}°</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-500">CONFIDENCE</p>
              <p className="font-mono text-sm font-bold text-amber-400">{(est.confidence * 100).toFixed(0)}%</p>
            </div>
          </div>
        </div>

        {/* trajectory analysis */}
        <div className="mb-3 rounded-lg border border-slate-700/50 bg-slate-800/30 p-2.5">
          <div className="mb-2 flex items-center gap-1.5">
            <Route className="h-3 w-3 text-cyan-400" />
            <p className="text-[10px] tracking-widest text-slate-500">TRAJECTORY ANALYSIS</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <p className="text-slate-600">TRACK POINTS</p>
              <p className="font-mono font-bold text-slate-300">{drone.gpsTrail.length}</p>
            </div>
            <div>
              <p className="text-slate-600">PROJECTION</p>
              <p className="font-mono font-bold text-slate-300">120s reverse</p>
            </div>
            <div>
              <p className="text-slate-600">VELOCITY</p>
              <p className="font-mono font-bold text-slate-300">{drone.speed.toFixed(1)} m/s</p>
            </div>
            <div>
              <p className="text-slate-600">HEADING</p>
              <p className="font-mono font-bold text-slate-300">{((drone.heading + 360) % 360).toFixed(0)}°</p>
            </div>
          </div>
        </div>

        {/* reverse path visualization */}
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-2.5">
          <div className="mb-2 flex items-center gap-1.5">
            <TrendingDown className="h-3 w-3 text-amber-400" />
            <p className="text-[10px] tracking-widest text-slate-500">REVERSE FLIGHT PATH</p>
          </div>
          <div className="relative h-24 overflow-hidden rounded bg-slate-900/50">
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 96" preserveAspectRatio="none">
              <defs>
                <linearGradient id="pathGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={c.dot.replace('bg-', '').includes('emerald') ? '#34d399' : c.dot.includes('amber') ? '#fbbf24' : c.dot.includes('orange') ? '#fb923c' : '#f87171'} stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              {drone.gpsTrail.length > 1 && (
                <polyline
                  points={drone.gpsTrail.map((p, i) => {
                    const t = i / (drone.gpsTrail.length - 1);
                    return `${10 + t * 150},${48 - (p.lat - drone.gpsTrail[0].lat) * 10000 + (p.lng - drone.gpsTrail[0].lng) * 5000}`;
                  }).join(' ')}
                  fill="none"
                  stroke="url(#pathGrad)"
                  strokeWidth="2"
                  strokeDasharray="3 2"
                />
              )}
              {/* current position */}
              <circle cx="160" cy="48" r="3" fill={c.dot.includes('emerald') ? '#34d399' : c.dot.includes('amber') ? '#fbbf24' : c.dot.includes('orange') ? '#fb923c' : '#f87171'} />
              {/* estimated launch */}
              <circle cx="20" cy="48" r="4" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="2 1" />
              <text x="20" y="62" fill="#fbbf24" fontSize="6" textAnchor="middle">ORIGIN?</text>
              <text x="160" y="62" fill="#94a3b8" fontSize="6" textAnchor="middle">NOW</text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearingTo(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos((lat2 * Math.PI) / 180);
  const x = Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) - Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180) / Math.PI;
}
