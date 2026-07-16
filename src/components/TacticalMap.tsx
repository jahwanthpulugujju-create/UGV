import { useEffect, useRef } from 'react';
import type { Drone } from '../lib/types';
import { THREAT_COLORS, formatCoord } from '../lib/utils';
import { MapPin, Navigation, Crosshair, Layers } from 'lucide-react';

interface Props {
  drones: Drone[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function TacticalMap({ drones, selectedId, onSelect }: Props) {
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

      // dark tactical background
      ctx.fillStyle = '#0a0f14';
      ctx.fillRect(0, 0, w, h);

      // grid lines
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.06)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0); ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y); ctx.lineTo(w, y);
        ctx.stroke();
      }

      // major grid
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.12)';
      for (let x = 0; x < w; x += gridSize * 4) {
        ctx.beginPath();
        ctx.moveTo(x, 0); ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize * 4) {
        ctx.beginPath();
        ctx.moveTo(0, y); ctx.lineTo(w, y);
        ctx.stroke();
      }

      // compass rose
      const cx = w - 50;
      const cy = 50;
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)';
      ctx.beginPath();
      ctx.arc(cx, cy, 25, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(34, 211, 238, 0.5)';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('N', cx, cy - 28);
      ctx.fillText('S', cx, cy + 35);
      ctx.fillText('W', cx - 32, cy + 4);
      ctx.fillText('E', cx + 32, cy + 4);
      // needle
      ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 20);
      ctx.lineTo(cx - 4, cy);
      ctx.lineTo(cx + 4, cy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(100, 116, 139, 0.6)';
      ctx.beginPath();
      ctx.moveTo(cx, cy + 20);
      ctx.lineTo(cx - 4, cy);
      ctx.lineTo(cx + 4, cy);
      ctx.closePath();
      ctx.fill();

      // UGV position (center)
      const ugvX = w / 2;
      const ugvY = h / 2;
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ugvX, ugvY, 15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ugvX, ugvY, 30 + Math.sin(frame * 0.05) * 5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.15)';
      ctx.stroke();
      ctx.fillStyle = 'rgba(34, 211, 238, 0.8)';
      ctx.beginPath();
      ctx.arc(ugvX, ugvY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = 'rgba(34, 211, 238, 0.6)';
      ctx.textAlign = 'left';
      ctx.fillText('UGV-01', ugvX + 10, ugvY - 12);

      // range rings
      for (let r = 60; r < 200; r += 60) {
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.05)';
        ctx.beginPath();
        ctx.arc(ugvX, ugvY, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // radar sweep
      const sweepAngle = (frame * 0.03) % (Math.PI * 2);
      const sweepGrad = ctx.createConicGradient(sweepAngle, ugvX, ugvY);
      sweepGrad.addColorStop(0, 'rgba(34, 211, 238, 0.15)');
      sweepGrad.addColorStop(0.1, 'rgba(34, 211, 238, 0)');
      sweepGrad.addColorStop(1, 'rgba(34, 211, 238, 0)');
      ctx.fillStyle = sweepGrad;
      ctx.beginPath();
      ctx.arc(ugvX, ugvY, 180, 0, Math.PI * 2);
      ctx.fill();

      frame++;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  // map GPS coords to canvas — center on UGV, scale relative
  const BASE_LAT = 34.0522;
  const BASE_LNG = -118.2437;
  const SCALE = 8000; // pixels per degree

  const project = (lat: number, lng: number) => {
    const x = 320 + (lng - BASE_LNG) * SCALE;
    const y = 180 + (BASE_LAT - lat) * SCALE;
    return { x, y };
  };

  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-700/50 bg-slate-950">
      <canvas ref={canvasRef} width={640} height={360} className="h-full w-full" />

      {/* overlay trajectories and markers */}
      <div className="pointer-events-none absolute inset-0">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 640 360" preserveAspectRatio="none">
          {drones.map((drone) => {
            const colorMap: Record<string, string> = { low: '#34d399', medium: '#fbbf24', high: '#fb923c', critical: '#f87171' };
            const color = colorMap[drone.threatLevel];
            const isSelected = selectedId === drone.id;
            const points = drone.gpsTrail.map((p) => project(p.lat, p.lng));

            return (
              <g key={drone.id}>
                {/* GPS trail */}
                {points.length > 1 && (
                  <polyline
                    points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke={color}
                    strokeWidth={isSelected ? 2 : 1}
                    strokeOpacity={isSelected ? 0.8 : 0.4}
                    strokeDasharray="3 2"
                  />
                )}
                {/* launch estimate line */}
                {drone.launchEstimate && (
                  <line
                    x1={project(drone.gps.lat, drone.gps.lng).x}
                    y1={project(drone.gps.lat, drone.gps.lng).y}
                    x2={project(drone.launchEstimate.lat, drone.launchEstimate.lng).x}
                    y2={project(drone.launchEstimate.lat, drone.launchEstimate.lng).y}
                    stroke={color}
                    strokeWidth={1}
                    strokeOpacity={0.3}
                    strokeDasharray="5 3"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* drone markers */}
        {drones.map((drone) => {
          const c = THREAT_COLORS[drone.threatLevel];
          const pos = project(drone.gps.lat, drone.gps.lng);
          const isSelected = selectedId === drone.id;
          return (
            <div key={drone.id}>
              {/* launch estimate marker */}
              {drone.launchEstimate && (
                <div
                  className="absolute"
                  style={{
                    left: `${(project(drone.launchEstimate.lat, drone.launchEstimate.lng).x / 640) * 100}%`,
                    top: `${(project(drone.launchEstimate.lat, drone.launchEstimate.lng).y / 360) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div className="relative">
                    <div className={`h-6 w-6 rounded-full border-2 border-dashed ${c.border} ${c.bg} flex items-center justify-center`}>
                      <MapPin className={`h-3 w-3 ${c.text}`} />
                    </div>
                    <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-[7px] font-bold ${c.text}`}>
                      LAUNCH?
                    </div>
                  </div>
                </div>
              )}

              {/* drone position marker */}
              <div
                className="absolute cursor-pointer"
                style={{
                  left: `${(pos.x / 640) * 100}%`,
                  top: `${(pos.y / 360) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                onClick={() => onSelect(drone.id)}
              >
                <div className={`relative ${isSelected ? 'scale-125' : ''} transition-transform`}>
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${isSelected ? 'border-cyan-400 bg-cyan-400/20' : `${c.border} ${c.bg}`} ${isSelected ? 'shadow-lg shadow-cyan-500/50' : `shadow ${c.glow}`}`}>
                    <Navigation className={`h-2.5 w-2.5 ${isSelected ? 'text-cyan-400' : c.text}`} style={{ transform: `rotate(${drone.heading}deg)` }} />
                  </div>
                  {isSelected && (
                    <span className="absolute inset-0 animate-ping rounded-full border border-cyan-400/50" />
                  )}
                  <div className={`absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 px-1 text-[8px] font-bold ${isSelected ? 'text-cyan-400' : c.text}`}>
                    {drone.trackId}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* HUD */}
      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded bg-black/60 px-2 py-1">
        <Layers className="h-3 w-3 text-cyan-400" />
        <span className="font-mono text-[10px] text-slate-300">TACTICAL MAP · GRID 34N</span>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded bg-black/60 px-2 py-1">
        <Crosshair className="h-3 w-3 text-cyan-400" />
        <span className="font-mono text-[10px] text-slate-300">UGV-01: {formatCoord(BASE_LAT, BASE_LNG)}</span>
      </div>

      <div className="pointer-events-none absolute bottom-3 right-3 rounded bg-black/60 px-2 py-1">
        <p className="font-mono text-[10px] text-slate-400">SCALE 1:5000 · WGS84</p>
      </div>
    </div>
  );
}
