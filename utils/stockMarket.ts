import { StockMarketItem, StockHolding, BusinessmanState, GameState, Notification } from '../types';

export interface StockTemplate {
  id: string;
  ticker: string;
  name: string;
  sector: string;
  description: string;
  riskTier: 'SAFE' | 'BALANCED' | 'RISKY';
  basePrice: number;
  winProbability: number; // Probability of positive gain each day
  gainPct: number; // Percentage gain on up days
  lossPct: number; // Percentage loss on down days
  dividendYield?: number; // Payout percentage every 7 days
  sparklineColor: string;
}

export const STOCK_TEMPLATES: StockTemplate[] = [
  // ---------------------------------------------------------------------------
  // 1. SAFE, LOWER REWARD (Steady Blue-Chips & Municipal Bond Funds)
  // High win probability (70-74%), small positive daily drift, low drawdown risk
  // ---------------------------------------------------------------------------
  {
    id: 'vmwp',
    ticker: 'VMWP',
    name: 'Veridia Municipal Water & Power',
    sector: 'Public Utilities & Energy',
    description: 'Regulated civic utility monopoly supplying electricity and clean water. Ultra-reliable compounder with quarterly dividend yields.',
    riskTier: 'SAFE',
    basePrice: 42.0,
    winProbability: 0.74, // 74% daily win chance
    gainPct: 0.024, // +2.4% on green days
    lossPct: 0.016, // -1.6% on red days
    dividendYield: 0.006, // 0.6% dividend every week
    sparklineColor: '#10b981', // Emerald
  },
  {
    id: 'fnct',
    ticker: 'FNCT',
    name: 'First National Civic Treasury Fund',
    sector: 'Government Bonds & Credit',
    description: 'Municipal bond index backed by municipal property tax revenue. Rock-solid capital preservation with steady coupon distributions.',
    riskTier: 'SAFE',
    basePrice: 105.0,
    winProbability: 0.70, // 70% daily win chance
    gainPct: 0.030, // +3.0%
    lossPct: 0.019, // -1.9%
    dividendYield: 0.004,
    sparklineColor: '#06b6d4', // Cyan
  },
  {
    id: 'vrei',
    ticker: 'VREI',
    name: 'Veridia Real Estate Investment Trust',
    sector: 'Commercial & Residential Real Estate',
    description: 'Holds premium commercial parcels along Magnolia Boulevard. Benefits steadily as city zoning expands and population settles.',
    riskTier: 'SAFE',
    basePrice: 78.0,
    winProbability: 0.67, // 67% daily win chance
    gainPct: 0.040, // +4.0%
    lossPct: 0.026, // -2.6%
    dividendYield: 0.005,
    sparklineColor: '#34d399', // Mint
  },

  // ---------------------------------------------------------------------------
  // 2. BALANCED GROWTH (Mid-Risk Industrial & Consumer Titans)
  // Moderate win probability (60-64%), solid upside swings, healthy long-term growth
  // ---------------------------------------------------------------------------
  {
    id: 'thin',
    ticker: 'THIN',
    name: 'Titan Heavy Industrial & Logistics',
    sector: 'Manufacturing & Freight Transit',
    description: 'Fabricates structural steel, freight cars, and logistics hubs. Surges in valuation when the mayor zones active factories and freight avenues.',
    riskTier: 'BALANCED',
    basePrice: 160.0,
    winProbability: 0.62, // 62% daily win chance
    gainPct: 0.072, // +7.2%
    lossPct: 0.048, // -4.8%
    dividendYield: 0.003,
    sparklineColor: '#f59e0b', // Amber
  },
  {
    id: 'apex',
    ticker: 'APEX',
    name: 'Apex Consumer Goods & Retail',
    sector: 'Consumer Discretionary & Commerce',
    description: 'High-end department stores, supermarkets, and suburban retail centers. Thrives directly as metropolitan purchasing power accelerates.',
    riskTier: 'BALANCED',
    basePrice: 215.0,
    winProbability: 0.60, // 60% daily win chance
    gainPct: 0.088, // +8.8%
    lossPct: 0.058, // -5.8%
    sparklineColor: '#38bdf8', // Sky Blue
  },

  // ---------------------------------------------------------------------------
  // 3. RISKIER, HIGHER REWARD (High-Beta Speculative Growth & Venture Capital)
  // Volatile swings (52-56% win rate), massive exponential surges, wild volatility
  // Strictly favorable in the long run with positive expected value
  // ---------------------------------------------------------------------------
  {
    id: 'nvqc',
    ticker: 'NVQC',
    name: 'Nova Quantum Computing & AI',
    sector: 'Deep Tech & Frontier Software',
    description: 'High-risk venture developing neural processors and automated city grid algorithms. High daily volatility with explosive moonshot rallies.',
    riskTier: 'RISKY',
    basePrice: 320.0,
    winProbability: 0.55, // 55% daily win chance
    gainPct: 0.175, // +17.5%
    lossPct: 0.110, // -11.0%
    sparklineColor: '#a855f7', // Purple
  },
  {
    id: 'abio',
    ticker: 'ABIO',
    name: 'Aegis BioPharma Therapeutics',
    sector: 'Biotechnology & Clinical Science',
    description: 'Clinical trial patents for next-gen immunotherapies. Dramatic double-digit daily swings with massive compounding upside over time.',
    riskTier: 'RISKY',
    basePrice: 180.0,
    winProbability: 0.53, // 53% daily win chance
    gainPct: 0.235, // +23.5%
    lossPct: 0.145, // -14.5%
    sparklineColor: '#ec4899', // Pink
  },
  {
    id: 'sdct',
    ticker: 'SDCT',
    name: 'Shadow Syndicate Dark Trust',
    sector: 'Offshore Arbitrage & Shadow Finance',
    description: 'Unregulated shadow banking fund taking leveraged bets on commodity derivatives and municipal contracts. Extreme swings for fearless magnates!',
    riskTier: 'RISKY',
    basePrice: 480.0,
    winProbability: 0.52, // 52% daily win chance
    gainPct: 0.290, // +29.0%
    lossPct: 0.180, // -18.0%
    sparklineColor: '#e11d48', // Rose Red
  },
];

