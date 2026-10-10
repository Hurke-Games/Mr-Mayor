import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { 
  Volume2, VolumeX, Monitor, HelpCircle, Compass, ChevronUp, ChevronDown, 
  ChevronLeft, ChevronRight, Home, LogOut, Maximize2, Minimize2, Wind, Smile, Vote 
} from 'lucide-react';
import { officeAudio } from './officeAudio';
import { useFullscreen } from '../../utils/fullscreen';

interface OfficeHUDProps {
  onSitAtDesk: () => void;
  onInteract: () => void;
  canInteract: boolean;
  interactionPrompt: string | null;
  onDirectionInput?: (dx: number, dy: number) => void;
  onReturnToMenu?: () => void;
  onStepDown?: () => void;
}

export const OfficeHUD: React.FC<OfficeHUDProps> = ({
  onSitAtDesk,
  onInteract,
  canInteract,
  interactionPrompt,
  onDirectionInput,
  onReturnToMenu,
  onStepDown,
}) => {
  const { state } = useGame();
  const [audioEnabled, setAudioEnabled] = useState(officeAudio.enabled);
  const [showHelp, setShowHelp] = useState(false);
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  const toggleAudio = () => {
    officeAudio.enabled = !audioEnabled;
    setAudioEnabled(!audioEnabled);
  };

  const dayNumber = Math.floor(state.date / 24) + 1;
  const latestNotification = state.notifications[0];
  const nextElectionDate = state.nextElectionDate || 43200;
  const remainingTicks = Math.max(0, nextElectionDate - state.date);
  const yearsUntilElection = (remainingTicks / 8640).toFixed(1);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-4 select-none z-30">
      {/* Top Header Bar */}
      <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3 sm:px-4 py-2.5 rounded-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-serif font-black text-sm shrink-0">
            MM
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-amber-400 uppercase">Mr. Mayor</span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-mono">Room 401</span>
            </div>
            <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight">Executive Office • New Veridia</h2>
          </div>
        </div>

        {/* Live Metrics - Fully displayed in full screen */}
        <div className="flex items-center gap-3 sm:gap-4 lg:gap-5 text-xs font-mono flex-wrap">
          <div className="flex flex-col">
            <span className="text-slate-400 text-[9px] uppercase font-sans">Date</span>
            <span className="text-white font-bold">Day {dayNumber}</span>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          <div className="flex flex-col">
            <span className="text-slate-400 text-[9px] uppercase font-sans">Treasury</span>
            <span className={`font-bold ${state.money < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              ${state.money.toLocaleString()}
            </span>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          <div className="flex flex-col">
            <span className="text-slate-400 text-[9px] uppercase font-sans">Population</span>
            <span className="text-slate-200 font-bold">{state.population.toLocaleString()}</span>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden md:block" />

          <div className="hidden sm:flex flex-col">
            <span className="text-slate-400 text-[9px] uppercase font-sans">Corruption</span>
            <span className={`font-bold ${state.corruption > 40 ? 'text-amber-400' : 'text-blue-400'}`}>
              {state.corruption}%
            </span>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden lg:block" />

          {/* Air Quality */}
          <div className="hidden md:flex flex-col">
            <span className="text-slate-400 text-[9px] uppercase font-sans flex items-center gap-1">
              <Wind size={10} className={(state.averagePollution || 0) > 40 ? 'text-purple-400' : 'text-emerald-400'} />
              Air Quality
            </span>
            <span className={`font-bold ${(state.averagePollution || 0) > 40 ? 'text-purple-300' : 'text-emerald-400'}`}>
              {state.averagePollution || 0} AQI
            </span>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden lg:block" />

          {/* Morale */}
          <div className="hidden lg:flex flex-col">
            <span className="text-slate-400 text-[9px] uppercase font-sans flex items-center gap-1">
              <Smile size={10} className={(state.cityMorale || 75) > 60 ? 'text-emerald-400' : 'text-amber-400'} />
              Morale
            </span>
            <span className="font-bold text-amber-300">
              {state.cityMorale || 75}%
            </span>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden xl:block" />

          {/* Election Cycle */}
          <div className="hidden xl:flex flex-col" title={`General Election in ${yearsUntilElection} years`}>
            <span className="text-slate-400 text-[9px] uppercase font-sans flex items-center gap-1">
              <Vote size={10} className="text-amber-400" />
              Election
            </span>
            <span className="font-bold text-amber-300">
              Term {state.termNumber || 1} • {yearsUntilElection}y
            </span>
          </div>
        </div>

        {/* Right Actions & Fullscreen Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen Mode" : "Enter Fullscreen Mode"}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          <button
            onClick={toggleAudio}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 cursor-pointer"
            title={audioEnabled ? 'Mute Office Audio' : 'Unmute Office Audio'}
          >
            {audioEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 cursor-pointer"
            title="Help & Movement Controls"
          >
            <HelpCircle size={15} />
          </button>

          {onReturnToMenu && (
            <button
              onClick={onReturnToMenu}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 text-xs font-semibold cursor-pointer"
              title="Return to Main Start Menu"
            >
              <Home size={13} className="text-amber-400" />
              <span className="hidden sm:inline">Main Menu</span>
            </button>
          )}

          {onStepDown && (
            <button
              onClick={onStepDown}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 hover:text-white transition-colors border border-rose-500/40 text-xs font-semibold cursor-pointer"
              title="Resign as Mayor and choose civilian career"
            >
              <LogOut size={13} className="text-rose-400" />
              <span className="hidden sm:inline">Step Down</span>
            </button>
          )}

          <button
            onClick={onSitAtDesk}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Monitor size={14} />
            <span>Sit at Desk</span>
          </button>
        </div>
      </div>

      {/* Floating Interaction Prompt in Center Screen if close to object */}
      {canInteract && interactionPrompt && (
        <div className="pointer-events-auto self-center mb-4 animate-bounce">
          <button
            onClick={onInteract}
            className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-amber-600/95 hover:bg-amber-500 text-white font-bold text-sm shadow-2xl border-2 border-amber-300 transition-transform active:scale-95 cursor-pointer backdrop-blur-sm"
          >
            <span className="bg-white text-amber-700 px-2 py-0.5 rounded text-xs font-mono font-black">E</span>
            <span>{interactionPrompt}</span>
          </button>
        </div>
      )}

      {/* Bottom Bar: News Ticker and On-screen Mobile Controls */}
      <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-3">
        {/* News Teletype Ticker */}
        <div className="pointer-events-auto w-full sm:max-w-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-4 py-2 rounded-lg shadow-lg flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-amber-400 shrink-0 text-xs font-bold font-mono">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>WIRE:</span>
          </div>
          <p className="text-xs text-slate-300 truncate font-mono">
            {latestNotification 
              ? `${latestNotification.title} — ${latestNotification.message}` 
              : "Municipal operations are active. Awaiting executive directives from the Mayor's desk."}
          </p>
        </div>

        {/* On-Screen Touch D-Pad for Mobile / Quick Navigation */}
        <div className="pointer-events-auto flex items-center gap-2 sm:hidden bg-slate-900/90 p-2 rounded-xl border border-slate-700 shadow-xl">
          <div className="grid grid-cols-3 gap-1 w-28 h-28">
            <div />
            <button
              onMouseDown={() => onDirectionInput?.(0, -1)}
              onTouchStart={() => onDirectionInput?.(0, -1)}
              className="bg-slate-800 active:bg-amber-600 text-white rounded flex items-center justify-center"
            >
              <ChevronUp size={18} />
            </button>
            <div />
            <button
              onMouseDown={() => onDirectionInput?.(-1, 0)}
              onTouchStart={() => onDirectionInput?.(-1, 0)}
              className="bg-slate-800 active:bg-amber-600 text-white rounded flex items-center justify-center"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={onInteract}
              className="bg-amber-600 active:bg-amber-500 text-white rounded font-black text-xs flex items-center justify-center font-mono"
            >
              E
            </button>
            <button
              onMouseDown={() => onDirectionInput?.(1, 0)}
              onTouchStart={() => onDirectionInput?.(1, 0)}
              className="bg-slate-800 active:bg-amber-600 text-white rounded flex items-center justify-center"
            >
              <ChevronRight size={18} />
            </button>
            <div />
            <button
              onMouseDown={() => onDirectionInput?.(0, 1)}
              onTouchStart={() => onDirectionInput?.(0, 1)}
              className="bg-slate-800 active:bg-amber-600 text-white rounded flex items-center justify-center"
            >
              <ChevronDown size={18} />
            </button>
            <div />
          </div>
        </div>

        {/* Desktop Controls Hint */}
        <div className="pointer-events-auto hidden sm:flex items-center gap-3 bg-slate-900/80 backdrop-blur border border-slate-800 px-3 py-1.5 rounded text-[11px] text-slate-400 font-mono">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">WASD</kbd> / 
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">Arrows</kbd> Walk
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">Click</kbd> to Move
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-amber-600 text-white rounded font-bold">E</kbd> Interact
          </span>
        </div>
      </div>

      {/* Controls / Info Modal */}
      {showHelp && (
        <div className="pointer-events-auto fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl max-w-md w-full shadow-2xl text-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Compass size={18} className="text-amber-400" />
                Office Navigation & Controls
              </h3>
              <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2 bg-slate-950 rounded border border-slate-800">
                <span>Walk Around</span>
                <span className="font-mono text-amber-400 font-bold">W, A, S, D / Arrow Keys</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-950 rounded border border-slate-800">
                <span>Click / Tap Anywhere</span>
                <span className="font-mono text-amber-400 font-bold">Walks to destination</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-950 rounded border border-slate-800">
                <span>Interact with Objects</span>
                <span className="font-mono text-amber-400 font-bold">Press [E] or Click Prompt</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-950 rounded border border-slate-800">
                <span>Executive Desk</span>
                <span className="font-mono text-emerald-400 font-bold">Opens Full City Management</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-950 rounded border border-slate-800">
                <span>Return to Office from Desk</span>
                <span className="font-mono text-amber-400 font-bold">Press [Esc] or Click Stand Up</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 italic">
              Explore your executive quarters: talk to Chief of Staff Arthur, inspect the faction power web, look out the panoramic window over the metropolis, or pour a scotch.
            </p>

            <button
              onClick={() => setShowHelp(false)}
              className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold text-xs"
            >
              Resume Mayoral Duties
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
