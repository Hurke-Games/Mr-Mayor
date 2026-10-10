import React, { useState, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { 
  Building2, 
  Store, 
  Factory, 
  X, 
  TrendingUp, 
  TrendingDown,
  Scale, 
  Users, 
  DollarSign, 
  ShieldCheck, 
  ShieldAlert, 
  ArrowRight,
  AlertTriangle,
  Play,
  Pause,
  Zap,
  FastForward,
  Clock,
  Briefcase,
  PieChart,
  BarChart3,
  Flame,
  Shield,
  Coins,
  CheckCircle2,
  ChevronRight,
  Info
} from 'lucide-react';
import { officeAudio } from '../office/officeAudio';
import { StockMarketItem, StockHolding } from '../../types';
import { TICKS_PER_DAY, DAYS_PER_MONTH } from '../../constants';

interface PortfolioModalProps {
  onClose: () => void;
  onSelectBusinessTile: (tileIndex: number) => void;
}

type TabType = 'STOCKS' | 'BUSINESSES' | 'BALANCE_SHEET';
type RiskFilterType = 'ALL' | 'SAFE' | 'BALANCED' | 'RISKY';

export const PortfolioModal: React.FC<PortfolioModalProps> = ({ onClose, onSelectBusinessTile }) => {
  const { state, dispatch } = useGame();
  const bizman = state.businessman;
  const mayor = state.computerMayor;

  const [activeTab, setActiveTab] = useState<TabType>('STOCKS');
  const [riskFilter, setRiskFilter] = useState<RiskFilterType>('ALL');
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);
  const [buyQuantity, setBuyQuantity] = useState<number>(1);
  const [sellQuantity, setSellQuantity] = useState<number>(1);
  const [tradeMode, setTradeMode] = useState<'BUY' | 'SELL'>('BUY');
  const [tradeSuccessMsg, setTradeSuccessMsg] = useState<string | null>(null);

  if (!bizman) return null;

  // Calendar & In-game clock calibration
  const totalDays = Math.floor(state.date / TICKS_PER_DAY);
  const currentYear = 1 + Math.floor(totalDays / (DAYS_PER_MONTH * 12));
  const currentMonthNum = 1 + (Math.floor(totalDays / DAYS_PER_MONTH) % 12);
  const currentDayInMonth = 1 + (totalDays % DAYS_PER_MONTH);
  const currentHour = state.date % TICKS_PER_DAY;
  const dayProgressPct = Math.round((currentHour / TICKS_PER_DAY) * 100);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthLabel = monthNames[currentMonthNum - 1] || 'Month';

  // Stock Market State
  const marketStocks: StockMarketItem[] = bizman.stockMarket || [];
  const holdings: StockHolding[] = bizman.portfolioStocks || [];
  const holdingsMap = useMemo(() => new Map<string, StockHolding>(holdings.map((h) => [h.stockId, h])), [holdings]);

  // Aggregate stats
  const totalBusinessRevenue = bizman.businesses.reduce((sum, b) => sum + (b.isRaided ? 0 : b.dailyRevenue), 0);
  const totalEmployees = bizman.businesses.reduce((sum, b) => sum + b.employees, 0);

  let totalEquitiesValue = 0;
  let totalEquitiesCostBasis = 0;
  let dailyEquitiesChange = 0;

  for (const h of holdings) {
    const stock = marketStocks.find((s) => s.id === h.stockId);
    if (stock) {
      const val = h.shares * stock.currentPrice;
      totalEquitiesValue += val;
      totalEquitiesCostBasis += h.totalCostBasis;
      dailyEquitiesChange += h.shares * stock.dayChangeDollar;
    }
  }

  const equitiesUnrealizedProfit = totalEquitiesValue - totalEquitiesCostBasis;
  const equitiesUnrealizedPct = totalEquitiesCostBasis > 0 ? (equitiesUnrealizedProfit / totalEquitiesCostBasis) * 100 : 0;
  const totalNetWorth = state.money + totalEquitiesValue + bizman.businesses.length * 15000;

  // Filtered stocks
  const filteredStocks = useMemo(() => {
    if (riskFilter === 'ALL') return marketStocks;
    return marketStocks.filter((s) => s.riskTier === riskFilter);
  }, [marketStocks, riskFilter]);

  const activeStock = useMemo(() => {
    if (selectedStockId) {
      return marketStocks.find((s) => s.id === selectedStockId) || marketStocks[0] || null;
    }
    return marketStocks[0] || null;
  }, [selectedStockId, marketStocks]);

  const activeHolding = activeStock ? holdingsMap.get(activeStock.id) : undefined;

  const handleToggleMode = (bizId: string) => {
    officeAudio.playClick();
    dispatch({
      type: 'TOGGLE_BUSINESS_MODE',
      payload: { businessId: bizId },
    });
  };

  const handleBuy = (stock: StockMarketItem, shares: number) => {
    const cost = stock.currentPrice * shares;
    if (state.money < cost) return;

    officeAudio.playCash();
    dispatch({
      type: 'BUY_STOCK',
      payload: { stockId: stock.id, shares },
    });
    setTradeSuccessMsg(`Successfully purchased ${shares} shares of ${stock.ticker}!`);
    setTimeout(() => setTradeSuccessMsg(null), 3000);
  };

  const handleSell = (stock: StockMarketItem, shares: number) => {
    if (!activeHolding || activeHolding.shares < shares) return;

    officeAudio.playCash();
    dispatch({
      type: 'SELL_STOCK',
      payload: { stockId: stock.id, shares },
    });
    setTradeSuccessMsg(`Successfully liquidated ${shares} shares of ${stock.ticker}!`);
    setTimeout(() => setTradeSuccessMsg(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 font-sans animate-in fade-in select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-5xl w-full overflow-hidden flex flex-col max-h-[95vh] text-slate-200">
        
        {/* ========================================================================= */}
        {/* TOP HEADER & TIME CONTROL BAR (IDENTICAL TO MAYOR'S HALL / SPEED CONTROL) */}
        {/* ========================================================================= */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-amber-700 border border-emerald-400/30 flex items-center justify-center text-white shadow-lg">
              <Briefcase size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-white text-base sm:text-lg">
                  Empire Portfolio & Stock Exchange
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                  VSE Trading Floor
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Corporate Holdings & High-Compound Equities Trading
              </span>
            </div>
          </div>

          {/* Time & Game Speed Control Bar (Player Always in Control!) */}
          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-inner">
            {/* Calendar display */}
            <div className="flex items-center gap-2 pr-3 border-r border-slate-800 text-xs font-mono">
              <Clock size={13} className="text-amber-400" />
              <div>
                <span className="text-white font-bold">{monthLabel} {currentDayInMonth}</span>
                <span className="text-slate-500 text-[10px] ml-1">Yr {currentYear}</span>
              </div>
              {/* Day Progress Mini Bar */}
              <div className="w-10 h-1.5 bg-slate-950 rounded-full overflow-hidden ml-1 border border-slate-800" title={`Day progress: ${dayProgressPct}%`}>
                <div className="bg-amber-400 h-full transition-all" style={{ width: `${dayProgressPct}%` }} />
              </div>
            </div>

            {/* Speed Options identical to Mayor's Hall */}
            <div className="flex items-center gap-1">
              {/* Pause */}
              <button 
                onClick={() => {
                  officeAudio.playClick();
                  dispatch({ type: 'SET_SPEED', payload: 0 });
                }}
                className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  state.speed === 0 ? 'bg-red-500/25 text-red-300 border border-red-500/40 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Pause Simulation"
              >
                <Pause size={12} />
                <span className="text-[10px]">Pause</span>
              </button>

              {/* 1x Normal Speed */}
              <button 
                onClick={() => {
                  officeAudio.playClick();
                  dispatch({ type: 'SET_SPEED', payload: 1 });
                }}
                className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  state.speed === 1 ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="1x Speed (Normal Calendar Pace: 1 Month in 2 Min)"
              >
                <Play size={12} />
                <span className="text-[10px]">1x</span>
              </button>

              {/* 2x Double Speed */}
              <button 
                onClick={() => {
                  officeAudio.playClick();
                  dispatch({ type: 'SET_SPEED', payload: 2 });
                }}
                className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  state.speed === 2 ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="2x Double Speed (1 Month in 1 Min)"
              >
                <Zap size={12} />
                <span className="text-[10px]">2x</span>
              </button>

              {/* 4x High Speed */}
              <button 
                onClick={() => {
                  officeAudio.playClick();
                  dispatch({ type: 'SET_SPEED', payload: 4 });
                }}
                className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  state.speed >= 4 ? 'bg-blue-500/25 text-blue-300 border border-blue-500/40 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="4x High Speed (1 Month in 30 Sec)"
              >
                <FastForward size={12} />
                <span className="text-[10px]">4x</span>
              </button>
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

        {/* ========================================================================= */}
        {/* EXECUTIVE STATS STRIP */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-950/70 border-b border-slate-800/80 text-xs shrink-0">
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col">
            <span className="text-[10px] text-slate-400 font-mono uppercase flex items-center gap-1">
              <Coins size={11} className="text-amber-400" /> Liquid Cash Available
            </span>
            <span className="font-mono font-bold text-amber-300 text-sm mt-0.5">
              ${state.money.toLocaleString()}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col">
            <span className="text-[10px] text-slate-400 font-mono uppercase flex items-center gap-1">
              <BarChart3 size={11} className="text-sky-400" /> Stock Equities Value
            </span>
            <span className="font-mono font-bold text-sky-300 text-sm mt-0.5 flex items-center gap-1.5">
              ${Math.round(totalEquitiesValue).toLocaleString()}
              {dailyEquitiesChange !== 0 && (
                <span className={`text-[10px] font-normal ${dailyEquitiesChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {dailyEquitiesChange >= 0 ? '+' : ''}${Math.round(dailyEquitiesChange).toLocaleString()} today
                </span>
              )}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col">
            <span className="text-[10px] text-slate-400 font-mono uppercase flex items-center gap-1">
              <Store size={11} className="text-emerald-400" /> Real Estate Profit
            </span>
            <span className="font-mono font-bold text-emerald-400 text-sm mt-0.5">
              +${totalBusinessRevenue.toLocaleString()}/day
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col">
            <span className="text-[10px] text-slate-400 font-mono uppercase flex items-center gap-1">
              <PieChart size={11} className="text-purple-400" /> Total Net Worth
            </span>
            <span className="font-mono font-bold text-purple-300 text-sm mt-0.5">
              ${Math.round(totalNetWorth).toLocaleString()}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* NAVIGATION TABS */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-slate-800 bg-slate-950/40 shrink-0">
          <button
            onClick={() => {
              officeAudio.playClick();
              setActiveTab('STOCKS');
            }}
            className={`px-4 py-2 font-semibold text-xs border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'STOCKS'
                ? 'border-emerald-500 text-emerald-300 bg-slate-900/60 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp size={14} className="text-emerald-400" />
            <span>Veridia Stock Exchange</span>
            {holdings.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                {holdings.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              officeAudio.playClick();
              setActiveTab('BUSINESSES');
            }}
            className={`px-4 py-2 font-semibold text-xs border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'BUSINESSES'
                ? 'border-amber-500 text-amber-300 bg-slate-900/60 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 size={14} className="text-amber-400" />
            <span>Commercial Holdings</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
              {bizman.businesses.length}
            </span>
          </button>

          <button
            onClick={() => {
              officeAudio.playClick();
              setActiveTab('BALANCE_SHEET');
            }}
            className={`px-4 py-2 font-semibold text-xs border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'BALANCE_SHEET'
                ? 'border-sky-500 text-sky-300 bg-slate-900/60 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scale size={14} className="text-sky-400" />
            <span>Balance Sheet</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: VERIDIA STOCK EXCHANGE (INTERACTIVE EQUITIES GAME) */}
        {/* ========================================================================= */}
        {activeTab === 'STOCKS' && (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Left Column: Stock Directory & Cards */}
            <div className="w-full md:w-3/5 border-r border-slate-800 flex flex-col overflow-hidden">
              {/* Category Filter Pills */}
              <div className="p-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between gap-2 shrink-0 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-mono text-slate-500 mr-1">Risk Tier:</span>
                  <button
                    onClick={() => setRiskFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      riskFilter === 'ALL' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All ({marketStocks.length})
                  </button>
                  <button
                    onClick={() => setRiskFilter('SAFE')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                      riskFilter === 'SAFE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-emerald-400/70 hover:text-emerald-300'
                    }`}
                    title="70-74% Daily Win Probability · Low Drawdowns · Steady Compounder"
                  >
                    <Shield size={11} /> Safe
                  </button>
                  <button
                    onClick={() => setRiskFilter('BALANCED')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                      riskFilter === 'BALANCED' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-amber-400/70 hover:text-amber-300'
                    }`}
                    title="60-64% Daily Win Probability · Solid Mid-Market Growth"
                  >
                    <BarChart3 size={11} /> Balanced
                  </button>
                  <button
                    onClick={() => setRiskFilter('RISKY')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                      riskFilter === 'RISKY' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-rose-400/70 hover:text-rose-300'
                    }`}
                    title="52-56% Daily Win Probability · Double-Digit Daily Swings · High Reward"
                  >
                    <Flame size={11} /> High Reward
                  </button>
                </div>

                <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                  <CheckCircle2 size={11} /> All stocks mathematically favorable (E &gt; 0)
                </div>
              </div>

              {/* Stock Directory List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {filteredStocks.map((stock) => {
                  const isSelected = selectedStockId === stock.id || (!selectedStockId && stock.id === marketStocks[0]?.id);
                  const holding = holdingsMap.get(stock.id);
                  const isPositiveDay = stock.dayChangeDollar >= 0;

                  return (
                    <div
                      key={stock.id}
                      onClick={() => {
                        officeAudio.playClick();
                        setSelectedStockId(stock.id);
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800/90 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white text-sm bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              {stock.ticker}
                            </span>
                            <h4 className="font-semibold text-slate-200 text-xs truncate max-w-[180px] sm:max-w-[240px]">
                              {stock.name}
                            </h4>
                            {stock.riskTier === 'SAFE' && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                                SAFE
                              </span>
                            )}
                            {stock.riskTier === 'BALANCED' && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                                BALANCED
                              </span>
                            )}
                            {stock.riskTier === 'RISKY' && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                                HIGH REWARD
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-400 mt-1 font-mono flex items-center gap-2">
                            <span className="text-slate-300">
                              Win: <strong className="text-emerald-400">{Math.round(stock.winProbability * 100)}%</strong>/day
                            </span>
                            <span>·</span>
                            <span className="text-slate-300">
                              Gain: <strong className="text-emerald-400">+{Math.round(stock.gainPct * 1000) / 10}%</strong>
                            </span>
                            <span>·</span>
                            <span className="text-slate-300">
                              Down: <strong className="text-rose-400">-{Math.round(stock.lossPct * 1000) / 10}%</strong>
                            </span>
                          </div>
                        </div>

                        {/* Price & Day Change */}
                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-white text-sm">
                            ${stock.currentPrice.toFixed(2)}
                          </div>
                          <div className={`font-mono text-xs font-semibold flex items-center justify-end gap-0.5 ${
                            isPositiveDay ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {isPositiveDay ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            <span>{isPositiveDay ? '+' : ''}{stock.dayChangePct.toFixed(2)}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Mini Sparkline Chart Preview */}
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px]">
                          <span>Expected Return:</span>
                          <span className="text-emerald-300 font-bold">+{stock.expectedDailyReturn.toFixed(2)}%/day</span>
                          {stock.dividendYield && (
                            <span className="text-amber-400 bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-500/30">
                              +{(stock.dividendYield * 100).toFixed(1)}% Div
                            </span>
                          )}
                        </div>

                        {holding && holding.shares > 0 ? (
                          <div className="font-mono text-[10px] text-sky-300 font-bold bg-sky-950/50 px-2 py-0.5 rounded border border-sky-500/30">
                            Owned: {holding.shares} sh (${Math.round(holding.shares * stock.currentPrice).toLocaleString()})
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">0 Shares</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Interactive Stock Inspector & Trading Terminal */}
            <div className="w-full md:w-2/5 p-4 flex flex-col justify-between bg-slate-950/80 overflow-y-auto">
              {activeStock ? (
                <div className="space-y-4">
                  {/* Stock Header */}
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-mono font-bold text-white bg-slate-900 px-2.5 py-0.5 rounded border border-slate-800">
                          {activeStock.ticker}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{activeStock.sector}</span>
                      </div>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        activeStock.dayChangeDollar >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {activeStock.dayChangeDollar >= 0 ? '+' : ''}${activeStock.dayChangeDollar.toFixed(2)} ({activeStock.dayChangePct.toFixed(2)}%)
                      </span>
                    </div>

                    <h3 className="font-serif font-bold text-white text-base mt-1">
                      {activeStock.name}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1">
                      {activeStock.description}
                    </p>
                  </div>

                  {/* 30-Day Interactive Historical Price SVG Chart */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>30-Day Market Trend</span>
                      <div className="flex items-center gap-3">
                        <span>Low: <strong className="text-slate-200">${activeStock.allTimeLow.toFixed(2)}</strong></span>
                        <span>High: <strong className="text-slate-200">${activeStock.allTimeHigh.toFixed(2)}</strong></span>
                      </div>
                    </div>

                    {/* SVG Sparkline Graph */}
                    <div className="h-28 w-full relative">
                      {(() => {
                        const hist = activeStock.history;
                        const min = Math.min(...hist) * 0.96;
                        const max = Math.max(...hist) * 1.04;
                        const range = Math.max(1, max - min);
                        const w = 360;
                        const h = 100;
                        const pts = hist.map((p, idx) => {
                          const x = (idx / (hist.length - 1)) * w;
                          const y = h - ((p - min) / range) * h;
                          return `${x},${y}`;
                        }).join(' ');

                        const isUpTrend = hist[hist.length - 1] >= hist[0];
                        const strokeCol = isUpTrend ? '#10b981' : '#f43f5e';
                        const fillCol = isUpTrend ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)';

                        return (
                          <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id={`grad_${activeStock.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={strokeCol} stopOpacity="0.25" />
                                <stop offset="100%" stopColor={strokeCol} stopOpacity="0.0" />
                              </linearGradient>
                            </defs>
                            {/* Area fill */}
                            <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#grad_${activeStock.id})`} />
                            {/* Line */}
                            <polyline fill="none" stroke={strokeCol} strokeWidth="2.5" points={pts} strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Quantitative Odds & Expected Return Analysis */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5 font-mono">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Daily Win Chance:</span>
                      <span className="text-emerald-400 font-bold">{Math.round(activeStock.winProbability * 100)}% Chance</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Upside on Win:</span>
                      <span className="text-emerald-400 font-bold">+{Math.round(activeStock.gainPct * 1000) / 10}%</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Downside on Loss:</span>
                      <span className="text-rose-400 font-bold">-{Math.round(activeStock.lossPct * 1000) / 10}%</span>
                    </div>
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-800 text-amber-300">
                      <span>Long-Run Expected Drift:</span>
                      <span className="font-bold text-emerald-400">+{activeStock.expectedDailyReturn.toFixed(2)}% / Day</span>
                    </div>
                  </div>

                  {/* Player Position Details */}
                  {activeHolding && activeHolding.shares > 0 ? (
                    <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-500/30 text-xs font-mono space-y-1">
                      <div className="flex items-center justify-between text-sky-200">
                        <span>Position Size:</span>
                        <span className="font-bold">{activeHolding.shares} Shares</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Average Buy Price:</span>
                        <span>${activeHolding.avgBuyPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Current Market Value:</span>
                        <span className="font-bold text-white">${Math.round(activeHolding.shares * activeStock.currentPrice).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-sky-800/60">
                        <span>Unrealized Return:</span>
                        {(() => {
                          const val = activeHolding.shares * activeStock.currentPrice;
                          const profit = val - activeHolding.totalCostBasis;
                          const pct = activeHolding.totalCostBasis > 0 ? (profit / activeHolding.totalCostBasis) * 100 : 0;
                          return (
                            <span className={`font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {profit >= 0 ? '+' : ''}${Math.round(profit).toLocaleString()} ({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 font-mono text-center">
                      You currently hold no shares in {activeStock.ticker}.
                    </div>
                  )}

                  {/* Trade Success Message */}
                  {tradeSuccessMsg && (
                    <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono text-center animate-in fade-in">
                      {tradeSuccessMsg}
                    </div>
                  )}

                  {/* Trading Controls: Buy / Sell Tab */}
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTradeMode('BUY')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          tradeMode === 'BUY'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Buy Shares
                      </button>
                      <button
                        onClick={() => setTradeMode('SELL')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          tradeMode === 'SELL'
                            ? 'bg-rose-600 text-white shadow-md'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Sell Shares
                      </button>
                    </div>

                    {/* Quantity Quick Buttons */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                        <span>Quantity:</span>
                        <span>
                          {tradeMode === 'BUY'
                            ? `Max Affordable: ${Math.floor(state.money / activeStock.currentPrice)} sh`
                            : `Max Owned: ${activeHolding?.shares || 0} sh`
                          }
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {[1, 5, 10, 50, 100].map((qty) => (
                          <button
                            key={qty}
                            onClick={() => {
                              officeAudio.playClick();
                              if (tradeMode === 'BUY') setBuyQuantity(qty);
                              else setSellQuantity(qty);
                            }}
                            className={`flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono transition-colors cursor-pointer ${
                              (tradeMode === 'BUY' ? buyQuantity : sellQuantity) === qty ? 'bg-slate-700 text-amber-300 font-bold border border-amber-500/40' : 'text-slate-300'
                            }`}
                          >
                            {qty}
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            officeAudio.playClick();
                            if (tradeMode === 'BUY') {
                              const maxBuy = Math.max(1, Math.floor(state.money / activeStock.currentPrice));
                              setBuyQuantity(maxBuy);
                            } else {
                              setSellQuantity(activeHolding?.shares || 1);
                            }
                          }}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono font-bold text-amber-400 transition-colors cursor-pointer"
                        >
                          MAX
                        </button>
                      </div>
                    </div>

                    {/* Order Summary & Execution Button */}
                    {tradeMode === 'BUY' ? (
                      <div className="space-y-2 pt-1 border-t border-slate-800">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-400">Total Purchase Cost:</span>
                          <span className="font-bold text-white text-sm">
                            ${Math.round(activeStock.currentPrice * buyQuantity).toLocaleString()}
                          </span>
                        </div>
                        <button
                          onClick={() => handleBuy(activeStock, buyQuantity)}
                          disabled={state.money < activeStock.currentPrice * buyQuantity || buyQuantity <= 0}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <TrendingUp size={14} />
                          <span>Buy {buyQuantity} Shares of {activeStock.ticker}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1 border-t border-slate-800">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-400">Estimated Liquidation Proceeds:</span>
                          <span className="font-bold text-white text-sm">
                            ${Math.round(activeStock.currentPrice * sellQuantity).toLocaleString()}
                          </span>
                        </div>
                        <button
                          onClick={() => handleSell(activeStock, sellQuantity)}
                          disabled={!activeHolding || activeHolding.shares < sellQuantity || sellQuantity <= 0}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <TrendingDown size={14} />
                          <span>Sell {sellQuantity} Shares of {activeStock.ticker}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: COMMERCIAL & REAL ESTATE HOLDINGS */}
        {/* ========================================================================= */}
        {activeTab === 'BUSINESSES' && (
          <div className="p-5 space-y-3 overflow-y-auto flex-1">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-serif font-bold text-white text-sm">
                  Physical Commercial & Industrial Establishments
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  Enterprises acquired across New Veridia's urban districts
                </p>
              </div>
              <div className="text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
                Municipal Subsidy Rate: <strong className="text-amber-300">{mayor?.subsidyMeter || 0}%</strong>
              </div>
            </div>

            {bizman.businesses.length === 0 ? (
              <div className="text-center py-12 space-y-3 bg-slate-950/40 rounded-2xl border border-slate-800/80">
                <Store size={40} className="mx-auto text-slate-600" />
                <h4 className="text-white font-serif font-bold text-base">No Physical Properties Acquired Yet</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Walk through the city streets and inspect any Commercial or Industrial parcel (press [E] or click on the building) to purchase your first enterprise!
                </p>
              </div>
            ) : (
              bizman.businesses.map((b) => {
                const isInd = b.type === 'FACTORY' || b.type === 'WAREHOUSE';
                const tile = state.grid[b.tileIndex];

                return (
                  <div 
                    key={b.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                        isInd 
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      }`}>
                        {isInd ? <Factory size={20} /> : <Store size={20} />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-serif font-bold text-white text-sm">
                            {b.name}
                          </h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400">
                            Tier {b.level}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                          <span className="text-emerald-400 font-bold">
                            +${b.dailyRevenue.toLocaleString()}/day
                          </span>
                          <span>·</span>
                          <span>{b.employees} Employees</span>
                          <span>·</span>
                          <span>Parcel ({tile?.x}, {tile?.y})</span>
                        </div>

                        {b.isRaided && (
                          <span className="text-[11px] text-rose-400 font-bold flex items-center gap-1 mt-1">
                            <AlertTriangle size={12} />
                            Police Raid Active (Revenue Halted)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => handleToggleMode(b.id)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                          b.mode === 'HONEST'
                            ? 'bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-500/40 text-emerald-300'
                            : 'bg-amber-950/40 hover:bg-amber-900/50 border-amber-500/40 text-amber-300'
                        }`}
                        title="Click to toggle between Honest Mode and Corrupt Mode"
                      >
                        {b.mode === 'HONEST' ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
                        <span>{b.mode === 'HONEST' ? 'Honest' : 'Corrupt'}</span>
                      </button>

                      <button
                        onClick={() => {
                          onSelectBusinessTile(b.tileIndex);
                          onClose();
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="View on Street"
                      >
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: BALANCE SHEET & ASSET BREAKDOWN */}
        {/* ========================================================================= */}
        {activeTab === 'BALANCE_SHEET' && (
          <div className="p-5 space-y-4 overflow-y-auto flex-1 font-mono text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-slate-400 font-bold uppercase text-[10px]">1. Liquid Capital</span>
                <div className="text-2xl font-bold text-amber-300">${state.money.toLocaleString()}</div>
                <p className="text-slate-500 text-[11px] font-sans">
                  Available for instant deployment into stocks, real estate, or political lobbying.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-slate-400 font-bold uppercase text-[10px]">2. Stock Equities Portfolio</span>
                <div className="text-2xl font-bold text-sky-300">${Math.round(totalEquitiesValue).toLocaleString()}</div>
                <div className={`text-[11px] ${equitiesUnrealizedProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  Unrealized: {equitiesUnrealizedProfit >= 0 ? '+' : ''}${Math.round(equitiesUnrealizedProfit).toLocaleString()} ({equitiesUnrealizedPct.toFixed(1)}%)
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-slate-400 font-bold uppercase text-[10px]">3. Real Estate Equity</span>
                <div className="text-2xl font-bold text-purple-300">
                  ${(bizman.businesses.length * 15000).toLocaleString()}
                </div>
                <div className="text-emerald-400 text-[11px]">
                  Generating +${totalBusinessRevenue.toLocaleString()} in daily cash flow
                </div>
              </div>
            </div>

            {/* Historical Accounting Ledger */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <h4 className="font-serif font-bold text-white text-sm">Historical Accounting Ledger</h4>
              <div className="space-y-1.5 text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span>Cumulative Lifetime Revenue:</span>
                  <span className="font-bold text-emerald-400">+${bizman.totalRevenueEarned.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span>Realized Stock Trading Gains:</span>
                  <span className={`font-bold ${(bizman.totalStockProfitsRealized || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {(bizman.totalStockProfitsRealized || 0) >= 0 ? '+' : ''}${Math.round(bizman.totalStockProfitsRealized || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span>City Hall Subsidies Collected:</span>
                  <span className="font-bold text-amber-300">+${bizman.subsidiesCollected.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span>Political Donations to Sitting Mayor:</span>
                  <span className="font-bold text-slate-400">-${bizman.donatedToMayor.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Political Action Funds to Recall PAC:</span>
                  <span className="font-bold text-slate-400">-${bizman.donatedToRecall.toLocaleString()} / $50,000 goal</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
