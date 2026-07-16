import { useEffect, useRef } from 'react';
import type { Drone } from '../lib/types';
import { THREAT_COLORS } from '../lib/utils';
import { Camera, Maximize2, Crosshair } from 'lucide-react';

interface Props {
  drones: Drone[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function LiveFeed({ drones, selectedId, onSelect }: Props) {
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
      ctx.clearRect(0, 0, w, h);

      // dark gradient background simulating low-light camera
      const grad = ctx.createRadialGradient(w * 0.5, h * 0.4, 50, w * 0.5, h * 0.5, w * 0.7);
      grad.addColorStop(0, '#0a1a12');
      grad.addColorStop(0.5, '#050d09');
      grad.addColorStop(1, '#020403');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // horizon line
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.62);
      ctx.lineTo(w, h * 0.62);
      ctx.stroke();

      // terrain silhouette
      ctx.fillStyle = 'rgba(20, 40, 30, 0.4)';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.62);
      for (let x = 0; x <= w; x += 20) {
        const y = h * 0.62 + Math.sin(x * 0.02 + frame * 0.005) * 3 + Math.sin(x * 0.05) * 5;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // noise / scanlines
      ctx.globalAlpha = 0.03;
      for (let i = 0; i < 80; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        ctx.fillStyle = Math.random() > 0.5 ? '#22c55e' : '#16a34a';
        ctx.fillRect(x, y, 1, 1);
      }
      ctx.globalAlpha = 1;

      // scan line
      const scanY = (frame * 2) % h;
      const scanGrad = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
      scanGrad.addColorStop(0, 'rgba(34, 197, 94, 0)');
      scanGrad.addColorStop(0.5, 'rgba(34, 197, 94, 0.06)');
      scanGrad.addColorStop(1, 'rgba(34, 197, 94, 0)');
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 30, w, 60);

      // crosshair
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
      ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 40, 0, Math.PI * 2);
      ctx.stroke();

      // stars
      ctx.fillStyle = 'rgba(150, 200, 180, 0.3)';
      for (let i = 0; i < 30; i++) {
        const sx = (i * 37 + frame * 0.1) % w;
        const sy = (i * 53) % (h * 0.55);
        ctx.fillRect(sx, sy, 1, 1);
      }

      frame++;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-700/50 bg-black">
      <canvas ref={canvasRef} width={640} height={360} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-0">
        {drones.map((drone) => {
          const c = THREAT_COLORS[drone.threatLevel];
          const isSelected = selectedId === drone.id;
          return (
            <div
              key={drone.id}
              className={`absolute cursor-pointer transition-all duration-100 ${isSelected ? 'z-20' : 'z-10'}`}
              style={{
                left: `${drone.bbox.x * 100}%`,
                top: `${drone.bbox.y * 100}%`,
                width: `${drone.bbox.width * 100}%`,
                height: `${drone.bbox.height * 100}%`,
              }}
              onClick={() => onSelect(drone.id)}
            >
              <div className={`relative h-full w-full border-2 ${isSelected ? 'border-cyan-400' : c.border} ${c.bg} ${isSelected ? 'shadow-lg shadow-cyan-500/40' : `shadow-sm ${c.glow}`}`}>
                {/* corner brackets */}
                <span className={`absolute -left-px -top-px h-2 w-2 border-l-2 border-t-2 ${isSelected ? 'border-cyan-400' : c.border}`} />
                <span className={`absolute -right-px -top-px h-2 w-2 border-r-2 border-t-2 ${isSelected ? 'border-cyan-400' : c.border}`} />
                <span className={`absolute -left-px -bottom-px h-2 w-2 border-l-2 border-b-2 ${isSelected ? 'border-cyan-400' : c.border}`} />
                <span className={`absolute -right-px -bottom-px h-2 w-2 border-r-2 border-b-2 ${isSelected ? 'border-cyan-400' : c.border}`} />

                {/* center dot */}
                <span className={`absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full ${c.dot}`} />

                {/* label */}
                <div className={`absolute -top-5 left-0 flex items-center gap-1 whitespace-nowrap bg-black/80 px-1 py-0.5 text-[9px] font-bold tracking-wider ${c.text}`}>
                  <span>{drone.trackId}</span>
                  <span className="opacity-60">·</span>
                  <span>{(drone.confidence * 100).toFixed(0)}%</span>
                </div>

                {/* trail */}
                {drone.trail.length > 1 && (
                  <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" style={{ width: '640px', height: '360px', left: 0, top: 0 }}>
                    {drone.trail.map((p, i) => {
                      if (i === 0) return null;
                      const prev = drone.trail[i - 1];
                      const opacity = i / drone.trail.length;
                      return (
                        <line
                          key={i}
                          x1={prev.x * 640}
                          y1={prev.y * 360}
                          x2={p.x * 640}
                          y2={p.y * 360}
                          stroke={isSelected ? '#22d3ee' : c.dot.replace('bg-', '').includes('emerald') ? '#34d399' : c.dot.includes('amber') ? '#fbbf24' : c.dot.includes('orange') ? '#fb923c' : '#f87171'}
                          strokeWidth={1}
                          opacity={opacity * 0.5}
                        />
                      );
                    })}
                  </svg>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* HUD overlay */}
      <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 rounded bg-black/60 px-2 py-1">
          <span className="flex h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
          <span className="text-[10px] font-bold tracking-widest text-red-400">REC</span>
          <Camera className="h-3 w-3 text-slate-400" />
          <span className="font-mono text-[10px] text-slate-300">CAM-01 RGB EO/IR</span>
        </div>
        <div className="flex items-center gap-1.5 rounded bg-black/60 px-2 py-1">
          <Crosshair className="h-3 w-3 text-cyan-400" />
          <span className="font-mono text-[10px] text-slate-300">34.0522°N 118.2437°W</span>
        </div>
      </div>

      <div className="pointer-events-none absolute right-3 top-3 rounded bg-black/60 px-2 py-1">
        <p className="font-mono text-[10px] text-slate-300">ZOOM 12x · F/2.8 · ISO 1600</p>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded bg-black/60 px-2 py-1">
        <Maximize2 className="h-3 w-3 text-slate-400" />
        <span className="font-mono text-[10px] text-slate-300">1920×1080 · 30FPS · H.265</span>
      </div>

      <div className="pointer-events-none absolute bottom-3 right-3 rounded bg-black/60 px-2 py-1">
        <p className="font-mono text-[10px] text-slate-400">
          {drones.length} target{drones.length !== 1 ? 's' : ''} tracked
        </p>
      </div>
    </div>
  );
}
