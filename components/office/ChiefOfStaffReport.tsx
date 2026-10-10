import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { 
  Shield, 
  Flame, 
  HeartPulse, 
  Trees, 
  Zap, 
  GraduationCap, 
  Briefcase, 
  Car, 
  AlertTriangle, 
  Vote, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  Scale, 
  TrendingUp, 
  TrendingDown, 
  Wind,
  Compass,
  ArrowRight,
  Info
} from 'lucide-react';
import { calculateCityGrievances } from '../../utils/simulation';

interface ChiefOfStaffReportProps {
  onClose: () => void;
  onSitAtDesk: () => void;
}

export const ChiefOfStaffReport: React.FC<ChiefOfStaffReportProps> = ({ onClose, onSitAtDesk }) => {
  const { state, dispatch } = useGame();
  const [activeTab, setActiveTab] = useState<'GRIEVANCES' | 'RANGES' | 'ELECTION' | 'TYCOONS'>('GRIEVANCES');

  const report = calculateCityGrievances(state);

  // Helper for color coding dissatisfaction percentages
  const getDiscontentColor = (pct: number) => {
    if (pct <= 15) return { text: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', bar: 'bg-emerald-500' };
    if (pct <= 40) return { text: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30', bar: 'bg-amber-500' };
    return { text: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', bar: 'bg-red-500' };
  };

  // Helper for coverage percentages
  const getCoverageColor = (pct: number) => {
    if (pct >= 80) return { text: 'text-emerald-400', bg: 'bg-emerald-500/15', bar: 'bg-emerald-500' };
    if (pct >= 50) return { text: 'text-amber-400', bg: 'bg-amber-500/15', bar: 'bg-amber-500' };
    return { text: 'text-red-400', bg: 'bg-red-500/15', bar: 'bg-red-500' };
  };

  const getForecastBadge = (forecast: string) => {
    switch (forecast) {
      case 'LANDSLIDE_WIN':
        return { label: 'Landslide Win Expected', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'FAVORED':
        return { label: 'Favored for Re-Election', color: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30' };
      case 'TOSS_UP':
        return { label: 'Competitive Toss-Up', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'VULNERABLE':
        return { label: 'Vulnerable Incumbent', color: 'bg-orange-500/20 text-orange-300 border-orange-500/40' };
      case 'DEFEAT':
      default:
        return { label: 'High Defeat Risk', color: 'bg-red-500/20 text-red-300 border-red-500/40' };
    }
  };

  const forecast = getForecastBadge(report.electionForecast);

  const grievancesList = [
    {
      id: 'crime',
      title: 'Crime & Public Safety',
      icon: Shield,
      pct: report.unhappyCrimePct,
      rangeNote: 'Police Station (16-tile patrol radius)',
      coverage: report.coveragePolicePct,
      summary: 'Residents in unpatrolled or unpowered blocks fear theft and vandalism.',
      solution: 'Zone a Police Station within 16 tiles to drop crime from 55% to under 15%.'
    },
    {
      id: 'pollution',
      title: 'Industrial Pollution & Smog',
      icon: Wind,
      pct: report.unhappyPollutionPct,
      rangeNote: 'Botanical Parks (8 tiles) & Statues (6 tiles) absorb smog',
      coverage: report.coverageParkWalkPct,
      summary: 'Factory smokestacks and power plant soot degrade air quality and cause illness.',
      solution: 'Plant Botanical Parks between residential and industrial zones to absorb toxic air.'
    },
    {
      id: 'traffic',
      title: 'Traffic Congestion & Transit',
      icon: Car,
      pct: report.unhappyTrafficPct,
      rangeNote: 'Paved road network & intersection capacity',
      coverage: null,
      summary: 'Commuters trapped in bottlenecks or living on unpaved parcels.',
      solution: 'Connect parallel avenues and pave roads to residential clusters.'
    },
    {
      id: 'jobs',
      title: 'Employment & Job Opportunities',
      icon: Briefcase,
      pct: report.unhappyJobsPct,
      rangeNote: `${report.totalJobs.toLocaleString()} jobs for ${report.workforce.toLocaleString()} workers (${report.jobsCoveragePct}% coverage)`,
      coverage: report.jobsCoveragePct,
      summary: 'Working-age citizens searching for retail and manufacturing employment.',
      solution: 'Zone Commercial storefronts and Industrial workshops to balance the workforce.'
    },
    {
      id: 'education',
      title: 'Education & Schools',
      icon: GraduationCap,
      pct: report.unhappyEducationPct,
      rangeNote: 'Schools (20-tile radius) & Universities (32-tile radius)',
      coverage: report.coverageSchoolPct,
      summary: 'Families demand elementary schools and higher education facilities.',
      solution: 'Place an Elementary School within 20 blocks or an Academic University campus.'
    },
    {
      id: 'recreation',
      title: 'Access to Recreation & Parks',
      icon: Trees,
      pct: report.unhappyRecreationPct,
      rangeNote: 'Botanical Parks (8-tile walking radius) & Statues (6 tiles)',
      coverage: report.coverageParkWalkPct,
      summary: 'Citizens feel isolated without green parks within walking distance of their front doors.',
      solution: 'Commission Botanical Parks within 8 tiles of every residential neighborhood.'
    },
    {
      id: 'healthcare',
      title: 'Healthcare & Hospital Access',
      icon: HeartPulse,
      pct: report.unhappyHealthcarePct,
      rangeNote: 'General Hospital (20-tile ambulance coverage radius)',
      coverage: report.coverageHospitalPct,
      summary: 'Fear of untreated sickness and lack of emergency ambulance response.',
      solution: 'Build a General Hospital (2x2) within 20 tiles to treat smog illness and provide peace of mind.'
    },
    {
      id: 'power',
      title: 'Electrical Power Grid',
      icon: Zap,
      pct: report.unhappyPowerPct,
      rangeNote: 'Power Plant (32-tile transmission radius)',
      coverage: report.coveragePowerPct,
      summary: 'Parcels without power suffer darkness, business disruption, and elevated crime.',
      solution: 'Expand power generation so transmission lines reach within 32 blocks of all homes.'
    },
    {
      id: 'fire',
      title: 'Fire Protection & Hazards',
      icon: Flame,
      pct: report.unhappyFirePct,
      rangeNote: 'Fire Station (16-tile engine response radius)',
      coverage: report.coverageFirePct,
      summary: 'Fear of uncontained structure fires in densely built neighborhoods.',
      solution: 'Place a Fire Station within 16 tiles to ensure fire truck coverage.'
    },
    {
      id: 'taxes',
      title: 'Municipal Property Taxes',
      icon: Scale,
      pct: report.unhappyTaxesPct,
      rangeNote: `Current Property Tax Rate: ${Math.round(state.taxRate * 100)}%`,
      coverage: null,
      summary: 'Citizens grumble when municipal property taxes exceed reasonable rates.',
      solution: 'Adjust the tax rate toward 8-10% at your desk to reduce voter backlash.'
    },
  ];

  return (
    <div className="space-y-4">
      {/* Advisor Header Profile */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-600/30 to-amber-900/50 border-2 border-amber-500/60 flex items-center justify-center text-amber-300 shadow-md">
            <Shield size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base font-serif">Arthur Holloway</h3>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold uppercase">
                Chief of Staff
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Civic Intelligence & Public Sentiment Audit • Term {report.termNumber} (5-Year Election Cycle)
            </p>
          </div>
        </div>

        {/* Polling & Election Countdown Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <Vote size={14} className="text-amber-400" />
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase text-slate-400 block leading-tight">Next General Election</span>
            <span className="text-xs font-mono font-bold text-amber-300">
              {report.yearsUntilElection} Years ({report.monthsUntilElection} mo)
            </span>
          </div>
        </div>
      </div>

      {/* Arthur's Direct Confidential Memo */}
      <div className="bg-slate-950 p-3.5 rounded-xl border border-amber-500/30 text-xs text-slate-200 leading-relaxed font-serif relative shadow-inner">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-amber-400 font-sans font-bold text-xs uppercase tracking-wider">
            Arthur's Priority Recommendation:
          </span>
        </div>
        <p className="italic text-slate-300 pl-2 border-l-2 border-amber-500">
          "{report.chiefOfStaffAdvice}"
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">Citizen Approval</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`text-xl font-mono font-bold ${report.overallApprovalPct >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
              {report.overallApprovalPct}%
            </span>
            <span className="text-[10px] text-slate-400">favorable</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Based on public works</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">Overall Discontent</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`text-xl font-mono font-bold ${report.overallDiscontentPct <= 40 ? 'text-slate-200' : 'text-amber-400'}`}>
              {report.overallDiscontentPct}%
            </span>
            <span className="text-[10px] text-slate-400">unhappy</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Aggregated grievances</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">Top Public Issue</span>
          <span className="text-xs font-bold text-amber-300 block truncate mt-1" title={report.topGrievance}>
            {report.topGrievance}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Requires attention</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">5-Year Forecast</span>
          <span className={`inline-block px-1.5 py-0.5 mt-1 rounded text-[10px] font-bold border ${forecast.color}`}>
            {forecast.label}
          </span>
          <span className="text-[10px] text-slate-500 font-mono block mt-0.5">Electorate: {state.population}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-700/80 gap-1 pt-1">
        <button
          onClick={() => setActiveTab('GRIEVANCES')}
          className={`px-3 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'GRIEVANCES'
              ? 'border-amber-500 text-amber-300 bg-amber-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Public Discontent Breakdown (% Unhappy)
        </button>

        <button
          onClick={() => setActiveTab('RANGES')}
          className={`px-3 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'RANGES'
              ? 'border-amber-500 text-amber-300 bg-amber-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Service Ranges & Balance Guide
        </button>

        <button
          onClick={() => setActiveTab('ELECTION')}
          className={`px-3 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'ELECTION'
              ? 'border-amber-500 text-amber-300 bg-amber-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          5-Year General Election Status
        </button>

        <button
          onClick={() => setActiveTab('TYCOONS')}
          className={`px-3 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'TYCOONS'
              ? 'border-amber-500 text-amber-300 bg-amber-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>City Tycoons & Bribes</span>
          {(state.totalBribesReceivedAsMayor || 0) > 0 && (
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded-full font-mono border border-emerald-500/30">
              ${(state.totalBribesReceivedAsMayor || 0).toLocaleString()}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: DETAILED CITIZEN DISCONTENT LIST */}
      {activeTab === 'GRIEVANCES' && (
        <div className="space-y-2.5 max-h-[58vh] min-h-[340px] overflow-y-auto pr-1">
          {grievancesList.map((item) => {
            const colors = getDiscontentColor(item.pct);
            const Icon = item.icon;

            return (
              <div 
                key={item.id} 
                className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 hover:border-slate-700 transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1.5 rounded-lg ${colors.bg} ${colors.text} shrink-0`}>
                      <Icon size={16} />
                    </div>
                    <div className="truncate">
                      <span className="text-xs font-bold text-white block truncate">{item.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{item.rangeNote}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.coverage !== null && (
                      <span className="hidden sm:inline text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {item.coverage}% covered
                      </span>
                    )}
                    <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${colors.bg} ${colors.text} ${colors.border}`}>
                      {item.pct}% unhappy
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${colors.bar}`}
                    style={{ width: `${Math.min(100, Math.max(2, item.pct))}%` }}
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 gap-1 pt-0.5">
                  <span className="text-slate-300 leading-tight">{item.summary}</span>
                  <span className="text-amber-400/90 font-medium shrink-0 leading-tight">
                    💡 {item.solution}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: SERVICE RANGES & BALANCE GUIDE */}
      {activeTab === 'RANGES' && (
        <div className="space-y-3 max-h-[58vh] min-h-[340px] overflow-y-auto pr-1 text-xs">
          <div className="bg-amber-950/20 border border-amber-500/30 p-3 rounded-xl text-amber-200">
            <span className="font-bold flex items-center gap-1.5 text-xs text-amber-300">
              <Info size={14} />
              Balance of Municipal Ranges
            </span>
            <p className="text-[11px] text-amber-200/90 mt-1 leading-relaxed">
              Every facility has an engineered radius. Citizens expect Botanical Parks within close walking distance (8 tiles) to stroll and breathe clean air, while emergency sirens (Police 16 tiles, Fire 16 tiles, Hospital 20 tiles) and regional grids (Power 32 tiles) cover wider wards.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Botanical Parks */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Trees size={14} className="text-emerald-400" />
                  Botanical Parks & Gardens
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-950 text-emerald-300 rounded border border-emerald-800">
                  8-tile radius
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Citizens need parks within 8 blocks walking distance. Scrubs up to 55 industrial smog and boosts citizen morale by +35.
              </p>
              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                <span>Current City Walkability:</span>
                <span className={`font-mono font-bold ${getCoverageColor(report.coverageParkWalkPct).text}`}>
                  {report.coverageParkWalkPct}% of homes
                </span>
              </div>
            </div>

            {/* Police Precinct */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Shield size={14} className="text-blue-400" />
                  Police Precinct
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-950 text-blue-300 rounded border border-blue-800">
                  16-tile radius
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Patrol cruisers safeguard residential wards within 16 blocks. Unpatrolled sectors face up to 55% crime pressure.
              </p>
              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                <span>Police Patrol Coverage:</span>
                <span className={`font-mono font-bold ${getCoverageColor(report.coveragePolicePct).text}`}>
                  {report.coveragePolicePct}% of homes
                </span>
              </div>
            </div>

            {/* Fire Department */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Flame size={14} className="text-red-400" />
                  Fire Station
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-red-950 text-red-300 rounded border border-red-800">
                  16-tile radius
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Engines deploy within 16 tiles to provide fire protection. Outside this range, unprotected buildings report fire hazard dissatisfaction.
              </p>
              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                <span>Fire Response Coverage:</span>
                <span className={`font-mono font-bold ${getCoverageColor(report.coverageFirePct).text}`}>
                  {report.coverageFirePct}% of homes
                </span>
              </div>
            </div>

            {/* General Hospital */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <HeartPulse size={14} className="text-cyan-400" />
                  General Hospital (2x2)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-cyan-950 text-cyan-300 rounded border border-cyan-800">
                  20-tile radius
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Ambulance paramedics reach 20 blocks. Essential for treating smog-induced respiratory sickness (up to 75% illness reduction).
              </p>
              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                <span>Ambulance Healthcare Reach:</span>
                <span className={`font-mono font-bold ${getCoverageColor(report.coverageHospitalPct).text}`}>
                  {report.coverageHospitalPct}% of homes
                </span>
              </div>
            </div>

            {/* Schools & Universities */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <GraduationCap size={14} className="text-amber-400" />
                  Schools & Universities
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-950 text-amber-300 rounded border border-amber-800">
                  20 / 32-tile radius
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Elementary schools cover 20 blocks; universities radiate academic influence 32 tiles, enabling arcology consolidation.
              </p>
              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                <span>Education Coverage:</span>
                <span className={`font-mono font-bold ${getCoverageColor(report.coverageSchoolPct).text}`}>
                  {report.coverageSchoolPct}% of homes
                </span>
              </div>
            </div>

            {/* Power Plants */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Zap size={14} className="text-orange-400" />
                  Power Plant (2x2)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-orange-950 text-orange-300 rounded border border-orange-800">
                  32-tile radius
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Generates high voltage across a 32-tile grid radius. Emits industrial smog up to 16 blocks (offset with nearby parks).
              </p>
              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                <span>Grid Power Delivery:</span>
                <span className={`font-mono font-bold ${getCoverageColor(report.coveragePowerPct).text}`}>
                  {report.coveragePowerPct}% of homes
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: 5-YEAR GENERAL ELECTION FORECAST */}
      {activeTab === 'ELECTION' && (
        <div className="space-y-3.5 max-h-[58vh] min-h-[340px] overflow-y-auto pr-1 text-xs">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400">Current Mayoral Term</span>
                <h4 className="text-base font-bold text-white">5-Year General Election Cycle (Term {report.termNumber})</h4>
              </div>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${forecast.color}`}>
                {forecast.label}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">Time Remaining</span>
                <span className="text-sm font-bold text-amber-300 font-mono">
                  {report.yearsUntilElection} Years
                </span>
                <span className="text-[10px] text-slate-500 block">({report.monthsUntilElection} in-game months)</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">Projected Turnout</span>
                <span className="text-sm font-bold text-sky-400 font-mono">~74% - 82%</span>
                <span className="text-[10px] text-slate-500 block">{state.population} registered voters</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">Projected Margin</span>
                <span className={`text-sm font-bold font-mono ${report.overallApprovalPct >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {report.overallApprovalPct}% vs {100 - report.overallApprovalPct}%
                </span>
                <span className="text-[10px] text-slate-500 block">50% needed to certify</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed italic">
              "Under the City Charter of New Veridia, the Mayor stands for re-election every 5 in-game years (43,200 simulation ticks). If citizen approval remains above 50%, you will win another 5-year term. If approval falls below 50%, the City Council enforces coalition concessions!"
            </p>
          </div>

          {state.lastElectionResult && (
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">
                Last Certified Election (Term {state.lastElectionResult.termNumber})
              </span>
              <div className="flex items-center justify-between text-xs">
                <span className={state.lastElectionResult.won ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                  {state.lastElectionResult.won ? '🏆 Certified Victory' : '⚠️ Defeat & Coalition Concession'}
                </span>
                <span className="font-mono text-slate-300">
                  {state.lastElectionResult.votePct}% for Mayor • {state.lastElectionResult.turnoutPct}% turnout
                </span>
              </div>
              <p className="text-[11px] text-slate-400 italic">
                "{state.lastElectionResult.keyReason}"
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CITY TYCOONS & BRIBE LEDGER */}
      {activeTab === 'TYCOONS' && (
        <div className="space-y-3.5 max-h-[58vh] min-h-[340px] overflow-y-auto pr-1">
          {/* Bribe & Slush Fund Summary Banner */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
                <Scale size={20} />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Total Bribes Received by City Hall</span>
                <span className="text-lg font-mono font-bold text-emerald-400">
                  ${(state.totalBribesReceivedAsMayor || 0).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-slate-400 block">Current City Corruption</span>
              <span className={`text-sm font-mono font-bold ${state.corruption > 40 ? 'text-amber-400' : 'text-blue-400'}`}>
                {state.corruption}% {state.corruption > 40 ? '(Machine / Corrupt)' : '(Clean / Honest)'}
              </span>
            </div>
          </div>

          {/* Computer Businessmen Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(state.computerBusinessmen || []).map((cb) => {
              const isHonest = cb.alignment === 'HONEST';
              const isMayorCorrupt = state.corruption > 40;
              const isAligned = (isHonest && !isMayorCorrupt) || (!isHonest && isMayorCorrupt);

              return (
                <div 
                  key={cb.id}
                  className={`p-3.5 rounded-xl border ${
                    isHonest 
                      ? 'bg-slate-950/80 border-emerald-500/40' 
                      : 'bg-slate-950/80 border-amber-500/40'
                  } space-y-3`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-serif font-bold text-white text-sm">
                          {cb.name}
                        </h4>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase border ${
                          isHonest 
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}>
                          {cb.alignment}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                        {cb.companyName}
                      </span>
                    </div>
                  </div>

                  {/* Financial Stats */}
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-900/60 p-2 rounded-lg text-center font-mono">
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase">Cash Reserves</span>
                      <span className="text-xs font-bold text-white">${cb.cash.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase">Daily Profit</span>
                      <span className="text-xs font-bold text-emerald-400">+${cb.dailyProfit.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase">Holdings</span>
                      <span className="text-xs font-bold text-sky-400">{cb.properties.length} Props</span>
                    </div>
                  </div>

                  {/* Bribes Ledger (if corrupt) */}
                  {!isHonest && (
                    <div className="bg-amber-950/20 border border-amber-500/30 p-2.5 rounded-lg text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-300 font-mono">Syndicate Bribes to Mayor:</span>
                        <span className="font-mono font-bold text-emerald-400">${cb.totalBribesPaidToMayor.toLocaleString()}</span>
                      </div>
                      {cb.lastBribeAmount && (
                        <p className="text-[10px] text-slate-400">
                          Last delivery: ${cb.lastBribeAmount.toLocaleString()} slipped to executive desk.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Political Stance & Mayor Replacement Status */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">Stance on City Hall:</span>
                      <span className={`font-mono text-[11px] font-bold ${
                        isAligned ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {isAligned ? 'Harmonious Alliance' : 'Active Ouster Effort!'}
                      </span>
                    </div>

                    {isAligned ? (
                      <p className="text-[11px] text-slate-400 italic">
                        {isHonest
                          ? '"Both mayor and businessman are honest. Complete cooperation, zero attempts to replace City Hall directly."'
                          : '"Both mayor and businessman are corrupt machine operators. Mutual understanding, kickbacks flowing, zero attempts to replace City Hall directly."'}
                      </p>
                    ) : (
                      <div className="bg-red-950/20 border border-red-500/30 p-2 rounded-lg space-y-1.5">
                        <p className="text-[11px] text-red-200">
                          {isHonest
                            ? 'Julian Croft is using the HONEST chain to remove the corrupt Mayor:'
                            : 'Silas Cross is using the CORRUPT chain to remove the honest Mayor:'}
                        </p>

                        {/* Qualifying Progress */}
                        <div className="space-y-0.5">
                          <div className="flex justify-between text-[10px] font-mono text-slate-400">
                            <span>$200k Ballot Initiative:</span>
                            <span className="text-white">${cb.qualifyingFunds.toLocaleString()} / $200,000</span>
                          </div>
                          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-amber-500 rounded-full"
                              style={{ width: `${Math.min(100, (cb.qualifyingFunds / 200000) * 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Subset Campaign Actions Progress */}
                        <div className="grid grid-cols-3 gap-1 text-[10px] font-mono pt-1">
                          {isHonest ? (
                            <>
                              <div className="bg-slate-900/80 p-1 rounded text-center">
                                <span className="text-slate-400 block text-[9px]">Ads</span>
                                <span className="text-emerald-300 font-bold">{cb.campaignProgress.runningAdsPayments}/5</span>
                              </div>
                              <div className="bg-slate-900/80 p-1 rounded text-center">
                                <span className="text-slate-400 block text-[9px]">Projects</span>
                                <span className="text-emerald-300 font-bold">{cb.campaignProgress.communityProjectsPayments}/5</span>
                              </div>
                              <div className="bg-slate-900/80 p-1 rounded text-center">
                                <span className="text-slate-400 block text-[9px]">Speeches</span>
                                <span className="text-emerald-300 font-bold">{cb.campaignProgress.campaignSpeechesPayments}/5</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="bg-slate-900/80 p-1 rounded text-center">
                                <span className="text-slate-400 block text-[9px]">Police Bribes</span>
                                <span className="text-amber-300 font-bold">{cb.campaignProgress.bribePoliceChiefPayments}/5</span>
                              </div>
                              <div className="bg-slate-900/80 p-1 rounded text-center">
                                <span className="text-slate-400 block text-[9px]">Media Smears</span>
                                <span className="text-amber-300 font-bold">{cb.campaignProgress.plantBadStoriesPayments}/5</span>
                              </div>
                              <div className="bg-slate-900/80 p-1 rounded text-center">
                                <span className="text-slate-400 block text-[9px]">Poll Bribes</span>
                                <span className="text-amber-300 font-bold">{cb.campaignProgress.bribePollWorkersPayments}/5</span>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-red-500/20">
                          <span className="font-mono text-[11px] text-slate-300">Ouster Odds at 5-Year Election:</span>
                          <span className="font-mono font-bold text-red-400 text-sm">
                            {cb.effectiveOdds}% {isHonest ? '(Max 50%)' : '(Max 90%)'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Owned properties preview */}
                    {cb.properties.length > 0 && (
                      <div className="pt-1">
                        <span className="text-[10px] font-mono text-slate-400 block">Acquired Properties:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {cb.properties.map((p, idx) => (
                            <span 
                              key={idx}
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800"
                            >
                              {p.name} (T{p.level})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-700/80">
        <button 
          onClick={onClose}
          className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium transition-colors cursor-pointer"
        >
          Dismiss Report
        </button>

        <button
          onClick={() => {
            onClose();
            onSitAtDesk();
          }}
          className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
        >
          <Building2 size={14} />
          <span>Open City Desk (Take Action)</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};
