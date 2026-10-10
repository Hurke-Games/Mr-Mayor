import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Tile, TileType, OwnedBusiness } from '../../types';
import { 
  Building2, 
  Store, 
  Factory, 
  X, 
  TrendingUp, 
  Scale, 
  ShieldAlert, 
  ShieldCheck, 
  Sparkles, 
  DollarSign, 
  Users, 
  Trash2, 
  ArrowUpCircle,
  HelpCircle,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { officeAudio } from '../office/officeAudio';

interface BusinessModalProps {
  tileIndex: number;
  onClose: () => void;
}

export const BusinessModal: React.FC<BusinessModalProps> = ({ tileIndex, onClose }) => {
  const { state, dispatch } = useGame();
  const tile = state.grid[tileIndex];
  const businessman = state.businessman;
  const mayor = state.computerMayor;

  if (!tile || !businessman) return null;

  // Find if player already owns a business at this tile
  const ownedBiz = businessman.businesses.find(b => b.tileIndex === tileIndex);
  const rivalTycoonOwner = state.computerBusinessmen?.find(cb => cb.id === tile.ownerId);

  // Suggested business names based on type
  const isIndustrial = tile.type === TileType.INDUSTRIAL;
  const isCommercial = tile.type === TileType.COMMERCIAL;

  const defaultName = isIndustrial 
    ? `Precision Machine & Tool Works #${tileIndex % 100}` 
    : `Grand Avenue Commercial Arcade #${tileIndex % 100}`;

  const [bizName, setBizName] = useState(ownedBiz ? ownedBiz.name : defaultName);
  const [selectedType, setSelectedType] = useState<OwnedBusiness['type']>(
    ownedBiz ? ownedBiz.type : isIndustrial ? 'FACTORY' : 'RETAIL'
  );
  const [selectedMode, setSelectedMode] = useState<'HONEST' | 'CORRUPT'>(
    ownedBiz ? ownedBiz.mode : 'HONEST'
  );

  // Property Acquisition Price
  const baseCost = isIndustrial ? 14000 : 10000;
  const purchaseCost = baseCost * Math.max(1, tile.level || 1);

  // Upgrade Cost
  const upgradeCost = ownedBiz ? (ownedBiz.level + 1) * 12000 : 12000;

  const handleBuy = () => {
    if (state.money < purchaseCost) {
      officeAudio.playClick();
      return;
    }
    officeAudio.playTerminalChime();
    dispatch({
      type: 'BUY_BUSINESS',
      payload: {
        tileIndex,
        name: bizName,
        type: selectedType,
        mode: selectedMode,
        cost: purchaseCost,
      },
    });
    onClose();
  };

  const handleToggleMode = () => {
    if (!ownedBiz) return;
    officeAudio.playClick();
    dispatch({
      type: 'TOGGLE_BUSINESS_MODE',
      payload: { businessId: ownedBiz.id },
    });
  };

  const handleUpgrade = () => {
    if (!ownedBiz || state.money < upgradeCost) return;
    officeAudio.playTerminalChime();
    dispatch({
      type: 'UPGRADE_BUSINESS',
      payload: { businessId: ownedBiz.id, cost: upgradeCost },
    });
  };

  const handleSell = () => {
    if (!ownedBiz) return;
    officeAudio.playStandUp();
    dispatch({
      type: 'SELL_BUSINESS',
      payload: { businessId: ownedBiz.id },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans animate-in fade-in select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-md ${
              isIndustrial 
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400' 
                : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
            }`}>
              {isIndustrial ? <Factory size={22} /> : <Store size={22} />}
            </div>
            <div>
              <h3 className="font-serif font-bold text-white text-lg">
                {ownedBiz ? ownedBiz.name : isIndustrial ? 'Industrial Property' : 'Commercial Property'}
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                Tile Parcel ({tile.x}, {tile.y}) · {isIndustrial ? 'Manufacturing Sector' : 'Commerce Ward'}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              officeAudio.playClick();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-sm text-slate-300 overflow-y-auto custom-scrollbar">
          {ownedBiz ? (
            /* ================= OWNED PROPERTY MANAGEMENT ================= */
            <div className="space-y-4">
              {/* Status Banner */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono uppercase">Tier Level {ownedBiz.level}:</span>
                  <span className="font-bold text-white font-serif">
                    {ownedBiz.level === 1 ? 'Starter Enterprise' : ownedBiz.level === 2 ? 'Established Company' : 'Metropolitan Megacorp'}
                  </span>
                </div>
                <span className={`text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                  ownedBiz.mode === 'HONEST' 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}>
                  {ownedBiz.mode === 'HONEST' ? 'Honest Mode' : 'Corrupt Mode'}
                </span>
              </div>

              {/* Financial Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col">
                  <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Daily Net</span>
                  <span className="text-base font-mono font-bold text-emerald-400 mt-1">
                    +${ownedBiz.dailyRevenue.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col">
                  <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Workforce</span>
                  <span className="text-base font-mono font-bold text-white mt-1">
                    {ownedBiz.employees} Employees
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col">
                  <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Mayor Alignment</span>
                  <span className="text-base font-mono font-bold text-amber-300 mt-1">
                    {mayor?.subsidyMeter}% Subsidy
                  </span>
                </div>
              </div>

              {/* Police Raid Warning if currently raided */}
              {ownedBiz.isRaided && (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-3">
                  <AlertTriangle size={20} className="text-rose-400 shrink-0" />
                  <div>
                    <span className="font-bold block">Shuttered Under Police Raid</span>
                    <span>District inspectors froze revenue for illicit operations. Resumes shortly.</span>
                  </div>
                </div>
              )}

              {/* Mode Toggle Button */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-200 block font-serif">
                  Corporate Operating Stance
                </span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {ownedBiz.mode === 'HONEST' ? (
                    'Operating honestly with fair wages and clean supply chains. Generates steady profits, boosts public morale, and qualifies for Mayor Clean Subsidies.'
                  ) : (
                    'Operating as an aggressive shadow racket with offshore ledgers. Generates 2.4x higher cash profits, but risks fines and raids from honest mayors unless bribed.'
                  )}
                </p>

                <button
                  onClick={handleToggleMode}
                  className={`w-full mt-2 py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    ownedBiz.mode === 'HONEST'
                      ? 'bg-amber-600/20 hover:bg-amber-600/30 border-amber-500/40 text-amber-300'
                      : 'bg-emerald-600/20 hover:bg-emerald-600/30 border-emerald-500/40 text-emerald-300'
                  }`}
                >
                  <Scale size={14} />
                  <span>
                    Switch to {ownedBiz.mode === 'HONEST' ? 'Corrupt Racket (2.4x Cash)' : 'Honest Enterprise'}
                  </span>
                </button>
              </div>

              {/* Action Buttons: Upgrade or Liquidate */}
              <div className="flex items-center gap-3 pt-2">
                {ownedBiz.level < 3 && (
                  <button
                    onClick={handleUpgrade}
                    disabled={state.money < upgradeCost}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                      state.money >= upgradeCost
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    <ArrowUpCircle size={15} />
                    <span>Expand to Tier {ownedBiz.level + 1} (${upgradeCost.toLocaleString()})</span>
                  </button>
                )}

                <button
                  onClick={handleSell}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-500/40 text-rose-300 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Liquidate (${Math.round(ownedBiz.purchasePrice * 0.7).toLocaleString()})</span>
                </button>
              </div>
            </div>
          ) : rivalTycoonOwner ? (
            /* ================= RIVAL TYCOON PROPERTY VIEW ================= */
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400 uppercase">Property Owner:</span>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${
                    rivalTycoonOwner.alignment === 'HONEST'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    {rivalTycoonOwner.name} ({rivalTycoonOwner.alignment})
                  </span>
                </div>
                <div className="text-sm font-serif font-bold text-white">
                  {tile.businessName || rivalTycoonOwner.companyName}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-900/60 p-2.5 rounded-lg">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Operating Company:</span>
                    <span className="text-white font-bold">{rivalTycoonOwner.companyName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Operating Mode:</span>
                    <span className={tile.businessMode === 'CORRUPT' ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {tile.businessMode || rivalTycoonOwner.alignment}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed italic">
                  "This property is actively occupied and generating revenue for your commercial rival {rivalTycoonOwner.name}. Their empire spans {rivalTycoonOwner.properties.length} commercial locations in New Veridia."
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium cursor-pointer"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          ) : (
            /* ================= UNOWNED PROPERTY PURCHASE ================= */
            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                This prime urban parcel is open for commercial enterprise acquisition. Establish your business, choose your operating ethics, and build your private capital empire!
              </p>

              {/* Business Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase text-slate-400 font-semibold block">
                  Enterprise Name:
                </label>
                <input
                  type="text"
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Business Model Mode Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase text-slate-400 font-semibold block">
                  Initial Business Philosophy:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setSelectedMode('HONEST')}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      selectedMode === 'HONEST'
                        ? 'bg-emerald-950/30 border-emerald-500 text-emerald-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs flex items-center gap-1 text-emerald-300">
                        <ShieldCheck size={14} />
                        Honest Enterprise
                      </span>
                      {selectedMode === 'HONEST' && <CheckCircle2 size={14} className="text-emerald-400" />}
                    </div>
                    <span className="text-[11px] leading-tight text-slate-400">
                      Clean operations, high civic reputation, eligible for clean municipal grants.
                    </span>
                  </div>

                  <div
                    onClick={() => setSelectedMode('CORRUPT')}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      selectedMode === 'CORRUPT'
                        ? 'bg-amber-950/30 border-amber-500 text-amber-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs flex items-center gap-1 text-amber-300">
                        <ShieldAlert size={14} />
                        Corrupt Racket
                      </span>
                      {selectedMode === 'CORRUPT' && <CheckCircle2 size={14} className="text-amber-400" />}
                    </div>
                    <span className="text-[11px] leading-tight text-slate-400">
                      2.4x raw cash flow, shadow accounting, high risk of raids unless Mayor is bribed.
                    </span>
                  </div>
                </div>
              </div>

              {/* Purchase Details */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono">Acquisition Price:</span>
                <span className="font-mono font-bold text-base text-emerald-400">
                  ${purchaseCost.toLocaleString()}
                </span>
              </div>

              {/* Purchase CTA */}
              <button
                onClick={handleBuy}
                disabled={state.money < purchaseCost}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                  state.money >= purchaseCost
                    ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold hover:scale-[1.01]'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
              >
                <DollarSign size={15} />
                <span>
                  {state.money >= purchaseCost ? `Acquire Property ($${purchaseCost.toLocaleString()})` : 'Insufficient Capital'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
