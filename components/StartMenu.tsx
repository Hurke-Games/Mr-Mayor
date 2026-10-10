import React, { useState } from 'react';
import { 
  Building2, 
  Briefcase, 
  ShieldAlert, 
  Newspaper, 
  ArrowRight, 
  Lock, 
  Vote, 
  Sparkles, 
  Info, 
  Volume2, 
  VolumeX, 
  MapPin, 
  TrendingUp, 
  Compass,
  CheckCircle2,
  X,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { officeAudio } from './office/officeAudio';
import { useFullscreen } from '../utils/fullscreen';

interface StartMenuProps {
  onStartMayor: () => void;
  onStartBusinessman: () => void;
}

interface CareerOption {
  id: 'MAYOR' | 'BUSINESS' | 'POLICE' | 'JOURNALIST';
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  status: 'PLAYABLE' | 'COMING_SOON';
  description: string;
  perks: string[];
  gradient: string;
  borderAccent: string;
  iconColor: string;
  previewDetails: {
    overview: string;
    plannedFeatures: string[];
  };
}

export const StartMenu: React.FC<StartMenuProps> = ({ onStartMayor, onStartBusinessman }) => {
  const [selectedPreview, setSelectedPreview] = useState<CareerOption | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(officeAudio.enabled);
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  const toggleSound = () => {
    officeAudio.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
    if (!soundEnabled) {
      officeAudio.playTerminalChime();
    }
  };

  const careers: CareerOption[] = [
    {
      id: 'MAYOR',
      title: 'Start as Mayor',
      subtitle: 'Executive Authority & Public Mandate',
      icon: Building2,
      status: 'PLAYABLE',
      description: 'Take the oath of office in City Hall. Exercise municipal zoning powers, commission emergency services, balance budgets, monitor citizen grievances, and face re-election every 5 years.',
      perks: [
        'Full Executive Office Suite & Staff Briefings',
        '100x100 Simulation Grid & Real-Time Zoning',
        '3rd-Person Street Walkability & Exploration',
        '5-Year General Election Cycle & Public Mandates',
      ],
      gradient: 'from-amber-950/50 via-slate-900 to-slate-950',
      borderAccent: 'border-amber-500/80 hover:border-amber-400 shadow-amber-950/50 hover:shadow-amber-500/20',
      iconColor: 'text-amber-400 bg-amber-500/20 border-amber-500/40',
      previewDetails: {
        overview: 'The core simulation experience. As the Chief Executive of New Veridia, the destiny of the metropolis rests squarely in your hands.',
        plannedFeatures: [
          'Direct zoning of Residential, Commercial & Industrial wards',
          'Placement of Botanical Parks, Police Precincts, Hospitals & Utilities',
          'Arthur Holloway Chief of Staff Discontent & Range Audits',
          'Democratic elections every 5 in-game years based on citizen approval',
        ],
      },
    },
    {
      id: 'BUSINESS',
      title: 'Start as Business Man',
      subtitle: 'Commercial Empire & Private Capital',
      icon: Briefcase,
      status: 'PLAYABLE',
      description: 'Climb from your private residence to an urban corporate magnate. Buy commercial and industrial zones, run honest shops or corrupt rackets, leverage mayoral subsidies, and fund PACs to force out hostile mayors.',
      perks: [
        'Private Residence & $50,000 Seed Capital',
        'Acquire Commercial & Industrial Zones',
        'Honest Enterprises vs. Shadow Rackets',
        'Computer Mayor, Subsidies & Recall PAC',
      ],
      gradient: 'from-emerald-950/50 via-slate-900 to-slate-950',
      borderAccent: 'border-emerald-500/80 hover:border-emerald-400 shadow-emerald-950/50 hover:shadow-emerald-500/20',
      iconColor: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40',
      previewDetails: {
        overview: 'Experience the city through the lens of private enterprise and cutthroat municipal politics. Build an empire of businesses while navigating relations with the autonomous Computer Mayor.',
        plannedFeatures: [
          'Walk the streets and purchase commercial and industrial parcels',
          'Toggle between Honest Mode and Corrupt Shadow Rackets',
          'Computer Mayor sets Municipal Subsidy Meter and sends inspectors',
          'Donate to the Challenger Super-PAC to force out corrupt or hostile mayors',
        ],
      },
    },
    {
      id: 'POLICE',
      title: 'Start as Police Chief',
      subtitle: 'Law Enforcement & Municipal Order',
      icon: ShieldAlert,
      status: 'COMING_SOON',
      description: 'Command the metropolitan police department. Dispatch patrol cruisers to high-crime wards, combat organized criminal syndicates, investigate city hall corruption, and maintain order.',
      perks: [
        'Precinct Fleet Dispatch & Emergency Sirens',
        'Organized Crime & Vice Investigations',
        'Internal Affairs & Anti-Corruption Probes',
        'Civil Defense During Riots & Unrest',
      ],
      gradient: 'from-indigo-950/40 via-slate-900 to-slate-950',
      borderAccent: 'border-slate-700/80 hover:border-indigo-500/40 hover:shadow-indigo-500/10',
      iconColor: 'text-indigo-400 bg-indigo-500/20 border-indigo-500/40',
      previewDetails: {
        overview: 'Take the badge and lead the thin blue line in a city where politics, street crime, and high-level graft constantly collide.',
        plannedFeatures: [
          'Tactical command of squad cars, detective units, and SWAT teams',
          'Tackle gang territories and eliminate illegal underground rings',
          'Balance departmental funding against civil liberties and protests',
          'Investigate Mayor and Council members for bribery and kickbacks',
        ],
      },
    },
    {
      id: 'JOURNALIST',
      title: 'Start as Journalist',
      subtitle: 'Investigative Press & Fourth Estate',
      icon: Newspaper,
      status: 'COMING_SOON',
      description: 'Dig through city hall files and confidential memos as an investigative reporter for the Daily Chronicle. Expose backroom bribes, publish front-page scoops, and sway the electorate.',
      perks: [
        'Daily Chronicle Front-Page Headline Publishing',
        'Undercover Wiretaps & Whistleblower Intel',
        'Expose Mayoral Scandals & Corporate Kickbacks',
        'Shape Citizen Sentiment Before General Elections',
      ],
      gradient: 'from-emerald-950/40 via-slate-900 to-slate-950',
      borderAccent: 'border-slate-700/80 hover:border-emerald-500/40 hover:shadow-emerald-500/10',
      iconColor: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40',
      previewDetails: {
        overview: 'Wield the power of the press. Unmask the hidden webs connecting politicians, union bosses, and industrial barons.',
        plannedFeatures: [
          'Publish daily editions of the New Veridia Chronicle',
          'Cultivate anonymous informants in city departments',
          'Break news stories that directly impact Mayoral approval and stock markets',
          'Dodge corporate lawsuits and threats from organized syndicates',
        ],
      },
    },
  ];

  const handleSelectCareer = (career: CareerOption) => {
    if (career.id === 'BUSINESS') {
      officeAudio.playTerminalChime();
      onStartBusinessman();
    } else if (career.id === 'MAYOR') {
      officeAudio.playTerminalChime();
      onStartMayor();
    } else {
      officeAudio.playClick();
      setSelectedPreview(career);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between overflow-x-hidden selection:bg-amber-500 selection:text-slate-950">
      {/* Background Architectural Grid & Atmospheric Vignette */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Subtle architectural grid pattern */}
        <div className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(to_right,#f59e0b_1px,transparent_1px),linear-gradient(to_bottom,#f59e0b_1px,transparent_1px)] bg-[size:48px_48px]" />
        
        {/* Soft radial glow centers */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-amber-600/15 via-amber-800/5 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-blue-900/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[400px] bg-emerald-900/10 blur-3xl pointer-events-none" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
            <Building2 size={20} />
          </div>
          <div>
            <span className="text-[11px] font-mono tracking-widest uppercase text-amber-400 font-bold block leading-tight">
              City of New Veridia
            </span>
            <span className="text-xs text-slate-400 font-sans">
              Municipal Charter & Career Selector
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen Mode'}
          >
            {isFullscreen ? <Minimize2 size={14} className="text-amber-400" /> : <Maximize2 size={14} className="text-amber-400" />}
            <span className="hidden sm:inline font-mono text-[11px]">{isFullscreen ? 'Windowed' : 'Fullscreen'}</span>
          </button>

          <button
            onClick={toggleSound}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition-colors cursor-pointer"
            title={soundEnabled ? 'Disable Audio' : 'Enable Audio'}
          >
            {soundEnabled ? <Volume2 size={14} className="text-amber-400" /> : <VolumeX size={14} className="text-slate-500" />}
            <span className="hidden sm:inline font-mono text-[11px]">{soundEnabled ? 'Audio On' : 'Muted'}</span>
          </button>

          <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400">
            v1.4 • 5-Yr Election Edition
          </span>
        </div>
      </header>

      {/* Main Hero & Game Mode Grid */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 sm:py-10 flex flex-col items-center">
        {/* Grand Title Banner */}
        <div className="text-center space-y-3 mb-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-medium shadow-sm">
            <Vote size={13} className="text-amber-400" />
            <span>5-Year General Election Cycle & Public Grievance Simulation</span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold font-serif tracking-tight text-white drop-shadow-md">
            MR. MAYOR
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-sans max-w-2xl mx-auto">
            Step into the contested arena of urban power. Choose your path through the municipal hierarchy of New Veridia.
          </p>
        </div>

        {/* 4 Career Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
          {careers.map((career) => {
            const Icon = career.icon;
            const isPlayable = career.status === 'PLAYABLE';

            return (
              <div
                key={career.id}
                onClick={() => handleSelectCareer(career)}
                className={`group relative rounded-2xl bg-gradient-to-b ${career.gradient} p-5 border-2 transition-all duration-300 flex flex-col justify-between cursor-pointer ${career.borderAccent} ${
                  isPlayable 
                    ? 'shadow-xl hover:-translate-y-1' 
                    : 'opacity-85 hover:opacity-100 hover:-translate-y-0.5'
                }`}
              >
                {/* Playable / Coming Soon Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-md ${career.iconColor}`}>
                    <Icon size={22} />
                  </div>

                  {isPlayable ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Playable Now
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-800/90 text-slate-400 border border-slate-700 flex items-center gap-1">
                      <Lock size={10} className="text-slate-400" />
                      Coming Soon
                    </span>
                  )}
                </div>

                {/* Card Title & Description */}
                <div className="space-y-2 mb-4">
                  <h3 className="text-xl font-bold text-white font-serif group-hover:text-amber-300 transition-colors flex items-center justify-between">
                    <span>{career.title}</span>
                  </h3>
                  <span className="text-[11px] font-mono uppercase text-slate-400 block tracking-wider">
                    {career.subtitle}
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {career.description}
                  </p>
                </div>

                {/* Feature Bullet Points */}
                <div className="space-y-1.5 pt-3 border-t border-slate-800/80 mb-5">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-semibold block mb-1">
                    Role Highlights:
                  </span>
                  {career.perks.map((perk, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-300 leading-tight">
                      <CheckCircle2 size={12} className={`shrink-0 mt-0.5 ${isPlayable ? 'text-amber-400' : 'text-slate-500'}`} />
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>

                {/* Action CTA Button */}
                <div>
                  {isPlayable ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        officeAudio.playTerminalChime();
                        onStartMayor();
                      }}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 group-hover:scale-[1.02] cursor-pointer"
                    >
                      <span>Assume Office (Play)</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        officeAudio.playClick();
                        setSelectedPreview(career);
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700/80 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Info size={13} className="text-slate-400" />
                      <span>View Mode Preview</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer System Notice */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-400">Mr. Mayor</span>
          <span>•</span>
          <span>City Simulation & Political Power</span>
        </div>

        <div className="flex items-center gap-4 text-[11px] font-mono">
          <span>Simulation Speed: 1 Month / 2 Min (Normal)</span>
          <span>•</span>
          <span>General Election: 5-Year Term Cycle</span>
        </div>
      </footer>

      {/* Preview Modal for "Coming Soon" Roles */}
      {selectedPreview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${selectedPreview.iconColor}`}>
                  <selectedPreview.icon size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base font-serif">{selectedPreview.title}</h4>
                  <span className="text-[10px] font-mono uppercase text-amber-400">In Development • Phase II Mode</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedPreview(null)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-300">
              <p className="leading-relaxed">
                {selectedPreview.previewDetails.overview}
              </p>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block font-mono">
                  Planned Career Mechanics:
                </span>
                <ul className="space-y-1.5">
                  {selectedPreview.previewDetails.plannedFeatures.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-300 leading-tight">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-[11px] text-slate-400 italic">
                We are actively developing this game mode as part of the Mr. Mayor multi-role expansion. Start as Mayor now to build the city your civilian career will inhabit!
              </p>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setSelectedPreview(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Close Preview
              </button>

              <button
                onClick={() => {
                  setSelectedPreview(null);
                  officeAudio.playTerminalChime();
                  onStartMayor();
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <span>Play as Mayor for Now</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
