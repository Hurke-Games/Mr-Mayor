import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { GameState, GameAction, GamePhase, CivilianRole, TileType, Notification, StockHolding } from '../types';
import { initializeGrid, processTick } from '../utils/simulation';
import { createInitialBusinessmanState, createInitialComputerMayor } from '../utils/businessmanSimulation';
import { createInitialComputerBusinessmen, seedInitialProperties } from '../utils/computerBusinessmanSimulation';
import { CITY_TICK_RATE_MS, REAL_WORLD_HOUR_RATE_MS, BASE_TICK_RATE_MS, FACTION_IDS, BUILD_COSTS, TICKS_PER_ELECTION } from '../constants';

const defaultGrid = initializeGrid();
const initialTycoons = createInitialComputerBusinessmen();
// Seed starter properties onto the grid for Julian Croft & Silas Cross
const tempInitialState: GameState = {
  date: 0,
  speed: 0,
  money: 50000,
  population: 120,
  role: GamePhase.MAYOR,
  civilianJob: CivilianRole.UNEMPLOYED,
  taxRate: 0.10,
  subsidyLevel: 20,
  regulationLevel: 40,
  termNumber: 1,
  nextElectionDate: TICKS_PER_ELECTION,
  showElectionModal: false,
  lastElectionResult: null,
  grid: defaultGrid,
  safety: 65,
  corruption: 20,
  housingDemand: 60,
  factions: {
    union: { id: FACTION_IDS.UNION, name: 'Iron Union', description: 'Labor and Industrial Workers', happiness: 50, influence: 40, color: '#f97316' },
    elite: { id: FACTION_IDS.ELITE, name: 'Gilded Circle', description: 'Business Owners and Old Money', happiness: 60, influence: 60, color: '#a855f7' },
    gray: { id: FACTION_IDS.GRAY, name: 'Gray Collective', description: 'Bureaucrats and Activists', happiness: 45, influence: 30, color: '#64748b' },
  },
  notifications: [{ id: 'init', title: 'Welcome, Mr. Mayor', message: 'The city awaits your command. Corruption is low, but ambition is high. First General Election in 5 years.', date: 0, source: 'System', bias: 0 }],
  selectedTileIndex: null,
  activeView: 'MENU',
};
seedInitialProperties(tempInitialState, initialTycoons);

