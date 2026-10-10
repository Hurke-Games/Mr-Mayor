export enum GamePhase {
  MAYOR = 'MAYOR',
  CIVILIAN = 'CIVILIAN',
}

export enum CivilianRole {
  BUSINESS_OWNER = 'Business Owner',
  POLICE_CHIEF = 'Police Chief',
  JOURNALIST = 'Journalist',
  UNEMPLOYED = 'Unemployed',
}

export enum TileType {
  EMPTY = 0,
  ROAD = 1,
  RESIDENTIAL = 2,
  COMMERCIAL = 3,
  INDUSTRIAL = 4,
  POLICE_STATION = 5,
  UNION_HALL = 6,
  LUXURY_ESTATE = 7,
  MAYORS_OFFICE = 8,
  POWER_PLANT = 9,
  FIRE_STATION = 10,
  SCHOOL = 11,
  UNIVERSITY = 12,
  PARK = 13,
  STATUE = 14,
  HOSPITAL = 15,
  DEMOLISH = 99,
}

export interface Tile {
  x: number;
  y: number;
  type: TileType;
  level: number; // 0 = unbuilt/zoned, 1 = low-density/starter, 2 = mid-density, 3 = high-density/skyscraper
  occupancy: number; // 0-100 (or up to capacity)
  condition: number; // 0-100
  crimeRisk: number; // 0-100
  hasPower?: boolean;
  education?: number; // 0-100 coverage
  fireProtection?: number; // 0-100 coverage
  healthcare?: number; // 0-100 coverage from hospitals
  hasParkAccess?: boolean; // Within walking proximity to botanical park
  pollution?: number; // 0-100 (smog/toxic emissions from factories & power plants, reduced by parks & statues)
  traffic?: number; // 0-100 (vehicle congestion)
  morale?: number; // 0-100 (citizen happiness, boosted by parks and monuments)
  illnessRate?: number; // 0-100 (% of occupants sick from high pollution)
  
  // Multi-tile and 3x3 merge support
  masterIndex?: number; // Index of top-left origin tile
  isMultiPart?: boolean; // True if this tile is occupied by an offset of a multi-tile building
  multiWidth?: number; // Width in tiles (e.g. 3 for Mayor's Office, 2 for Power Plant/Univ/Hospital)
  multiHeight?: number; // Height in tiles
  isMerged3x3?: boolean; // Specific to 3x3 merged residential superblock
  mergedLevel?: number; // 1, 2, or 3 for 3x3 mega-building
  
  // Property ownership and enterprise identification
  ownerId?: string; // 'player' | 'cb_honest' | 'cb_corrupt'
  ownerName?: string;
  businessName?: string;
  businessType?: OwnedBusiness['type'];
  businessMode?: 'HONEST' | 'CORRUPT';
}

export interface OwnedBusiness {
  id: string;
  tileIndex: number;
  name: string;
  type: 'RETAIL' | 'RESTAURANT' | 'OFFICE' | 'HOTEL' | 'FACTORY' | 'WAREHOUSE' | 'TECH';
  mode: 'HONEST' | 'CORRUPT';
  level: number; // 1, 2, or 3
  dailyRevenue: number;
  dailyCosts: number;
  employees: number;
  purchasePrice: number;
  purchaseDate: number;
  auditCount: number;
  isRaided?: boolean;
  raidTimer?: number;
}

export interface StockHolding {
  stockId: string;
  shares: number;
  avgBuyPrice: number;
  totalCostBasis: number;
}

export interface StockMarketItem {
  id: string;
  ticker: string;
  name: string;
  sector: string;
  description: string;
  riskTier: 'SAFE' | 'BALANCED' | 'RISKY';
  currentPrice: number;
  previousPrice: number;
  winProbability: number; // 0.0 - 1.0 (e.g. 0.72 = 72% chance of positive daily gain)
  gainPct: number; // e.g. 0.025 (+2.5% gain on positive day)
  lossPct: number; // e.g. 0.015 (-1.5% loss on negative day)
  expectedDailyReturn: number; // P_win * gainPct - (1 - P_win) * lossPct (always strictly > 0)
  dividendYield?: number; // Periodic dividend payout percentage (every 7 in-game days)
  history: number[]; // Array of last 30 daily price points for charting
  dayChangePct: number; // Current day's percentage change
  dayChangeDollar: number; // Current day's dollar change
  allTimeHigh: number;
  allTimeLow: number;
  sparklineColor: string;
}

