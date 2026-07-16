import { useEffect, useRef, useState } from 'react';
import { useBorderScenario } from '../lib/useBorderScenario';
import type { Motherboard, BorderDrone } from '../lib/useBorderScenario';
import {
  Zap, Crosshair, Radio, Shield, ShieldAlert, Power, Activity,
  Target, Thermometer, SatelliteDish, AlertTriangle, CheckCircle2,
  Plane, RadioTower, Clock, RefreshCw, Skull
} from 'lucide-react';

export function OperationalDashboard() {
  const {
    motherboards, drones, neutralizationLog, status,
    scanning, scanTarget, startThermalScan, neutralizeMotherboard, resetScenario,
  } = useBorderScenario();

  const [selectedMB, setSelectedMB] = useState<string | null>(null);

  const selectedMotherboard = motherboards.find((m) => m.id === selectedMB) ?? null;
  const selectedDrones = drones.filter((d) => d.motherboardId === selectedMB);

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      {/* Top status bar */}
      <BorderStatusBar status={status} onReset={resetScenario} />

      {/* Main content */}
      <div className="flex flex-1 gap-2 overflow-hidden">
        {/* Left: Border thermal map */}
        <div className="flex flex-1 flex-col gap-2 overflow-hidden">
          <BorderThermalMap
            motherboards={motherboards}
            drones={drones}
            selectedMB={selectedMB}
            onSelectMB={setSelectedMB}
            scanning={scanning}
            scanTarget={scanTarget}
          />
          <NeutralizationLog events={neutralizationLog} />
        </div>

        {/* Right: Control panel */}
        <div className="flex w-[380px] flex-shrink-0 flex-col gap-2 overflow-hidden">
          <MotherboardControlPanel
            motherboard={selectedMotherboard}
            drones={selectedDrones}
            scanning={scanning}
            scanTarget={scanTarget}
            onScan={startThermalScan}
            onNeutralize={neutralizeMotherboard}
          />
          <DroneSwarmPanel drones={drones} motherboards={motherboards} />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Border Status Bar
// ============================================================
function BorderStatusBar({
  status, onReset,
}: {
  status: ReturnType<typeof useBorderScenario>['status'];
  onReset: () => void;
}) {
  const threatColors = {
    safe: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', text: 'text-emerald-400', label: 'NOMINAL' },
    elevated: { bg: 'bg-amber-500/10', border: 'border-amber-500/40', text: 'text-amber-400', label: 'ELEVATED' },
    high: { bg: 'bg-orange-500/10', border: 'border-orange-500/40', text: 'text-orange-400', label: 'HIGH' },
    critical: { bg: 'bg-red-500/10', border: 'border-red-500/40', text: 'text-red-400', label: 'CRITICAL' },
  };
  const tc = threatColors[status.threatLevel];

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-2">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className={`h-5 w-5 ${tc.text}`} />
          <div>
            <p className="text-[10px] tracking-widest text-slate-500">SECTOR RAJASTHAN-GUJARAT · INDIA-PAKISTAN BORDER</p>
            <p className="text-sm font-bold text-white">OPERATIONAL COUNTER-UAS DASHBOARD</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 rounded-md border ${tc.border} ${tc.bg} px-2.5 py-1`}>
          <span className="flex h-2 w-2">
            <span className={`absolute inline-flex h-2 w-2 animate-ping rounded-full ${tc.text.replace('text-', 'bg-')} opacity-75`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${tc.text.replace('text-', 'bg-')}`} />
          </span>
          <span className={`text-[11px] font-bold tracking-widest ${tc.text}`}>THREAT: {tc.label}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Stat icon={Plane} label="Active Drones" value={status.activeDrones} color="text-orange-400" />
        <Stat icon={Skull} label="Disabled" value={status.disabledDrones} color="text-slate-400" />
        <Stat icon={RadioTower} label="Motherboards" value={status.motherboardsDetected} color="text-amber-400" />
        <Stat icon={Zap} label="Neutralized" value={status.motherboardsNeutralized} color="text-cyan-400" />
        <Stat icon={Clock} label="Uptime" value={formatTime(status.uptime)} color="text-slate-300" />
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/50 px-2.5 py-1.5 text-[10px] font-bold tracking-wider text-slate-300 transition-colors hover:bg-slate-700/50 hover:text-white"
        >
          <RefreshCw className="h-3 w-3" />
          RESET SCENARIO
        </button>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }: { icon: typeof Plane; label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`h-3.5 w-3.5 ${color}`} />
      <div className="leading-none">
        <p className="text-[8px] tracking-widest text-slate-600">{label}</p>
        <p className={`font-mono text-xs font-bold ${color}`}>{value}</p>
      </div>
    </div>
  );
}

