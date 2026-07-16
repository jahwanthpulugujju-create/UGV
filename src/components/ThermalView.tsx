import { useEffect, useRef } from 'react';
import type { Drone } from '../lib/types';
import { Thermometer, Flame } from 'lucide-react';

interface Props {
  drones: Drone[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ThermalView({ drones, selectedId, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let frame = 0;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;

      // thermal gradient background — cold blues/purples at bottom, dark at top
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#0a0a1a');
      grad.addColorStop(0.5, '#0d0d20');
      grad.addColorStop(0.7, '#1a0a30');
      grad.addColorStop(1, '#2a0a40');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // ambient heat blobs (terrain)
      for (let i = 0; i < 5; i++) {
        const cx = (Math.sin(frame * 0.002 + i * 2) * 0.3 + 0.5) * w;
        const cy = h * (0.6 + i * 0.05);
        const r = 60 + Math.sin(frame * 0.01 + i) * 10;
        const heatGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        heatGrad.addColorStop(0, 'rgba(80, 40, 120, 0.3)');
        heatGrad.addColorStop(1, 'rgba(80, 40, 120, 0)');
        ctx.fillStyle = heatGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // noise
      ctx.globalAlpha = 0.04;
      for (let i = 0; i < 120; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        ctx.fillStyle = Math.random() > 0.5 ? '#ff6b35' : '#ff9500';
        ctx.fillRect(x, y, 1, 1);
      }
      ctx.globalAlpha = 1;

      frame++;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-700/50 bg-black">
      <canvas ref={canvasRef} width={320} height={360} className="h-full w-full" />

      {/* thermal heat signatures for each drone */}
      <div className="pointer-events-none absolute inset-0">
        {drones.map((drone) => {
          const isSelected = selectedId === drone.id;
          const intensity = drone.thermalSignature;
          const size = drone.bbox.width * 100;
          const hue = intensity > 0.85 ? 'rgba(255, 80, 0, 0.7)' : intensity > 0.75 ? 'rgba(255, 140, 0, 0.6)' : 'rgba(255, 200, 0, 0.5)';
          const hueCore = intensity > 0.85 ? 'rgba(255, 220, 100, 0.9)' : intensity > 0.75 ? 'rgba(255, 180, 50, 0.8)' : 'rgba(255, 220, 100, 0.7)';

          return (
            <div
              key={drone.id}
              className="absolute cursor-pointer"
              style={{
                left: `${drone.bbox.x * 100}%`,
                top: `${drone.bbox.y * 100}%`,
                width: `${size}%`,
                height: `${size}%`,
              }}
              onClick={() => onSelect(drone.id)}
            >
              <div
                className="absolute inset-0 rounded-full blur-md"
                style={{ background: `radial-gradient(circle, ${hueCore} 0%, ${hue} 40%, transparent 70%)` }}
              />
              {isSelected && (
                <div className="absolute -inset-1 rounded-full border border-cyan-400/60" />
              )}
              <div className={`absolute -bottom-4 left-0 whitespace-nowrap text-[8px] font-bold ${isSelected ? 'text-cyan-400' : 'text-orange-300'}`}>
                {drone.trackId} · {(intensity * 100).toFixed(0)}°
              </div>
            </div>
          );
        })}
      </div>

      {/* thermal HUD */}
      <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 rounded bg-black/60 px-2 py-1">
          <Thermometer className="h-3 w-3 text-orange-400" />
          <span className="font-mono text-[10px] text-slate-300">CAM-02 LWIR 8-14μm</span>
        </div>
        <div className="flex items-center gap-1.5 rounded bg-black/60 px-2 py-1">
          <Flame className="h-3 w-3 text-orange-400" />
          <span className="font-mono text-[10px] text-slate-300">PALETTE: WHITE-HOT</span>
        </div>
      </div>

      <div className="pointer-events-none absolute right-3 top-3 rounded bg-black/60 px-2 py-1">
        <p className="font-mono text-[10px] text-slate-300">NETD &lt;30mK</p>
      </div>

      {/* temperature scale */}
      <div className="pointer-events-none absolute bottom-3 right-3 flex flex-col items-center gap-0.5">
        <span className="text-[8px] text-slate-400">HOT</span>
        <div className="h-16 w-2 rounded-sm" style={{ background: 'linear-gradient(to bottom, #ffec80, #ff9500, #ff5500, #6b2d80, #1a0a30)' }} />
        <span className="text-[8px] text-slate-400">COLD</span>
      </div>
    </div>
  );
}
