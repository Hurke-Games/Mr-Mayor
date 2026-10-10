import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { 
  NewsTickerItem, 
  getInitialNewsItems, 
  evaluateGameStateNews, 
  formatSimDate,
  NewsCategory 
} from '../utils/newsGenerator';
import { officeAudio } from './office/officeAudio';
import { 
  AlertTriangle, Flame, ShieldAlert, Newspaper, Radio, ChevronLeft, 
  ChevronRight, Pause, Play, Volume2, VolumeX, X, ExternalLink, 
  TrendingUp, TrendingDown, Users, DollarSign, Zap, Building2, Eye, Filter
} from 'lucide-react';

export const DeskNewsTicker: React.FC = () => {
  const { state } = useGame();
  
  // News items buffer (initial pool + dynamic breaking events)
  const [newsItems, setNewsItems] = useState<NewsTickerItem[]>(() => getInitialNewsItems(state));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<NewsTickerItem | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'ALL' | NewsCategory>('ALL');
  const [hasBreakingFlash, setHasBreakingFlash] = useState(false);

  const prevDateRef = useRef(state.date);
  const prevStateRef = useRef(state);
  const autoRotateTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Monitor GameState on simulation ticks to synthesize real-time news, scandals & faction movements
  useEffect(() => {
    // Only check every 12 ticks (~2 seconds at normal play speed) or on significant events
    if (state.date !== prevDateRef.current && (state.date % 12 === 0 || state.notifications.length > 0)) {
      prevDateRef.current = state.date;

      // 1. Check for custom notification conversions from simulation
      const latestNotif = state.notifications[0];
      if (latestNotif) {
        setNewsItems(prev => {
          if (prev.some(item => item.id === `notif-${latestNotif.id}`)) return prev;
          
          const notifItem: NewsTickerItem = {
            id: `notif-${latestNotif.id}`,
            category: latestNotif.source === 'Intel' ? 'SCANDAL' : 'CITY_EVENT',
            headline: latestNotif.title.toUpperCase(),
            summary: latestNotif.message,
            fullStory: latestNotif.message,
            source: latestNotif.source === 'Intel' ? 'Underground Whistleblower' : 'Municipal Press Corps',
            timestamp: formatSimDate(latestNotif.date),
            severity: latestNotif.source === 'Intel' ? 'WARNING' : 'NORMAL',
            impactTag: latestNotif.source === 'Intel' ? '🕵️ Confidential Intel' : '📰 Public Notice',
          };

          return [notifItem, ...prev].slice(0, 30);
        });
      }

      // 2. Evaluate state-reactive breaking scandals and faction movements
      const dynamicItem = evaluateGameStateNews(state, prevStateRef.current);
      prevStateRef.current = state;

      if (dynamicItem) {
        setNewsItems(prev => {
          // Avoid duplicate triggers within 20 items
          if (prev.slice(0, 10).some(i => i.headline === dynamicItem.headline)) {
            return prev;
          }

          // Trigger breaking news audio alert and visual flash
          if (soundEnabled && (dynamicItem.severity === 'CRITICAL' || dynamicItem.category === 'SCANDAL')) {
            officeAudio.playBreakingAlert();
          } else if (soundEnabled) {
            officeAudio.playNewsTeletype();
          }

          setHasBreakingFlash(true);
          setTimeout(() => setHasBreakingFlash(false), 2000);

          // Jump immediately to the breaking dispatch
          setCurrentIndex(0);
          return [dynamicItem, ...prev].slice(0, 30);
        });
      }
    }
  }, [state, soundEnabled]);

  // Auto-rotation timer for the ticker bar
  useEffect(() => {
    if (isPaused || isModalOpen || newsItems.length === 0) return;

    autoRotateTimerRef.current = setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % newsItems.length);
    }, 6000);

    return () => {
      if (autoRotateTimerRef.current) clearTimeout(autoRotateTimerRef.current);
    };
  }, [currentIndex, isPaused, isModalOpen, newsItems.length]);

  const activeItem = newsItems[currentIndex] || newsItems[0];

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (newsItems.length === 0) return;
    if (soundEnabled) officeAudio.playNewsTeletype();
    setCurrentIndex(prev => (prev + 1) % newsItems.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (newsItems.length === 0) return;
    if (soundEnabled) officeAudio.playNewsTeletype();
    setCurrentIndex(prev => (prev - 1 + newsItems.length) % newsItems.length);
  };

  const handleOpenItem = (item: NewsTickerItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  // Filtered news list for modal archive
  const filteredArchive = useMemo(() => {
    if (activeCategoryFilter === 'ALL') return newsItems;
    return newsItems.filter(i => i.category === activeCategoryFilter);
  }, [newsItems, activeCategoryFilter]);

  // Visual badge colors based on category & severity
  const getCategoryBadgeClass = (category: NewsCategory) => {
    switch (category) {
      case 'SCANDAL':
        return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'FACTION':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'ECONOMY':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'INFRASTRUCTURE':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      case 'CITY_EVENT':
      default:
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
    }
  };

  const getSeverityGlow = (severity: string) => {
    if (severity === 'CRITICAL') return 'border-red-600 bg-red-950/40';
    if (severity === 'WARNING') return 'border-amber-600 bg-amber-950/30';
    return 'border-slate-700 bg-slate-900/90';
  };

  if (!activeItem) return null;

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* REAL-TIME NEWS TICKER OVERLAY (DESK VIEW BANNER)             */}
      {/* ------------------------------------------------------------- */}
      <div 
        className={`w-full h-10 border-b flex items-center justify-between px-3 z-20 transition-colors duration-500 select-none backdrop-blur-md shrink-0 shadow-md ${
          hasBreakingFlash 
            ? 'bg-red-900/50 border-red-500' 
            : getSeverityGlow(activeItem.severity)
        }`}
      >
        {/* Left: Wire Badge & Flashing Beacon */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950/80 border border-slate-700 text-[10px] font-black tracking-wider uppercase">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-red-400 font-mono">LIVE WIRE</span>
          </div>

          {/* Category Tag */}
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getCategoryBadgeClass(activeItem.category)}`}>
            {activeItem.category.replace('_', ' ')}
          </span>

          {/* Impact Tag (e.g. Ethics Probe, Strike Risk, Blackout) */}
          {activeItem.impactTag && (
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/80 text-amber-300 border border-slate-700/80 text-[10px] font-semibold">
              {activeItem.impactTag}
            </span>
          )}
        </div>

        {/* Center: Live Scrolling Ticker Content (Clickable) */}
        <div 
          onClick={() => handleOpenItem(activeItem)}
          className="flex-1 mx-3 overflow-hidden cursor-pointer group flex items-center"
          title="Click to open full investigative dispatch and faction monitor"
        >
          <div className="truncate flex items-center gap-2">
            <span className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition-colors tracking-wide">
              {activeItem.headline}
            </span>
            <span className="hidden lg:inline text-xs text-slate-400 truncate">
              — {activeItem.summary}
            </span>
            <span className="hidden xl:inline text-[10px] font-mono text-slate-500 shrink-0">
              ({activeItem.source} • {activeItem.timestamp})
            </span>
          </div>
        </div>

        {/* Right: Ticker Navigation Controls & Sound */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Item index indicator */}
          <span className="text-[10px] font-mono text-slate-400 px-1 hidden sm:inline">
            {currentIndex + 1}/{newsItems.length}
          </span>

          {/* Prev / Next buttons */}
          <button
            onClick={handlePrev}
            className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Previous Story"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            onClick={handleNext}
            className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Next Story"
          >
            <ChevronRight size={13} />
          </button>

          {/* Pause / Play toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsPaused(p => !p);
            }}
            className={`p-1 rounded transition-colors cursor-pointer ${
              isPaused 
                ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30' 
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
            title={isPaused ? 'Resume Auto-Scroll' : 'Pause Auto-Scroll'}
          >
            {isPaused ? <Play size={13} /> : <Pause size={13} />}
          </button>

          {/* Audio Chime Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSoundEnabled(s => !s);
            }}
            className={`p-1 rounded transition-colors cursor-pointer ${
              soundEnabled 
                ? 'bg-slate-800/80 text-slate-300 hover:text-white' 
                : 'bg-slate-800/50 text-slate-500'
            }`}
            title={soundEnabled ? 'Mute News Chimes' : 'Unmute News Chimes'}
          >
            {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </button>

          {/* Full Dispatch Archive Button */}
          <button
            onClick={() => handleOpenItem(activeItem)}
            className="ml-1 flex items-center gap-1 px-2.5 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] tracking-wide shadow-sm transition-transform active:scale-95 cursor-pointer"
            title="Open Metropolis Wire & News Terminal"
          >
            <Newspaper size={12} />
            <span className="hidden sm:inline">Wire</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* METROPOLIS WIRE & SCANDAL INTEL TERMINAL MODAL                */}
      {/* ------------------------------------------------------------- */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Radio size={20} className="animate-pulse" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>THE METROPOLIS WIRE</span>
                    <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                      DESK FEEDBACK
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Live city event dispatches, investigative scandals, and faction intelligence
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content Columns: Active Dispatch & Live Faction Reactions */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-5">
              
              {/* Featured Dispatch Banner */}
              <div className={`p-4 rounded-xl border ${getSeverityGlow(selectedItem.severity)} relative overflow-hidden`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${getCategoryBadgeClass(selectedItem.category)}`}>
                      {selectedItem.category.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {selectedItem.source} • {selectedItem.timestamp}
                    </span>
                  </div>

                  {selectedItem.statDelta && (
                    <span className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded flex items-center gap-1 ${
                      selectedItem.statDelta.type === 'positive' 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : selectedItem.statDelta.type === 'negative'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {selectedItem.statDelta.type === 'positive' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {selectedItem.statDelta.label}: {selectedItem.statDelta.value}
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-black text-white leading-snug mb-3">
                  {selectedItem.headline}
                </h3>

                <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800 mb-3">
                  {selectedItem.fullStory}
                </p>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Eye size={13} className="text-amber-400" />
                    Civic Impact: <strong className="text-slate-200">{selectedItem.impactTag}</strong>
                  </span>
                  <span className="italic text-[11px] text-slate-500">
                    Journalistic reliability verified by municipal wire
                  </span>
                </div>
              </div>

              {/* Faction Pulse & City Health Status */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Users size={14} className="text-amber-400" />
                  Live Faction Alignments & Movement
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Iron Union */}
                  <div className={`p-3 rounded-xl border ${selectedItem.factionId === 'union' ? 'border-amber-500 bg-amber-500/10' : 'border-slate-800 bg-slate-950/60'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
                        <Users size={13} /> {state.factions.union.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Inf: {Math.round(state.factions.union.influence)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-1">
                      <div 
                        className="bg-blue-500 h-full rounded-full transition-all" 
                        style={{ width: `${state.factions.union.happiness}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Morale</span>
                      <span className={state.factions.union.happiness < 40 ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                        {Math.round(state.factions.union.happiness)}% {state.factions.union.happiness < 40 ? '(Strike Risk)' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Gilded Circle */}
                  <div className={`p-3 rounded-xl border ${selectedItem.factionId === 'elite' ? 'border-amber-500 bg-amber-500/10' : 'border-slate-800 bg-slate-950/60'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                        <DollarSign size={13} /> {state.factions.elite.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Inf: {Math.round(state.factions.elite.influence)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-1">
                      <div 
                        className="bg-amber-400 h-full rounded-full transition-all" 
                        style={{ width: `${state.factions.elite.happiness}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Investment</span>
                      <span className={state.factions.elite.happiness < 40 ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                        {Math.round(state.factions.elite.happiness)}% {state.factions.elite.happiness < 40 ? '(Flight Risk)' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Gray Syndicate / Common Citizens */}
                  <div className={`p-3 rounded-xl border ${selectedItem.factionId === 'gray' ? 'border-amber-500 bg-amber-500/10' : 'border-slate-800 bg-slate-950/60'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                        <ShieldAlert size={13} /> {state.factions.gray.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Inf: {Math.round(state.factions.gray.influence)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-1">
                      <div 
                        className="bg-slate-400 h-full rounded-full transition-all" 
                        style={{ width: `${state.factions.gray.happiness}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Public Calm</span>
                      <span className={state.safety < 45 ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                        {Math.round(state.safety)}% {state.safety < 45 ? '(Unrest)' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wire Archive Section with Filters */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Newspaper size={14} className="text-sky-400" />
                    Recent Wire Dispatches ({newsItems.length})
                  </h4>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10px]">
                    <button
                      onClick={() => setActiveCategoryFilter('ALL')}
                      className={`px-2 py-0.5 rounded font-bold transition-colors ${
                        activeCategoryFilter === 'ALL' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setActiveCategoryFilter('SCANDAL')}
                      className={`px-2 py-0.5 rounded font-bold transition-colors ${
                        activeCategoryFilter === 'SCANDAL' ? 'bg-red-500 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Scandals
                    </button>
                    <button
                      onClick={() => setActiveCategoryFilter('FACTION')}
                      className={`px-2 py-0.5 rounded font-bold transition-colors ${
                        activeCategoryFilter === 'FACTION' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Factions
                    </button>
                    <button
                      onClick={() => setActiveCategoryFilter('CITY_EVENT')}
                      className={`px-2 py-0.5 rounded font-bold transition-colors ${
                        activeCategoryFilter === 'CITY_EVENT' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Events
                    </button>
                    <button
                      onClick={() => setActiveCategoryFilter('ECONOMY')}
                      className={`px-2 py-0.5 rounded font-bold transition-colors ${
                        activeCategoryFilter === 'ECONOMY' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Economy
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {filteredArchive.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        item.id === selectedItem.id
                          ? 'border-amber-500/80 bg-amber-500/10'
                          : 'border-slate-800/80 bg-slate-950/40 hover:bg-slate-800/40 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider border ${getCategoryBadgeClass(item.category)}`}>
                            {item.category.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {item.timestamp}
                          </span>
                          {item.impactTag && (
                            <span className="text-[10px] text-amber-400 font-medium">
                              • {item.impactTag}
                            </span>
                          )}
                        </div>
                        <h5 className="text-xs font-bold text-slate-200 truncate">
                          {item.headline}
                        </h5>
                      </div>

                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {item.source}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Desk Stream Synchronized With City Simulation
              </span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Close Wire
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
