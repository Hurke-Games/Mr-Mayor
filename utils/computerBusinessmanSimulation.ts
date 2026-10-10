import { 
  GameState, 
  ComputerBusinessmanState, 
  ComputerBusinessmanProperty, 
  TileType, 
  Notification, 
  CampaignActionProgress,
  OwnedBusiness
} from '../types';
import { GRID_SIZE, TOTAL_TILES } from '../constants';

export const createInitialComputerBusinessmen = (): ComputerBusinessmanState[] => {
  const initialCampaignProgress: CampaignActionProgress = {
    runningAdsPayments: 0,
    communityProjectsPayments: 0,
    campaignSpeechesPayments: 0,
    bribePoliceChiefPayments: 0,
    plantBadStoriesPayments: 0,
    bribePollWorkersPayments: 0,
  };

  const honestTycoon: ComputerBusinessmanState = {
    id: 'cb_honest',
    name: 'Julian Croft',
    companyName: 'Croft Clean Industries & Civic Capital',
    title: 'Civic Industrialist & Reformer',
    alignment: 'HONEST',
    portrait: 'HONEST_REFORMER',
    cash: 125000,
    dailyRevenue: 520,
    dailyProfit: 420,
    properties: [],
    isAttemptingOuster: false,
    ousterMethod: 'NONE',
    qualifyingFunds: 0,
    isQualified: false,
    campaignProgress: { ...initialCampaignProgress },
    effectiveOdds: 0,
    totalBribesPaidToMayor: 0,
    lastActionText: 'Croft Clean Industries committed $50,000 in seed capital for green commerce corridors.',
    lastActionDate: 0,
  };

  const corruptTycoon: ComputerBusinessmanState = {
    id: 'cb_corrupt',
    name: 'Silas Cross',
    companyName: 'Cross Harbor Syndicate & Holdings',
    title: 'Machine Fixer & Industrial Baron',
    alignment: 'CORRUPT',
    portrait: 'SYNDICATE_BOSS',
    cash: 195000,
    dailyRevenue: 1350,
    dailyProfit: 1100,
    properties: [],
    isAttemptingOuster: false,
    ousterMethod: 'NONE',
    qualifyingFunds: 0,
    isQualified: false,
    campaignProgress: { ...initialCampaignProgress },
    effectiveOdds: 0,
    totalBribesPaidToMayor: 0,
    lastActionText: 'Cross Harbor Syndicate acquired offshore transshipment slips and established discretionary shadow accounts.',
    lastActionDate: 0,
  };

  return [honestTycoon, corruptTycoon];
};

/**
 * Assigns starter properties on the map to Julian Croft and Silas Cross if none exist
 */
export const seedInitialProperties = (state: GameState, tycoons: ComputerBusinessmanState[]): void => {
  const grid = state.grid;

  tycoons.forEach(cb => {
    if (cb.properties.length > 0) return;

    if (cb.alignment === 'HONEST') {
      // Find a commercial tile near center
      for (let i = 0; i < TOTAL_TILES; i++) {
        const tile = grid[i];
        if (tile.type === TileType.COMMERCIAL && !tile.ownerId && !tile.isMultiPart) {
          const starterProp: ComputerBusinessmanProperty = {
            tileIndex: i,
            name: 'Croft Central Apothecary & Organics',
            type: 'RETAIL',
            level: 1,
            mode: 'HONEST',
            dailyRevenue: 320,
            dailyCosts: 40,
            acquiredDate: state.date,
          };
          cb.properties.push(starterProp);
          grid[i] = {
            ...grid[i],
            ownerId: cb.id,
            ownerName: cb.name,
            businessName: starterProp.name,
            businessType: starterProp.type,
            businessMode: starterProp.mode,
            level: Math.max(1, grid[i].level),
            occupancy: 65,
          };
          break;
        }
      }
    } else {
      // Find an industrial or commercial tile
      for (let i = 0; i < TOTAL_TILES; i++) {
        const tile = grid[i];
        if (tile.type === TileType.INDUSTRIAL && !tile.ownerId && !tile.isMultiPart) {
          const starterProp: ComputerBusinessmanProperty = {
            tileIndex: i,
            name: 'Cross Harbor Foundry & Die Cast',
            type: 'FACTORY',
            level: 1,
            mode: 'CORRUPT',
            dailyRevenue: 750,
            dailyCosts: 60,
            acquiredDate: state.date,
          };
          cb.properties.push(starterProp);
          grid[i] = {
            ...grid[i],
            ownerId: cb.id,
            ownerName: cb.name,
            businessName: starterProp.name,
            businessType: starterProp.type,
            businessMode: starterProp.mode,
            level: Math.max(1, grid[i].level),
            occupancy: 70,
          };
          break;
        }
      }
    }
  });
};