/**
 * Creates the initial stock market state with 30 in-game days of generated history
 */
export const createInitialStockMarket = (): StockMarketItem[] => {
  return STOCK_TEMPLATES.map((tmpl) => {
    // Generate 30 days of realistic pre-history
    let price = tmpl.basePrice;
    const history: number[] = [];
    let minPrice = price;
    let maxPrice = price;

    for (let day = 0; day < 30; day++) {
      const isWin = Math.random() < tmpl.winProbability;
      const variance = 0.8 + Math.random() * 0.4; // 80% to 120% of nominal gain/loss
      if (isWin) {
        price = Math.round(price * (1 + tmpl.gainPct * variance) * 100) / 100;
      } else {
        price = Math.max(1.0, Math.round(price * (1 - tmpl.lossPct * variance) * 100) / 100);
      }
      history.push(price);
      if (price < minPrice) minPrice = price;
      if (price > maxPrice) maxPrice = price;
    }

    const currentPrice = history[history.length - 1];
    const previousPrice = history[history.length - 2] || tmpl.basePrice;
    const dayChangeDollar = Math.round((currentPrice - previousPrice) * 100) / 100;
    const dayChangePct = Math.round(((currentPrice - previousPrice) / previousPrice) * 10000) / 100;

    // Mathematical expected daily return formula: E = P_win * gain - (1 - P_win) * loss
    const expectedDailyReturn = Math.round(
      (tmpl.winProbability * tmpl.gainPct - (1 - tmpl.winProbability) * tmpl.lossPct) * 10000
    ) / 100;

    return {
      id: tmpl.id,
      ticker: tmpl.ticker,
      name: tmpl.name,
      sector: tmpl.sector,
      description: tmpl.description,
      riskTier: tmpl.riskTier,
      currentPrice,
      previousPrice,
      winProbability: tmpl.winProbability,
      gainPct: tmpl.gainPct,
      lossPct: tmpl.lossPct,
      expectedDailyReturn,
      dividendYield: tmpl.dividendYield,
      history,
      dayChangePct,
      dayChangeDollar,
      allTimeHigh: maxPrice,
      allTimeLow: minPrice,
      sparklineColor: tmpl.sparklineColor,
    };
  });
};

/**
 * Simulates a daily closing bell on the Veridia Stock Exchange (Every 24 in-game ticks)
 */
