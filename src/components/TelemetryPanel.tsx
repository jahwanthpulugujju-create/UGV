import type { Drone } from '../lib/types';
import { THREAT_COLORS, DRONE_TYPE_LABELS, formatCoord } from '../lib/utils';
import { Gauge, Navigation, Mountain, Clock, Radio, TrendingUp } from 'lucide-react';

interface Props {
  drone: Drone | null;
}

export function TelemetryPanel({ drone }: Props) {
  if (!drone) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-slate-700/50 px-3 py-2">
          <Gauge className="h-4 w-4 text-cyan-400" />
          <h2 className="text-xs font-bold tracking-wider text-white">TELEMETRY</h2>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-slate-600">
          <Radio className="h-8 w-8" />
          <p className="text-xs">No target selected</p>
          <p className="text-[10px] text-slate-700">Select a threat to view telemetry</p>
        </div>
      </div>
    );
  }

  const c = THREAT_COLORS[drone.threatLevel];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-700/50 px-3 py-2">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-cyan-400" />
          <h2 className="text-xs font-bold tracking-wider text-white">TELEMETRY</h2>
        </div>
        <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${c.bg} ${c.text}`}>
          {drone.trackId}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {/* target info */}
        <div className="mb-3 rounded-lg border border-slate-700/50 bg-slate-800/30 p-2.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] tracking-widest text-slate-500">CLASSIFICATION</p>
              <p className="text-sm font-bold text-white">{DRONE_TYPE_LABELS[drone.type]}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] tracking-widest text-slate-500">STATUS</p>
              <p className={`text-sm font-bold ${c.text}`}>{drone.status.toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* GPS */}
        <div className="mb-3 rounded-lg border border-slate-700/50 bg-slate-800/30 p-2.5">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Navigation className="h-3 w-3 text-cyan-400" />
            <p className="text-[10px] tracking-widest text-slate-500">GPS POSITION</p>
          </div>
          <p className="font-mono text-sm text-slate-200">{formatCoord(drone.gps.lat, drone.gps.lng)}</p>
        </div>

        {/* metrics grid */}
        <div className="mb-3 grid grid-cols-2 gap-2">
          <Metric icon={TrendingUp} label="SPEED" value={`${drone.speed.toFixed(1)} m/s`} color="text-cyan-400" />
          <Metric icon={Mountain} label="ALTITUDE" value={`${drone.altitude.toFixed(0)} m`} color="text-cyan-400" />
          <Metric icon={Navigation} label="HEADING" value={`${((drone.heading + 360) % 360).toFixed(0)}°`} color="text-cyan-400" />
          <Metric icon={Clock} label="TRACK AGE" value={`${Math.floor((Date.now() - drone.firstSeen) / 1000)}s`} color="text-cyan-400" />
        </div>

        {/* confidence gauge */}
        <div className="mb-3 rounded-lg border border-slate-700/50 bg-slate-800/30 p-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[10px] tracking-widest text-slate-500">DETECTION CONFIDENCE</p>
            <p className={`font-mono text-sm font-bold ${c.text}`}>{(drone.confidence * 100).toFixed(1)}%</p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full ${c.dot} transition-all duration-300`}
              style={{ width: `${drone.confidence * 100}%` }}
            />
          </div>
        </div>

        {/* thermal signature */}
        <div className="mb-3 rounded-lg border border-slate-700/50 bg-slate-800/30 p-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[10px] tracking-widest text-slate-500">THERMAL SIGNATURE</p>
            <p className="font-mono text-sm font-bold text-orange-400">{(drone.thermalSignature * 100).toFixed(0)}%</p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300"
              style={{ width: `${drone.thermalSignature * 100}%` }}
            />
          </div>
        </div>

        {/* heading compass */}
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-2.5">
          <p className="mb-2 text-[10px] tracking-widest text-slate-500">FLIGHT VECTOR</p>
          <div className="flex items-center gap-3">
            <div className="relative h-16 w-16 rounded-full border border-slate-600">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] text-slate-600">N</div>
              <div
                className="absolute left-1/2 top-1/2 origin-left"
                style={{ transform: `rotate(${drone.heading}deg)` }}
              >
                <div className="h-0.5 w-7 rounded-full bg-cyan-400" />
              </div>
              <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400" />
            </div>
            <div>
              <p className="font-mono text-2xl font-bold text-white">{((drone.heading + 360) % 360).toFixed(0)}°</p>
              <p className="text-[10px] text-slate-500">{headingToCardinal(drone.heading)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-2.5">
      <div className="mb-1 flex items-center gap-1">
        <Icon className={`h-3 w-3 ${color}`} />
        <p className="text-[9px] tracking-widest text-slate-500">{label}</p>
      </div>
      <p className="font-mono text-sm font-bold text-slate-200">{value}</p>
    </div>
  );
}

function headingToCardinal(deg: number): string {
  const cardinals = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return cardinals[Math.round(((deg + 360) % 360) / 45) % 8];
}