export interface CampaignActionProgress {
  // Good side (each 0 to 5 payments; all 3 total 15 payments = 50% win probability)
  runningAdsPayments: number;
  communityProjectsPayments: number;
  campaignSpeechesPayments: number;

  // Corrupt side (each 0 to 5 payments; all 3 total 15 payments = 90% win probability)
  bribePoliceChiefPayments: number;
  plantBadStoriesPayments: number;
  bribePollWorkersPayments: number;
}

export interface BusinessmanState {
  alignment: number; // -100 (Extremely Corrupt) to +100 (Purely Honest)
  homeTileIndex: number; // Residence tile index
  homePos: { x: number; y: number }; // In world pixels
  businesses: OwnedBusiness[];
  totalRevenueEarned: number;
  donatedToRecall: number; // Campaign funds to qualify for Run for Office ($200,000 threshold, 4x original $50k)
  donatedToMayor: number; // Campaign funds to support mayor
  subsidiesCollected: number;
  portfolioStocks?: StockHolding[];
  stockMarket?: StockMarketItem[];
  totalStockValue?: number;
  totalStockProfitsRealized?: number;
  lastStockDayEvaluated?: number;
  campaignProgress?: CampaignActionProgress;
  isBallotQualified?: boolean; // True once $200,000 Run for Office goal is funded
}

export interface ComputerMayorState {
  name: string; // e.g., "Mayor Thaddeus Sterling" or "Mayor Clara Vance"
  alignment: 'HONEST' | 'CORRUPT';
  portrait: 'REFORMER_FEMALE' | 'MACHINE_BOSS_MALE' | 'TECHNO_MALE' | 'PATRICIAN_FEMALE';
  approval: number; // 0-100%
  subsidyMeter: number; // 0-100% (Municipal subsidy payout rate to local enterprise)
  relationWithPlayer: number; // -100 (Hostile enemy) to +100 (Staunch ally)
  lastActionText: string;
  lastActionDate: number;
  totalRecallFundsAgainst: number; // $50,000 to trigger vote of no confidence / recall
  actionsTakenCount: number;
  treasury: number; // Municipal capital for public works & urban development
  currentProject?: string; // Currently active public works / development initiative
  urbanFocus?: string; // Mayoral development doctrine
  civicProjectsBuilt?: number; // Total roads, zones, and public buildings constructed
}

export interface ComputerBusinessmanProperty {
  tileIndex: number;
  name: string;
  type: OwnedBusiness['type'];
  level: number;
  mode: 'HONEST' | 'CORRUPT';
  dailyRevenue: number;
  dailyCosts: number;
  acquiredDate: number;
}

export interface ComputerBusinessmanState {
  id: string; // 'cb_honest' | 'cb_corrupt'
  name: string;
  companyName: string;
  title: string;
  alignment: 'HONEST' | 'CORRUPT';
  portrait: 'HONEST_REFORMER' | 'SYNDICATE_BOSS' | 'TECH_VENTURE' | 'INDUSTRIAL_BARON';
  cash: number;
  dailyRevenue: number;
  dailyProfit: number;
  properties: ComputerBusinessmanProperty[];
  // Political campaign / Mayor removal attempt
  isAttemptingOuster: boolean;
  ousterMethod: 'HONEST' | 'CORRUPT' | 'NONE';
  qualifyingFunds: number; // Towards $200,000 threshold
  isQualified: boolean;
  campaignProgress: CampaignActionProgress;
  effectiveOdds: number; // Prorated win probability (up to 50% for honest, up to 90% for corrupt)
  // Corruption interactions
  totalBribesPaidToMayor: number;
  lastBribeDate?: number;
  lastBribeAmount?: number;
  lastActionText: string;
  lastActionDate: number;
}

export interface Faction {
  id: string;
  name: string;
  description: string;
  happiness: number; // 0-100
  influence: number; // 0-100 (Power to affect outcomes)
  color: string;
}

export interface GameState {
  date: number; // Ticks elapsed
  speed: number; // 0, 1, 2, 4, 8
  money: number;
  population: number;
  role: GamePhase;
  civilianJob: CivilianRole;
  
  // Policies
  taxRate: number; // 0.0 - 0.5 (0-50%)
  subsidyLevel: number; // 0-100 (Investment in growth)
  regulationLevel: number; // 0-100 (Safety vs Freedom)

  // Grid
  grid: Tile[]; // Flat array of 100x100
  
