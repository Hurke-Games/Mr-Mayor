import React, { useState, useRef, useEffect } from 'react';
import { GameSimulation } from './components/game/GameSimulation';
import { 
  Building2, 
  Briefcase, 
  ShieldAlert, 
  Newspaper, 
  Maximize2, 
  Minimize2, 
  Monitor, 
  Compass, 
  Landmark, 
  TrendingUp, 
  Vote, 
  Zap, 
  Wind, 
  Smile, 
  Users, 
  Scale, 
  Store, 
  Factory, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  CheckCircle2, 
  ChevronRight, 
  Play, 
  HelpCircle, 
  Radio, 
  FileText, 
  Layers,
  Sparkles,
  ArrowRight,
  Shield,
  Clock,
  Award,
  Terminal,
  Share2,
  Tv
} from 'lucide-react';
import { toggleFullscreen, isFullscreenActive } from './utils/fullscreen';
import { officeAudio } from './components/office/officeAudio';

export const App: React.FC = () => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theaterSize, setTheaterSize] = useState<'standard' | 'cinema'>('standard');
  const [activeSection, setActiveSection] = useState<'simulation' | 'guide' | 'almanac' | 'changelog'>('simulation');
  const [guideRole, setGuideRole] = useState<'mayor' | 'businessman' | 'indicators'>('mayor');
  const [soundMuted, setSoundMuted] = useState(!officeAudio.enabled);
  const [gameKey, setGameKey] = useState(1); // For resetting simulation

  // Listen to native fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(isFullscreenActive());
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = async () => {
    if (gameContainerRef.current) {
      await toggleFullscreen(gameContainerRef.current);
      setIsFullscreen(isFullscreenActive());
    }
  };

  const handleResetGame = () => {
    officeAudio.playClick();
    if (window.confirm('Restart the simulation from the title screen?')) {
      setGameKey(k => k + 1);
    }
  };

  const handleToggleSound = () => {
    const next = !soundMuted;
    setSoundMuted(next);
    officeAudio.enabled = !next;
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* ========================================================================= */}
      {/* 1. OFFICIAL SITE HEADER & NAV */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-[#0a0f1d]/90 backdrop-blur-md border-b border-slate-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Seal & Title */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollToSection('simulation')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 via-amber-700 to-slate-900 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-md">
              <Landmark size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-black text-white text-base tracking-tight">NEW VERIDIA</span>
                <span className="text-[10px] font-mono uppercase bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30 font-bold hidden sm:inline">
                  Civic Archive
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono block leading-none mt-0.5">
                Official Metropolis Simulation Portal
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <button 
              onClick={() => { setActiveSection('simulation'); scrollToSection('simulation'); }}
              className={`hover:text-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer ${activeSection === 'simulation' ? 'text-amber-400 font-bold' : ''}`}
            >
              <Monitor size={14} />
              <span>Simulation</span>
            </button>
            <button 
              onClick={() => { setActiveSection('guide'); scrollToSection('field-guide'); }}
              className={`hover:text-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer ${activeSection === 'guide' ? 'text-amber-400 font-bold' : ''}`}
            >
              <FileText size={14} />
              <span>Field Guide</span>
            </button>
            <button 
              onClick={() => { setActiveSection('almanac'); scrollToSection('almanac'); }}
              className={`hover:text-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer ${activeSection === 'almanac' ? 'text-amber-400 font-bold' : ''}`}
            >
              <Building2 size={14} />
              <span>City Almanac</span>
            </button>
            <button 
              onClick={() => { setActiveSection('changelog'); scrollToSection('changelog'); }}
              className={`hover:text-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer ${activeSection === 'changelog' ? 'text-amber-400 font-bold' : ''}`}
            >
              <Terminal size={14} />
              <span>Changelog v1.5</span>
            </button>
          </nav>

          {/* Right Action: Instant Fullscreen CTA */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleToggleFullscreen}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg hover:shadow-amber-500/20 active:scale-95 cursor-pointer"
              title="Launch embedded simulation in full screen (no keyboard shortcuts required)"
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              <span className="hidden sm:inline">{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO INTRO BANNER */}
      {/* ========================================================================= */}
      <section className="relative pt-10 pb-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center">
        <div className="space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Interactive Web Embed • Procedural Engine Active</span>
            <span className="text-slate-600">·</span>
            <span className="text-amber-400 font-bold">No Keyboard Shortcuts Required</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold font-serif tracking-tight text-white">
            MR. MAYOR
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
            A real-time political city simulation and corporate tycoon sandbox. Rule City Hall as the elected Mayor or build an urban monopoly as private tycoon Victor Vance.
          </p>

          <div className="flex items-center justify-center gap-4 text-xs font-mono text-slate-400 pt-1 flex-wrap">
            <span>100×100 Simulation Grid</span>
            <span>·</span>
            <span>5-Year Democratic Elections</span>
            <span>·</span>
            <span>Stock Exchange</span>
            <span>·</span>
            <span>Living Citizens & Traffic</span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. THE EMBEDDED GAME THEATER */}
      {/* ========================================================================= */}
      <section id="simulation" className="relative px-2 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full pb-14">
        {/* Game Player Enclosure */}
        <div className={`mx-auto transition-all duration-300 ${
          theaterSize === 'cinema' ? 'max-w-full' : 'max-w-6xl'
        }`}>
          {/* Player Console Bar (Top Header of the Embedded Screen) */}
          <div className="bg-slate-900 border border-slate-700/80 rounded-t-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            {/* Left: Embedded Game Metadata */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono font-bold text-white tracking-wide">
                  EMBEDDED CONSOLE
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  v1.5
                </span>
              </div>
              <div className="h-4 w-px bg-slate-700 hidden sm:block" />
              <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                New Veridia Simulation Core
              </span>
            </div>

            {/* Right: Embedded Screen Controls (Fullscreen, Theater, Sound, Reload) */}
            <div className="flex items-center gap-2">
              {/* Theater Size Toggle */}
              <button
                onClick={() => setTheaterSize(s => s === 'standard' ? 'cinema' : 'standard')}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
                title={theaterSize === 'standard' ? 'Switch to Cinema Wide View' : 'Switch to Standard Theater View'}
              >
                <Tv size={13} className="text-amber-400" />
                <span>{theaterSize === 'standard' ? 'Cinema' : 'Standard'}</span>
              </button>

              {/* Sound Toggle */}
              <button
                onClick={handleToggleSound}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title={soundMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {soundMuted ? <VolumeX size={14} className="text-slate-400" /> : <Volume2 size={14} className="text-amber-400" />}
              </button>

              {/* Restart Simulation */}
              <button
                onClick={handleResetGame}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Reset simulation to start screen"
              >
                <RefreshCw size={14} />
              </button>

              {/* Prominent One-Click Fullscreen Button (No shortcut keys) */}
              <button
                onClick={handleToggleFullscreen}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
                title="Enter hardware full screen with 1 click (no keyboard shortcut keys required)"
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                <span>{isFullscreen ? 'Exit Full Screen' : 'Go Full Screen'}</span>
              </button>
            </div>
          </div>

          {/* Embedded Game Screen Container */}
          <div 
            ref={gameContainerRef}
            className={`relative bg-slate-950 border-x border-b border-slate-700/80 rounded-b-2xl overflow-hidden shadow-2xl transition-all ${
              isFullscreen 
                ? 'fixed inset-0 z-50 w-screen h-screen rounded-none border-none' 
                : 'w-full h-[580px] sm:h-[660px] md:h-[720px] lg:h-[780px] xl:h-[820px]'
            }`}
          >
            {/* The Actual Running Game */}
            <GameSimulation key={gameKey} />

            {/* Floating Exit Fullscreen Button (Always accessible when in Full Screen mode) */}
            {isFullscreen && (
              <button
                onClick={handleToggleFullscreen}
                className="absolute top-4 right-4 z-50 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-bold shadow-2xl border border-slate-700 backdrop-blur cursor-pointer hover:scale-105 transition-transform"
                title="Exit Full Screen Mode"
              >
                <Minimize2 size={14} className="text-amber-400" />
                <span>Exit Full Screen</span>
              </button>
            )}
          </div>

          {/* Quick HUD Navigation & Controls Guide under the Screen */}
          <div className="mt-3 bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Compass size={13} className="text-amber-400" />
                <span>Quick Controls:</span>
              </span>
              <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono text-[11px]">WASD</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono text-[11px]">Click</kbd> Walk</span>
              <span><kbd className="px-1.5 py-0.5 bg-amber-600 text-white rounded font-mono font-bold text-[11px]">E</kbd> Interact</span>
              <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono text-[11px]">M</kbd> Open City Desk</span>
              <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono text-[11px]">Esc</kbd> Stand Up / Deselect</span>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
              <span className="text-emerald-400 font-bold">100% Client-Side Engine</span>
              <span>·</span>
              <span>Zero External API Lag</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. EXECUTIVE FIELD GUIDE & PLAY MANUAL */}
      {/* ========================================================================= */}
      <section id="field-guide" className="py-14 bg-slate-900/50 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">Field Manual</span>
              <h2 className="text-3xl font-bold font-serif text-white mt-1">Executive Gameplay Guide</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                Master the twin career paths: steer municipal policy and election cycles from City Hall, or amass private commercial holdings on the street.
              </p>
            </div>

            {/* Segmented Tab Control */}
            <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                onClick={() => setGuideRole('mayor')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  guideRole === 'mayor' 
                    ? 'bg-amber-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Mayoral Administration
              </button>
              <button
                onClick={() => setGuideRole('businessman')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  guideRole === 'businessman' 
                    ? 'bg-emerald-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Victor Vance (Businessman)
              </button>
              <button
                onClick={() => setGuideRole('indicators')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  guideRole === 'indicators' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Simulation Vitals
              </button>
            </div>
          </div>

          {/* Tab 1: Mayor */}
          {guideRole === 'mayor' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Building2 size={20} />
                </div>
                <h3 className="text-base font-bold text-white font-serif">1. 100×100 Zoning Grid</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Zone parcels for Residential homes, Commercial stores, and Industrial factories. Keep an economic ratio of roughly 1 store and 1 factory for every 2 residential zones to maintain a 100% jobs and stores balance.
                </p>
                <div className="text-[11px] font-mono text-amber-400 bg-amber-950/20 p-2 rounded border border-amber-900/30">
                  Tip: Power plants provide electricity up to a radius of 18 tiles. Build Power Lines to span long distances!
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                  <ShieldAlert size={20} />
                </div>
                <h3 className="text-base font-bold text-white font-serif">2. Emergency Precincts</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Citizens demand Police Precincts to suppress crime and Fire Stations to contain blazes. Botanical Parks and Civic Statues absorb industrial smog, lowering AQI pollution and boosting city morale.
                </p>
                <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/20 p-2 rounded border border-emerald-900/30">
                  Tip: Consult Chief of Staff Arthur Holloway in Room 401 for detailed grievance and coverage audits.
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Vote size={20} />
                </div>
                <h3 className="text-base font-bold text-white font-serif">3. 5-Year Elections</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Every 5 in-game years (43,200 ticks), New Veridia holds a democratic election. The Board of Elections audits citizen approval, safety, corruption, and treasury balance. Win a renewed mandate or step down.
                </p>
                <div className="text-[11px] font-mono text-blue-400 bg-blue-950/20 p-2 rounded border border-blue-900/30">
                  Tip: If defeated or resigning, select "Step Down" to transition into the private sector as a Businessman!
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Businessman */}
          {guideRole === 'businessman' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Briefcase size={20} />
                </div>
                <h3 className="text-base font-bold text-white font-serif">1. Commercial Acquisitions</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Begin with $50,000 in seed capital at the Vance Private Estate on Magnolia Boulevard. Walk up to zoned Commercial and Industrial properties on the street and press [E] to buy them.
                </p>
                <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/20 p-2 rounded border border-emerald-900/30">
                  Tip: Upgrade established businesses to Tier 2 and Tier 3 to multiply daily revenue cash flow!
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <TrendingUp size={20} />
                </div>
                <h3 className="text-base font-bold text-white font-serif">2. Veridia Stock Exchange</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Open your Empire Portfolio to trade listed municipal equities. Buy shares in high-dividend blue chips, tech ventures, and commodities. Liquidate shares when markets spike to fund larger acquisitions.
                </p>
                <div className="text-[11px] font-mono text-amber-400 bg-amber-950/20 p-2 rounded border border-amber-900/30">
                  Tip: Businesses can operate in Honest Mode (clean community standing) or Corrupt Mode (+50% profit, police raid risk).
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Landmark size={20} />
                </div>
                <h3 className="text-base font-bold text-white font-serif">3. Lobbying & Recall PAC</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Approach the autonomous Computer Mayor in City Hall. Lobby for municipal subsidies, grant campaign contributions, or launch a Recall PAC to unseat a hostile machine boss and trigger early elections.
                </p>
                <div className="text-[11px] font-mono text-purple-400 bg-purple-950/20 p-2 rounded border border-purple-900/30">
                  Tip: High subsidy meters yield lucrative civic contracts for your factories and retail shops.
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Indicators */}
          {guideRole === 'indicators' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold font-mono">
                  <Zap size={14} />
                  <span>TREASURY & TAXES</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Collected on the 1st of every month. Each resident yields $1.5/mo, commercial jobs $2.5/mo, and industrial jobs $3.0/mo. Avoid deficits to prevent credit freezes.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-purple-400 text-xs font-bold font-mono">
                  <Wind size={14} />
                  <span>AIR QUALITY INDEX (AQI)</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Generated by heavy factories and coal power plants. Smog reduces life expectancy and voter happiness. Dispersed by Botanical Parks and ocean breezes.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold font-mono">
                  <Smile size={14} />
                  <span>CITIZEN MORALE</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  A comprehensive index (0-100%) reflecting low crime, affordable housing, clean air, and power stability. Directly determines re-election turnout.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-blue-400 text-xs font-bold font-mono">
                  <Scale size={14} />
                  <span>ECONOMIC BALANCE</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Calculates parity between available jobs, consumer markets, and residential labor. Imbalance triggers industrial flight and commercial vacancies.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. CITY ALMANAC & FACTIONS */}
      {/* ========================================================================= */}
      <section id="almanac" className="py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-8">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">Metropolis Geography</span>
          <h2 className="text-3xl font-bold font-serif text-white mt-1">The Almanac of New Veridia</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            A metropolis built on reclaimed river delta wetlands, divided into competing wards and governed by backroom alliances.
          </p>
        </div>

        {/* 4 Districts Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <span className="text-[10px] font-mono uppercase text-amber-400 font-bold">District 01</span>
            <h4 className="text-base font-bold text-white font-serif">City Hall Plaza & Ward 4</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Neoclassical marble architecture, executive quarters in Room 401, bureaucratic clerks, and the central radio dispatch tower.
            </p>
            <div className="pt-2 text-[11px] text-slate-500 font-mono">
              Key Site: Executive Office & Arthur Holloway Desk
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">District 02</span>
            <h4 className="text-base font-bold text-white font-serif">Magnolia Boulevard</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tree-lined avenues, luxury estates, and the Victor Vance private manor. The bastion of high society and commercial capital.
            </p>
            <div className="pt-2 text-[11px] text-slate-500 font-mono">
              Key Site: Vance Estate & Private Sanctuary
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold">District 03</span>
            <h4 className="text-base font-bold text-white font-serif">The Commercial Arcade</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Department stores, banks, newspapers, and financial exchanges where equities trade in real time and fortunes rise and fall.
            </p>
            <div className="pt-2 text-[11px] text-slate-500 font-mono">
              Key Site: Veridia Stock Exchange & Retail Hubs
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <span className="text-[10px] font-mono uppercase text-orange-400 font-bold">District 04</span>
            <h4 className="text-base font-bold text-white font-serif">Eastside Industrial Belt</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Smokestacks, foundries, power stations, and shipping docks. The economic engine of the working class, tempered by union friction.
            </p>
            <div className="pt-2 text-[11px] text-slate-500 font-mono">
              Key Site: Heavy Power Plants & Steel Foundries
            </div>
          </div>
        </div>

        {/* Faction Dossiers */}
        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Scale size={18} className="text-amber-400" />
            <h3 className="font-serif font-bold text-white text-base">The Four Political Factions</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="font-bold text-amber-300 block mb-1">Labor Union Guild</span>
              <p className="text-slate-400">Demands workplace safety, affordable rents, and high employment ratios. Strikes when neglected.</p>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="font-bold text-emerald-300 block mb-1">Corporate Cartel</span>
              <p className="text-slate-400">Champions deregulation, low taxes, and commercial subsidies. Backs pro-business mayors with heavy donations.</p>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="font-bold text-sky-300 block mb-1">Citizen Watchdog Coalition</span>
              <p className="text-slate-400">Fiercely anti-corruption. Demands clean air, botanical parks, honest press dispatches, and public trials.</p>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="font-bold text-purple-300 block mb-1">Machine Bosses</span>
              <p className="text-slate-400">Control ward precinct committees. Demand municipal patronage appointments and backroom favors in exchange for votes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. MUNICIPAL CHANGELOG & SPECIFICATIONS */}
      {/* ========================================================================= */}
      <section id="changelog" className="py-14 bg-slate-900/30 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">Release Notes</span>
              <h2 className="text-2xl font-bold font-serif text-white mt-0.5">Simulation Changelog & System Specs</h2>
            </div>
            <span className="text-xs font-mono px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-emerald-400">
              Version 1.5.0 • Build Stable
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs text-slate-300">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="font-mono text-amber-400 font-bold">1. Embed & Fullscreen Engine</span>
              <p className="text-slate-400 leading-relaxed">
                Dedicated web portal enclosure featuring instant one-click mouse/touch fullscreen without any keyboard shortcut reliance. Hardware fullscreen seamlessly scales across all aspect ratios.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="font-mono text-emerald-400 font-bold">2. Procedural News Teletype</span>
              <p className="text-slate-400 leading-relaxed">
                Gemini API completely decoupled and removed. Wire reports, corruption scandals, and public opinion dispatches are generated instantaneously by local simulation telemetry with zero latency.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="font-mono text-cyan-400 font-bold">3. Dual-Role Autonomous Loop</span>
              <p className="text-slate-400 leading-relaxed">
                Full support for Mayor (public management, 100x100 zoning) and Businessman (private capital, equities, commercial empire) with autonomous computer mayor AI behavior.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. SITE FOOTER */}
      {/* ========================================================================= */}
      <footer className="mt-auto border-t border-slate-800 bg-[#070b15] py-10 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-serif font-black text-xs">
              NV
            </div>
            <div>
              <span className="font-serif font-bold text-slate-200 block">The City of New Veridia</span>
              <span className="text-[11px] text-slate-500">Department of Municipal Computing & Archives</span>
            </div>
          </div>

          <div className="flex items-center gap-6 font-mono text-[11px]">
            <button onClick={() => scrollToSection('simulation')} className="hover:text-amber-400 transition-colors cursor-pointer">
              Simulation Terminal
            </button>
            <button onClick={() => scrollToSection('field-guide')} className="hover:text-amber-400 transition-colors cursor-pointer">
              Field Guide
            </button>
            <button onClick={() => scrollToSection('almanac')} className="hover:text-amber-400 transition-colors cursor-pointer">
              Almanac
            </button>
            <button onClick={handleToggleFullscreen} className="text-amber-400 font-bold hover:underline cursor-pointer">
              Full Screen Mode
            </button>
          </div>

          <p className="text-[11px] text-slate-500 text-center sm:text-right">
            © 2026 Metropolis Simulation Suite. Built with React 19, TypeScript & Tailwind CSS.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