export const simulateDailyStockMarket = (
  state: GameState,
  businessman: BusinessmanState
): { updatedMarket: StockMarketItem[]; updatedHoldings: StockHolding[]; notifications: Notification[]; dividendsPaid: number } => {
  const currentMarket = businessman.stockMarket && businessman.stockMarket.length > 0
    ? businessman.stockMarket
    : createInitialStockMarket();

  const currentHoldings = businessman.portfolioStocks || [];
  const holdingsMap = new Map<string, StockHolding>(currentHoldings.map((h) => [h.stockId, h]));

  const notifications: Notification[] = [];
  let dividendsPaid = 0;
  const isDividendDay = state.date % (24 * 7) === 0; // Weekly dividend distribution

  const updatedMarket: StockMarketItem[] = currentMarket.map((stock) => {
    // 1. Roll daily win probability
    const roll = Math.random();
    const isGainDay = roll < stock.winProbability;

    // Natural market noise variation (+/- 20%)
    const variance = 0.8 + Math.random() * 0.4;
    let deltaPct = 0;

    if (isGainDay) {
      deltaPct = stock.gainPct * variance;
    } else {
      deltaPct = -stock.lossPct * variance;
    }

    const previousPrice = stock.currentPrice;
    let newPrice = Math.round(previousPrice * (1 + deltaPct) * 100) / 100;
    // Lower bound floor
    newPrice = Math.max(0.5, newPrice);

    const dayChangeDollar = Math.round((newPrice - previousPrice) * 100) / 100;
    const dayChangePct = Math.round(((newPrice - previousPrice) / previousPrice) * 10000) / 100;

    // Update 30-day historical window
    const newHistory = [...stock.history.slice(1), newPrice];
    const newHigh = Math.max(stock.allTimeHigh, newPrice);
    const newLow = Math.min(stock.allTimeLow, newPrice);

    // 2. Check for player dividends
    const holding = holdingsMap.get(stock.id);
    if (isDividendDay && stock.dividendYield && holding && holding.shares > 0) {
      const payout = Math.round(holding.shares * newPrice * stock.dividendYield);
      if (payout > 0) {
        dividendsPaid += payout;
        notifications.push({
          id: `div_${stock.id}_${state.date}`,
          title: `💵 Dividend Payout: ${stock.ticker}`,
          message: `${stock.name} paid $${payout.toLocaleString()} in quarterly dividends on your ${holding.shares.toLocaleString()} shares!`,
          date: state.date,
          source: 'News',
          bias: 0,
        });
      }
    }

    // 3. Highlight exceptional rally days for player holdings
    if (holding && holding.shares > 0 && dayChangePct >= 12.0) {
      const dayProfit = Math.round(holding.shares * dayChangeDollar);
      notifications.push({
        id: `rally_${stock.id}_${state.date}`,
        title: `🚀 Market Surge: ${stock.ticker} +${dayChangePct}%!`,
        message: `${stock.name} surged +${dayChangePct}% today, boosting your equity value by +$${dayProfit.toLocaleString()}!`,
        date: state.date,
        source: 'News',
        bias: 0,
      });
    }

    return {
      ...stock,
      previousPrice,
      currentPrice: newPrice,
      history: newHistory,
      dayChangeDollar,
      dayChangePct,
      allTimeHigh: newHigh,
      allTimeLow: newLow,
    };
  });

  return {
    updatedMarket,
    updatedHoldings: currentHoldings,
    notifications,
    dividendsPaid,
  };
};

/**
 * Calculates current total value of a businessman's stock portfolio
 */
export const calculateTotalPortfolioValue = (
  holdings: StockHolding[] = [],
  market: StockMarketItem[] = []
): { totalValue: number; totalCost: number; unrealizedProfit: number; unrealizedPct: number } => {
  const priceMap = new Map<string, number>(market.map((s) => [s.id, s.currentPrice]));

  let totalValue = 0;
  let totalCost = 0;

  for (const h of holdings) {
    const curPrice = priceMap.get(h.stockId) || h.avgBuyPrice;
    totalValue += h.shares * curPrice;
    totalCost += h.totalCostBasis;
  }

  const unrealizedProfit = totalValue - totalCost;
  const unrealizedPct = totalCost > 0 ? (unrealizedProfit / totalCost) * 100 : 0;

  return {
    totalValue: Math.round(totalValue),
    totalCost: Math.round(totalCost),
    unrealizedProfit: Math.round(unrealizedProfit),
    unrealizedPct: Math.round(unrealizedPct * 10) / 10,
  };
};
