import React from 'react';
import { useGame } from '../../context/GameContext';
import { 
  Briefcase, 
  TrendingUp, 
  Scale, 
  Landmark, 
  Building2, 
  ShieldAlert, 
  ShieldCheck, 
  Home, 
  ChevronRight,
  Vote,
  Sparkles,
  Zap,
  Percent,
  Hammer,
  Users,
  Activity,
  Wind,
  Play,
  Pause,
  FastForward,
  Clock,
  BarChart3,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { officeAudio } from '../office/officeAudio';
import { TICKS_PER_DAY, DAYS_PER_MONTH } from '../../constants';
import { useFullscreen } from '../../utils/fullscreen';

interface BusinessmanHUDProps {
  onOpenPolitics: () => void;
  onOpenPortfolio: () => void;
  onGoToHome: () => void;
  onReturnToMenu: () => void;
}

export const BusinessmanHUD: React.FC<BusinessmanHUDProps> = ({
  onOpenPolitics,
  onOpenPortfolio,
  onGoToHome,
  onReturnToMenu,
}) => {
  const { state, dispatch } = useGame();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const biz = state.businessman;
  const mayor = state.computerMayor;

  if (!biz || !mayor) return null;

  // Calendar & In-game clock calibration
  const totalDays = Math.floor(state.date / TICKS_PER_DAY);
  const currentYear = 1 + Math.floor(totalDays / (DAYS_PER_MONTH * 12));
  const currentMonthNum = 1 + (Math.floor(totalDays / DAYS_PER_MONTH) % 12);
  const currentDayInMonth = 1 + (totalDays % DAYS_PER_MONTH);
  const currentHour = state.date % TICKS_PER_DAY;
  const dayProgressPct = Math.round((currentHour / TICKS_PER_DAY) * 100);

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const monthLabel = monthNames[currentMonthNum - 1] || 'Jan';

  // Calculate total daily revenue
  const totalDailyRevenue = biz.businesses.reduce((sum, b) => sum + (b.isRaided ? 0 : b.dailyRevenue), 0);
  const totalEquitiesValue = biz.totalStockValue || 0;
  const honestCount = biz.businesses.filter(b => b.mode === 'HONEST').length;
  const corruptCount = biz.businesses.filter(b => b.mode === 'CORRUPT').length;

  // Alignment label and color
  const alignScore = biz.alignment;
  const isHonest = alignScore >= 15;
  const isCorrupt = alignScore <= -15;
  const alignLabel = isHonest ? 'Ethical Philanthropist' : isCorrupt ? 'Shadow Cartel Tycoon' : 'Pragmatic Enterprise';
  const alignColor = isHonest ? 'text-emerald-400' : isCorrupt ? 'text-amber-400' : 'text-slate-300';

  // Relation color
  const rel = mayor.relationWithPlayer;
  const isMayorAlly = rel >= 30;
  const isMayorHostile = rel <= -25;
  const relText = isMayorAlly ? `Staunch Ally (+${rel})` : isMayorHostile ? `Hostile Adversary (${rel})` : `Neutral Relations (${rel})`;
  const relColor = isMayorAlly ? 'text-emerald-400' : isMayorHostile ? 'text-rose-400' : 'text-slate-300';

  return (
    <div className="absolute top-3 left-3 right-3 z-30 pointer-events-none flex flex-wrap items-start justify-between gap-2.5 font-sans">
      {/* 1. Left Corporate Financial Card */}
      <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl p-2.5 sm:p-3 flex items-center gap-3 shrink-0">
        {/* Businessman Avatar / Monogram */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-slate-900 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shadow-md">
            <Briefcase size={20} />
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center">
            {isHonest ? (
              <ShieldCheck size={10} className="text-emerald-400" />
            ) : isCorrupt ? (
              <ShieldAlert size={10} className="text-amber-400" />
            ) : (
              <Scale size={10} className="text-slate-400" />
            )}
          </div>
        </div>

        {/* Corporate Treasury & Balance */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-serif font-bold text-white tracking-wide">
              Victor Vance Enterprises
            </span>
            <span className="text-[10px] text-slate-500 font-mono">·</span>
            <span className={`text-[10px] font-semibold ${alignColor}`}>
              {alignLabel}
            </span>
          </div>

          <div className="flex items-baseline gap-2.5 mt-0.5">
            <span className="text-lg font-mono font-extrabold text-emerald-400 tracking-tight">
              ${state.money.toLocaleString()}
            </span>
            <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-300/90 font-medium">
              <TrendingUp size={11} className="text-emerald-400" />
              <span>+${totalDailyRevenue.toLocaleString()}/day</span>
            </div>
          </div>

          {/* Alignment Meter Bar */}
          <div className="w-44 bg-slate-950 h-1.5 rounded-full overflow-hidden mt-1 border border-slate-800 flex">
            {/* Left Corrupt half (red/amber), Right Honest half (emerald) */}
            <div 
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${Math.max(0, -alignScore / 2)}%` }}
            />
            <div className="h-full flex-1 bg-slate-900" />
            <div 
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${Math.max(0, alignScore / 2)}%` }}
            />
          </div>
        </div>

        {/* Quick Portfolio Button */}
        <button
          onClick={() => {
            officeAudio.playClick();
            onOpenPortfolio();
          }}
          className="ml-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-slate-200 hover:text-white transition-all flex items-center gap-1 shadow-sm cursor-pointer"
        >
          <Building2 size={13} className="text-emerald-400" />
          <span>Holdings ({biz.businesses.length})</span>
        </button>

        {/* Quick Stocks Button */}
        <button
          onClick={() => {
            officeAudio.playClick();
            onOpenPortfolio();
          }}
          className="px-2.5 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/40 text-xs font-semibold text-emerald-300 hover:text-white transition-all flex items-center gap-1 shadow-sm cursor-pointer"
          title="Open Veridia Stock Exchange"
        >
          <TrendingUp size={13} className="text-emerald-400" />
          <span>Stocks (${Math.round(totalEquitiesValue).toLocaleString()})</span>
        </button>

        {/* Home Estate Quick Navigation */}
        <button
          onClick={() => {
            officeAudio.playClick();
            onGoToHome();
          }}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
          title="Return to Private Residence & Executive Home Office"
        >
          <Home size={14} className="text-amber-400" />
        </button>
      </div>

      {/* Center Mayoral Public Works & Speed Control Banner */}
      <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl px-3 py-2 flex flex-col items-center gap-1 shrink-0">
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <Hammer size={12} className={mayor.alignment === 'HONEST' ? 'text-emerald-400' : 'text-amber-400'} />
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">
            City Hall Public Works:
          </span>
          <span className="text-white font-semibold truncate max-w-[180px]" title={mayor.currentProject || mayor.lastActionText}>
            {mayor.currentProject || 'Zoning & Infrastructure'}
          </span>
        </div>

        {/* Calendar & Time Options */}
        <div className="flex items-center gap-2 text-[10px] font-mono pt-1 border-t border-slate-800/80 w-full justify-between">
          <div className="flex items-center gap-1 text-slate-300">
            <Clock size={11} className="text-amber-400" />
            <span className="font-bold">{monthLabel} {currentDayInMonth}</span>
            <span className="text-slate-500 text-[9px]">Yr {currentYear}</span>
          </div>

          {/* Speed Buttons */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => dispatch({ type: 'SET_SPEED', payload: 0 })}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer ${
                state.speed === 0 ? 'bg-red-500/25 text-red-300 border border-red-500/40' : 'text-slate-400 hover:text-white'
              }`}
              title="Pause"
            >
              <Pause size={10} />
            </button>
            <button
              onClick={() => dispatch({ type: 'SET_SPEED', payload: 1 })}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer ${
                state.speed === 1 ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-white'
              }`}
              title="1x Normal Speed"
            >
              1x
            </button>
            <button
              onClick={() => dispatch({ type: 'SET_SPEED', payload: 2 })}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer ${
                state.speed === 2 ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'
              }`}
              title="2x Double Speed"
            >
              2x
            </button>
            <button
              onClick={() => dispatch({ type: 'SET_SPEED', payload: 4 })}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer ${
                state.speed >= 4 ? 'bg-blue-500/25 text-blue-300 border border-blue-500/40' : 'text-slate-400 hover:text-white'
              }`}
              title="4x High Speed"
            >
              4x
            </button>
          </div>
        </div>
      </div>

      {/* 2. Right Computer Mayor & Subsidy Meter Card */}
      <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl p-2.5 sm:p-3 flex items-center gap-3 shrink-0">
        {/* City Hall / Mayor Seal */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600/30 to-slate-900 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md shrink-0">
          <Landmark size={20} />
        </div>

        {/* Mayor Information & Subsidy Meter */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-serif font-bold text-white">
              {mayor.name}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">·</span>
            <span className={`text-[9px] font-mono uppercase font-bold tracking-wider ${
              mayor.alignment === 'HONEST' ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {mayor.alignment === 'HONEST' ? 'Reformer' : 'Machine Boss'}
            </span>
          </div>

          {/* Subsidy Meter Bar */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-slate-400 font-sans">
              Subsidy Meter:
            </span>
            <div className="w-24 bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
              <div 
                className={`h-full transition-all duration-500 ${
                  mayor.alignment === 'HONEST' 
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' 
                    : 'bg-gradient-to-r from-amber-600 to-amber-400'
                }`}
                style={{ width: `${mayor.subsidyMeter}%` }}
              />
            </div>
            <span className="text-[11px] font-mono font-bold text-amber-300">
              {mayor.subsidyMeter}%
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[9px] text-slate-400 mt-0.5">
            <span>Relations:</span>
            <span className={`font-semibold ${relColor}`}>{relText}</span>
          </div>
        </div>

        {/* City Hall Lobbying & Recall Button */}
        <button
          onClick={() => {
            officeAudio.playClick();
            onOpenPolitics();
          }}
          className="px-3 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] shrink-0"
        >
          <Vote size={13} />
          <span>Lobby & PAC</span>
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen Mode"}
        >
          {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>

        {/* Return to Menu Button */}
        <button
          onClick={() => {
            officeAudio.playClick();
            onReturnToMenu();
          }}
          className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
          title="Return to Main Menu"
        >
          Menu
        </button>
      </div>
    </div>
  );
};