/**
 * Autonomous simulation of the Computer Businessmen (both Good and Corrupt)
 */
export const simulateComputerBusinessmen = (state: GameState): GameState => {
  let newState = { ...state };

  if (!newState.computerBusinessmen || newState.computerBusinessmen.length === 0) {
    newState.computerBusinessmen = createInitialComputerBusinessmen();
    seedInitialProperties(newState, newState.computerBusinessmen);
  }

  const date = newState.date;
  const isPlayerMayor = newState.role === 'MAYOR';
  // Mayor alignment evaluation
  // When player is Mayor: corruption <= 40 is GOOD / HONEST; corruption > 40 is CORRUPT
  // When computer mayor is in office: check computerMayor.alignment
  const isMayorCorrupt = isPlayerMayor 
    ? (newState.corruption > 40)
    : (newState.computerMayor?.alignment === 'CORRUPT');
  const isMayorGood = !isMayorCorrupt;

  const updatedTycoons = newState.computerBusinessmen.map(cb => {
    const tycoon = { 
      ...cb, 
      properties: [...cb.properties],
      campaignProgress: { ...(cb.campaignProgress || {
        runningAdsPayments: 0,
        communityProjectsPayments: 0,
        campaignSpeechesPayments: 0,
        bribePoliceChiefPayments: 0,
        plantBadStoriesPayments: 0,
        bribePollWorkersPayments: 0,
      }) }
    };

    // -------------------------------------------------------------------------
    // 1. DAILY ACCOUNTING & REVENUE EARNING (Every 24 in-game ticks = 1 Day)
    // -------------------------------------------------------------------------
    if (date % 24 === 0) {
      let dayRev = 0;
      let dayCosts = 0;

      tycoon.properties.forEach(prop => {
        let baseRev = prop.level === 1 ? 300 : prop.level === 2 ? 780 : 1850;
        if (prop.mode === 'CORRUPT') {
          baseRev = Math.round(baseRev * 2.3);
          newState.corruption = Math.min(100, newState.corruption + 0.08);
        } else {
          newState.cityMorale = Math.min(100, (newState.cityMorale || 70) + 0.08);
        }
        prop.dailyRevenue = baseRev;
        dayRev += baseRev;
        dayCosts += prop.dailyCosts;
      });

      const netProfit = Math.max(0, dayRev - dayCosts);
      tycoon.dailyRevenue = dayRev;
      tycoon.dailyProfit = netProfit;
      tycoon.cash += netProfit;
    }

    // -------------------------------------------------------------------------
    // 2. PROPERTY ACQUISITIONS & UPGRADES (Every 36 in-game ticks)
    // -------------------------------------------------------------------------
    if (date % 36 === 0 && tycoon.cash > 15000 && tycoon.properties.length < 8) {
      const grid = newState.grid;
      const targetType = tycoon.alignment === 'HONEST' ? TileType.COMMERCIAL : TileType.INDUSTRIAL;
      let acquired = false;

      // Scan for vacant or unowned commercial/industrial tile
      for (let i = 0; i < TOTAL_TILES; i++) {
        const tile = grid[i];
        if (tile.type === targetType && !tile.ownerId && !tile.isMultiPart) {
          const cost = tycoon.alignment === 'HONEST' ? 12000 : 16000;
          if (tycoon.cash >= cost) {
            tycoon.cash -= cost;
            const newName = tycoon.alignment === 'HONEST'
              ? `Croft Clean Enterprise #${tile.x}-${tile.y}`
              : `Cross Harbor Syndicate Front #${tile.x}-${tile.y}`;
            
            const newProp: ComputerBusinessmanProperty = {
              tileIndex: i,
              name: newName,
              type: tycoon.alignment === 'HONEST' ? 'RETAIL' : 'FACTORY',
              level: 1,
              mode: tycoon.alignment,
              dailyRevenue: tycoon.alignment === 'HONEST' ? 320 : 750,
              dailyCosts: 45,
              acquiredDate: date,
            };

            tycoon.properties.push(newProp);
            grid[i] = {
              ...grid[i],
              ownerId: tycoon.id,
              ownerName: tycoon.name,
              businessName: newName,
              businessType: newProp.type,
              businessMode: newProp.mode,
              level: Math.max(1, grid[i].level),
              occupancy: 60,
            };

            tycoon.lastActionText = `${tycoon.name} acquired commercial block (${tile.x}, ${tile.y}) for $${cost.toLocaleString()}.`;
            tycoon.lastActionDate = date;
            acquired = true;

            if (Math.random() < 0.35) {
              newState.notifications.unshift({
                id: `prop_acq_${tycoon.id}_${date}`,
                title: '🏢 Commercial Real Estate Acquisition',
                message: `${tycoon.name} (${tycoon.companyName}) purchased property at (${tile.x}, ${tile.y}) for $${cost.toLocaleString()} to expand business footprint.`,
                date,
                source: 'News',
                bias: 0,
              });
            }
            break;
          }
        }
      }

      // If no new property acquired, try upgrading an existing property
      if (!acquired && tycoon.properties.length > 0 && tycoon.cash > 25000) {
        const upgradeCandidate = tycoon.properties.find(p => p.level < 3);
        if (upgradeCandidate) {
          const upgradeCost = upgradeCandidate.level === 1 ? 12000 : 20000;
          if (tycoon.cash >= upgradeCost) {
            tycoon.cash -= upgradeCost;
            upgradeCandidate.level += 1;
            const tileIdx = upgradeCandidate.tileIndex;
            if (grid[tileIdx]) {
              grid[tileIdx] = {
                ...grid[tileIdx],
                level: upgradeCandidate.level,
                occupancy: Math.min(100, (grid[tileIdx].occupancy || 50) + 25),
              };
            }
            tycoon.lastActionText = `${tycoon.name} upgraded "${upgradeCandidate.name}" to Tier ${upgradeCandidate.level}.`;
            tycoon.lastActionDate = date;
          }
        }
      }
    }

    // -------------------------------------------------------------------------
    // 3. BRIBES TO THE MAYOR (From Corrupt Businessman to Mayor)
    // "and the mayor should receive any bribes to the mayor"
    // -------------------------------------------------------------------------
    if (tycoon.alignment === 'CORRUPT' && date % 72 === 0 && tycoon.cash >= 20000) {
      const bribeAmount = Math.floor(4500 + Math.random() * 4000); // $4,500 - $8,500
      tycoon.cash -= bribeAmount;
      tycoon.totalBribesPaidToMayor += bribeAmount;
      tycoon.lastBribeDate = date;
      tycoon.lastBribeAmount = bribeAmount;

      const bribeReasons = [
        'zoning variance clearance on industrial smoke limits',
        'looking the other way regarding chemical runoff near the harbor',
        'expedited commercial licensing with zero environmental review',
        'discreet slush fund deposit to ensure police labor neutrality',
        'confidential handshake kickback for city procurement priority',
      ];
      const selectedReason = bribeReasons[Math.floor(Math.random() * bribeReasons.length)];

      // The Mayor receives the bribe!
      newState.money += bribeAmount;
      newState.totalBribesReceivedAsMayor = (newState.totalBribesReceivedAsMayor || 0) + bribeAmount;

      if (isPlayerMayor) {
        // Taking bribes increases city/mayor corruption
        newState.corruption = Math.min(100, newState.corruption + 2.5);
        tycoon.lastActionText = `Silas Cross slipped $${bribeAmount.toLocaleString()} to Mayor's desk for ${selectedReason}.`;

        newState.notifications.unshift({
          id: `bribe_recv_${date}`,
          title: '💰 Bribe Received from Silas Cross',
          message: `Silas Cross (${tycoon.companyName}) discreetly delivered $${bribeAmount.toLocaleString()} to your executive office for ${selectedReason}. Funds added to municipal treasury!`,
          date,
          source: 'Intel',
          bias: 15,
        });
      } else if (newState.computerMayor) {
        newState.computerMayor.treasury += bribeAmount;
        newState.corruption = Math.min(100, newState.corruption + 3);
        tycoon.lastActionText = `Silas Cross delivered $${bribeAmount.toLocaleString()} in machine slush to Mayor ${newState.computerMayor.name}.`;
      }
    }

    // -------------------------------------------------------------------------
    // 4. ALIGNMENT MATCHING & MAYOR REPLACEMENT / OUSTER LOGIC
    // "The computer business man will make no attempt to replace the mayor directly if they are both good or both corrupt. Otherwise the businessman will try the honest or the corrupt way to remove the mayor"
    // -------------------------------------------------------------------------
    const isBothGood = tycoon.alignment === 'HONEST' && isMayorGood;
    const isBothCorrupt = tycoon.alignment === 'CORRUPT' && isMayorCorrupt;

    if (isBothGood || isBothCorrupt) {
      // "make no attempt to replace the mayor directly if they are both good or both corrupt."
      tycoon.isAttemptingOuster = false;
      tycoon.ousterMethod = 'NONE';
      tycoon.effectiveOdds = 0;

      if (isBothGood) {
        tycoon.lastActionText = `Croft Clean Industries commends City Hall for ethical leadership. Zero political opposition.`;
      } else {
        tycoon.lastActionText = `Silas Cross toasts City Hall: "Boss in office, Syndicate in business." Harmonious machine alliance.`;
      }
    } else {
      // "Otherwise the businessman will try the honest or the corrupt way to remove the mayor"
      tycoon.isAttemptingOuster = true;

      // -----------------------------------------------------------------------
      // A. HONEST BUSINESSMAN (Julian Croft) trying to remove CORRUPT MAYOR:
      // Honest way: $200k qualifying, then running ads, community projects, campaign speeches (5 each, max 50% odds)
      // -----------------------------------------------------------------------
      if (tycoon.alignment === 'HONEST') {
        tycoon.ousterMethod = 'HONEST';

        // Phase 1: Qualify for Ballot ($200,000 threshold)
        if (!tycoon.isQualified) {
          const pledge = Math.min(tycoon.cash * 0.2, 12000);
          if (tycoon.cash >= pledge && pledge > 0) {
            tycoon.cash -= pledge;
            tycoon.qualifyingFunds = Math.min(200000, tycoon.qualifyingFunds + pledge);
            if (tycoon.qualifyingFunds >= 200000) {
              tycoon.isQualified = true;
              newState.notifications.unshift({
                id: `honest_ballot_qual_${date}`,
                title: '🗳️ Clean Governance Initiative Qualified!',
                message: `Julian Croft and the Citizens for Honest Governance secured the $200,000 ballot threshold to challenge the corrupt administration at the next 5-Year Election!`,
                date,
                source: 'News',
                bias: 0,
              });
            }
          }
        } 
        // Phase 2: Campaign Sub-set Actions (Running Ads, Community Projects, Speeches)
        else if (date % 36 === 0 && tycoon.cash >= 8000) {
          const cp = tycoon.campaignProgress;
          let funded = false;

          if (cp.runningAdsPayments < 5 && tycoon.cash >= 8000) {
            tycoon.cash -= 8000;
            cp.runningAdsPayments += 1;
            funded = true;
            tycoon.lastActionText = `Croft funded Anti-Corruption TV & Radio Ad Wave (${cp.runningAdsPayments}/5) exposing City Hall kickbacks.`;
            newState.notifications.unshift({
              id: `ads_funded_${date}`,
              title: '📺 Reform Campaign Ads Airing',
              message: `Julian Croft launched television advertisements detailing mayoral corruption and calling for reform at the upcoming election!`,
              date,
              source: 'News',
              bias: 0,
            });
          } else if (cp.communityProjectsPayments < 5 && tycoon.cash >= 9000) {
            tycoon.cash -= 9000;
            cp.communityProjectsPayments += 1;
            funded = true;
            tycoon.lastActionText = `Croft financed Public Community Centers & Free Clinics (${cp.communityProjectsPayments}/5) to rally voters.`;
            newState.notifications.unshift({
              id: `proj_funded_${date}`,
              title: '🌳 Croft Civic Project Funded',
              message: `Julian Croft unveiled a public park and community health center, winning civic accolades ahead of the 5-Year Election.`,
              date,
              source: 'News',
              bias: 0,
            });
          } else if (cp.campaignSpeechesPayments < 5 && tycoon.cash >= 7500) {
            tycoon.cash -= 7500;
            cp.campaignSpeechesPayments += 1;
            funded = true;
            tycoon.lastActionText = `Croft held a 5,000-Citizen Town Hall Speech (${cp.campaignSpeechesPayments}/5) demanding mayoral resignation.`;
            newState.notifications.unshift({
              id: `speech_held_${date}`,
              title: '🎤 Croft Town Hall Rally',
              message: `Julian Croft held a packed town hall rally demanding City Hall accountability and presenting the Clean Reform platform!`,
              date,
              source: 'News',
              bias: 0,
            });
          }

          if (funded) {
            // Good side: 3 actions x 5 payments = 15 payments = 50% max win odds
            const totalPayments = cp.runningAdsPayments + cp.communityProjectsPayments + cp.campaignSpeechesPayments;
            tycoon.effectiveOdds = Math.min(50, Math.round((totalPayments * (50 / 15)) * 10) / 10);
            tycoon.lastActionDate = date;
          }
        }
      }

      // -----------------------------------------------------------------------
      // B. CORRUPT BUSINESSMAN (Silas Cross) trying to remove HONEST MAYOR:
      // Corrupt way: $200k qualifying, then bribe police chief, plant bad stories, bribe poll workers (5 each, max 90% odds)
      // -----------------------------------------------------------------------
      else if (tycoon.alignment === 'CORRUPT') {
        tycoon.ousterMethod = 'CORRUPT';

        // Phase 1: Qualify PAC War Chest ($200,000 threshold)
        if (!tycoon.isQualified) {
          const pledge = Math.min(tycoon.cash * 0.25, 15000);
          if (tycoon.cash >= pledge && pledge > 0) {
            tycoon.cash -= pledge;
            tycoon.qualifyingFunds = Math.min(200000, tycoon.qualifyingFunds + pledge);
            if (tycoon.qualifyingFunds >= 200000) {
              tycoon.isQualified = true;
              newState.notifications.unshift({
                id: `corrupt_pac_qual_${date}`,
                title: '🗳️ Shadow Machine PAC Ballot Qualification',
                message: `Cross Harbor Syndicate established a $200,000 political machine PAC to run a syndicate candidate and oust the honest Mayor!`,
                date,
                source: 'Intel',
                bias: 35,
              });
            }
          }
        } 
        // Phase 2: Corrupt Sub-set Actions (Bribe Police Chief, Plant Bad Stories, Bribe Poll Workers)
        else if (date % 36 === 0 && tycoon.cash >= 10000) {
          const cp = tycoon.campaignProgress;
          let funded = false;

          if (cp.bribePoliceChiefPayments < 5 && tycoon.cash >= 10000) {
            tycoon.cash -= 10000;
            cp.bribePoliceChiefPayments += 1;
            funded = true;
            tycoon.lastActionText = `Silas Cross bribed Police Chief & Municipal Union bosses (${cp.bribePoliceChiefPayments}/5) to endorse challenger.`;
            newState.notifications.unshift({
              id: `bribe_chief_${date}`,
              title: '🚨 Police & Labor Leadership Co-opted',
              message: `Intel suggests Silas Cross delivered off-the-books payouts to sway municipal union heads and police brass against City Hall!`,
              date,
              source: 'Intel',
              bias: 20,
            });
          } else if (cp.plantBadStoriesPayments < 5 && tycoon.cash >= 9000) {
            tycoon.cash -= 9000;
            cp.plantBadStoriesPayments += 1;
            funded = true;
            tycoon.lastActionText = `Silas Cross planted fabricated scandal leaks in tabloid media (${cp.plantBadStoriesPayments}/5).`;
            newState.notifications.unshift({
              id: `smear_story_${date}`,
              title: '📰 Tabloid Smear Story Planted',
              message: `Sensationalist front-page headlines fabricated allegations against City Hall. Silas Cross's publicists orchestrated the smear!`,
              date,
              source: 'News',
              bias: 80,
            });
          } else if (cp.bribePollWorkersPayments < 5 && tycoon.cash >= 11000) {
            tycoon.cash -= 11000;
            cp.bribePollWorkersPayments += 1;
            funded = true;
            tycoon.lastActionText = `Silas Cross compromised precinct election captains & poll workers (${cp.bribePollWorkersPayments}/5).`;
            newState.notifications.unshift({
              id: `poll_bribes_${date}`,
              title: '🗳️ Election Precinct Workers Compromised',
              message: `Syndicate fixers reportedly bought off key precinct ballot inspectors to prepare fraudulent vote-rigging for the 5-Year Election!`,
              date,
              source: 'Intel',
              bias: 15,
            });
          }

          if (funded) {
            // Corrupt side: 3 actions x 5 payments = 15 payments = 90% max win odds (6% per payment)
            const totalPayments = cp.bribePoliceChiefPayments + cp.plantBadStoriesPayments + cp.bribePollWorkersPayments;
            tycoon.effectiveOdds = Math.min(90, Math.round((totalPayments * 6) * 10) / 10);
            tycoon.lastActionDate = date;
          }
        }
      }
    }

    return tycoon;
  });

  newState.computerBusinessmen = updatedTycoons;
  return newState;
};
