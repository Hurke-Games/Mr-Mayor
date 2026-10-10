import React from 'react';
import { useGame } from '../../context/GameContext';
import { 
  Home, 
  X, 
  Briefcase, 
  Building2, 
  Landmark, 
  TrendingUp, 
  Scale, 
  ShieldCheck, 
  ShieldAlert, 
  DoorOpen,
  Vote,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { officeAudio } from '../office/officeAudio';

interface HomeSanctuaryModalProps {
  onClose: () => void;
  onOpenPolitics: () => void;
  onOpenPortfolio: () => void;
}

export const HomeSanctuaryModal: React.FC<HomeSanctuaryModalProps> = ({
  onClose,
  onOpenPolitics,
  onOpenPortfolio,
}) => {
  const { state } = useGame();
  const bizman = state.businessman;
  const mayor = state.computerMayor;

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        officeAudio.playClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!bizman || !mayor) return null;

  const totalRevenue = bizman.businesses.reduce((sum, b) => sum + (b.isRaided ? 0 : b.dailyRevenue), 0);
  const isHonest = bizman.alignment >= 0;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-sans animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          officeAudio.playClick();
          onClose();
        }
      }}
    >
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-hidden flex flex-col select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
              <Home size={22} />
            </div>
            <div>
              <h3 className="font-serif font-bold text-white text-lg">
                Victor Vance Private Estate & Home Office
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                Westside Residential Boulevard · Private Sanctuary
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              officeAudio.playClick();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 text-sm text-slate-300 overflow-y-auto custom-scrollbar">
          <p className="text-xs text-slate-300 leading-relaxed">
            Welcome back to your private estate. Here you review confidential balance sheets, plan corporate acquisitions, coordinate City Hall lobbying, and manage your private wealth far from prying eyes.
          </p>

          {/* Quick Ledger */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col">
              <span className="text-[10px] text-slate-400 font-mono uppercase">Private Capital</span>
              <span className="text-xl font-mono font-bold text-emerald-400 mt-1">
                ${state.money.toLocaleString()}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col">
              <span className="text-[10px] text-slate-400 font-mono uppercase">Daily Cash Inflow</span>
              <span className="text-xl font-mono font-bold text-emerald-300 mt-1 flex items-center gap-1">
                <TrendingUp size={16} />
                +${totalRevenue.toLocaleString()}/day
              </span>
            </div>
          </div>

          {/* Alignment & Mayor Strategy Summary */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 uppercase">Empire Philosophy:</span>
              <span className={`font-bold ${isHonest ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isHonest ? 'Honest Commerce & Philanthropy' : 'Aggressive Shadow Cartel'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono border-t border-slate-800/80 pt-2">
              <span className="text-slate-400 uppercase">Current Mayor:</span>
              <span className="font-bold text-white font-serif">{mayor.name}</span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono border-t border-slate-800/80 pt-2">
              <span className="text-slate-400 uppercase">Mayoral Subsidies:</span>
              <span className="font-bold text-amber-300">{mayor.subsidyMeter}% Active</span>
            </div>
          </div>

          {/* Fast Navigation Buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                onClose();
                onOpenPortfolio();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-all flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Building2 size={15} className="text-emerald-400" />
                <span>Manage Commercial & Industrial Portfolio ({bizman.businesses.length})</span>
              </div>
              <ArrowRight size={14} className="text-slate-400" />
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenPolitics();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-all flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Landmark size={15} className="text-amber-400" />
                <span>City Hall Lobbying, Subsidies & Recall PAC</span>
              </div>
              <ArrowRight size={14} className="text-slate-400" />
            </button>

            <button
              onClick={() => {
                officeAudio.playStandUp();
                onClose();
              }}
              className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-emerald-500/20"
            >
              <DoorOpen size={16} />
              <span>Leave Home & Step Out onto Street (Magnolia Blvd)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
