import type { Drone } from '../lib/types';
import { THREAT_COLORS, DRONE_TYPE_LABELS, STATUS_LABELS, formatTimeAgo } from '../lib/utils';
import { Target, X, AlertTriangle } from 'lucide-react';

interface Props {
  drones: Drone[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function ThreatPanel({ drones, selectedId, onSelect, onDismiss }: Props) {
  const sorted = [...drones].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.threatLevel] - order[b.threatLevel];
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-700/50 px-3 py-2">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-red-400" />
          <h2 className="text-xs font-bold tracking-wider text-white">ACTIVE THREATS</h2>
        </div>
        <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
          {drones.length} ACTIVE
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-600">
            <AlertTriangle className="h-8 w-8" />
            <p className="text-xs">No active threats detected</p>
            <p className="text-[10px] text-slate-700">System monitoring...</p>
          </div>
        ) : (
          sorted.map((drone) => {
            const c = THREAT_COLORS[drone.threatLevel];
            const isSelected = selectedId === drone.id;
            return (
              <div
                key={drone.id}
                onClick={() => onSelect(drone.id)}
                className={`group cursor-pointer border-b border-slate-800/50 px-3 py-2.5 transition-colors ${
                  isSelected ? 'bg-cyan-500/10 border-l-2 border-l-cyan-400' : 'hover:bg-slate-800/40 border-l-2 border-l-transparent'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`flex h-7 w-7 items-center justify-center rounded ${c.bg} ${c.border} border`}>
                      <span className={`h-2 w-2 rounded-full ${c.dot} animate-pulse`} />
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-white">{drone.trackId}</span>
                        <span className={`rounded px-1 py-0.5 text-[8px] font-bold tracking-wider ${c.bg} ${c.text}`}>
                          {drone.threatLevel.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">{DRONE_TYPE_LABELS[drone.type]}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDismiss(drone.id); }}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5 text-slate-500 hover:text-red-400" />
                  </button>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-1 text-[9px]">
                  <div>
                    <p className="text-slate-600">CONF</p>
                    <p className="font-mono font-bold text-slate-300">{(drone.confidence * 100).toFixed(0)}%</p>
                  </div>
                  <div>
                    <p className="text-slate-600">SPD</p>
                    <p className="font-mono font-bold text-slate-300">{drone.speed.toFixed(0)}m/s</p>
                  </div>
                  <div>
                    <p className="text-slate-600">ALT</p>
                    <p className="font-mono font-bold text-slate-300">{drone.altitude.toFixed(0)}m</p>
                  </div>
                </div>

                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-[9px] text-slate-500">{STATUS_LABELS[drone.status]}</span>
                  <span className="text-[9px] text-slate-600">{formatTimeAgo(drone.firstSeen)}</span>
                </div>

                {/* confidence bar */}
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full ${c.dot} transition-all duration-300`}
                    style={{ width: `${drone.confidence * 100}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
