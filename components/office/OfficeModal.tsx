import React from 'react';
import { useGame } from '../../context/GameContext';
import { X, Eye, Shield, Users, Lock, Coffee, Newspaper, DoorClosed, AlertTriangle, Compass } from 'lucide-react';
import { officeAudio } from './officeAudio';
import { ChiefOfStaffReport } from './ChiefOfStaffReport';

export type OfficeInteractableType = 
  | 'DESK' 
  | 'WINDOW' 
  | 'ADVISOR' 
  | 'CORKBOARD' 
  | 'SAFE' 
  | 'BAR' 
  | 'SOFA' 
  | 'DOORS';

interface OfficeModalProps {
  type: OfficeInteractableType | null;
  onClose: () => void;
  onSitAtDesk: () => void;
  onGoOutside?: () => void;
}

export const OfficeModal: React.FC<OfficeModalProps> = ({ type, onClose, onSitAtDesk, onGoOutside }) => {
  const { state } = useGame();

  if (!type || type === 'DESK') return null;

  const dayNumber = Math.floor(state.date / 24);
  const hour = state.date % 24;

  const renderContent = () => {
    switch (type) {
      case 'WINDOW': {
        const isNight = hour < 6 || hour >= 20;
        const isDusk = hour >= 17 && hour < 20;
        const timeDesc = isNight ? 'Bathed in streetlamp amber and blinking antenna beacons' : isDusk ? 'Golden hour casting long shadows between skyscrapers' : 'Shrouded under morning metropolitan mist';
        
        let cityImpression = "The grid expands below. Chimneys and cranes mark the city's ambition.";
        if (state.corruption > 50) {
          cityImpression = "Protest banners flutter faintly in the lower district. The air feels heavy with civic discontent.";
        } else if (state.population > 500) {
          cityImpression = "Traffic arteries pulse steadily through the commercial corridors. Growth is accelerating.";
        }

        return (
          <div className="space-y-4">
            <div className="h-44 rounded-lg bg-gradient-to-b from-slate-950 via-slate-900 to-amber-950/40 p-4 border border-slate-700 relative overflow-hidden flex flex-col justify-end">
              {/* Decorative skyline silhouette */}
              <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px]" />
              <div className="relative z-10">
                <span className="text-xs font-mono uppercase tracking-widest text-amber-400">Panoramic View • 4th Floor</span>
                <h4 className="text-xl font-bold text-white font-serif tracking-tight">The City of New Veridia</h4>
                <p className="text-xs text-slate-300 mt-1">{timeDesc}</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed italic border-l-2 border-amber-500 pl-3">
              "{cityImpression}"
            </p>

            <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-3 rounded border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block">Civic Safety</span>
                <span className={`font-mono font-bold ${state.safety > 60 ? 'text-emerald-400' : 'text-red-400'}`}>{state.safety}%</span>
              </div>
              <div>
                <span className="text-slate-400 block">Corruption</span>
                <span className={`font-mono font-bold ${state.corruption > 40 ? 'text-amber-400' : 'text-blue-400'}`}>{state.corruption}%</span>
              </div>
              <div>
                <span className="text-slate-400 block">Housing Demand</span>
                <span className="font-mono font-bold text-white">{state.housingDemand}%</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={onClose}
                className="px-4 py-2 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium transition-colors"
              >
                Step Away
              </button>
              <button
                onClick={() => {
                  onClose();
                  onSitAtDesk();
                }}
                className="px-4 py-2 rounded bg-amber-600 text-white hover:bg-amber-500 text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <span>Sit at Desk & Manage</span>
              </button>
            </div>
          </div>
        );
      }

      case 'ADVISOR': {
        return (
          <ChiefOfStaffReport 
            onClose={onClose} 
            onSitAtDesk={onSitAtDesk} 
          />
        );
      }

      case 'CORKBOARD': {
        return (
          <div className="space-y-4">
            <div className="border-b border-slate-700 pb-2">
              <span className="text-xs font-mono uppercase text-amber-500">Confidential Diagram</span>
              <h4 className="font-bold text-white text-lg">The Political Power Web</h4>
            </div>

            <p className="text-xs text-slate-400">
              Photographs, official memos, and newspaper clippings connected by red yarn crisscross the corkboard.
            </p>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-950 p-3 rounded border border-orange-500/30">
                <div className="text-xs font-bold text-orange-400 mb-1">Iron Union</div>
                <p className="text-[11px] text-slate-400">Controls heavy industry & transit strikes. Needs affordable housing & work permits.</p>
              </div>
              <div className="bg-slate-950 p-3 rounded border border-purple-500/30">
                <div className="text-xs font-bold text-purple-400 mb-1">Gilded Circle</div>
                <p className="text-[11px] text-slate-400">High-finance magnates. Funds campaigns, hates high taxes and safety regulations.</p>
              </div>
              <div className="bg-slate-950 p-3 rounded border border-slate-500/30">
                <div className="text-xs font-bold text-slate-300 mb-1">Gray Collective</div>
                <p className="text-[11px] text-slate-400">Civil servants & investigative journalists. Uncovers dirty bribes and illicit backroom deals.</p>
              </div>
            </div>

            <div className="p-3 bg-amber-950/30 rounded border border-amber-800/40 text-xs text-amber-200/90 flex items-start gap-2">
              <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <span>
                Tip: Sitting at your desk unlocks full faction interactions (bribing, lobbying, policy sliders).
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={onClose}
                className="px-4 py-2 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium"
              >
                Close Corkboard
              </button>
            </div>
          </div>
        );
      }

      case 'SAFE': {
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-700 pb-2">
              <Lock size={18} className="text-amber-400" />
              <h4 className="font-bold text-white text-lg">Mayoral Wall Safe</h4>
            </div>

            <div className="bg-slate-950 p-4 rounded border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Official Municipal Treasury:</span>
                <span className="text-emerald-400 font-bold">${state.money.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Total Bribes Slipped to Mayor:</span>
                <span className="text-emerald-400 font-bold">${(state.totalBribesReceivedAsMayor || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Corruption Index:</span>
                <span className="text-amber-400 font-bold">{state.corruption} / 100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Auditor Status:</span>
                <span className={state.corruption > 50 ? 'text-red-400' : 'text-slate-400'}>
                  {state.corruption > 50 ? 'Active Inquiry Pending' : 'No Current Investigation'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 italic">
              "Behind the portrait of Founding Mayor Bartholomew Hands lies the ledgers of past administrations. Every bribe leaves a fingerprint."
            </p>

            <div className="flex justify-end pt-2">
              <button 
                onClick={onClose}
                className="px-4 py-2 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium"
              >
                Lock Safe
              </button>
            </div>
          </div>
        );
      }

      case 'BAR': {
        return (
          <div className="space-y-4">
            <div className="border-b border-slate-700 pb-2">
              <span className="text-xs font-mono uppercase text-amber-500">Executive Hospitality</span>
              <h4 className="font-bold text-white text-lg">Mahogany Bar Cart & Decanter</h4>
            </div>

            <div className="bg-slate-950 p-4 rounded border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-2">
              <p>
                An antique cut-crystal decanter filled with 25-year-old highland malt whisky sits alongside a freshly brewed pot of Columbian dark roast coffee.
              </p>
              <p className="text-amber-400/90 italic">
                "Leadership demands sharp senses. Or a steadying sip when the city council vetoes the zoning budget."
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  officeAudio.playGlassClink();
                  onClose();
                }}
                className="px-4 py-2 rounded bg-amber-600/30 border border-amber-500 text-amber-300 hover:bg-amber-600/40 text-xs font-semibold"
              >
                Pour a Glass of Scotch
              </button>
              <button 
                onClick={onClose}
                className="px-4 py-2 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium"
              >
                Leave Bar
              </button>
            </div>
          </div>
        );
      }

      case 'SOFA': {
        const latestNews = state.notifications[0];
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-700 pb-2">
              <Newspaper size={18} className="text-amber-400" />
              <h4 className="font-bold text-white text-lg">The Metropolis Daily Chronicle</h4>
            </div>

            <div className="bg-amber-50 text-slate-950 p-4 rounded shadow-inner font-serif">
              <div className="border-b border-slate-400 pb-2 mb-3 text-center">
                <span className="text-xs uppercase font-sans tracking-widest text-slate-600 block">CITY HALL EDITION • DAY {dayNumber}</span>
                <h3 className="text-lg font-black tracking-tight mt-1">{latestNews ? latestNews.title : 'CITY HANDS TAKE CHARGE'}</h3>
              </div>
              <p className="text-xs leading-relaxed">
                {latestNews ? latestNews.message : 'The new administration takes office amidst growing anticipation. Faction delegates gather at the city gates.'}
              </p>
              <div className="mt-3 pt-2 border-t border-slate-300 text-[10px] font-mono text-slate-500 flex justify-between">
                <span>Source: {latestNews?.source || 'City Desk'}</span>
                <span>Press Reliability: {100 - (latestNews?.bias || 0)}%</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={onClose}
                className="px-4 py-2 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium"
              >
                Put Down Paper
              </button>
            </div>
          </div>
        );
      }

      case 'DOORS': {
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-700 pb-2">
              <DoorClosed size={18} className="text-amber-400" />
              <h4 className="font-bold text-white text-lg">City Hall Grand Entrance</h4>
            </div>

            <div className="bg-slate-950 p-4 rounded border border-slate-800 text-xs text-slate-300 space-y-2">
              <p>
                The grand corridor leads down past the marble rotunda directly to the colonnade portico and out into the city streets.
              </p>
              <p className="italic text-slate-400">
                Outside, the sprawling landscape of Metropolis stretches out across rolling green plains, waiting for your zoning plans and civic decrees.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={onClose}
                className="px-4 py-2 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium"
              >
                Stay in Office
              </button>
              {onGoOutside && (
                <button
                  onClick={() => {
                    onClose();
                    onGoOutside();
                  }}
                  className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <Compass size={14} />
                  <span>Head Outside to City Streets</span>
                </button>
              )}
              <button
                onClick={() => {
                  onClose();
                  onSitAtDesk();
                }}
                className="px-4 py-2 rounded bg-amber-600 text-white hover:bg-amber-500 text-xs font-bold"
              >
                Go to Desk & Manage
              </button>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className={`bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full overflow-hidden flex flex-col ${
        type === 'ADVISOR' ? 'max-w-4xl max-h-[94vh]' : 'max-w-lg'
      }`}>
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800/80 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-mono tracking-wider uppercase text-slate-300 font-semibold">
              {type === 'ADVISOR' ? 'Chief of Staff Executive Intelligence' : 'Executive Suite Interaction'}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className={`p-5 ${type === 'ADVISOR' ? 'overflow-y-auto' : ''}`}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
