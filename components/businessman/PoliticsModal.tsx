import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { 
  Landmark, 
  Vote, 
  X, 
  TrendingUp, 
  Scale, 
  ShieldAlert, 
  ShieldCheck, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  Gavel, 
  ArrowRight,
  HandCoins,
  Receipt,
  Sparkles,
  Megaphone,
  Radio,
  Tv,
  HeartHandshake,
  Mic,
  Skull,
  Newspaper,
  Shield,
  FileText,
  BadgeAlert
} from 'lucide-react';
import { officeAudio } from '../office/officeAudio';
import { TICKS_PER_DAY, DAYS_PER_MONTH } from '../../constants';

interface PoliticsModalProps {
  onClose: () => void;
}

export const PoliticsModal: React.FC<PoliticsModalProps> = ({ onClose }) => {
  const { state, dispatch } = useGame();
  const mayor = state.computerMayor;
  const bizman = state.businessman;

  const [selectedSuccessor, setSelectedSuccessor] = useState<'HONEST' | 'CORRUPT'>('HONEST');
  const [showOusterConfirmation, setShowOusterConfirmation] = useState(false);

  if (!mayor || !bizman) return null;

  // 1. Qualifying committee threshold: 4x the original $50,000 = $200,000!
  const campaignGoal = 200000;
  const currentCampaignFunds = bizman.donatedToRecall || 0;
  const campaignPct = Math.min(100, Math.round((currentCampaignFunds / campaignGoal) * 100));
  const isBallotQualified = currentCampaignFunds >= campaignGoal || !!bizman.isBallotQualified;

  // 2. Campaign Sub-set Actions Progress
  const cp = bizman.campaignProgress || {
    runningAdsPayments: 0,
    communityProjectsPayments: 0,
    campaignSpeechesPayments: 0,
    bribePoliceChiefPayments: 0,
    plantBadStoriesPayments: 0,
    bribePollWorkersPayments: 0,
  };

  // Good side: 3 actions x 5 payments = 15 payments = 50% max win odds
  const goodTotalPayments = cp.runningAdsPayments + cp.communityProjectsPayments + cp.campaignSpeechesPayments;
  const goodOdds = Math.min(50, Math.round((goodTotalPayments * (50 / 15)) * 10) / 10);

  // Corrupt side: 3 actions x 5 payments = 15 payments = 90% max win odds (6% per payment)
  const corruptTotalPayments = cp.bribePoliceChiefPayments + cp.plantBadStoriesPayments + cp.bribePollWorkersPayments;
  const corruptOdds = Math.min(90, Math.round((corruptTotalPayments * 6) * 10) / 10);

  // Electoral rule: Whichever is better sets the odds! No stacking benefit.
  const effectiveOdds = Math.max(goodOdds, corruptOdds);

  // 5-Year General Election Timing
  const totalDays = Math.floor(state.date / TICKS_PER_DAY);
  const daysUntilElection = Math.max(0, Math.floor((state.nextElectionDate - state.date) / TICKS_PER_DAY));
  const currentYear = 1 + Math.floor(totalDays / (DAYS_PER_MONTH * 12));
  const electionYear = Math.ceil(state.nextElectionDate / (TICKS_PER_DAY * DAYS_PER_MONTH * 12));

  const isMayorHonest = mayor.alignment === 'HONEST';
  const rel = mayor.relationWithPlayer;
  const isAlly = rel >= 30;
  const isHostile = rel <= -25;

  const handleLobby = (actionType: 'INCREASE_SUBSIDY' | 'TAX_RELIEF' | 'BRIBE' | 'DONATE_CAMPAIGN', cost: number) => {
    if (state.money < cost) {
      officeAudio.playClick();
      return;
    }
    officeAudio.playTerminalChime();
    dispatch({
      type: 'LOBBY_MAYOR',
      payload: { actionType, amount: cost },
    });
  };

  const handleDonateCampaign = (amount: number) => {
    const cost = Math.min(state.money, amount);
    if (cost <= 0) return;
    officeAudio.playTerminalChime();
    dispatch({
      type: 'LOBBY_MAYOR',
      payload: { actionType: 'FUND_RECALL', amount: cost },
    });
  };

  const handleCampaignAction = (
    action: 
      | 'RUN_ADS' 
      | 'COMMUNITY_PROJECTS' 
      | 'CAMPAIGN_SPEECHES' 
      | 'BRIBE_POLICE_CHIEF' 
      | 'PLANT_BAD_STORIES' 
      | 'BRIBE_POLL_WORKERS',
    cost: number
  ) => {
    if (state.money < cost) {
      officeAudio.playClick();
      return;
    }
    officeAudio.playCash();
    dispatch({
      type: 'CAMPAIGN_ACTION',
      payload: { action, cost },
    });
  };

  const handleCallElectionNow = () => {
    officeAudio.playStandUp();
    dispatch({ type: 'RESOLVE_BUSINESSMAN_ELECTION', payload: { forced: true } });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 font-sans animate-in fade-in select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[95vh] text-slate-200">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600/30 to-slate-900 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
              <Landmark size={22} />
            </div>
            <div>
              <h3 className="font-serif font-bold text-white text-base sm:text-lg flex items-center gap-2">
                <span>City Hall Politics & Mayoral Campaign</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                Lobbying · Run for Office · Good vs. Corrupt Electoral Strategies
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              officeAudio.playClick();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer bg-slate-900 border border-slate-800 hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 space-y-5 overflow-y-auto text-sm text-slate-300">
          
          {/* 1. Current Sitting Mayor Dossier */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 font-serif font-bold text-base">
                  {mayor.name[0]}
                </div>
                <div>
                  <h4 className="font-serif font-bold text-white text-base leading-tight">
                    {mayor.name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mt-0.5">
                    <span className={isMayorHonest ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                      {isMayorHonest ? 'Honest Reformer' : 'Machine Boss'}
                    </span>
                    <span>·</span>
                    <span>Approval: {mayor.approval}%</span>
                    <span>·</span>
                    <span className={isAlly ? 'text-emerald-400' : isHostile ? 'text-rose-400' : 'text-slate-300'}>
                      Relations: {mayor.relationWithPlayer > 0 ? `+${mayor.relationWithPlayer}` : mayor.relationWithPlayer}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-mono uppercase block">Active Subsidy Rate</span>
                <span className="text-lg font-mono font-bold text-amber-300">{mayor.subsidyMeter}%</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed italic">
              "{mayor.lastActionText}"
            </p>
          </div>

          {/* ========================================================================= */}
          {/* 2. RUN FOR OFFICE: CANDIDACY COMMITTEE ($200,000 THRESHOLD - 4X SUPERPACK) */}
          {/* ========================================================================= */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 border-2 border-amber-500/40 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Vote size={22} className="text-amber-400" />
                <div>
                  <h4 className="font-serif font-bold text-white text-base">
                    Run for Office: Mayoral Candidacy Committee
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Qualify on Ballot (Cost: $200,000) & Campaign for the 5th-Year Election
                  </span>
                </div>
              </div>
              <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${
                isBallotQualified
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {isBallotQualified ? '✓ BALLOT QUALIFIED' : `${campaignPct}% Funded`}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              To challenge the sitting Mayor and take City Hall, you must establish an official Exploratory Campaign Committee ($200,000 qualifying war chest). Once ballot qualification is achieved, you unlock <strong>Good</strong> and <strong>Corrupt</strong> campaign mechanics to secure victory in the <strong>5th-Year General Election</strong>!
            </p>

            {/* War Chest Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Qualifying Capital Raised:</span>
                <span className="font-bold text-amber-300">
                  ${currentCampaignFunds.toLocaleString()} / ${campaignGoal.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="h-full bg-gradient-to-r from-amber-600 to-emerald-400 transition-all duration-300"
                  style={{ width: `${campaignPct}%` }}
                />
              </div>
            </div>

            {/* Funding Buttons (Only active if not qualified yet) */}
            {!isBallotQualified ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-slate-400 font-mono">Contribute Capital:</span>
                <button
                  onClick={() => handleDonateCampaign(10000)}
                  disabled={state.money < 10000}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-white border border-slate-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  +$10,000
                </button>
                <button
                  onClick={() => handleDonateCampaign(50000)}
                  disabled={state.money < 50000}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-white border border-slate-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  +$50,000
                </button>
                <button
                  onClick={() => handleDonateCampaign(Math.min(state.money, campaignGoal - currentCampaignFunds))}
                  disabled={state.money <= 0}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-mono font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Fund Remaining (${Math.min(state.money, campaignGoal - currentCampaignFunds).toLocaleString()})
                </button>
              </div>
            ) : (
              /* ========================================================================= */
              /* SUB-SET OF CAMPAIGN STRATEGIES: GOOD (50% MAX) vs CORRUPT (90% MAX) */
              /* ========================================================================= */
              <div className="space-y-4 pt-2 border-t border-slate-800">
                
                {/* Electoral Rule Banner */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Scale size={16} className="text-amber-400" />
                      <span className="font-bold text-white text-xs">
                        Electoral Rule: Independent Campaign Tracks
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">
                      Doing both together provides no combined benefit. Whichever track has the higher win odds determines your final election outcome.
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 font-mono text-xs">
                    <div className="text-center">
                      <span className="text-[9px] text-emerald-400 block uppercase">Good Odds</span>
                      <span className="font-bold text-emerald-300">{goodOdds}%</span>
                    </div>
                    <span className="text-slate-600">vs</span>
                    <div className="text-center">
                      <span className="text-[9px] text-rose-400 block uppercase">Corrupt Odds</span>
                      <span className="font-bold text-rose-300">{corruptOdds}%</span>
                    </div>
                    <span className="text-slate-600">➔</span>
                    <div className="text-center pl-1 border-l border-slate-800">
                      <span className="text-[9px] text-amber-400 block uppercase">Effective</span>
                      <span className="font-extrabold text-amber-300 text-sm">{effectiveOdds}%</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* TRACK A: THE GOOD SIDE (Civic Reformer - 50% Max Win Odds) */}
                  <div className="p-4 rounded-xl bg-emerald-950/20 border-2 border-emerald-500/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={18} className="text-emerald-400" />
                        <h5 className="font-serif font-bold text-emerald-300 text-sm">
                          Good Side: Civic Campaign
                        </h5>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {goodOdds}% / 50% Max
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Win through voter trust, civic works, and public town halls. 5 payments each across all 3 actions brings you to 50% win probability.
                    </p>

                    <div className="space-y-2 pt-1 font-mono text-xs">
                      {/* Action 1: Running Ads */}
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-white text-xs font-sans flex items-center gap-1.5">
                            <Tv size={13} className="text-emerald-400" />
                            <span>Running Media Ads</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {cp.runningAdsPayments}/5 paid (+{(cp.runningAdsPayments * 3.33).toFixed(1)}% odds)
                          </span>
                        </div>
                        <button
                          onClick={() => handleCampaignAction('RUN_ADS', 8000)}
                          disabled={cp.runningAdsPayments >= 5 || state.money < 8000}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          {cp.runningAdsPayments >= 5 ? 'Maxed (5/5)' : 'Pay $8,000'}
                        </button>
                      </div>

                      {/* Action 2: Funding Community Projects */}
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-white text-xs font-sans flex items-center gap-1.5">
                            <HeartHandshake size={13} className="text-emerald-400" />
                            <span>Community Projects</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {cp.communityProjectsPayments}/5 paid (+{(cp.communityProjectsPayments * 3.33).toFixed(1)}% odds)
                          </span>
                        </div>
                        <button
                          onClick={() => handleCampaignAction('COMMUNITY_PROJECTS', 12000)}
                          disabled={cp.communityProjectsPayments >= 5 || state.money < 12000}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          {cp.communityProjectsPayments >= 5 ? 'Maxed (5/5)' : 'Pay $12,000'}
                        </button>
                      </div>

                      {/* Action 3: Holding Campaign Speeches */}
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-white text-xs font-sans flex items-center gap-1.5">
                            <Mic size={13} className="text-emerald-400" />
                            <span>Campaign Speeches</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {cp.campaignSpeechesPayments}/5 paid (+{(cp.campaignSpeechesPayments * 3.33).toFixed(1)}% odds)
                          </span>
                        </div>
                        <button
                          onClick={() => handleCampaignAction('CAMPAIGN_SPEECHES', 6000)}
                          disabled={cp.campaignSpeechesPayments >= 5 || state.money < 6000}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          {cp.campaignSpeechesPayments >= 5 ? 'Maxed (5/5)' : 'Pay $6,000'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* TRACK B: THE CORRUPT SIDE (Machine Boss - 90% Max Win Odds) */}
                  <div className="p-4 rounded-xl bg-rose-950/20 border-2 border-rose-500/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldAlert size={18} className="text-rose-400" />
                        <h5 className="font-serif font-bold text-rose-300 text-sm">
                          Corrupt Side: Shadow Machine
                        </h5>
                      </div>
                      <span className="text-xs font-mono font-bold text-rose-400">
                        {corruptOdds}% / 90% Max
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Fix the election through machine bribes, union bosses, and smear campaigns. 5 payments each across all 3 actions brings you to 90% win probability.
                    </p>

                    <div className="space-y-2 pt-1 font-mono text-xs">
                      {/* Action 1: Bribing Police Chief */}
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-white text-xs font-sans flex items-center gap-1.5">
                            <Shield size={13} className="text-rose-400" />
                            <span>Bribe Police Chief (Unions)</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {cp.bribePoliceChiefPayments}/5 paid (+{cp.bribePoliceChiefPayments * 6}% odds)
                          </span>
                        </div>
                        <button
                          onClick={() => handleCampaignAction('BRIBE_POLICE_CHIEF', 14000)}
                          disabled={cp.bribePoliceChiefPayments >= 5 || state.money < 14000}
                          className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          {cp.bribePoliceChiefPayments >= 5 ? 'Maxed (5/5)' : 'Pay $14,000'}
                        </button>
                      </div>

                      {/* Action 2: Planting Bad Stories in Media */}
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-white text-xs font-sans flex items-center gap-1.5">
                            <Newspaper size={13} className="text-rose-400" />
                            <span>Plant Media Smear Stories</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {cp.plantBadStoriesPayments}/5 paid (+{cp.plantBadStoriesPayments * 6}% odds)
                          </span>
                        </div>
                        <button
                          onClick={() => handleCampaignAction('PLANT_BAD_STORIES', 10000)}
                          disabled={cp.plantBadStoriesPayments >= 5 || state.money < 10000}
                          className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          {cp.plantBadStoriesPayments >= 5 ? 'Maxed (5/5)' : 'Pay $10,000'}
                        </button>
                      </div>

                      {/* Action 3: Bribing Poll Workers */}
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-white text-xs font-sans flex items-center gap-1.5">
                            <Vote size={13} className="text-rose-400" />
                            <span>Bribe Precinct Poll Workers</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {cp.bribePollWorkersPayments}/5 paid (+{cp.bribePollWorkersPayments * 6}% odds)
                          </span>
                        </div>
                        <button
                          onClick={() => handleCampaignAction('BRIBE_POLL_WORKERS', 15000)}
                          disabled={cp.bribePollWorkersPayments >= 5 || state.money < 15000}
                          className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          {cp.bribePollWorkersPayments >= 5 ? 'Maxed (5/5)' : 'Pay $15,000'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Election Trigger Box */}
                <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-mono text-slate-300">
                      <span>Scheduled General Election: </span>
                      <strong className="text-amber-300">Year {electionYear}</strong>
                      <span className="text-slate-400 ml-1">({daysUntilElection} in-game days remaining)</span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5 block leading-tight">
                      When held at Year 5, you have a <strong>{effectiveOdds}% chance</strong> to win and assume the Mayorship, ending your time as a businessman. Or call a Special Recall Election now!
                    </span>
                  </div>

                  <button
                    onClick={handleCallElectionNow}
                    disabled={effectiveOdds <= 0}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Gavel size={14} />
                    <span>Call Special Election ({effectiveOdds}% Odds)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. Standard Mayoral Lobbying & Subsidies */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="font-serif font-bold text-white text-sm">
              Routine City Hall Lobbying & Subsidies
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Increase Subsidies */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-2">
                <div>
                  <span className="font-bold text-white text-xs block font-serif">
                    Lobby for Enterprise Subsidies
                  </span>
                  <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">
                    Petition the City Council to raise the municipal subsidy payout rate by +10%.
                  </span>
                </div>
                <button
                  onClick={() => handleLobby('INCREASE_SUBSIDY', 5000)}
                  disabled={state.money < 5000}
                  className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-slate-950 transition-colors flex items-center justify-between cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Petition Council</span>
                  <span className="font-mono font-bold">$5,000</span>
                </button>
              </div>

              {/* Option 2: Mayoral Kickback / Bribe */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-2">
                <div>
                  <span className="font-bold text-amber-300 text-xs block font-serif flex items-center gap-1">
                    <HandCoins size={13} />
                    Under-the-Table Mayoral Bribe
                  </span>
                  <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">
                    Slip kickbacks to City Hall machine bosses. Cancels all pending police raids and secures dark slush funding.
                  </span>
                </div>
                <button
                  onClick={() => handleLobby('BRIBE', 8000)}
                  disabled={state.money < 8000}
                  className="py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-slate-950 transition-colors flex items-center justify-between cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Pay Kickback</span>
                  <span className="font-mono font-bold">$8,000</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
