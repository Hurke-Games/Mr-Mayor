import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { GamePhase } from '../types';
import { TICKS_PER_DAY, DAYS_PER_MONTH } from '../constants';
import { 
  Play, Pause, Zap, FastForward, ArrowLeft, Building2, Compass, 
  Wind, Smile, Scale, Vote, LogOut, DollarSign, Maximize2, Minimize2 
} from 'lucide-react';
import { StepDownModal } from './office/StepDownModal';
import { useFullscreen } from '../utils/fullscreen';

interface DashboardProps {
  onReturnToOffice?: () => void;
  onGoOutside?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onReturnToOffice, onGoOutside }) => {
  const { state, dispatch } = useGame();
  const [showStepDown, setShowStepDown] = useState(false);
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  const formatMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  const totalDays = Math.floor(state.date / TICKS_PER_DAY);
  const currentMonth = Math.floor(totalDays / DAYS_PER_MONTH) + 1;
  const currentDay = (totalDays % DAYS_PER_MONTH) + 1;
  const currentHour = state.date % 24;
  const hour12 = currentHour % 12 === 0 ? 12 : currentHour % 12;
  const ampm = currentHour >= 12 ? 'PM' : 'AM';
  const hourString = `${hour12 < 10 ? '0' : ''}${hour12}:00 ${ampm}`;
  const dayProgressPct = Math.round(((currentHour + 1) / 24) * 100);
  const nextElectionDate = state.nextElectionDate || 43200;
  const remainingTicks = Math.max(0, nextElectionDate - state.date);
  const yearsUntilElection = (remainingTicks / 8640).toFixed(1);

  return (
    <header className="min-h-16 bg-slate-900 border-b border-slate-700 flex flex-wrap items-center justify-between px-3 md:px-4 py-2 shrink-0 z-10 shadow-lg gap-2 select-none">
      {/* Left zone: Navigation shortcuts & Title */}
      <div className="flex items-center gap-2.5 lg:gap-4 shrink-0">
        {onReturnToOffice && (
          <button
            onClick={onReturnToOffice}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-600/30 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 transition-all text-xs font-semibold tracking-wide shadow-sm cursor-pointer shrink-0"
            title="Stand up from desk and return to the Mayor's Office (Esc)"
          >
            <ArrowLeft size={13} className="text-amber-400" />
            <Building2 size={13} />
            <span className="hidden sm:inline">Office Suite</span>
            <kbd className="hidden lg:inline px-1 py-0.2 bg-slate-800 text-[10px] text-slate-400 rounded font-mono border border-slate-700">ESC</kbd>
          </button>
        )}

        {onGoOutside && (
          <button
            onClick={onGoOutside}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600/30 border border-slate-700 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300 transition-all text-xs font-semibold tracking-wide shadow-sm cursor-pointer shrink-0"
            title="Step outside into the city streets with your character"
          >
            <Compass size={13} className="text-emerald-400" />
            <span className="hidden sm:inline">Walk Outside</span>
          </button>
        )}

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-base md:text-lg font-bold tracking-tight text-white whitespace-nowrap">MR. MAYOR</span>
          <span className="hidden xl:inline text-[9px] font-mono uppercase text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 whitespace-nowrap">
            DESK TERMINAL
          </span>
        </div>
      </div>

      {/* Center zone: All Key Municipal Simulation Indicators (Fully visible in full screen) */}
      <div className="flex items-center gap-3 lg:gap-5 text-xs flex-wrap justify-center">
        {/* Treasury */}
        <div className="flex flex-col shrink-0" title={`City Municipal Treasury: ${formatMoney(state.money)}`}>
          <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Treasury</span>
          <span className={`font-mono font-bold text-xs sm:text-sm ${state.money < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {formatMoney(state.money)}
          </span>
        </div>
        
        {/* Population */}
        <div className="flex flex-col shrink-0" title={`Metropolis Permanent Citizen Census: ${state.population.toLocaleString()}`}>
          <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Population</span>
          <span className="font-mono text-slate-100 font-semibold text-xs sm:text-sm">
            {state.population.toLocaleString()}
          </span>
        </div>

        {/* 5-Year General Election Cycle */}
        <div 
          className="flex flex-col shrink-0 cursor-pointer hover:bg-slate-800/60 p-1 -m-1 rounded-lg transition-colors border border-transparent hover:border-slate-700"
          title={`5-Year General Election Cycle. Current Term: ${state.termNumber || 1}. ${yearsUntilElection} years until vote.`}
          onClick={() => onReturnToOffice && onReturnToOffice()}
        >
          <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1">
            <Vote size={11} className="text-amber-400" />
            Election
          </span>
          <span className="font-mono font-bold text-xs sm:text-sm text-amber-300">
            Term {state.termNumber || 1} • {yearsUntilElection}y
          </span>
        </div>

        {/* Bribes Received by City Hall (if any) */}
        {(state.totalBribesReceivedAsMayor || 0) > 0 && (
          <div 
            className="flex flex-col shrink-0 cursor-pointer hover:bg-slate-800/60 p-1 -m-1 rounded-lg transition-colors border border-transparent hover:border-slate-700"
            title={`Total Bribes Slipped to Mayor: $${(state.totalBribesReceivedAsMayor || 0).toLocaleString()}`}
            onClick={() => onReturnToOffice && onReturnToOffice()}
          >
            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1">
              <DollarSign size={11} className="text-emerald-400" />
              Bribes
            </span>
            <span className="font-mono font-bold text-xs sm:text-sm text-emerald-400">
              ${(state.totalBribesReceivedAsMayor || 0).toLocaleString()}
            </span>
          </div>
        )}

        {/* Air Quality (AQI) */}
        <div 
          className="flex flex-col shrink-0"
          title={`Air Quality Index: ${state.averagePollution || 0} AQI. Lower is cleaner. Fought by Botanical Parks and Civic Statues.`}
        >
          <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1">
            <Wind size={11} className={(state.averagePollution || 0) > 50 ? 'text-purple-400' : 'text-emerald-400'} />
            Air Quality
          </span>
          <span className={`font-mono font-bold text-xs sm:text-sm ${
            (state.averagePollution || 0) > 75 
              ? 'text-purple-400' 
              : (state.averagePollution || 0) > 50 
              ? 'text-orange-400' 
              : (state.averagePollution || 0) > 25 
              ? 'text-yellow-400' 
              : 'text-emerald-400'
          }`}>
            {state.averagePollution || 0} AQI
          </span>
        </div>

        {/* Citizen Morale */}
        <div 
          className="flex flex-col shrink-0"
          title={`Citizen Satisfaction & Public Morale: ${state.cityMorale || 75}%. Elevated by Parks, Monuments, and Low Crime.`}
        >
          <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1">
            <Smile size={11} className={(state.cityMorale || 75) > 60 ? 'text-emerald-400' : 'text-amber-400'} />
            Morale
          </span>
          <span className={`font-mono font-bold text-xs sm:text-sm ${
            (state.cityMorale || 75) > 70 ? 'text-emerald-400' : (state.cityMorale || 75) > 40 ? 'text-amber-400' : 'text-red-400'
          }`}>
            {state.cityMorale || 75}%
          </span>
        </div>

        {/* Economic Balance (Jobs & Stores ~0.5x ratio) */}
        <div 
          className="flex flex-col shrink-0" 
          title={`Commercial & Industrial Balance: ${state.economicBalance ?? 100}%. Needs ~1 commercial & ~1 industrial per 2 residential parcels. Current growth modifier: ${Math.round((state.growthRateModifier ?? 1) * 100)}%.`}
        >
          <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1">
            <Scale size={11} className={(state.economicBalance ?? 100) >= 80 ? 'text-emerald-400' : (state.economicBalance ?? 100) >= 50 ? 'text-amber-400' : 'text-red-400'} />
            Jobs & Stores
          </span>
          <div className="flex items-center gap-1.5">
            <span className={`font-mono font-bold text-xs sm:text-sm ${
              (state.economicBalance ?? 100) >= 80 ? 'text-emerald-400' : (state.economicBalance ?? 100) >= 50 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {state.economicBalance ?? 100}%
            </span>
            {(state.growthRateModifier ?? 1) < 0.9 && (
              <span className="text-[9px] font-mono px-1 py-0.2 bg-amber-950 text-amber-300 border border-amber-800 rounded">
                {Math.round((state.growthRateModifier ?? 1) * 100)}%
              </span>
            )}
          </div>
        </div>

        {/* In-Game Calendar & Time */}
        <div className="flex flex-col shrink-0 min-w-[120px]" title="Simulation Calendar and Daily Progress">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
            <span>Calendar</span>
            <span className="font-mono text-amber-400">{hourString}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-amber-300 font-semibold text-xs sm:text-sm">
              Month {currentMonth}, Day {currentDay}
            </span>
            {state.speed > 0 && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-0.5">
            <div 
              className="bg-amber-400 h-full rounded-full transition-all duration-150" 
              style={{ width: `${dayProgressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Right zone: Speed Controls, Fullscreen Toggle, Role & Step Down */}
      <div className="flex items-center gap-2 lg:gap-3 shrink-0">
        {/* Speed Controls calibrated: 1x = 1 mo / 2 min, 2x = 1 mo / 1 min, 4x = 1 mo / 30 sec */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-700/80 shadow-inner shrink-0">
          {/* Pause */}
          <button 
            onClick={() => dispatch({ type: 'SET_SPEED', payload: 0 })}
            className={`px-2 py-1 rounded-lg flex items-center gap-1 text-xs font-semibold transition-all cursor-pointer ${
              state.speed === 0 ? 'bg-red-500/25 text-red-300 border border-red-500/40 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Pause City Simulation"
          >
            <Pause size={13} />
            <span className="hidden sm:inline">Pause</span>
          </button>

          {/* 1x Normal Speed */}
          <button 
            onClick={() => dispatch({ type: 'SET_SPEED', payload: 1 })}
            className={`px-2 py-1 rounded-lg flex items-center gap-1 text-xs font-semibold transition-all cursor-pointer ${
              state.speed === 1 ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="1x Regular Speed: 1 Month in 2 Minutes"
          >
            <Play size={13} />
            <span>1x</span>
          </button>

          {/* 2x Double Speed */}
          <button 
            onClick={() => dispatch({ type: 'SET_SPEED', payload: 2 })}
            className={`px-2 py-1 rounded-lg flex items-center gap-1 text-xs font-semibold transition-all cursor-pointer ${
              state.speed === 2 ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="2x Double Speed: 1 Month in 1 Minute"
          >
            <Zap size={13} />
            <span>2x</span>
          </button>

          {/* 4x Fast Forward */}
          <button 
            onClick={() => dispatch({ type: 'SET_SPEED', payload: 4 })}
            className={`px-2 py-1 rounded-lg flex items-center gap-1 text-xs font-semibold transition-all cursor-pointer ${
              state.speed >= 4 ? 'bg-blue-500/25 text-blue-300 border border-blue-500/40 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="4x High Speed: 1 Month in 30 Seconds"
          >
            <FastForward size={13} />
            <span>4x</span>
          </button>
        </div>

        {/* Fullscreen Mode Toggle Button */}
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 cursor-pointer shrink-0"
          title={isFullscreen ? "Exit Fullscreen Mode" : "Enter Fullscreen Mode (Maximize Viewport)"}
        >
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>

        {/* Executive Role Badge */}
        <div className="hidden lg:flex flex-col items-end shrink-0">
          <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Role</span>
          <span className="font-bold text-amber-400 text-xs tracking-wide">{state.role}</span>
        </div>

        {/* Step Down Resignation */}
        <button
          onClick={() => setShowStepDown(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 hover:text-white transition-colors border border-rose-500/40 text-xs font-semibold cursor-pointer shrink-0"
          title="Resign Mayoral Office & choose next civilian career"
        >
          <LogOut size={13} className="text-rose-400" />
          <span className="hidden sm:inline">Step Down</span>
        </button>
      </div>

      {showStepDown && (
        <StepDownModal onClose={() => setShowStepDown(false)} />
      )}
    </header>
  );
};

export default Dashboard;

