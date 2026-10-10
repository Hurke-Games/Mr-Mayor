import React from 'react';
import { useGame } from '../../context/GameContext';
import { Vote, Award, AlertTriangle, Users, CheckCircle2, ArrowRight, ShieldCheck, Scale, Building2 } from 'lucide-react';
import { calculateCityGrievances } from '../../utils/simulation';

export const ElectionModal: React.FC = () => {
  const { state, dispatch } = useGame();

  if (!state.showElectionModal) return null;

  const result = state.lastElectionResult;
  const won = result?.won ?? true;
  const termNumber = result?.termNumber ?? 1;
  const grievances = calculateCityGrievances(state);

  const handleCertify = () => {
    dispatch({ type: 'CLOSE_ELECTION_MODAL' });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Official Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/50 p-5 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 shadow-lg ${
              won ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-red-500/20 border-red-400 text-red-300'
            }`}>
              <Vote size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                  City Board of Elections
                </span>
                <span className="text-xs font-mono text-slate-400">
                  5-Year General Election Cycle
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white font-serif tracking-tight mt-0.5">
                Official Mayoral Certification • Term {termNumber}
              </h2>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Victory / Re-election Banner */}
          <div className={`p-4 rounded-xl border flex items-start gap-4 ${
            won 
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200' 
              : 'bg-red-950/30 border-red-500/40 text-red-200'
          }`}>
            <div className="shrink-0 mt-0.5">
              {won ? <Award size={28} className="text-amber-400" /> : <AlertTriangle size={28} className="text-red-400" />}
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold font-serif text-white flex items-center gap-2">
                {won ? '🏆 RE-ELECTION VICTORY: 5-YEAR MANDATE RENEWED' : '⚠️ ELECTORAL REBUKE: COALITION COMPACT ENFORCED'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {result?.keyReason || (won 
                  ? 'Citizens approved your public works and services across the wards!' 
                  : 'Voters expressed sharp discontent with municipal conditions!')}
              </p>
            </div>
          </div>

          {/* Voting Results & Tally Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-col">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Mayoral Ballots</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className={`text-2xl font-mono font-bold ${won ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {result?.votePct ?? 52}%
                </span>
                <span className="text-xs text-slate-400 font-mono">of vote</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 font-mono">
                {(result?.votesFor ?? 0).toLocaleString()} votes for Mayor
              </span>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-col">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Challenger Coalition</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-mono font-bold text-slate-300">
                  {result?.opponentVotePct ?? 48}%
                </span>
                <span className="text-xs text-slate-400 font-mono">of vote</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 font-mono">
                {(result?.votesAgainst ?? 0).toLocaleString()} votes against
              </span>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-col col-span-2 sm:col-span-1">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium flex items-center gap-1">
                <Users size={12} className="text-sky-400" />
                Voter Turnout
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-mono font-bold text-sky-400">
                  {result?.turnoutPct ?? 74}%
                </span>
                <span className="text-xs text-slate-400 font-mono">turnout</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 font-mono">
                Registered electorate: {state.population.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Visual Vote Margin Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-300">
              <span className="font-semibold text-emerald-400">Incumbent ({result?.votePct}%)</span>
              <span className="font-semibold text-slate-400">Challenger Coalition ({result?.opponentVotePct}%)</span>
            </div>
            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
              <div 
                className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full transition-all duration-500" 
                style={{ width: `${result?.votePct ?? 50}%` }}
              />
              <div 
                className="bg-gradient-to-r from-slate-600 to-slate-500 h-full transition-all duration-500" 
                style={{ width: `${result?.opponentVotePct ?? 50}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>50% Threshold to Win</span>
              <span>Total Ballots Cast: {((result?.votesFor ?? 0) + (result?.votesAgainst ?? 0)).toLocaleString()}</span>
            </div>
          </div>

          {/* Chief of Staff Official Post-Election Debrief */}
          <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/20 space-y-2 relative">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-500/40">
                A
              </div>
              <span className="text-xs font-bold text-amber-300">Arthur Holloway • Chief of Staff Debrief</span>
            </div>
            <p className="text-xs text-slate-300 italic leading-relaxed font-serif pl-8">
              "{won 
                ? `Sir, the Board of Elections has officially sealed the ballot boxes. Our majority held with ${result?.votePct}% of the vote! Citizens appreciate our progress, especially regarding ${grievances.topApproved}. But take note: public discontent remains highest in ${grievances.topGrievance}. Let's address it early in our new 5-year term.`
                : `Sir, the voters sent an unmistakable rebuke over ${grievances.topGrievance}, keeping us to ${result?.votePct}%. Under municipal charter provisions, the City Council has seated you under an emergency coalition pact. We must balance our service ranges—parks, clinics, fire, and police—immediately if we want to survive the next 5 years.`
              }"
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-amber-400" />
            <span>Next General Election in 5 Years (Term {termNumber + 1})</span>
          </div>

          <button
            onClick={handleCertify}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs transition-all shadow-lg flex items-center gap-2 cursor-pointer"
          >
            <span>Certify & Begin 5-Year Term {termNumber + 1}</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
