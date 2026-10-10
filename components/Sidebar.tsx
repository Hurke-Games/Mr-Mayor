import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { TileType, GamePhase, Faction } from '../types';
import { BUILD_COSTS, COLORS } from '../constants';
import { 
  Hammer, Shield, Users, Building, AlertTriangle, Coins, Scale, TrendingUp, 
  Newspaper, Briefcase, Zap, Flame, GraduationCap, BookOpen, Trash2, Building2, 
  Sparkles, HelpCircle, X, CheckCircle2, ArrowRight, Lightbulb, Info, Award,
  TreePine, Landmark, Wind, MousePointer, Crosshair
} from 'lucide-react';
import NewsFeed from './NewsFeed';

interface SidebarProps {
  onToolSelect: (tool: TileType | null) => void;
  activeTool: TileType | null;
}

interface BuildingGuideData {
  title: string;
  category: string;
  footprint: string;
  cost: number;
  maintenance: string;
  summary: string;
  roleDescription: string;
  requirements: string[];
  progression?: {
    level: string;
    name: string;
    capacity?: string;
    details: string;
  }[];
  mergeFeature?: {
    title: string;
    description: string;
    tiers: { tier: string; name: string; capacity: string; details: string }[];
  };
  mayorTips: string;
}

const BUILDING_GUIDES: Partial<Record<TileType, BuildingGuideData>> = {
  [TileType.ROAD]: {
    title: 'Paved Road Network',
    category: 'Transit Infrastructure',
    footprint: '1x1 (Transit Grid)',
    cost: 50,
    maintenance: '$2 / day per tile',
    summary: 'The vital circulatory transit network of Metropolis.',
    roleDescription: 'Roads connect all residential, commercial, and industrial parcels to city services, power lines, and markets. Any zone without adjacent road access cannot construct buildings.',
    requirements: [
      'Must connect adjacent to other roads or the central civic square',
      'Provides immediate road access for adjacent zones',
    ],
    mayorTips: 'Plan arterial avenues leading away from City Hall so future expansion zones are immediately accessible.',
  },
  [TileType.RESIDENTIAL]: {
    title: 'Residential Zone',
    category: 'Zoning & Housing',
    footprint: '1x1 (Merges into 3x3 Superblocks)',
    cost: 100,
    maintenance: '$4–$12 / day based on level',
    summary: 'Citizen housing that starts from raw zoned plots and builds into high-density skyscrapers.',
    roleDescription: 'Residential zones house your population. Citizens pay income taxes, supply labor, and drive city prosperity. When well-supported with power, schools, and safety, they rapidly upgrade through 3 development levels!',
    requirements: [
      'Direct road access within 2 tiles',
      'Electricity from a Power Plant',
      'Positive Housing Demand (> 15%)',
    ],
    progression: [
      { level: 'Level 0', name: 'Zoned Lot (Undeveloped)', capacity: '0', details: 'Wooden surveyor stakes and cleared dirt foundation awaiting construction.' },
      { level: 'Level 1', name: 'Craftsman Cottage / Bungalow', capacity: '35 residents', details: 'Single-family homes with pitched terracotta roofs, chimneys, and green yards.' },
      { level: 'Level 2', name: 'Brick Townhouses & Brownstone Duplex', capacity: '80 residents', details: 'Mid-density urban brownstones with iron fire escapes and rooftop water towers.' },
      { level: 'Level 3', name: 'Modern Apartment High-Rise', capacity: '150 residents (MAX)', details: 'High-density glass and concrete towers with balconies and rooftop amenities. Maximum standard parcel limit: 150.' },
    ],
    mergeFeature: {
      title: '3x3 Superblock Merge System',
      description: 'When 9 adjacent residential plots (a 3x3 square) flourish together, they merge into an immense Residential Megacomplex with 3 developmental tiers:',
      tiers: [
        { tier: 'Tier 1', name: 'Garden Manor Quad (2x Bonus)', capacity: '2,700 residents (9x150x2)', details: 'Four brick wings framing a central landscaped courtyard with stone fountains.' },
        { tier: 'Tier 2', name: 'Twin Skyline Towers with Skybridge (5x Bonus)', capacity: '6,750 residents (9x150x5)', details: 'Dual glass skyscrapers connected by an elevated glass skybridge and rooftop helipad.' },
        { tier: 'Tier 3', name: 'Metropolis Arcology Citadel (10x Bonus)', capacity: '13,500 residents (9x150x10)', details: 'Terraced futuristic ziggurat with hanging sky-gardens and glowing needle spires.' },
      ],
    },
    mayorTips: 'Keep a 1:2 ratio of commercial and industrial zones to maintain goods and jobs. Bad balance significantly slows population growth!',
  },
  [TileType.COMMERCIAL]: {
    title: 'Commercial Business Zone',
    category: 'Zoning & Commerce',
    footprint: '1x1 (3 Progression Tiers)',
    cost: 200,
    maintenance: '$0 (Private enterprise pays taxes)',
    summary: 'Retail stores, restaurants, financial centers, and corporate towers.',
    roleDescription: 'Commercial zones employ your population and generate corporate tax revenue. Thrives near residential neighborhoods and accessible transit.',
    requirements: [
      'Road access and electrical grid connectivity',
      'Flourishes with low business regulations and moderate tax rates',
    ],
    progression: [
      { level: 'Level 0', name: 'Zoned Commercial Lot', capacity: '0', details: 'Survey stakes and commercial lease signs.' },
      { level: 'Level 1', name: 'Corner Market & Diner', capacity: '80 workers', details: 'Local shops with striped red-and-white fabric awnings and neon signage.' },
      { level: 'Level 2', name: 'Department Store & Bank', capacity: '220 workers', details: 'Multi-story neoclassical stone retail centers with revolving doors.' },
      { level: 'Level 3', name: 'Corporate Skyscraper', capacity: '550 workers', details: 'Blue reflective glass curtain skyscraper with antenna mast.' },
    ],
    mayorTips: 'Place commercial districts along busy arterial avenues between residential and industrial sectors.',
  },
  [TileType.INDUSTRIAL]: {
    title: 'Industrial Sector',
    category: 'Zoning & Production',
    footprint: '1x1 (3 Progression Tiers)',
    cost: 300,
    maintenance: '$0 (Private manufacturing)',
    summary: 'Heavy manufacturing, warehouses, freight depots, and high-tech cleanrooms.',
    roleDescription: 'Provides essential industrial GDP, supplies high-paying factory jobs, and strengthens Iron Union faction approval.',
    requirements: [
      'Road access and high-capacity electrical power',
      'Advanced tiers require educated workers from Schools and Universities',
    ],
    progression: [
      { level: 'Level 0', name: 'Zoned Industrial Lot', capacity: '0', details: 'Gravel grading and perimeter fencing.' },
      { level: 'Level 1', name: 'Workshop & Freight Depot', capacity: '120 workers', details: 'Corrugated metal roofs, loading docks, and cargo staging.' },
      { level: 'Level 2', name: 'Manufacturing Factory', capacity: '300 workers', details: 'Heavy industrial assembly plants with dual brick smokestacks emitting smoke.' },
      { level: 'Level 3', name: 'High-Tech Cleanroom Facility', capacity: '700 workers', details: 'Robotics cleanrooms with domed chemical siloes and solar panel arrays.' },
    ],
    mayorTips: 'Place power plants nearby to ensure uninterrupted voltage for heavy machinery.',
  },
  [TileType.POWER_PLANT]: {
    title: 'Metropolis Power Plant',
    category: 'Energy & Utilities',
    footprint: '2x2 Footprint (4 Tiles)',
    cost: 3000,
    maintenance: '$100 / day',
    summary: 'Essential electrical generation facility powering city development.',
    roleDescription: 'Supplies electrical energy across a 32-tile radius. Unpowered buildings cannot develop into higher tiers and suffer from elevated crime and rapid structural decay.',
    requirements: [
      'Requires a 2x2 clear plot with adjacent road access',
      'Sufficient city treasury for initial $3,000 capital investment',
    ],
    mayorTips: 'Check the Power overlay in the top bar to inspect grid coverage across your metropolis.',
  },
  [TileType.POLICE_STATION]: {
    title: 'Police Precinct',
    category: 'Public Safety',
    footprint: '1x1 Footprint',
    cost: 1000,
    maintenance: '$50 / day',
    summary: 'Law enforcement headquarters suppressing crime and protecting property.',
    roleDescription: 'Patrols neighborhoods across a 20-tile radius, directly reducing local crime risk and preventing abandonment of residential towers.',
    requirements: ['Road access and electrical grid connection'],
    mayorTips: 'High density apartments and commercial districts require police precincts to keep crime below 35%.',
  },
  [TileType.FIRE_STATION]: {
    title: 'Municipal Fire Station',
    category: 'Public Safety',
    footprint: '1x1 Footprint',
    cost: 800,
    maintenance: '$40 / day',
    summary: 'Fire prevention and emergency structural protection facility.',
    roleDescription: 'Extinguishes fires and provides structural preservation across a 20-tile radius, significantly reducing building condition decay over time.',
    requirements: ['Road access and electrical grid connection'],
    mayorTips: 'Fire stations prevent catastrophic structural decay in dense industrial and residential superblocks.',
  },
  [TileType.SCHOOL]: {
    title: 'Elementary & High School',
    category: 'Education & Civics',
    footprint: '1x1 Footprint',
    cost: 1200,
    maintenance: '$45 / day',
    summary: 'Foundational education for neighborhood youth.',
    roleDescription: 'Delivers primary schooling across a 22-tile radius. Elevates social mobility, improves tax yields, and is required for residential parcels to upgrade to Level 2 townhouses.',
    requirements: ['Road access and electrical grid connection'],
    mayorTips: 'Build a school in every residential neighborhood to accelerate population growth and tax revenue.',
  },
  [TileType.UNIVERSITY]: {
    title: 'University Academic Campus',
    category: 'Higher Education & Research',
    footprint: '2x2 Footprint (4 Tiles)',
    cost: 4500,
    maintenance: '$120 / day',
    summary: 'Collegiate research campus driving technological innovation.',
    roleDescription: 'Prestige collegiate quad with a massive 36-tile influence radius. Powers high-tech industry, unlocks Level 3 skyscrapers, and elevates Gray Collective and Gilded Circle happiness.',
    requirements: ['Requires a 2x2 clear plot with road access and electricity'],
    mayorTips: 'Place near commercial centers or high-density residential towers to create a thriving university district.',
  },
  [TileType.UNION_HALL]: {
    title: 'Iron Union Hall (Local 101)',
    category: 'Faction Stronghold',
    footprint: '1x1 Footprint',
    cost: 500,
    maintenance: '$20 / day',
    summary: 'Labor organizing guild house for blue-collar industrial workers.',
    roleDescription: 'Bolsters Iron Union happiness and influence. Provides political backing for labor welfare and workplace safety decrees.',
    requirements: ['Road access'],
    mayorTips: 'Construct near industrial sectors to earn loyalty from the labor working class.',
  },
  [TileType.LUXURY_ESTATE]: {
    title: 'Gilded Circle Private Estate',
    category: 'Faction Stronghold',
    footprint: '1x1 Footprint',
    cost: 2000,
    maintenance: '$15 / day',
    summary: 'Lavish gated mansion with swimming pool and private grounds.',
    roleDescription: 'Pleasures the wealthy oligarchs of the Gilded Circle. Increases elite faction influence and unlocks lucrative business lobbying.',
    requirements: ['Road access'],
    mayorTips: 'Keep away from polluting industrial zones to maintain high elite approval.',
  },
  [TileType.PARK]: {
    title: 'Botanical City Park',
    category: 'Parks & Environment',
    footprint: '1x1 Footprint',
    cost: 150,
    maintenance: '$15 / day',
    summary: 'Verdant municipal gardens, shade trees, walking paths, and tiered fountain.',
    roleDescription: 'Crucial environmental barrier! Absorbs industrial smog and power plant emissions (-55 pollution) in an 8-tile radius, raises residential morale to 100%, and shields citizens from toxic respiratory illness.',
    requirements: ['Any cleared 1x1 parcel with road access'],
    mayorTips: 'Place botanical parks as green belts between heavy industrial zones and residential neighborhoods to neutralize toxic emissions before they sicken citizens.',
  },
  [TileType.STATUE]: {
    title: 'Civic Heroic Monument',
    category: 'Civic Culture & Heritage',
    footprint: '1x1 Footprint',
    cost: 350,
    maintenance: '$20 / day',
    summary: 'Polished granite pedestal with heroic bronze statue of the Founding Mayor.',
    roleDescription: 'Inspires profound civic pride and community morale (+30 within 6 tiles). Also absorbs urban smog (-35 within 6 tiles) and serves as an iconic cultural landmark.',
    requirements: ['Any cleared 1x1 parcel with road access'],
    mayorTips: 'Erect monuments in public squares and near city avenues to keep morale soaring and air clean.',
  },
  [TileType.DEMOLISH]: {
    title: 'Bulldozer / Parcel Clearance',
    category: 'Demolition Tool',
    footprint: 'Any selected parcel',
    cost: 25,
    maintenance: '$0',
    summary: 'Clears structures, roads, and zoned lots back to empty land.',
    roleDescription: 'Clears any building, road, or zone. Multi-tile buildings are demolished cleanly as a single unit. Note: The 3x3 Mayor’s Office is constitutionally protected from demolition.',
    requirements: ['None (Costs $25 per clearance operation)'],
    mayorTips: 'Use the bulldozer to rezone old low-density blocks into 3x3 superblocks or build new avenues.',
  },
};