  // Metrics
  safety: number;
  corruption: number; // 0-100
  housingDemand: number;
  averagePollution?: number; // 0-100 (overall city air quality)
  averageHealth?: number; // 0-100 (public health score)
  cityMorale?: number; // 0-100 (citizen happiness score)
  commercialRatio?: number; // 0.0 - 2.0 (ratio of commercial to needed ~0.5x residential)
  industrialRatio?: number; // 0.0 - 2.0 (ratio of industrial to needed ~0.5x residential)
  economicBalance?: number; // 0-100% (overall workforce & commerce health)
  growthRateModifier?: number; // 0.15 - 1.0 (growth throttle factor from zoning balance)
  
  // Factions
  factions: {
    union: Faction;
    elite: Faction;
    gray: Faction;
  };

  // 5-Year General Election System
  termNumber: number; // Current 5-year term (1, 2, 3...)
  nextElectionDate: number; // In-game tick when next general election occurs
  showElectionModal?: boolean;
  lastElectionResult?: {
    termNumber: number;
    won: boolean;
    votePct: number;
    opponentVotePct: number;
    turnoutPct: number;
    votesFor: number;
    votesAgainst: number;
    date: number;
    keyReason: string;
  } | null;

  // Businessman & Computer Mayor Mode
  computerMayor?: ComputerMayorState;
  businessman?: BusinessmanState;
  computerBusinessmen?: ComputerBusinessmanState[];
  totalBribesReceivedAsMayor?: number;

  // Meta
  notifications: Notification[];
  selectedTileIndex: number | null;
  activeView?: 'MENU' | 'OFFICE' | 'OUTSIDE' | 'DESK';
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: number;
  source: 'System' | 'Intel' | 'News';
  bias: number; // 0 (Truth) to 100 (Lie)
}

export type GameAction =
  | { type: 'TICK'; payload: { delta: number } }
  | { type: 'SET_SPEED'; payload: number }
  | { type: 'SET_ROLE'; payload: GamePhase }
  | { type: 'SET_VIEW'; payload: 'MENU' | 'OFFICE' | 'OUTSIDE' | 'DESK' }
  | { type: 'ZONE_TILE'; payload: { index: number; type: TileType } }
  | { type: 'DEMOLISH_TILE'; payload: { index: number } }
  | { type: 'MERGE_3X3_RESIDENTIAL'; payload: { masterIndex: number } }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'SELECT_TILE'; payload: number | null }
  | { type: 'CLOSE_ELECTION_MODAL' }
  | { type: 'FACTION_ACTION'; payload: { factionId: string; actionType: 'BRIBE' | 'LOBBY' } }
  | { type: 'SET_POLICY'; payload: { key: 'taxRate' | 'subsidyLevel' | 'regulationLevel'; value: number } }
  | { type: 'START_BUSINESSMAN_MODE' }
  | { type: 'BUY_BUSINESS'; payload: { tileIndex: number; name: string; type: OwnedBusiness['type']; mode: 'HONEST' | 'CORRUPT'; cost: number } }
  | { type: 'TOGGLE_BUSINESS_MODE'; payload: { businessId: string } }
  | { type: 'UPGRADE_BUSINESS'; payload: { businessId: string; cost: number } }
  | { type: 'SELL_BUSINESS'; payload: { businessId: string } }
  | { type: 'LOBBY_MAYOR'; payload: { actionType: 'INCREASE_SUBSIDY' | 'TAX_RELIEF' | 'BRIBE' | 'DONATE_CAMPAIGN' | 'FUND_RECALL'; amount: number } }
  | { type: 'FORCE_OUT_MAYOR'; payload: { newAlignment: 'HONEST' | 'CORRUPT' } }
  | { type: 'BUY_STOCK'; payload: { stockId: string; shares: number } }
  | { type: 'SELL_STOCK'; payload: { stockId: string; shares: number } }
  | { 
      type: 'CAMPAIGN_ACTION'; 
      payload: { 
        action: 
          | 'RUN_ADS' 
          | 'COMMUNITY_PROJECTS' 
          | 'CAMPAIGN_SPEECHES' 
          | 'BRIBE_POLICE_CHIEF' 
          | 'PLANT_BAD_STORIES' 
          | 'BRIBE_POLL_WORKERS'; 
        cost: number; 
      } 
    }
  | { type: 'RESOLVE_BUSINESSMAN_ELECTION'; payload?: { forced?: boolean } }
  | { type: 'STEP_DOWN_AS_MAYOR'; payload: { targetRole: 'BUSINESSMAN' } }
  | { type: 'ACCEPT_BRIBE'; payload: { businessmanId: string; amount: number; message?: string } };