const initialState: GameState = {
  ...tempInitialState,
  computerBusinessmen: initialTycoons,
  totalBribesReceivedAsMayor: 0,
};

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'TICK':
      return processTick(state);
    case 'SET_SPEED':
      return { ...state, speed: action.payload };
    case 'SET_ROLE':
      return { ...state, role: action.payload };
    case 'SET_VIEW':
      return { ...state, activeView: action.payload };
    case 'SELECT_TILE':
      return { ...state, selectedTileIndex: action.payload };
    case 'CLOSE_ELECTION_MODAL':
      return { ...state, showElectionModal: false };
    case 'ZONE_TILE': {
        const { index, type } = action.payload;
        if (index < 0 || index >= state.grid.length) return state;

        // Cannot overwrite Mayor's Office
        const currentTile = state.grid[index];
        if (currentTile.type === TileType.MAYORS_OFFICE) return state;

        // If Demolish tool selected
        if (type === TileType.DEMOLISH) {
          const cost = 25;
          if (state.money < cost) return state;

          const newGrid = [...state.grid];
          // If multi-tile, clear all tiles in the group
          const targetTile = newGrid[index];
          const mIdx = targetTile.masterIndex ?? index;
          const w = targetTile.multiWidth || 1;
          const h = targetTile.multiHeight || 1;
          const originX = mIdx % 100;
          const originY = Math.floor(mIdx / 100);

          for (let dy = 0; dy < h; dy++) {
            for (let dx = 0; dx < w; dx++) {
              const tileIdx = (originY + dy) * 100 + (originX + dx);
              if (tileIdx >= 0 && tileIdx < newGrid.length) {
                newGrid[tileIdx] = {
                  ...newGrid[tileIdx],
                  type: TileType.EMPTY,
                  level: 0,
                  occupancy: 0,
                  condition: 100,
                  crimeRisk: 10,
                  masterIndex: undefined,
                  isMultiPart: false,
                  multiWidth: undefined,
                  multiHeight: undefined,
                  isMerged3x3: false,
                  mergedLevel: undefined,
                };
              }
            }
          }

          return { ...state, grid: newGrid, money: state.money - cost };
        }

        // Multi-tile placement (e.g. 2x2 for Power Plant, University, or Hospital)
        const is2x2 = type === TileType.POWER_PLANT || type === TileType.UNIVERSITY || type === TileType.HOSPITAL;
        const cost = (BUILD_COSTS[type] || 0);
        if (state.money < cost) return state;

        const newGrid = [...state.grid];
        const originX = index % 100;
        const originY = Math.floor(index / 100);

        // If replacing part of a previous multi-tile structure, clear the partner tiles
        const oldTile = newGrid[index];
        if (oldTile && (oldTile.masterIndex !== undefined || oldTile.multiWidth || oldTile.isMerged3x3)) {
          const oldMIdx = oldTile.masterIndex ?? index;
          const oldMaster = newGrid[oldMIdx];
          const ow = oldMaster?.multiWidth || (oldMaster?.isMerged3x3 ? 3 : 1);
          const oh = oldMaster?.multiHeight || (oldMaster?.isMerged3x3 ? 3 : 1);
          const ox = oldMIdx % 100;
          const oy = Math.floor(oldMIdx / 100);
          for (let dy = 0; dy < oh; dy++) {
            for (let dx = 0; dx < ow; dx++) {
              const sIdx = (oy + dy) * 100 + (ox + dx);
              if (sIdx >= 0 && sIdx < newGrid.length && sIdx !== index) {
                newGrid[sIdx] = {
                  ...newGrid[sIdx],
                  type: TileType.EMPTY,
                  level: 0,
                  occupancy: 0,
                  condition: 100,
                  crimeRisk: 10,
                  masterIndex: undefined,
                  isMultiPart: false,
                  multiWidth: undefined,
                  multiHeight: undefined,
                  isMerged3x3: false,
                  mergedLevel: undefined,
                };
              }
            }
          }
        }

        if (is2x2) {
          // Check if 2x2 fits within grid boundaries
          if (originX >= 99 || originY >= 99) return state;

          // Check if any tile in the 2x2 area is Mayor's Office
          for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
              const tIdx = (originY + dy) * 100 + (originX + dx);
              if (newGrid[tIdx].type === TileType.MAYORS_OFFICE) return state;
            }
          }

          for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
              const tIdx = (originY + dy) * 100 + (originX + dx);
              newGrid[tIdx] = {
                ...newGrid[tIdx],
                type,
                level: 1,
                occupancy: 40,
                condition: 100,
                masterIndex: index,
                isMultiPart: !(dx === 0 && dy === 0),
                multiWidth: 2,
                multiHeight: 2,
                isMerged3x3: false,
              };
            }
          }
        } else {
          // Single-tile placement
          // Zones (Residential, Commercial, Industrial) start at Level 0 (undeveloped parcel) and build up
          const isZone = type === TileType.RESIDENTIAL || type === TileType.COMMERCIAL || type === TileType.INDUSTRIAL;
          const initialLevel = isZone ? 0 : 1;
          const initialOccupancy = isZone ? 0 : 20;

          newGrid[index] = {
            ...newGrid[index],
            type,
            level: initialLevel,
            occupancy: initialOccupancy,
            condition: 100,
            masterIndex: undefined,
            isMultiPart: false,
            multiWidth: undefined,
            multiHeight: undefined,
            isMerged3x3: false,
            mergedLevel: undefined,
          };
        }

        return { ...state, grid: newGrid, money: state.money - cost, selectedTileIndex: index };
    }
    case 'DEMOLISH_TILE': {
        const index = action.payload.index;
        if (index < 0 || index >= state.grid.length) return state;
        const targetTile = state.grid[index];
        if (targetTile.type === TileType.MAYORS_OFFICE) return state;

        const newGrid = [...state.grid];
        const mIdx = targetTile.masterIndex ?? index;
        const w = targetTile.multiWidth || 1;
        const h = targetTile.multiHeight || 1;
        const originX = mIdx % 100;
        const originY = Math.floor(mIdx / 100);

        for (let dy = 0; dy < h; dy++) {
          for (let dx = 0; dx < w; dx++) {
            const tileIdx = (originY + dy) * 100 + (originX + dx);
            if (tileIdx >= 0 && tileIdx < newGrid.length) {
              newGrid[tileIdx] = {
                ...newGrid[tileIdx],
                type: TileType.EMPTY,
                level: 0,
                occupancy: 0,
                condition: 100,
                crimeRisk: 10,
                masterIndex: undefined,
                isMultiPart: false,
                multiWidth: undefined,
                multiHeight: undefined,
                isMerged3x3: false,
                mergedLevel: undefined,
              };
            }
          }
        }
        return { ...state, grid: newGrid, money: Math.max(0, state.money - 25) };
    }
    case 'MERGE_3X3_RESIDENTIAL': {
        const { masterIndex } = action.payload;
        const originX = masterIndex % 100;
        const originY = Math.floor(masterIndex / 100);
        if (originX > 97 || originY > 97) return state;

        const newGrid = [...state.grid];
        let totalOcc = 0;
        for (let dy = 0; dy < 3; dy++) {
          for (let dx = 0; dx < 3; dx++) {
            const idx = (originY + dy) * 100 + (originX + dx);
            totalOcc += newGrid[idx].occupancy;
          }
        }

        for (let dy = 0; dy < 3; dy++) {
          for (let dx = 0; dx < 3; dx++) {
            const idx = (originY + dy) * 100 + (originX + dx);
            newGrid[idx] = {
              ...newGrid[idx],
              type: TileType.RESIDENTIAL,
              level: 3,
              isMerged3x3: true,
              mergedLevel: 1,
              masterIndex,
              isMultiPart: !(dx === 0 && dy === 0),
              multiWidth: 3,
              multiHeight: 3,
              occupancy: dx === 0 && dy === 0 ? Math.max(500, totalOcc) : 0,
              condition: 100,
            };
          }
        }

        return { ...state, grid: newGrid };
    }
    case 'ADD_NOTIFICATION':
        return { ...state, notifications: [action.payload, ...state.notifications].slice(0, 50) };
    case 'FACTION_ACTION': {
        const { factionId, actionType } = action.payload;
        const factionKey = Object.keys(state.factions).find(k => state.factions[k as keyof typeof state.factions].id === factionId) as keyof typeof state.factions | undefined;
        
        if (!factionKey) return state;

        let cost = 0;
        let influenceGain = 0;
        let happinessGain = 0;
        let corruptionChange = 0;

        // Distinct effects
        if (actionType === 'LOBBY') {
            cost = 2000;
            influenceGain = 5;
            happinessGain = 2;
            corruptionChange = -1; // Lobbying is 'clean' influence, maybe slight reduction in overt corruption or neutral
        } else if (actionType === 'BRIBE') {
            cost = 500;
            influenceGain = 10;
            happinessGain = 5;
            corruptionChange = 5; // Direct corruption increase
        }

        if (state.money < cost) return state;
        
        const factions = { ...state.factions };
        factions[factionKey] = {
            ...factions[factionKey],
            influence: Math.min(100, Math.max(0, factions[factionKey].influence + influenceGain)),
            happiness: Math.min(100, Math.max(0, factions[factionKey].happiness + happinessGain))
        };

        return { 
            ...state, 
            factions, 
            money: state.money - cost, 
            corruption: Math.min(100, Math.max(0, state.corruption + corruptionChange)) 
        };
    }
    case 'SET_POLICY': {
        const { key, value } = action.payload;
        return { ...state, [key]: value };
    }
    case 'START_BUSINESSMAN_MODE': {
      const updatedGrid = [...state.grid];
      // Guarantee Magnolia Boulevard (y = 51, x = 42..48) is paved road directly in front of Vance Estate
      for (let x = 42; x <= 48; x++) {
        const rIdx = 51 * 100 + x;
        if (rIdx >= 0 && rIdx < updatedGrid.length) {
          updatedGrid[rIdx] = {
            ...updatedGrid[rIdx],
            type: TileType.ROAD,
            condition: 100,
          };
        }
      }
      // Ensure Vance Estate at (45, 52) is initialized as Estate property
      const estateIdx = 52 * 100 + 45;
      if (estateIdx >= 0 && estateIdx < updatedGrid.length) {
        updatedGrid[estateIdx] = {
          ...updatedGrid[estateIdx],
          type: TileType.RESIDENTIAL,
          level: 2,
          occupancy: 12,
          condition: 100,
        };
      }
      const businessman = createInitialBusinessmanState();
      const computerMayor = createInitialComputerMayor();
      return {
        ...state,
        grid: updatedGrid,
        role: GamePhase.CIVILIAN,
        civilianJob: CivilianRole.BUSINESS_OWNER,
        money: 50000,
        speed: 1,
        activeView: 'OUTSIDE',
        businessman,
        computerMayor,
        notifications: [
          {
            id: `biz_welcome_${Date.now()}`,
            title: 'Welcome to New Veridia, Magnate',
            message: 'You have stepped out onto Magnolia Boulevard in front of your private estate with $50,000 in seed capital. Acquire commercial and industrial zones, expand your empire, manage subsidies, and navigate relations with City Hall!',
            date: state.date,
            source: 'System',
            bias: 0,
          },
          ...state.notifications,
        ],
      };
    }
    case 'BUY_BUSINESS': {
      if (!state.businessman) return state;
      const { tileIndex, name, type, mode, cost } = action.payload;
      if (state.money < cost) return state;

      const newBiz = {
        id: `biz_${Date.now()}_${tileIndex}`,
        tileIndex,
        name,
        type,
        mode,
        level: 1,
        dailyRevenue: mode === 'CORRUPT' ? 580 : 250,
        dailyCosts: 40,
        employees: 12,
        purchasePrice: cost,
        purchaseDate: state.date,
        auditCount: 0,
      };

      const updatedGrid = [...state.grid];
      if (updatedGrid[tileIndex]) {
        updatedGrid[tileIndex] = {
          ...updatedGrid[tileIndex],
          ownerId: 'player',
          ownerName: 'Victor Vance (Player)',
          businessName: name,
          businessType: type,
          businessMode: mode,
          level: Math.max(1, updatedGrid[tileIndex].level),
          occupancy: Math.max(40, updatedGrid[tileIndex].occupancy),
        };
      }

      return {
        ...state,
        grid: updatedGrid,
        money: state.money - cost,
        businessman: {
          ...state.businessman,
          businesses: [...state.businessman.businesses, newBiz],
          alignment: mode === 'CORRUPT' ? state.businessman.alignment - 5 : state.businessman.alignment + 5,
        },
        notifications: [
          {
            id: `buy_biz_${Date.now()}`,
            title: 'Enterprise Acquired!',
            message: `Congratulations! You now own "${name}" operating in ${mode === 'HONEST' ? 'Honest' : 'Corrupt'} Mode. Daily revenue will now flow to your treasury!`,
            date: state.date,
            source: 'System',
            bias: 0,
          },
          ...state.notifications,
        ],
      };
    }
    case 'TOGGLE_BUSINESS_MODE': {
      if (!state.businessman) return state;
      const { businessId } = action.payload;
      const businesses = state.businessman.businesses.map(b => {
        if (b.id !== businessId) return b;
        const newMode = b.mode === 'HONEST' ? 'CORRUPT' : 'HONEST';
        return {
          ...b,
          mode: newMode as 'HONEST' | 'CORRUPT',
          dailyRevenue: newMode === 'CORRUPT' ? Math.round(b.dailyRevenue * 2.2) : Math.round(b.dailyRevenue / 2.2),
        };
      });
      return {
        ...state,
        businessman: {
          ...state.businessman,
          businesses,
        },
      };
    }
    case 'UPGRADE_BUSINESS': {
      if (!state.businessman) return state;
      const { businessId, cost } = action.payload;
      if (state.money < cost) return state;

      const businesses = state.businessman.businesses.map(b => {
        if (b.id !== businessId) return b;
        const newLvl = Math.min(3, b.level + 1);
        return {
          ...b,
          level: newLvl,
          employees: b.employees + 15,
          dailyRevenue: Math.round(b.dailyRevenue * 1.8),
        };
      });

      return {
        ...state,
        money: state.money - cost,
        businessman: {
          ...state.businessman,
          businesses,
        },
      };
    }
    case 'SELL_BUSINESS': {
      if (!state.businessman) return state;
      const { businessId } = action.payload;
      const target = state.businessman.businesses.find(b => b.id === businessId);
      if (!target) return state;

      const refund = Math.round(target.purchasePrice * 0.7);
      const remaining = state.businessman.businesses.filter(b => b.id !== businessId);

      const updatedGrid = [...state.grid];
      if (updatedGrid[target.tileIndex]) {
        updatedGrid[target.tileIndex] = {
          ...updatedGrid[target.tileIndex],
          ownerId: undefined,
          ownerName: undefined,
          businessName: undefined,
          businessType: undefined,
          businessMode: undefined,
        };
      }

      return {
        ...state,
        grid: updatedGrid,
        money: state.money + refund,
        businessman: {
          ...state.businessman,
          businesses: remaining,
        },
        notifications: [
          {
            id: `sell_biz_${Date.now()}`,
            title: 'Property Liquidated',
            message: `Sold "${target.name}" for $${refund.toLocaleString()} liquidation proceeds.`,
            date: state.date,
            source: 'System',
            bias: 0,
          },
          ...state.notifications,
        ],
      };
    }
    case 'LOBBY_MAYOR': {
      if (!state.businessman || !state.computerMayor) return state;
      const { actionType, amount } = action.payload;
      if (state.money < amount) return state;

      const mayor = { ...state.computerMayor };
      const bizman = { ...state.businessman };
      let notifTitle = 'City Hall Lobbying';
      let notifMsg = '';

      if (actionType === 'INCREASE_SUBSIDY') {
        mayor.subsidyMeter = Math.min(100, mayor.subsidyMeter + 20);
        mayor.relationWithPlayer = Math.min(100, mayor.relationWithPlayer + 15);
        notifTitle = 'Subsidy Expansion Approved';
        notifMsg = `Lobbied City Council successfully. Municipal Business Subsidy Meter expanded to ${mayor.subsidyMeter}%!`;
      } else if (actionType === 'TAX_RELIEF') {
        state.taxRate = Math.max(0.04, state.taxRate - 0.02);
        mayor.relationWithPlayer = Math.min(100, mayor.relationWithPlayer + 10);
        notifTitle = 'Commercial Tax Relief Enacted';
        notifMsg = `Secured municipal tax concessions. Municipal commercial rate decreased to ${(state.taxRate * 100).toFixed(0)}%!`;
      } else if (actionType === 'BRIBE') {
        mayor.relationWithPlayer = Math.min(100, mayor.relationWithPlayer + 40);
        mayor.subsidyMeter = Math.min(100, mayor.subsidyMeter + 15);
        state.corruption = Math.min(100, state.corruption + 6);
        bizman.alignment = Math.max(-100, bizman.alignment - 10);
        bizman.businesses = bizman.businesses.map(b => ({ ...b, isRaided: false, raidTimer: 0 }));
        notifTitle = 'City Hall Backroom Deal';
        notifMsg = `Under-the-table kickback accepted. Police raids cancelled, mayoral relations improved!`;
      } else if (actionType === 'DONATE_CAMPAIGN') {
        bizman.donatedToMayor += amount;
        mayor.relationWithPlayer = Math.min(100, mayor.relationWithPlayer + 25);
        mayor.approval = Math.min(95, mayor.approval + 8);
        notifTitle = 'Mayoral Re-Election Donation';
        notifMsg = `Contributed $${amount.toLocaleString()} to ${mayor.name}'s war chest. Mayor expresses deep gratitude!`;
      } else if (actionType === 'FUND_RECALL') {
        bizman.donatedToRecall += amount;
        if (bizman.donatedToRecall >= 200000) {
          bizman.isBallotQualified = true;
          notifTitle = '🗳️ Ballot Qualified: Run for Office!';
          notifMsg = `Candidacy committee fully funded ($${bizman.donatedToRecall.toLocaleString()} / $200,000)! You are officially certified on the Mayoral Election ballot! Campaign action strategies are now unlocked.`;
        } else {
          notifTitle = 'Mayoral Candidacy Committee Funded';
          notifMsg = `Invested $${amount.toLocaleString()} into your Run for Office qualifying fund ($${bizman.donatedToRecall.toLocaleString()} / $200,000 required to qualify)!`;
        }
      }

      return {
        ...state,
        money: state.money - amount,
        computerMayor: mayor,
        businessman: bizman,
        notifications: [
          {
            id: `lobby_${Date.now()}`,
            title: notifTitle,
            message: notifMsg,
            date: state.date,
            source: 'Intel',
            bias: 0,
          },
          ...state.notifications,
        ],
      };
    }
    case 'CAMPAIGN_ACTION': {
      if (!state.businessman) return state;
      const { action: campaignAct, cost } = action.payload;
      if (state.money < cost) return state;

      const currentProgress = state.businessman.campaignProgress || {
        runningAdsPayments: 0,
        communityProjectsPayments: 0,
        campaignSpeechesPayments: 0,
        bribePoliceChiefPayments: 0,
        plantBadStoriesPayments: 0,
        bribePollWorkersPayments: 0,
      };

      const updatedProgress = { ...currentProgress };
      let notifTitle = 'Campaign Action Executed';
      let notifMsg = '';

      if (campaignAct === 'RUN_ADS') {
        if (updatedProgress.runningAdsPayments >= 5) return state;
        updatedProgress.runningAdsPayments += 1;
        notifTitle = '📺 Campaign Ads Broadcasted';
        notifMsg = `Aired prime-time promotional ads across New Veridia (${updatedProgress.runningAdsPayments}/5 payments complete, +3.33% win odds).`;
      } else if (campaignAct === 'COMMUNITY_PROJECTS') {
        if (updatedProgress.communityProjectsPayments >= 5) return state;
        updatedProgress.communityProjectsPayments += 1;
        notifTitle = '🌳 Community Project Funded';
        notifMsg = `Endowed grassroots neighborhood civic projects and parks (${updatedProgress.communityProjectsPayments}/5 payments complete, +3.33% win odds).`;
      } else if (campaignAct === 'CAMPAIGN_SPEECHES') {
        if (updatedProgress.campaignSpeechesPayments >= 5) return state;
        updatedProgress.campaignSpeechesPayments += 1;
        notifTitle = '🎙️ Campaign Rally & Speech Delivered';
        notifMsg = `Delivered an inspiring town-hall mayoral address (${updatedProgress.campaignSpeechesPayments}/5 payments complete, +3.33% win odds).`;
      } else if (campaignAct === 'BRIBE_POLICE_CHIEF') {
        if (updatedProgress.bribePoliceChiefPayments >= 5) return state;
        updatedProgress.bribePoliceChiefPayments += 1;
        notifTitle = '💼 Police Chief Bribed & Unions Swayed';
        notifMsg = `Slipped hush funds to the Chief of Police to endorse your ticket and order union block votes (${updatedProgress.bribePoliceChiefPayments}/5 payments complete, +6.0% win odds).`;
      } else if (campaignAct === 'PLANT_BAD_STORIES') {
        if (updatedProgress.plantBadStoriesPayments >= 5) return state;
        updatedProgress.plantBadStoriesPayments += 1;
        notifTitle = '📰 Smear Story Planted in Media';
        notifMsg = `Published devastating leaked scandal exposés about the incumbent Mayor (${updatedProgress.plantBadStoriesPayments}/5 payments complete, +6.0% win odds).`;
      } else if (campaignAct === 'BRIBE_POLL_WORKERS') {
        if (updatedProgress.bribePollWorkersPayments >= 5) return state;
        updatedProgress.bribePollWorkersPayments += 1;
        notifTitle = '🗳️ Ward Poll Workers Bribed';
        notifMsg = `Secured precinct ballot boxes and vote counters with dark cash payments (${updatedProgress.bribePollWorkersPayments}/5 payments complete, +6.0% win odds).`;
      }

      return {
        ...state,
        money: state.money - cost,
        businessman: {
          ...state.businessman,
          campaignProgress: updatedProgress,
        },
        notifications: [
          {
            id: `camp_${Date.now()}`,
            title: notifTitle,
            message: notifMsg,
            date: state.date,
            source: 'News',
            bias: 0,
          },
          ...state.notifications,
        ],
      };
    }
    case 'RESOLVE_BUSINESSMAN_ELECTION': {
      if (!state.businessman) return state;
      const cp = state.businessman.campaignProgress || {
        runningAdsPayments: 0,
        communityProjectsPayments: 0,
        campaignSpeechesPayments: 0,
        bribePoliceChiefPayments: 0,
        plantBadStoriesPayments: 0,
        bribePollWorkersPayments: 0,
      };

      const goodOdds = (cp.runningAdsPayments + cp.communityProjectsPayments + cp.campaignSpeechesPayments) * (50 / 15);
      const corruptOdds = (cp.bribePoliceChiefPayments + cp.plantBadStoriesPayments + cp.bribePollWorkersPayments) * 6;
      const winOdds = Math.min(100, Math.max(goodOdds, corruptOdds));

      const roll = Math.random() * 100;
      const won = roll < winOdds;

      if (won) {
        return {
          ...state,
          role: GamePhase.MAYOR,
          activeView: 'OFFICE',
          speed: 1,
          showElectionModal: true,
          notifications: [
            {
              id: `elect_win_${Date.now()}`,
              title: '🎉 ELECTION VICTORY: You Are Sworn in as Mayor!',
              message: `Your campaign secured a decisive victory with ${Math.round(winOdds)}% effective odds! Your time as a private businessman ends — you now take executive control of City Hall as Mayor!`,
              date: state.date,
              source: 'News',
              bias: 0,
            },
            ...state.notifications,
          ],
        };
      } else {
        return {
          ...state,
          notifications: [
            {
              id: `elect_loss_${Date.now()}`,
              title: '🗳️ Election Result: Incumbent Retained Office',
              message: `The ballot result did not fall in your favor (rolled against ${Math.round(winOdds)}% odds). Incumbent ${state.computerMayor?.name || 'Mayor'} narrowly retained office. Your private enterprise empire remains intact for future challenges!`,
              date: state.date,
              source: 'News',
              bias: 0,
            },
            ...state.notifications,
          ],
        };
      }
    }
    case 'STEP_DOWN_AS_MAYOR': {
      const businessman = state.businessman || createInitialBusinessmanState();
      const computerMayor = state.computerMayor || createInitialComputerMayor();

      return {
        ...state,
        role: GamePhase.CIVILIAN,
        civilianJob: CivilianRole.BUSINESS_OWNER,
        activeView: 'OUTSIDE',
        speed: 1,
        businessman,
        computerMayor,
        notifications: [
          {
            id: `step_down_${Date.now()}`,
            title: '🏛️ Resignation Certified: Return to Private Enterprise',
            message: `You have stepped down from the Mayorship of New Veridia. You arrive on Magnolia Boulevard outside Vance Estate with full control of your private commercial empire!`,
            date: state.date,
            source: 'System',
            bias: 0,
          },
          ...state.notifications,
        ],
      };
    }
    case 'FORCE_OUT_MAYOR': {
      if (!state.businessman) return state;
      const { newAlignment } = action.payload;

      const newMayor = newAlignment === 'HONEST'
        ? {
            name: 'Mayor Clara Vance',
            alignment: 'HONEST' as const,
            portrait: 'REFORMER_FEMALE' as const,
            approval: 78,
            subsidyMeter: 80,
            relationWithPlayer: 75,
            lastActionText: 'Mayor Clara Vance sworn in following historic recall victory, promising clean enterprise subsidies and transparency.',
            lastActionDate: state.date,
            totalRecallFundsAgainst: 0,
            actionsTakenCount: 1,
            treasury: 75000,
            currentProject: 'Drafting Garden City Masterplan & Parkside Expansion',
            urbanFocus: 'Parks, Public Health, Schools & Balanced Growth',
            civicProjectsBuilt: 0,
          }
        : {
            name: "Mayor Vincent 'The Bull' Moretti",
            alignment: 'CORRUPT' as const,
            portrait: 'MACHINE_BOSS_MALE' as const,
            approval: 58,
            subsidyMeter: 90,
            relationWithPlayer: 85,
            lastActionText: 'Mayor Moretti takes City Hall in a lightning political coup, opening dark municipal subsidies and sweeping racketeering charges aside.',
            lastActionDate: state.date,
            totalRecallFundsAgainst: 0,
            actionsTakenCount: 1,
            treasury: 90000,
            currentProject: 'Fast-tracking Industrial Deregulation & Cartel Corridors',
            urbanFocus: 'Heavy Factories, Commercial High-Rises & Patronage',
            civicProjectsBuilt: 0,
          };

      return {
        ...state,
        computerMayor: newMayor,
        businessman: {
          ...state.businessman,
          donatedToRecall: 0,
        },
        notifications: [
          {
            id: `mayor_oust_${Date.now()}`,
            title: '🏛️ MAYORAL RECALL CERTIFIED: New Mayor Sworn In!',
            message: `Your political action committee successfully forced out the old Mayor! ${newMayor.name} takes the oath of office in City Hall with a +${newMayor.relationWithPlayer} favorable alliance to your enterprise!`,
            date: state.date,
            source: 'News',
            bias: 0,
          },
          ...state.notifications,
        ],
      };
    }
    case 'BUY_STOCK': {
      if (!state.businessman) return state;
      const { stockId, shares } = action.payload;
      if (shares <= 0) return state;

      const market = state.businessman.stockMarket || [];
      const stock = market.find((s) => s.id === stockId);
      if (!stock) return state;

      const totalCost = Math.round(stock.currentPrice * shares * 100) / 100;
      if (state.money < totalCost) return state;

      const currentHoldings = state.businessman.portfolioStocks || [];
      const existing = currentHoldings.find((h) => h.stockId === stockId);

      let updatedHoldings: StockHolding[];
      if (existing) {
        const newTotalShares = existing.shares + shares;
        const newTotalCostBasis = existing.totalCostBasis + totalCost;
        const newAvgBuyPrice = Math.round((newTotalCostBasis / newTotalShares) * 100) / 100;
        updatedHoldings = currentHoldings.map((h) =>
          h.stockId === stockId
            ? { ...h, shares: newTotalShares, avgBuyPrice: newAvgBuyPrice, totalCostBasis: newTotalCostBasis }
            : h
        );
      } else {
        updatedHoldings = [
          ...currentHoldings,
          {
            stockId,
            shares,
            avgBuyPrice: stock.currentPrice,
            totalCostBasis: totalCost,
          },
        ];
      }

      const totalStockVal = updatedHoldings.reduce((sum, h) => {
        const s = market.find((item) => item.id === h.stockId);
        return sum + (s ? s.currentPrice * h.shares : h.avgBuyPrice * h.shares);
      }, 0);

      return {
        ...state,
        money: state.money - totalCost,
        businessman: {
          ...state.businessman,
          portfolioStocks: updatedHoldings,
          totalStockValue: Math.round(totalStockVal),
        },
        notifications: [
          {
            id: `buy_stock_${Date.now()}`,
            title: `Executed: Bought ${shares} ${stock.ticker}`,
            message: `Acquired ${shares} shares of ${stock.name} at $${stock.currentPrice.toFixed(2)}/share for $${totalCost.toLocaleString()}.`,
            date: state.date,
            source: 'News',
            bias: 0,
          },
          ...state.notifications,
        ],
      };
    }
    case 'SELL_STOCK': {
      if (!state.businessman) return state;
      const { stockId, shares } = action.payload;
      if (shares <= 0) return state;

      const currentHoldings = state.businessman.portfolioStocks || [];
      const existing = currentHoldings.find((h) => h.stockId === stockId);
      if (!existing || existing.shares < shares) return state;

      const market = state.businessman.stockMarket || [];
      const stock = market.find((s) => s.id === stockId);
      const sellPrice = stock ? stock.currentPrice : existing.avgBuyPrice;

      const proceeds = Math.round(sellPrice * shares * 100) / 100;
      const costBasisSold = Math.round(existing.avgBuyPrice * shares * 100) / 100;
      const realizedGain = proceeds - costBasisSold;

      let updatedHoldings: StockHolding[];
      if (existing.shares === shares) {
        updatedHoldings = currentHoldings.filter((h) => h.stockId !== stockId);
      } else {
        const remainingShares = existing.shares - shares;
        const remainingCostBasis = existing.totalCostBasis - costBasisSold;
        updatedHoldings = currentHoldings.map((h) =>
          h.stockId === stockId
            ? { ...h, shares: remainingShares, totalCostBasis: remainingCostBasis }
            : h
        );
      }

      const totalStockVal = updatedHoldings.reduce((sum, h) => {
        const s = market.find((item) => item.id === h.stockId);
        return sum + (s ? s.currentPrice * h.shares : h.avgBuyPrice * h.shares);
      }, 0);

      return {
        ...state,
        money: state.money + proceeds,
        businessman: {
          ...state.businessman,
          portfolioStocks: updatedHoldings,
          totalStockValue: Math.round(totalStockVal),
          totalStockProfitsRealized: (state.businessman.totalStockProfitsRealized || 0) + realizedGain,
        },
        notifications: [
          {
            id: `sell_stock_${Date.now()}`,
            title: `Sold ${shares} ${stock?.ticker || 'Shares'}`,
            message: `Liquidated ${shares} shares for $${proceeds.toLocaleString()} proceeds (${realizedGain >= 0 ? '+' : ''}$${Math.round(realizedGain).toLocaleString()} P&L).`,
            date: state.date,
            source: 'News',
            bias: 0,
          },
          ...state.notifications,
        ],
      };
    }
    case 'ACCEPT_BRIBE': {
      const { businessmanId, amount, message } = action.payload;
      return {
        ...state,
        money: state.money + amount,
        corruption: Math.min(100, state.corruption + 3),
        totalBribesReceivedAsMayor: (state.totalBribesReceivedAsMayor || 0) + amount,
        notifications: [
          {
            id: `accept_bribe_${Date.now()}`,
            title: '💰 Bribe Accepted into City Accounts',
            message: message || `Accepted $${amount.toLocaleString()} in off-the-books funds from ${businessmanId === 'cb_corrupt' ? 'Silas Cross' : 'private interests'}. Municipal funds increased!`,
            date: state.date,
            source: 'Intel',
            bias: 25,
          },
          ...state.notifications,
        ],
      };
    }
    default:
      return state;
  }
};

interface GameContextProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

const GameContext = createContext<GameContextProps | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  useEffect(() => {
    if (state.speed === 0 || state.activeView === 'MENU') return;

    // For Businessman career, human controls speed and city simulation runs at active speed (CITY_TICK_RATE_MS)
    // For Mayor walking outside, uses real-world pace
    const isRealWorld = state.activeView === 'OUTSIDE' && state.role !== GamePhase.CIVILIAN;
    const tickInterval = isRealWorld
      ? Math.max(25, Math.round(REAL_WORLD_HOUR_RATE_MS / state.speed))
      : Math.max(15, Math.round(CITY_TICK_RATE_MS / state.speed));

    const timerId = setInterval(() => {
      dispatch({ type: 'TICK', payload: { delta: 1 } });
    }, tickInterval);

    return () => clearInterval(timerId);
  }, [state.speed, state.activeView, state.role]);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
