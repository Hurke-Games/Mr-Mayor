import React from 'react';
import { useGame } from '../../context/GameContext';
import { 
  Building2, 
  Briefcase, 
  ShieldAlert, 
  Newspaper, 
  X, 
  LogOut, 
  ArrowRight, 
  Clock, 
  Sparkles,
  Lock
} from 'lucide-react';
import { officeAudio } from './officeAudio';

interface StepDownModalProps {
  onClose: () => void;
}

export const StepDownModal: React.FC<StepDownModalProps> = ({ onClose }) => {
  const { dispatch } = useGame();

  const handleBecomeBusinessman = () => {
    officeAudio.playStandUp();
    dispatch({ type: 'STEP_DOWN_AS_MAYOR', payload: { targetRole: 'BUSINESSMAN' } });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-sans animate-in fade-in select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col text-slate-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-slate-900 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-md">
              <LogOut size={20} />
            </div>
            <div>
              <h3 className="font-serif font-bold text-white text-base sm:text-lg">
                Step Down from the Mayorship
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                Resign Office · Select Your Next Civilian Career Path
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
            <X size={18} />
          </button>
        </div>

        {/* Career Options List */}
        <div className="p-5 space-y-3.5 overflow-y-auto">
          <p className="text-xs text-slate-300 leading-relaxed">
            Relinquishing the executive seal of City Hall will transfer municipal governance to an interim Computer Mayor. Choose which role you wish to assume in New Veridia:
          </p>

          {/* Option 1: Businessman (Playable Now!) */}
          <div className="p-4 rounded-xl bg-slate-950 border-2 border-emerald-500/50 hover:border-emerald-500 transition-all space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0">
                  <Briefcase size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-serif font-bold text-white text-sm sm:text-base">
                      Businessman (Victor Vance Enterprises)
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold uppercase">
                      Playable Now
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Private Sector Commerce & Equities Market
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Step out onto Magnolia Boulevard at Vance Estate with $50,000 in seed capital. Acquire physical stores and factories, build a corporate empire, trade on the Veridia Stock Exchange, and lobby the computer mayor!
            </p>

            <button
              onClick={handleBecomeBusinessman}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
            >
              <span>Step Down & Become Businessman</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Option 2: Police Chief (Coming Soon) */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 opacity-75 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-serif font-bold text-slate-300 text-sm">
                      Police Chief (Law Enforcement)
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-semibold uppercase flex items-center gap-1">
                      <Lock size={10} /> Coming Soon
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    City Precincts & Organized Crime Balance
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Command the New Veridia Police Department. Deploy precinct cruisers, balance union demands, raid illicit operations, or accept dark slush payments.
            </p>

            <button
              disabled
              className="w-full py-2 px-4 rounded-xl bg-slate-800/60 text-slate-500 text-xs font-semibold cursor-not-allowed border border-slate-800"
            >
              Police Chief (In Development)
            </button>
          </div>

          {/* Option 3: Journalist (Coming Soon) */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 opacity-75 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Newspaper size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-serif font-bold text-slate-300 text-sm">
                      Journalist (The Daily Chronicle)
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-semibold uppercase flex items-center gap-1">
                      <Lock size={10} /> Coming Soon
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    Investigative Press & Public Opinion
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Head the city press corps. Investigate backroom contracts, expose corrupt officials, interview faction leaders, and manipulate front-page public headlines.
            </p>

            <button
              disabled
              className="w-full py-2 px-4 rounded-xl bg-slate-800/60 text-slate-500 text-xs font-semibold cursor-not-allowed border border-slate-800"
            >
              Journalist (In Development)
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 text-[11px]">
            You can always return to the Mayor role in future election campaigns.
          </span>
          <button
            onClick={() => {
              officeAudio.playClick();
              onClose();
            }}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
