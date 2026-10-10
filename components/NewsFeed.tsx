import React, { useEffect, useState, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { generateSimulationNewsReport } from '../utils/newsGenerator';
import { officeAudio } from './office/officeAudio';
import { Newspaper, RefreshCw, Radio, Flame, ShieldAlert, Sparkles } from 'lucide-react';

const NewsFeed: React.FC = () => {
  const { state, dispatch } = useGame();
  const [loading, setLoading] = useState(false);

  // Synthesize contextual simulation news report
  const fetchNews = useCallback(() => {
    if (loading) return;
    setLoading(true);
    officeAudio.playNewsTeletype();
    const report = generateSimulationNewsReport(state);
    dispatch({ type: 'ADD_NOTIFICATION', payload: report });
    setTimeout(() => {
      setLoading(false);
    }, 200);
  }, [loading, state, dispatch]);

  // Auto-generate news report periodically on day rollover (every 24 simulation ticks)
  useEffect(() => {
    if (state.date > 0 && state.date % 24 === 0) {
      const report = generateSimulationNewsReport(state);
      dispatch({ type: 'ADD_NOTIFICATION', payload: report });
    }
  }, [state.date, dispatch]);

  return (
    <div className="flex flex-col h-full bg-slate-900 select-none">
      <div className="bg-slate-800/90 p-3 flex justify-between items-center border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Radio size={14} className="animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-white text-xs tracking-wide flex items-center gap-1.5">
              <span>The Metropolis Wire</span>
              <span className="text-[9px] font-mono font-normal bg-slate-950 px-1.5 py-0.2 rounded border border-slate-700 text-amber-400">
                LIVE
              </span>
            </h3>
            <span className="text-[10px] text-slate-400">City Press & Intelligence Feed</span>
          </div>
        </div>

        <button 
          onClick={fetchNews}
          disabled={loading}
          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white text-[11px] font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-sm active:scale-95"
          title="Intercept breaking press wire dispatch"
        >
          <RefreshCw size={12} className={loading ? "animate-spin text-amber-400" : ""} />
          <span>Dispatch</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-0 custom-scrollbar flex flex-col divide-y divide-slate-800">
        {state.notifications.map((note) => {
          const isHighBias = note.bias > 60;
          const isIntel = note.source === 'Intel';
          return (
            <div 
              key={note.id} 
              className="p-3 hover:bg-slate-800/40 transition-colors group cursor-default"
            >
              <div className="flex justify-between items-start mb-1.5">
                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                  isIntel 
                    ? 'text-red-300 bg-red-950/60 border-red-800/60' 
                    : isHighBias 
                    ? 'text-amber-300 bg-amber-950/60 border-amber-800/60' 
                    : 'text-sky-300 bg-sky-950/60 border-sky-800/60'
                }`}>
                  {isIntel ? '🕵️ Confidential Intel' : note.source}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Day {Math.floor(note.date / 24) + 1}
                </span>
              </div>

              <h4 className="text-xs font-bold text-slate-100 leading-snug mb-1 group-hover:text-amber-300 transition-colors">
                {note.title}
              </h4>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                {note.message}
              </p>

              {isHighBias && (
                <div className="mt-2 text-[10px] text-amber-400/90 italic flex items-center gap-1 font-mono bg-amber-950/20 px-1.5 py-0.5 rounded border border-amber-900/30">
                  <ShieldAlert size={10} className="text-amber-400 shrink-0" />
                  <span>Journalistic reliability: Questionable municipal bias ({note.bias}%)</span>
                </div>
              )}
            </div>
          );
        })}
        
        {state.notifications.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
            <Newspaper size={24} className="text-slate-600" />
            <span>No dispatches recorded yet. Click 'Dispatch' to intercept wire news.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsFeed;

