import { useState, useEffect } from 'react';
import { Shield, ShieldAlert } from 'lucide-react';
import { useDroneSimulation } from './lib/useDroneSimulation';
import { Header } from './components/Header';
import { LiveFeed } from './components/LiveFeed';
import { ThermalView } from './components/ThermalView';
import { TacticalMap } from './components/TacticalMap';
import { ThreatPanel } from './components/ThreatPanel';
import { TelemetryPanel } from './components/TelemetryPanel';
import { EventLog } from './components/EventLog';
import { LaunchEstimation } from './components/LaunchEstimation';
import { OperationalDashboard } from './components/OperationalDashboard';

type Mode = 'demo' | 'operational';

export default function App() {
  const [mode, setMode] = useState<Mode>('demo');
  const { drones, events, status, dismissDrone } = useDroneSimulation();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (drones.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !drones.find((d) => d.id === selectedId)) {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      const top = [...drones].sort((a, b) => order[a.threatLevel] - order[b.threatLevel])[0];
      setSelectedId(top.id);
    }
  }, [drones, selectedId]);

  const selectedDrone = drones.find((d) => d.id === selectedId) ?? null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-950 text-slate-200">
      {/* Mode toggle bar */}
      <div className="flex items-center justify-between border-b border-slate-800/50 bg-slate-900/40 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('demo')}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[11px] font-bold tracking-wider transition-all ${
              mode === 'demo'
                ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400 shadow-sm shadow-cyan-500/20'
                : 'border-slate-700 bg-slate-800/30 text-slate-500 hover:text-slate-300'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            DEMO MODE
          </button>
          <button
            onClick={() => setMode('operational')}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[11px] font-bold tracking-wider transition-all ${
              mode === 'operational'
                ? 'border-red-500/40 bg-red-500/10 text-red-400 shadow-sm shadow-red-500/20'
                : 'border-slate-700 bg-slate-800/30 text-slate-500 hover:text-slate-300'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            OPERATIONAL MODE
            <span className="ml-1 flex h-1.5 w-1.5">
              {mode === 'operational' && (
                <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-red-400 opacity-75" />
              )}
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
            </span>
          </button>
        </div>
        <div className="flex items-center gap-2 text-[9px] tracking-widest text-slate-600">
          {mode === 'demo' ? (
            <span>SENTINEL-X C2 · SIMULATION ENVIRONMENT</span>
          ) : (
            <span className="text-red-500/70">SENTINEL-X C2 · LIVE OPERATIONAL · INDIA-PAKISTAN BORDER SECTOR</span>
          )}
        </div>
      </div>

      {mode === 'demo' ? (
        <>
          <Header status={status} />
          <main className="flex flex-1 gap-2 overflow-hidden p-2">
            <div className="flex flex-1 flex-col gap-2 overflow-hidden">
              <div className="grid flex-1 gap-2 lg:grid-cols-3">
                <div className="lg:col-span-2 min-h-0">
                  <LiveFeed drones={drones} selectedId={selectedId} onSelect={setSelectedId} />
                </div>
                <div className="min-h-0">
                  <ThermalView drones={drones} selectedId={selectedId} onSelect={setSelectedId} />
                </div>
              </div>
              <div className="h-[280px] flex-shrink-0">
                <TacticalMap drones={drones} selectedId={selectedId} onSelect={setSelectedId} />
              </div>
            </div>
            <div className="flex w-[340px] flex-shrink-0 flex-col gap-2 overflow-hidden">
              <div className="h-[45%] min-h-0 rounded-lg border border-slate-700/50 bg-slate-900/50">
                <ThreatPanel drones={drones} selectedId={selectedId} onSelect={setSelectedId} onDismiss={dismissDrone} />
              </div>
              <div className="h-[55%] min-h-0 rounded-lg border border-slate-700/50 bg-slate-900/50">
                <TelemetryPanel drone={selectedDrone} />
              </div>
            </div>
          </main>
          <div className="flex gap-2 px-2 pb-2" style={{ height: '220px' }}>
            <div className="flex-1 rounded-lg border border-slate-700/50 bg-slate-900/50">
              <EventLog liveEvents={events} />
            </div>
            <div className="w-[340px] flex-shrink-0 rounded-lg border border-slate-700/50 bg-slate-900/50">
              <LaunchEstimation drone={selectedDrone} />
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-hidden p-2">
          <OperationalDashboard />
        </div>
      )}
    </div>
  );
}
