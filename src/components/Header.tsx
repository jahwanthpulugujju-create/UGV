import { useEffect, useState } from 'react';
import { Radar, Activity, Cpu, Camera, Thermometer, Wifi, Shield } from 'lucide-react';
import type { SystemStatus } from '../lib/types';
import { formatUptime } from '../lib/utils';

export function Header({ status }: { status: SystemStatus }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const utc = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  return (
    <header className="flex items-center justify-between border-b border-slate-700/50 bg-slate-900/80 px-4 py-2.5 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Radar className="h-7 w-7 text-cyan-400" />
          <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
          </span>
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-wider text-white">
            SENTINEL-X <span className="text-cyan-400">C2</span>
          </h1>
          <p className="text-[10px] tracking-widest text-slate-500">UGV DRONE DETECTION & TRACKING SYSTEM</p>
        </div>
      </div>

      <div className="hidden items-center gap-5 lg:flex">
        <StatusItem icon={Cpu} label="Inference" value={`${status.inferenceLatency}ms`} ok={status.inferenceLatency < 100} />
        <StatusItem icon={Activity} label="Tracking" value={`${status.trackingFps} FPS`} ok={status.trackingFps >= 28} />
        <StatusItem icon={Camera} label="RGB" value="ONLINE" ok={status.rgbCamera} />
        <StatusItem icon={Thermometer} label="Thermal" value="ONLINE" ok={status.thermalCamera} />
        <StatusItem icon={Wifi} label="Link" value="SECURE" ok={status.online} />
        <StatusItem icon={Shield} label="Uptime" value={formatUptime(status.uptime)} ok={status.online} />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1">
          <span className="flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[10px] font-bold tracking-widest text-emerald-400">OPERATIONAL</span>
        </div>
        <div className="text-right">
          <p className="font-mono text-[11px] text-slate-300">{utc}</p>
          <p className="text-[9px] tracking-widest text-slate-500">SECTOR 7-A · GRID 34N 118W</p>
        </div>
      </div>
    </header>
  );
}

function StatusItem({
  icon: Icon,
  label,
  value,
  ok,
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`h-3.5 w-3.5 ${ok ? 'text-slate-400' : 'text-red-400'}`} />
      <div className="leading-none">
        <p className="text-[9px] tracking-widest text-slate-500">{label}</p>
        <p className={`font-mono text-[11px] font-bold ${ok ? 'text-slate-200' : 'text-red-400'}`}>{value}</p>
      </div>
    </div>
  );
}