// ============================================================
// Border Thermal Map
// ============================================================
function BorderThermalMap({
  motherboards, drones, selectedMB, onSelectMB, scanning, scanTarget,
}: {
  motherboards: Motherboard[];
  drones: BorderDrone[];
  selectedMB: string | null;
  onSelectMB: (id: string) => void;
  scanning: boolean;
  scanTarget: string | null;
}) {
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

      // Thermal gradient background — cold at edges, warm at center
      const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, 50, w * 0.5, h * 0.5, w * 0.7);
      grad.addColorStop(0, '#1a0a20');
      grad.addColorStop(0.4, '#0d0a18');
      grad.addColorStop(1, '#050508');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      // Border line (vertical, at center)
      const borderX = w * 0.5;
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(borderX, 0);
      ctx.lineTo(borderX, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // Border labels
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
      ctx.textAlign = 'left';
      ctx.fillText('◄ PAKISTAN', 8, 16);
      ctx.textAlign = 'right';
      ctx.fillText('INDIA ►', w - 8, 16);

      // Border zone markers
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.fillRect(borderX - 3, 0, 6, h);

      // Terrain heat blobs (Pakistan side — warmer)
      for (let i = 0; i < 4; i++) {
        const cx = w * (0.15 + i * 0.08);
        const cy = h * (0.3 + Math.sin(i * 1.5) * 0.2);
        const r = 40 + Math.sin(frame * 0.01 + i) * 8;
        const hg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        hg.addColorStop(0, 'rgba(80, 30, 60, 0.2)');
        hg.addColorStop(1, 'rgba(80, 30, 60, 0)');
        ctx.fillStyle = hg;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      }

      // Noise
      ctx.globalAlpha = 0.03;
      for (let i = 0; i < 60; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#ff6b35' : '#ff9500';
        ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
      }
      ctx.globalAlpha = 1;

      // Scanning sweep (if scanning)
      if (scanning && scanTarget) {
        const mb = motherboards.find((m) => m.id === scanTarget);
        if (mb) {
          const sx = mb.screenPos.x * w;
          const sy = mb.screenPos.y * h;
          const sweepRadius = (frame % 60) * 3;
          ctx.strokeStyle = `rgba(255, 200, 0, ${Math.max(0, 1 - sweepRadius / 180)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(sx, sy, sweepRadius, 0, Math.PI * 2);
          ctx.stroke();

          // Crosshair
          ctx.strokeStyle = 'rgba(255, 200, 0, 0.6)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(sx - 30, sy); ctx.lineTo(sx + 30, sy);
          ctx.moveTo(sx, sy - 30); ctx.lineTo(sx, sy + 30);
          ctx.stroke();
        }
      }

      // Radar sweep from India side
      const sweepAngle = (frame * 0.02) % (Math.PI * 2);
      const sweepGrad = ctx.createConicGradient(sweepAngle, borderX + 50, h * 0.5);
      sweepGrad.addColorStop(0, 'rgba(34, 211, 238, 0.08)');
      sweepGrad.addColorStop(0.08, 'rgba(34, 211, 238, 0)');
      sweepGrad.addColorStop(1, 'rgba(34, 211, 238, 0)');
      ctx.fillStyle = sweepGrad;
      ctx.beginPath();
      ctx.arc(borderX + 50, h * 0.5, 250, 0, Math.PI * 2);
      ctx.fill();

      frame++;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [scanning, scanTarget, motherboards]);

  return (
    <div className="relative flex-1 overflow-hidden rounded-lg border border-slate-700/50 bg-black min-h-0">
      <canvas ref={canvasRef} width={800} height={500} className="h-full w-full" />

      {/* Drone overlays */}
      <div className="pointer-events-none absolute inset-0">
        {drones.map((drone) => {
          const isDisabled = drone.status === 'disabled';
          const isHovering = drone.status === 'hovering';
          const color = isDisabled ? '#64748b' : isHovering ? '#f87171' : '#fb923c';
          return (
            <div
              key={drone.id}
              className="absolute"
              style={{
                left: `${drone.screenPos.x * 100}%`,
                top: `${drone.screenPos.y * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* Trail */}
              {drone.screenTrail.length > 1 && (
                <svg className="absolute inset-0 overflow-visible" style={{ width: '800px', height: '500px', left: `-${drone.screenPos.x * 800}px`, top: `-${drone.screenPos.y * 500}px` }}>
                  <polyline
                    points={drone.screenTrail.map((p) => `${p.x * 800},${p.y * 500}`).join(' ')}
                    fill="none"
                    stroke={color}
                    strokeWidth={1}
                    strokeOpacity={isDisabled ? 0.15 : 0.4}
                    strokeDasharray="2 2"
                  />
                </svg>
              )}
              {/* Drone icon */}
              <div className="relative" style={{ opacity: isDisabled ? 0.4 : 1 }}>
                <div
                  className="flex h-4 w-4 items-center justify-center rounded-full border"
                  style={{ borderColor: color, background: `${color}20` }}
                >
                  <Plane className="h-2 w-2" style={{ color, transform: `rotate(${drone.heading}deg)` }} />
                </div>
                {isDisabled && <Skull className="absolute -right-2 -top-2 h-2.5 w-2.5 text-slate-500" />}
                {isHovering && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 animate-pulse text-[7px] font-bold text-red-400">
                    !
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Motherboard overlays */}
        {motherboards.map((mb) => {
          const isSelected = selectedMB === mb.id;
          const isDetected = mb.status === 'detected' || mb.status === 'neutralized';
          const isNeutralized = mb.status === 'neutralized';
          const color = isNeutralized ? '#64748b' : isDetected ? '#fbbf24' : '#94a3b8';

          return (
            <div
              key={mb.id}
              className="absolute cursor-pointer"
              style={{
                left: `${mb.screenPos.x * 100}%`,
                top: `${mb.screenPos.y * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
              onClick={() => onSelectMB(mb.id)}
            >
              <div className={`relative transition-transform ${isSelected ? 'scale-125' : ''}`}>
                {/* Thermal glow if detected */}
                {isDetected && !isNeutralized && (
                  <div
                    className="absolute inset-0 rounded-full blur-md"
                    style={{ background: `radial-gradient(circle, ${color}80 0%, transparent 70%)`, width: '40px', height: '40px', left: '-20px', top: '-20px' }}
                  />
                )}

                {/* Motherboard icon */}
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${isSelected ? 'ring-2 ring-cyan-400/50' : ''}`}
                  style={{ borderColor: color, background: isNeutralized ? '#1e293b' : `${color}20` }}
                >
                  {isNeutralized ? (
                    <Skull className="h-3.5 w-3.5 text-slate-500" />
                  ) : isDetected ? (
                    <RadioTower className="h-3.5 w-3.5" style={{ color }} />
                  ) : (
                    <RadioTower className="h-3.5 w-3.5 text-slate-500" />
                  )}
                </div>

                {/* Label */}
                <div
                  className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 px-1 text-[8px] font-bold"
                  style={{ color }}
                >
                  {mb.trackId}
                  {isNeutralized && ' · OFF'}
                </div>

                {/* Scan progress ring */}
                {scanning && scanTarget === mb.id && mb.scanProgress < 100 && (
                  <svg className="absolute -inset-1 h-9 w-9 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,200,0,0.2)" strokeWidth="2" />
                    <circle
                      cx="18" cy="18" r="16" fill="none" stroke="#fbbf24" strokeWidth="2"
                      strokeDasharray={`${(mb.scanProgress / 100) * 100.5} 100.5`}
                      strokeLinecap="round"
                    />
                  </svg>
                )}

                {/* Selected indicator */}
                {isSelected && (
                  <span className="absolute inset-0 animate-ping rounded-full border border-cyan-400/40" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* HUD */}
      <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 rounded bg-black/60 px-2 py-1">
          <Thermometer className="h-3 w-3 text-orange-400" />
          <span className="font-mono text-[10px] text-slate-300">THERMAL RECON · LWIR 8-14μm</span>
        </div>
        <div className="flex items-center gap-1.5 rounded bg-black/60 px-2 py-1">
          <SatelliteDish className="h-3 w-3 text-cyan-400" />
          <span className="font-mono text-[10px] text-slate-300">SAT-LINK · ISRO GSAT-7A</span>
        </div>
      </div>

      <div className="pointer-events-none absolute right-3 top-3 rounded bg-black/60 px-2 py-1">
        <p className="font-mono text-[10px] text-slate-300">27.0000°N 70.0000°E · BORDER GRID</p>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded bg-black/60 px-2 py-1">
        <Crosshair className="h-3 w-3 text-cyan-400" />
        <span className="font-mono text-[10px] text-slate-300">{drones.length} targets · {motherboards.length} control stations</span>
      </div>

      {/* Legend */}
      <div className="pointer-events-none absolute bottom-3 right-3 flex flex-col gap-1 rounded bg-black/60 px-2 py-1.5">
        <LegendItem color="#fb923c" label="Incoming Drone" />
        <LegendItem color="#f87171" label="Border Breach" />
        <LegendItem color="#fbbf24" label="Detected Motherboard" />
        <LegendItem color="#64748b" label="Neutralized" />
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      <span className="text-[8px] text-slate-400">{label}</span>
    </div>
  );
}

// ============================================================
// Motherboard Control Panel
// ============================================================
function MotherboardControlPanel({
  motherboard, drones, scanning, scanTarget, onScan, onNeutralize,
}: {
  motherboard: Motherboard | null;
  drones: BorderDrone[];
  scanning: boolean;
  scanTarget: string | null;
  onScan: (id: string) => void;
  onNeutralize: (id: string) => void;
}) {
  if (!motherboard) {
    return (
      <div className="flex flex-1 flex-col rounded-lg border border-slate-700/50 bg-slate-900/50">
        <div className="flex items-center gap-2 border-b border-slate-700/50 px-3 py-2">
          <RadioTower className="h-4 w-4 text-amber-400" />
          <h2 className="text-xs font-bold tracking-wider text-white">MOTHERBOARD CONTROL</h2>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-slate-600">
          <RadioTower className="h-10 w-10" />
          <p className="text-xs">No motherboard selected</p>
          <p className="text-[10px] text-slate-700">Click a control station on the map to begin</p>
        </div>
      </div>
    );
  }

  const isDetected = motherboard.status === 'detected';
  const isNeutralized = motherboard.status === 'neutralized';
  const isScanning = scanning && scanTarget === motherboard.id;
  const activeDrones = drones.filter((d) => d.status !== 'disabled').length;

  return (
    <div className="flex flex-1 flex-col rounded-lg border border-slate-700/50 bg-slate-900/50 overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-700/50 px-3 py-2">
        <div className="flex items-center gap-2">
          <RadioTower className="h-4 w-4 text-amber-400" />
          <h2 className="text-xs font-bold tracking-wider text-white">MOTHERBOARD CONTROL</h2>
        </div>
        <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
          isNeutralized ? 'bg-slate-500/20 text-slate-400' :
          isDetected ? 'bg-amber-500/20 text-amber-400' :
          'bg-slate-700/30 text-slate-400'
        }`}>
          {motherboard.trackId}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {/* Status banner */}
        <div className={`mb-3 rounded-lg border p-3 ${
          isNeutralized ? 'border-slate-600/50 bg-slate-800/30' :
          isDetected ? 'border-amber-500/40 bg-amber-500/10' :
          'border-slate-700/50 bg-slate-800/30'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] tracking-widest text-slate-500">CONTROL STATION STATUS</p>
              <p className={`text-lg font-bold ${
                isNeutralized ? 'text-slate-400' : isDetected ? 'text-amber-400' : 'text-slate-300'
              }`}>
                {isNeutralized ? 'NEUTRALIZED' : isDetected ? 'THERMALLY DETECTED' : 'UNKNOWN SIGNAL'}
              </p>
            </div>
            <div>
              {isNeutralized ? (
                <CheckCircle2 className="h-8 w-8 text-slate-500" />
              ) : isDetected ? (
                <Target className="h-8 w-8 text-amber-400" />
              ) : (
                <Radio className="h-8 w-8 text-slate-500" />
              )}
            </div>
          </div>
          {isNeutralized && motherboard.neutralizedAt && (
            <p className="mt-1 text-[10px] text-slate-500">
              Neutralized at {new Date(motherboard.neutralizedAt).toLocaleTimeString('en-US', { hour12: false })} UTC
            </p>
          )}
        </div>

        {/* GPS coordinates */}
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-2.5">
            <p className="text-[9px] tracking-widest text-slate-500">LATITUDE</p>
            <p className="font-mono text-sm font-bold text-slate-200">{motherboard.lat.toFixed(4)}°N</p>
          </div>
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-2.5">
            <p className="text-[9px] tracking-widest text-slate-500">LONGITUDE</p>
            <p className="font-mono text-sm font-bold text-slate-200">{motherboard.lng.toFixed(4)}°E</p>
          </div>
        </div>

        {/* Thermal signature */}
        <div className="mb-3 rounded-lg border border-slate-700/50 bg-slate-800/30 p-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[10px] tracking-widest text-slate-500">THERMAL SIGNATURE</p>
            <p className="font-mono text-sm font-bold text-orange-400">
              {isDetected || isNeutralized ? `${(motherboard.thermalSignature * 100).toFixed(0)}%` : 'SCANNING...'}
            </p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300"
              style={{ width: `${(isDetected || isNeutralized ? motherboard.thermalSignature : 0) * 100}%` }}
            />
          </div>
        </div>

        {/* Connected drones */}
        <div className="mb-3 rounded-lg border border-slate-700/50 bg-slate-800/30 p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] tracking-widest text-slate-500">CONNECTED DRONES</p>
            <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[9px] font-bold text-orange-400">
              {activeDrones} ACTIVE
            </span>
          </div>
          <div className="space-y-1">
            {drones.length === 0 ? (
              <p className="text-[10px] text-slate-600">No drones connected</p>
            ) : (
              drones.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <Plane className={`h-2.5 w-2.5 ${d.status === 'disabled' ? 'text-slate-600' : 'text-orange-400'}`} />
                    <span className="font-mono text-slate-300">{d.trackId}</span>
                  </div>
                  <span className={`font-bold ${d.status === 'disabled' ? 'text-slate-600' : d.status === 'hovering' ? 'text-red-400' : 'text-orange-400'}`}>
                    {d.status.toUpperCase()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          {/* Thermal Scan button */}
          <button
            disabled={isNeutralized || isDetected || isScanning}
            onClick={() => onScan(motherboard.id)}
            className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-bold tracking-wider transition-all ${
              isNeutralized || isDetected
                ? 'cursor-not-allowed border-slate-700 bg-slate-800/30 text-slate-600'
                : isScanning
                ? 'cursor-wait border-amber-500/40 bg-amber-500/10 text-amber-400'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:shadow-lg hover:shadow-amber-500/20'
            }`}
          >
            {isScanning ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                SCANNING... {motherboard.scanProgress}%
              </>
            ) : (
              <>
                <Thermometer className="h-4 w-4" />
                {isDetected ? 'THERMAL SCAN COMPLETE' : isNeutralized ? 'STATION OFFLINE' : 'INITIATE THERMAL SCAN'}
              </>
            )}
          </button>

          {/* Neutralize button */}
          {isDetected && !isNeutralized && (
            <button
              onClick={() => onNeutralize(motherboard.id)}
              className="group flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-3 text-sm font-bold tracking-wider text-red-400 transition-all hover:bg-red-500/20 hover:shadow-lg hover:shadow-red-500/30"
            >
              <Power className="h-5 w-5 transition-transform group-hover:scale-110" />
              NEUTRALIZE MOTHERBOARD
              <Zap className="h-4 w-4" />
            </button>
          )}

          {isNeutralized && (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-600/50 bg-slate-800/30 px-3 py-3 text-sm font-bold text-slate-400">
              <CheckCircle2 className="h-5 w-5 text-slate-500" />
              STATION NEUTRALIZED — ALL DRONES DISABLED
            </div>
          )}

          {isScanning && (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[10px] text-amber-400">
              <Activity className="h-3 w-3 animate-pulse" />
              Thermal sensor sweeping target area... Detecting heat signature...
            </div>
          )}
        </div>

        {/* Info note */}
        <div className="mt-3 rounded-lg border border-slate-700/50 bg-slate-800/20 p-2.5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-3 w-3 flex-shrink-0 text-amber-400 mt-0.5" />
            <p className="text-[9px] leading-relaxed text-slate-500">
              Thermal scan detects ground control station via sustained heat signature.
              Neutralization sends EW jammer signal to disable motherboard, cutting control
              to all connected drones simultaneously.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Drone Swarm Panel
// ============================================================
function DroneSwarmPanel({ drones, motherboards }: { drones: BorderDrone[]; motherboards: Motherboard[] }) {
  const sorted = [...drones].sort((a, b) => {
    const order = { disabled: 3, retreating: 2, hovering: 0, incoming: 1 };
    return order[a.status] - order[b.status];
  });

  return (
    <div className="flex max-h-[40%] flex-col rounded-lg border border-slate-700/50 bg-slate-900/50 overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-700/50 px-3 py-2">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-orange-400" />
          <h2 className="text-xs font-bold tracking-wider text-white">DRONE SWARM</h2>
        </div>
        <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[9px] font-bold text-orange-400">
          {drones.length} TOTAL
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[10px] text-slate-600">
            No drones in sector
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {sorted.map((drone) => {
              const mb = motherboards.find((m) => m.id === drone.motherboardId);
              const isDisabled = drone.status === 'disabled';
              return (
                <div key={drone.id} className={`px-3 py-2 ${isDisabled ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Plane className={`h-3 w-3 ${isDisabled ? 'text-slate-600' : 'text-orange-400'}`} />
                      <span className="font-mono text-xs font-bold text-slate-200">{drone.trackId}</span>
                    </div>
                    <span className={`text-[9px] font-bold ${
                      drone.status === 'disabled' ? 'text-slate-600' :
                      drone.status === 'hovering' ? 'text-red-400' :
                      'text-orange-400'
                    }`}>
                      {drone.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[9px] text-slate-500">
                    <span>CTRL: {mb?.trackId ?? '???'}</span>
                    <span>{drone.speed.toFixed(0)}m/s · {drone.altitude.toFixed(0)}m</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Neutralization Log
// ============================================================
function NeutralizationLog({ events }: { events: ReturnType<typeof useBorderScenario>['neutralizationLog'] }) {
  return (
    <div className="flex max-h-[200px] flex-col rounded-lg border border-slate-700/50 bg-slate-900/50 overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-700/50 px-3 py-2">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-red-400" />
          <h2 className="text-xs font-bold tracking-wider text-white">NEUTRALIZATION LOG</h2>
        </div>
        <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold text-red-400">
          {events.length} ACTIONS
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <div className="flex h-full items-center justify-center gap-2 text-[10px] text-slate-600">
            <Shield className="h-4 w-4" />
            No neutralization actions recorded
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-2 px-3 py-2">
                <span className={`mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                  event.status === 'successful' ? 'bg-cyan-400' :
                  event.status === 'jamming' ? 'bg-amber-400 animate-pulse' :
                  event.status === 'initiated' ? 'bg-red-400 animate-pulse' :
                  'bg-slate-600'
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-slate-300">
                    <span className="font-bold text-red-400">EW JAMMER</span> → {event.trackId}
                  </p>
                  <div className="flex items-center gap-2 text-[9px] text-slate-600">
                    <span className={`font-bold ${
                      event.status === 'successful' ? 'text-cyan-400' :
                      event.status === 'jamming' ? 'text-amber-400' :
                      'text-red-400'
                    }`}>
                      {event.status.toUpperCase()}
                    </span>
                    <span>·</span>
                    <span>{event.dronesDisabled} drones disabled</span>
                    <span>·</span>
                    <span>{new Date(event.timestamp).toLocaleTimeString('en-US', { hour12: false })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