const Sidebar: React.FC<SidebarProps> = ({ onToolSelect, activeTool }) => {
  const { state, dispatch } = useGame();
  const [activeTab, setActiveTab] = useState<'build' | 'intel' | 'factions' | 'wire'>('build');
  const [infoModalTile, setInfoModalTile] = useState<TileType | null>(null);

  // Inspected parcel resolution
  const selectedTile = state.selectedTileIndex !== null && state.grid[state.selectedTileIndex] 
    ? state.grid[state.selectedTileIndex] 
    : null;
  const masterIndex = selectedTile ? (selectedTile.masterIndex ?? state.selectedTileIndex!) : null;
  const masterTile = masterIndex !== null && masterIndex >= 0 && masterIndex < state.grid.length
    ? state.grid[masterIndex] 
    : null;

  // Helper for build buttons with embedded "?" information trigger
  const BuildBtn = ({ 
    type, 
    label, 
    cost, 
    badge,
    description 
  }: { 
    type: TileType; 
    label: string; 
    cost: number; 
    badge?: string;
    description?: string;
  }) => (
    <div
      onClick={() => onToolSelect(type === activeTool ? null : type)}
      className={`w-full text-left p-2.5 rounded-lg mb-2 border transition-all cursor-pointer select-none group ${
        activeTool === type 
          ? 'bg-slate-700/90 border-amber-400 text-white shadow-md' 
          : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-750 hover:border-slate-600'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-3.5 h-3.5 rounded-sm shrink-0 border border-black/30" style={{ backgroundColor: COLORS[type] }} />
          <span className="text-xs font-semibold">{label}</span>
          {badge && (
            <span className="text-[10px] font-mono px-1 py-0.2 bg-slate-700 text-amber-300 rounded border border-slate-600">
              {badge}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono font-medium text-emerald-400">${cost}</span>
          {/* "?" Information Help Trigger Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setInfoModalTile(type);
            }}
            className="w-5 h-5 rounded-full bg-slate-700/80 hover:bg-amber-400 hover:text-slate-950 text-slate-300 flex items-center justify-center text-[11px] font-bold transition-all border border-slate-600 hover:border-amber-300 shadow-sm cursor-pointer shrink-0"
            title={`Explain how ${label} works and its function`}
          >
            ?
          </button>
        </div>
      </div>
      {description && (
        <p className="text-[10px] text-slate-400 mt-1 pl-6 leading-tight">{description}</p>
      )}
    </div>
  );

  const selectedGuide = infoModalTile !== null ? BUILDING_GUIDES[infoModalTile] : null;

  return (
    <aside className="w-80 bg-slate-900 border-l border-slate-700 flex flex-col shrink-0 overflow-hidden z-20 shadow-xl relative">
      {/* Tabs */}
      <div className="flex border-b border-slate-700 bg-slate-800/50">
        <button 
          onClick={() => setActiveTab('build')}
          className={`flex-1 py-3 px-2 text-sm font-medium transition-colors ${activeTab === 'build' ? 'text-amber-500 border-b-2 border-amber-500 bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
          title="Manage & Build"
        >
          <Hammer size={18} className="mx-auto" />
        </button>
        <button 
          onClick={() => setActiveTab('factions')}
          className={`flex-1 py-3 px-2 text-sm font-medium transition-colors ${activeTab === 'factions' ? 'text-amber-500 border-b-2 border-amber-500 bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
          title="Factions"
        >
          <Users size={18} className="mx-auto" />
        </button>
        <button 
          onClick={() => setActiveTab('intel')}
          className={`flex-1 py-3 px-2 text-sm font-medium transition-colors ${activeTab === 'intel' ? 'text-amber-500 border-b-2 border-amber-500 bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
          title="Intel"
        >
          <Shield size={18} className="mx-auto" />
        </button>
        <button 
          onClick={() => setActiveTab('wire')}
          className={`flex-1 py-3 px-2 text-sm font-medium transition-colors ${activeTab === 'wire' ? 'text-amber-500 border-b-2 border-amber-500 bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
          title="The Wire"
        >
          <Newspaper size={18} className="mx-auto" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        {/* The Wire Tab */}
        {activeTab === 'wire' && (
          <div className="h-full">
            <NewsFeed />
          </div>
        )}

        <div className="p-4 space-y-6">
          {/* Build Tab */}
          {activeTab === 'build' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
              {state.role === GamePhase.MAYOR ? (
                <>
                  {/* Inspected Parcel Details Card (When a parcel on the map is selected) */}
                  {masterTile && masterIndex !== null && (
                    <div className="bg-slate-950 p-3 rounded-xl border border-amber-500/60 shadow-lg space-y-2.5 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3.5 h-3.5 rounded-xs shrink-0 border border-black/40 shadow-xs" 
                            style={{ backgroundColor: COLORS[masterTile.type] || '#475569' }} 
                          />
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                              Parcel Inspector
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 ml-1.5">
                              [{masterIndex % 100}, {Math.floor(masterIndex / 100)}]
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => dispatch({ type: 'SELECT_TILE', payload: null })}
                          className="text-[10px] font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                          title="Deselect parcel (Esc)"
                        >
                          Clear (Esc)
                        </button>
                      </div>

                      {/* Title & Level */}
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>
                            {masterTile.type === TileType.EMPTY
                              ? 'Unzoned Meadow Land'
                              : masterTile.isMerged3x3
                              ? `3x3 Residential Superblock (Tier ${masterTile.mergedLevel || 1})`
                              : BUILDING_GUIDES[masterTile.type]?.title || 'Building Structure'}
                          </span>
                        </h4>
                        <span className="text-[10px] text-slate-400">
                          {masterTile.type === TileType.EMPTY
                            ? 'Cleared undeveloped parcel awaiting zoning charter.'
                            : masterTile.level === 0 && (masterTile.type === TileType.RESIDENTIAL || masterTile.type === TileType.COMMERCIAL || masterTile.type === TileType.INDUSTRIAL)
                            ? 'Undeveloped zoned parcel with surveyor stakes.'
                            : masterTile.level > 0
                            ? `Development Level ${masterTile.level} • Condition: ${masterTile.condition || 100}%`
                            : 'Civic facility'}
                        </span>
                      </div>

                      {/* Parcel Metrics Grid */}
                      <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                        {/* Power status */}
                        <div className="flex items-center gap-1">
                          <Zap size={11} className={masterTile.hasPower ? 'text-emerald-400' : 'text-red-400'} />
                          <span className={masterTile.hasPower ? 'text-emerald-300' : 'text-red-400 font-bold'}>
                            {masterTile.hasPower ? 'Powered ⚡' : 'Blackout ⚠️'}
                          </span>
                        </div>

                        {/* Local Pollution */}
                        <div className="flex items-center gap-1">
                          <Wind size={11} className={(masterTile.pollution || 0) > 40 ? 'text-purple-400' : 'text-emerald-400'} />
                          <span className={(masterTile.pollution || 0) > 40 ? 'text-purple-300' : 'text-slate-300'}>
                            {masterTile.pollution || 0} AQI
                          </span>
                        </div>

                        {/* Safety / Crime */}
                        <div className="flex items-center gap-1">
                          <Shield size={11} className={(masterTile.crimeRisk || 0) > 40 ? 'text-red-400' : 'text-blue-400'} />
                          <span className={(masterTile.crimeRisk || 0) > 40 ? 'text-red-300' : 'text-slate-300'}>
                            Crime: {masterTile.crimeRisk || 0}%
                          </span>
                        </div>

                        {/* Occupants or Condition */}
                        <div className="flex items-center gap-1">
                          <Users size={11} className="text-amber-400" />
                          <span className="text-slate-200">
                            {masterTile.type === TileType.RESIDENTIAL
                              ? masterTile.isMerged3x3
                                ? `${(masterTile.mergedLevel === 3 ? 13500 : masterTile.mergedLevel === 2 ? 6750 : 2700).toLocaleString()} Cap`
                                : masterTile.level === 3 ? '150 Max' : masterTile.level === 2 ? '80 Cap' : masterTile.level === 1 ? '35 Cap' : '0 Res'
                              : masterTile.type === TileType.COMMERCIAL
                              ? masterTile.level === 3 ? '550 Wk' : masterTile.level === 2 ? '220 Wk' : masterTile.level === 1 ? '80 Wk' : '0 Wk'
                              : masterTile.type === TileType.INDUSTRIAL
                              ? masterTile.level === 3 ? '700 Wk' : masterTile.level === 2 ? '300 Wk' : masterTile.level === 1 ? '120 Wk' : '0 Wk'
                              : masterTile.type === TileType.ROAD
                              ? `Tfc: ${masterTile.traffic || 0}%`
                              : `${masterTile.condition || 100}% Health`}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons on inspected parcel */}
                      <div className="flex items-center gap-1.5 pt-1">
                        {masterTile.type !== TileType.EMPTY && masterTile.type !== TileType.MAYORS_OFFICE && (
                          <button
                            type="button"
                            onClick={() => {
                              dispatch({ type: 'DEMOLISH_TILE', payload: { index: masterIndex } });
                              dispatch({ type: 'SELECT_TILE', payload: null });
                            }}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-red-950/60 hover:bg-red-900/80 text-red-300 hover:text-white border border-red-800/60 rounded-lg text-xs font-bold transition-all cursor-pointer"
                            title="Bulldoze this parcel back to empty land ($25)"
                          >
                            <Trash2 size={12} />
                            <span>Bulldoze ($25)</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setInfoModalTile(masterTile.type);
                          }}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          title="View architectural guide for this building type"
                        >
                          Guide ?
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Mode Selector: Inspect vs Build */}
                  <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-700/80">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Interaction Mode</span>
                      <span className="font-mono text-amber-400">{activeTool === null ? 'INSPECT' : 'BUILDING'}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => onToolSelect(null)}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          activeTool === null
                            ? 'bg-amber-500 text-slate-950 shadow-md scale-[1.02]'
                            : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700'
                        }`}
                      >
                        <MousePointer size={14} />
                        <span>Select & Inspect</span>
                      </button>

                      <div
                        className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
                          activeTool !== null
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-slate-800/40 text-slate-500 border border-slate-800'
                        }`}
                      >
                        <Hammer size={14} />
                        <span>Build Active</span>
                      </div>
                    </div>

                    {activeTool !== null ? (
                      <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                        <span className="text-slate-300 flex items-center gap-1">
                          Tool: <strong className="text-amber-300">{BUILDING_GUIDES[activeTool]?.title || 'Building'}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => onToolSelect(null)}
                          className="text-[10px] text-red-400 hover:text-red-300 underline cursor-pointer"
                        >
                          Clear (Esc)
                        </button>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 mt-1.5 leading-snug">
                        Click any parcel or structure on the map to inspect details, health, and pollution.
                      </p>
                    )}
                  </div>

                  {/* Zoning & Transit */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Building size={13} className="text-amber-400" /> Zoning & Transit
                      </h3>
                      <span className="text-[10px] text-slate-500">Click ? for info</span>
                    </div>
                    <BuildBtn 
                      type={TileType.ROAD} 
                      label="Paved Road" 
                      cost={BUILD_COSTS[TileType.ROAD]} 
                      description="Essential transit network for development."
                    />
                    <BuildBtn 
                      type={TileType.RESIDENTIAL} 
                      label="Residential Zone" 
                      cost={BUILD_COSTS[TileType.RESIDENTIAL]} 
                      badge="150 Max • 3x3 to 13.5k"
                      description="Starts empty. 150 people max. 3x3 blocks merge into 2x (2,700), 5x (6,750), and 10x (13,500) skyscrapers!"
                    />
                    <BuildBtn 
                      type={TileType.COMMERCIAL} 
                      label="Commercial Zone" 
                      cost={BUILD_COSTS[TileType.COMMERCIAL]} 
                      badge="Needs ~1:2 Res"
                      description="Stores, diners, and corporate centers. Needs ~1 per 2 residential zones to supply citizen goods."
                    />
                    <BuildBtn 
                      type={TileType.INDUSTRIAL} 
                      label="Industrial Zone" 
                      cost={BUILD_COSTS[TileType.INDUSTRIAL]} 
                      badge="Needs ~1:2 Res"
                      description="Factory manufacturing and workshops. Needs ~1 per 2 residential zones for blue-collar jobs."
                    />
                    <BuildBtn 
                      type={TileType.DEMOLISH} 
                      label="Bulldozer / Clear" 
                      cost={BUILD_COSTS[TileType.DEMOLISH]} 
                      badge="Demolish"
                      description="Clear buildings, roads, or zoned plots."
                    />
                  </div>

                  {/* Energy & Utilities */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Zap size={13} className="text-amber-400" /> Power & Energy
                    </h3>
                    <BuildBtn 
                      type={TileType.POWER_PLANT} 
                      label="Power Plant" 
                      cost={BUILD_COSTS[TileType.POWER_PLANT]} 
                      badge="2x2"
                      description="Supplies electrical power to all city zones within 32 tiles."
                    />
                  </div>

                  {/* Parks, Culture & Environment (Fights Pollution & Boosts Morale) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <TreePine size={13} className="text-emerald-400" /> Parks & Clean Air
                      </h3>
                      <span className="text-[10px] text-emerald-400/80 font-mono">Fights Smog</span>
                    </div>
                    <BuildBtn 
                      type={TileType.PARK} 
                      label="Botanical City Park" 
                      cost={BUILD_COSTS[TileType.PARK]} 
                      badge="1x1 • -55 Smog"
                      description="Lush gardens & fountain. Absorbs smog (8-tile rad) & boosts morale to 100%!"
                    />
                    <BuildBtn 
                      type={TileType.STATUE} 
                      label="Civic Heroic Statue" 
                      cost={BUILD_COSTS[TileType.STATUE]} 
                      badge="1x1 • +Morale"
                      description="Bronze monument on granite pedestal. Cleans air (-35) & elevates civic pride."
                    />
                  </div>
                  
                  {/* Municipal Services & Safety */}
                  <div>
                     <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                       <Shield size={13} className="text-blue-400" /> Public Safety & Services
                     </h3>
                     <BuildBtn 
                       type={TileType.POLICE_STATION} 
                       label="Police Precinct" 
                       cost={BUILD_COSTS[TileType.POLICE_STATION]} 
                       badge="1x1"
                       description="Patrols nearby blocks and cuts crime risk."
                     />
                     <BuildBtn 
                       type={TileType.FIRE_STATION} 
                       label="Fire Station" 
                       cost={BUILD_COSTS[TileType.FIRE_STATION]} 
                       badge="1x1"
                       description="Prevents fire disasters and reduces structural building decay."
                     />
                  </div>

                  {/* Education */}
                  <div>
                     <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                       <GraduationCap size={13} className="text-yellow-400" /> Education
                     </h3>
                     <BuildBtn 
                       type={TileType.SCHOOL} 
                       label="Elementary / High School" 
                       cost={BUILD_COSTS[TileType.SCHOOL]} 
                       badge="1x1"
                       description="Provides basic education, boosts neighborhood value and civics."
                     />
                     <BuildBtn 
                       type={TileType.UNIVERSITY} 
                       label="University Campus" 
                       cost={BUILD_COSTS[TileType.UNIVERSITY]} 
                       badge="2x2"
                       description="Prestigious research campus. Drives high-tech growth and wealth."
                     />
                  </div>

                  {/* Faction Real Estate */}
                  <div>
                     <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                       <Users size={13} className="text-purple-400" /> Faction Real Estate
                     </h3>
                     <BuildBtn 
                       type={TileType.UNION_HALL} 
                       label="Union Hall" 
                       cost={BUILD_COSTS[TileType.UNION_HALL]} 
                       description="Labor union stronghold for organizing workers."
                     />
                     <BuildBtn 
                       type={TileType.LUXURY_ESTATE} 
                       label="Gilded Estate" 
                       cost={BUILD_COSTS[TileType.LUXURY_ESTATE]} 
                       description="Lavish private estate for elite political donors."
                     />
                  </div>

                  {/* Policy Section */}
                  <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 space-y-4 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Scale size={14} /> City Policy
                    </h3>
                    
                    {/* Tax Rate Slider */}
                    <div>
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span className="flex items-center gap-1"><Coins size={12} /> Tax Rate</span>
                        <span className="font-mono text-amber-400">{Math.round(state.taxRate * 100)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="50" 
                        value={state.taxRate * 100}
                        onChange={(e) => dispatch({ type: 'SET_POLICY', payload: { key: 'taxRate', value: Number(e.target.value) / 100 } })}
                        className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Rates &le; 12% boost housing demand and rapid growth.</p>
                    </div>

                    {/* Subsidies Slider */}
                    <div>
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span className="flex items-center gap-1"><TrendingUp size={12} /> Subsidies</span>
                        <span className="font-mono text-emerald-400">{state.subsidyLevel}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="100" 
                        value={state.subsidyLevel}
                        onChange={(e) => dispatch({ type: 'SET_POLICY', payload: { key: 'subsidyLevel', value: Number(e.target.value) } })}
                        className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Accelerates zone construction and slows decay.</p>
                    </div>

                    {/* Regulations Slider */}
                    <div>
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span className="flex items-center gap-1"><Shield size={12} /> Regulations</span>
                        <span className="font-mono text-blue-400">{state.regulationLevel}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="100" 
                        value={state.regulationLevel}
                        onChange={(e) => dispatch({ type: 'SET_POLICY', payload: { key: 'regulationLevel', value: Number(e.target.value) } })}
                        className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">High regulations cut corruption and crime.</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-4 bg-slate-800 rounded border border-slate-700 text-center">
                  <p className="text-sm text-slate-400">Civilian Mode: Zoning controls restricted to the Mayor.</p>
                </div>
              )}
            </div>
          )}

          {/* Factions Tab */}
          {activeTab === 'factions' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">City Factions</h3>
              {(Object.values(state.factions) as Faction[]).map((faction) => (
                <div key={faction.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white" style={{ color: faction.color }}>{faction.name}</span>
                    <span className="text-xs font-mono text-slate-400">Pwr: {Math.round(faction.influence)}%</span>
                  </div>
                  <p className="text-xs text-slate-400">{faction.description}</p>
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                      <span>Approval</span>
                      <span>{Math.round(faction.happiness)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${faction.happiness}%` }}></div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => dispatch({ type: 'FACTION_ACTION', payload: { factionId: faction.id, actionType: 'LOBBY' } })}
                      className="flex-1 py-1 px-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs transition-colors"
                    >
                      Lobby ($2k)
                    </button>
                    <button
                      onClick={() => dispatch({ type: 'FACTION_ACTION', payload: { factionId: faction.id, actionType: 'BRIBE' } })}
                      className="flex-1 py-1 px-2 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/50 rounded text-xs transition-colors"
                    >
                      Bribe ($500)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Intel Tab */}
          {activeTab === 'intel' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle size={15} className="text-amber-500" />
                  City Stability & Metrics
                </h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Corruption Level</span>
                      <span className={state.corruption > 50 ? 'text-red-400 font-bold' : 'text-slate-200'}>{Math.round(state.corruption)}%</span>
                    </div>
                    <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div className={`h-full ${state.corruption > 50 ? 'bg-red-500' : 'bg-slate-500'}`} style={{ width: `${state.corruption}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Public Safety</span>
                      <span className={state.safety < 40 ? 'text-red-400 font-bold' : 'text-emerald-400'}>{Math.round(state.safety)}%</span>
                    </div>
                    <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div className={`h-full ${state.safety < 40 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${state.safety}%` }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Housing Demand</span>
                      <span className="text-emerald-400 font-bold">{Math.round(state.housingDemand)}%</span>
                    </div>
                    <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${state.housingDemand}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Building Guide "?" Detailed Modal */}
      {selectedGuide && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setInfoModalTile(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-sm shrink-0 border border-black/30" 
                  style={{ backgroundColor: COLORS[infoModalTile!] }} 
                />
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{selectedGuide.title}</span>
                    <span className="text-[11px] font-mono font-normal px-2 py-0.5 bg-slate-800 text-amber-300 rounded border border-slate-700">
                      {selectedGuide.footprint}
                    </span>
                  </h3>
                  <div className="text-[11px] text-slate-400">{selectedGuide.category}</div>
                </div>
              </div>

              <button
                onClick={() => setInfoModalTile(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto custom-scrollbar space-y-4 text-xs leading-relaxed">
              {/* Cost & Maintenance stats */}
              <div className="grid grid-cols-2 gap-2 bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">Construction Cost</span>
                  <div className="font-mono text-emerald-400 font-bold text-sm">${selectedGuide.cost}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">Daily Maintenance</span>
                  <div className="font-mono text-slate-300 font-medium">{selectedGuide.maintenance}</div>
                </div>
              </div>

              {/* Function & Role */}
              <div>
                <h4 className="text-slate-300 font-bold text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Info size={14} className="text-amber-400" /> Function & Municipal Role
                </h4>
                <p className="text-slate-300 leading-normal">{selectedGuide.roleDescription}</p>
              </div>

              {/* Requirements */}
              <div>
                <h4 className="text-slate-300 font-bold text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-400" /> Prerequisites & Support Needed
                </h4>
                <ul className="space-y-1">
                  {selectedGuide.requirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-300">
                      <span className="text-emerald-400 font-bold mt-0.5">•</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Developmental Levels (if applicable) */}
              {selectedGuide.progression && (
                <div>
                  <h4 className="text-slate-300 font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-yellow-400" /> 3 Development Levels (SimCity Progression)
                  </h4>
                  <div className="space-y-2">
                    {selectedGuide.progression.map((tier, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700/70">
                        <div className="flex items-center justify-between font-semibold text-white mb-0.5">
                          <span className="text-amber-300">{tier.level}: {tier.name}</span>
                          {tier.capacity && <span className="font-mono text-[10px] text-emerald-400">{tier.capacity}</span>}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-normal">{tier.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3x3 Merged Superblock Feature (if applicable) */}
              {selectedGuide.mergeFeature && (
                <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-lg space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs uppercase tracking-wider">
                    <Award size={14} /> {selectedGuide.mergeFeature.title}
                  </div>
                  <p className="text-[11px] text-amber-200/90 leading-normal">{selectedGuide.mergeFeature.description}</p>
                  <div className="space-y-1.5 pt-1">
                    {selectedGuide.mergeFeature.tiers.map((m, midx) => (
                      <div key={midx} className="bg-slate-900/80 p-2 rounded border border-amber-500/30 text-[11px]">
                        <div className="flex justify-between font-semibold text-white">
                          <span className="text-amber-400">{m.tier}: {m.name}</span>
                          <span className="text-emerald-400 font-mono text-[10px]">{m.capacity}</span>
                        </div>
                        <div className="text-slate-400 text-[10px] mt-0.5">{m.details}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mayor's Strategic Tips */}
              <div className="p-3 bg-slate-800/90 rounded-lg border border-slate-700 flex items-start gap-2.5">
                <Lightbulb size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white text-[11px] uppercase tracking-wider">Mayor's Strategic Advice: </span>
                  <span className="text-slate-300 text-[11px]">{selectedGuide.mayorTips}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-850 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Click anywhere outside to close</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInfoModalTile(null)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    onToolSelect(infoModalTile);
                    setInfoModalTile(null);
                  }}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-transform active:scale-95 shadow cursor-pointer"
                >
                  <span>Select Tool</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
