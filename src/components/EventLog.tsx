import { useEffect, useState } from 'react';
import type { ThreatEvent } from '../lib/types';
import { supabase } from '../lib/supabase';
import { THREAT_COLORS } from '../lib/utils';
import { ScrollText, Database, RefreshCw } from 'lucide-react';

interface Props {
  liveEvents: ThreatEvent[];
}

interface DBEvent {
  id: string;
  drone_id: string;
  severity: string;
  description: string;
  timestamp: string;
}

export function EventLog({ liveEvents }: Props) {
  const [dbEvents, setDbEvents] = useState<DBEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'live' | 'db'>('live');

  useEffect(() => {
    loadFromDB();
  }, []);

  const loadFromDB = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('threat_events')
        .select('id, drone_id, severity, description, timestamp')
        .order('timestamp', { ascending: false })
        .limit(50);
      if (!error && data) setDbEvents(data as DBEvent[]);
    } catch {
      // non-fatal
    }
    setLoading(false);
  };

  const events = source === 'live' ? liveEvents : dbEvents.map((e) => ({
    id: e.id,
    drone_id: e.drone_id,
    track_id: '',
    severity: e.severity as ThreatEvent['severity'],
    description: e.description,
    timestamp: new Date(e.timestamp).getTime(),
  }));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-700/50 px-3 py-2">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-cyan-400" />
          <h2 className="text-xs font-bold tracking-wider text-white">EVENT LOG</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSource('live')}
            className={`rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider transition-colors ${
              source === 'live' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            LIVE
          </button>
          <button
            onClick={() => { setSource('db'); loadFromDB(); }}
            className={`rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider transition-colors ${
              source === 'db' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Database className="mr-0.5 inline h-2.5 w-2.5" />
            DB
          </button>
          {source === 'db' && (
            <button onClick={loadFromDB} className="text-slate-500 hover:text-cyan-400">
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-600">
            <ScrollText className="h-8 w-8" />
            <p className="text-xs">{loading ? 'Loading...' : 'No events recorded'}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {events.map((event) => {
              const c = THREAT_COLORS[event.severity];
              return (
                <div key={event.id} className="flex items-start gap-2 px-3 py-2 hover:bg-slate-800/30">
                  <span className={`mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full ${c.dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-slate-300">{event.description}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold ${c.text}`}>{event.severity.toUpperCase()}</span>
                      <span className="text-[9px] text-slate-600">
                        {new Date(event.timestamp).toLocaleTimeString('en-US', { hour12: false })} UTC
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-slate-700/50 px-3 py-1.5">
        <p className="text-[9px] text-slate-600">
          {source === 'live' ? 'Real-time detection stream' : `${dbEvents.length} records from database`}
        </p>
      </div>
    </div>
  );
}
