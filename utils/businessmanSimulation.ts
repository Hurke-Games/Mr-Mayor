import { GameState, BusinessmanState, ComputerMayorState, OwnedBusiness, TileType, Notification, Tile } from '../types';
import { GRID_SIZE, TOTAL_TILES, BUILD_COSTS } from '../constants';
import { getNeighbors, getIndex, hasAdjacentRoad } from './simulation';
import { createInitialStockMarket, simulateDailyStockMarket, calculateTotalPortfolioValue } from './stockMarket';

export const createInitialBusinessmanState = (): BusinessmanState => {
  // Residence placed at tile (45, 52) in the charming starter residential boulevard
  const homeTx = 45;
  const homeTy = 52;
  const ts = 480;

  return {
    alignment: 0, // Starts neutral: can build an honest or corrupt empire!
    homeTileIndex: homeTy * GRID_SIZE + homeTx,
    homePos: {
      x: homeTx * ts + ts / 2, // 21840 (aligned with estate front entrance)
      y: 51 * ts + ts / 2,     // 24720 (paved Magnolia Boulevard street roadway)
    },
    businesses: [],
    totalRevenueEarned: 0,
    donatedToRecall: 0,
    donatedToMayor: 0,
    subsidiesCollected: 0,
    portfolioStocks: [],
    stockMarket: createInitialStockMarket(),
    totalStockValue: 0,
    totalStockProfitsRealized: 0,
  };
};

export const createInitialComputerMayor = (): ComputerMayorState => {
  // Starts with a notorious Machine Boss Mayor: Mayor Thaddeus Sterling
  return {
    name: "Mayor Thaddeus 'Boss' Sterling",
    alignment: 'CORRUPT',
    portrait: 'MACHINE_BOSS_MALE',
    approval: 52,
    subsidyMeter: 40, // 40% starting subsidy meter
    relationWithPlayer: 10, // Slightly cordial to begin
    lastActionText: 'Mayor Sterling signed executive zoning orders and met with commercial party organizers in private City Hall chambers.',
    lastActionDate: 0,
    totalRecallFundsAgainst: 0,
    actionsTakenCount: 1,
    treasury: 65000,
    currentProject: 'Expanding South & East Smokestack Industrial Corridor',
    urbanFocus: 'Heavy Industry, Commercial Monopolies & Machine Slush',
    civicProjectsBuilt: 0,
  };
};

/**
 * Autonomous simulation of the Computer Mayor and the Businessman's corporate empire
 */
export const simulateBusinessmanAndComputerMayor = (state: GameState): GameState => {
  let newState = { ...state };

  if (!newState.businessman) {
    newState.businessman = createInitialBusinessmanState();
  }
  if (!newState.computerMayor) {
    newState.computerMayor = createInitialComputerMayor();
  }

  const businessman = { ...newState.businessman };
  const mayor = { ...newState.computerMayor };
  const date = newState.date;

  // Ensure municipal treasury is initialized
  if (typeof mayor.treasury !== 'number' || isNaN(mayor.treasury)) {
    mayor.treasury = mayor.alignment === 'HONEST' ? 70000 : 85000;
  }

  // ---------------------------------------------------------------------------
  // 1. BUSINESSMAN EMPIRE DAILY ACCOUNTING & MUNICIPAL TAX INFLOW (Every 24 ticks = 1 Day)
  // ---------------------------------------------------------------------------
  if (date % 24 === 0) {
    // A. Business Profits
    if (businessman.businesses.length > 0) {
      let dailyNetProfit = 0;
      const updatedBusinesses = businessman.businesses.map(biz => {
        const b = { ...biz };

        // Handle raid cooldown
        if (b.isRaided) {
          b.raidTimer = Math.max(0, (b.raidTimer || 24) - 24);
          if (b.raidTimer <= 0) {
            b.isRaided = false;
          }
          return b;
        }

        // Base daily revenue according to level
        let baseRev = b.level === 1 ? 240 : b.level === 2 ? 650 : 1600;
        if (b.type === 'TECH' || b.type === 'HOTEL') baseRev *= 1.35;
        if (b.type === 'FACTORY') baseRev *= 1.25;

        // Operating Mode Multipliers
        if (b.mode === 'CORRUPT') {
          // Corrupt businesses make 2.4x raw cash flow through shadow accounting & deregulation
          baseRev = Math.round(baseRev * 2.4);
          newState.corruption = Math.min(100, newState.corruption + 0.15);
          businessman.alignment = Math.max(-100, businessman.alignment - 0.4);

          // Dark subsidies from a Corrupt Mayor
          if (mayor.alignment === 'CORRUPT' && mayor.subsidyMeter > 0) {
            const darkSlushBonus = Math.round(baseRev * (mayor.subsidyMeter / 100) * 0.35);
            baseRev += darkSlushBonus;
            businessman.subsidiesCollected += darkSlushBonus;
          }
        } else {
          // Honest businesses generate clean profit and boost public morale
          newState.cityMorale = Math.min(100, (newState.cityMorale || 70) + 0.2);
          businessman.alignment = Math.min(100, businessman.alignment + 0.35);

          // Clean Municipal Subsidies from an Honest Mayor
          if (mayor.alignment === 'HONEST' && mayor.subsidyMeter > 0) {
            const cleanSubsidyBonus = Math.round(baseRev * (mayor.subsidyMeter / 100) * 0.3);
            baseRev += cleanSubsidyBonus;
            businessman.subsidiesCollected += cleanSubsidyBonus;
          }
        }

        b.dailyRevenue = baseRev;
        dailyNetProfit += baseRev;
        return b;
      });

      businessman.businesses = updatedBusinesses;
      businessman.totalRevenueEarned += dailyNetProfit;
      newState.money += dailyNetProfit;
    }

    // B. City Hall Tax Collection & Treasury Maintenance
    const cityPop = Math.max(120, newState.population);
    const grossTaxes = Math.floor(cityPop * 22 * (newState.taxRate || 0.12));
    
    if (mayor.alignment === 'CORRUPT') {
      // Corrupt machine siphons 15% kickback into private slush funds
      const kickback = Math.floor(grossTaxes * 0.15);
      mayor.treasury += Math.max(500, grossTaxes - kickback);
      newState.corruption = Math.min(100, newState.corruption + 0.2);
    } else {
      // Honest mayor reinvests fully into public works
      mayor.treasury += Math.max(800, grossTaxes);
      newState.corruption = Math.max(0, newState.corruption - 0.15);
      newState.cityMorale = Math.min(100, (newState.cityMorale || 70) + 0.1);
    }

    // C. Daily Stock Market Evaluation & Dividend Distribution
    const stockResult = simulateDailyStockMarket(newState, businessman);
    businessman.stockMarket = stockResult.updatedMarket;
    businessman.portfolioStocks = stockResult.updatedHoldings;
    if (stockResult.dividendsPaid > 0) {
      newState.money += stockResult.dividendsPaid;
      businessman.totalRevenueEarned += stockResult.dividendsPaid;
    }
    if (stockResult.notifications.length > 0) {
      newState.notifications = [...stockResult.notifications, ...newState.notifications];
    }
    const valStats = calculateTotalPortfolioValue(businessman.portfolioStocks, businessman.stockMarket);
    businessman.totalStockValue = valStats.totalValue;
  }

  // ---------------------------------------------------------------------------
  // 2. MAYORAL POLICY HARMONIZATION (Every 72 ticks = 3 in-game days)
  // ---------------------------------------------------------------------------
  if (date % 72 === 0) {
    if (mayor.alignment === 'HONEST') {
      newState.taxRate = 0.11;
      newState.regulationLevel = Math.max(55, Math.min(75, (newState.regulationLevel || 50) + 2));
      newState.subsidyLevel = Math.max(30, Math.min(55, (newState.subsidyLevel || 30) + 1));
      mayor.urbanFocus = 'Garden City: Clean Air, Hospitals, Schools & Green Belt';
    } else {
      newState.taxRate = 0.14;
      newState.regulationLevel = Math.min(30, Math.max(12, (newState.regulationLevel || 50) - 2));
      newState.subsidyLevel = Math.min(85, Math.max(50, (newState.subsidyLevel || 30) + 2));
      mayor.urbanFocus = 'Smokestack Capitalism: Heavy Industry, Monopolies & Machine Slush';
    }
  }

  // ---------------------------------------------------------------------------
  // 3. COMPUTER MAYOR DIPLOMACY & LOBBYING INTERACTIONS (Every 36 ticks)
  // ---------------------------------------------------------------------------
  if (date % 36 === 0) {
    const honestCount = businessman.businesses.filter(b => b.mode === 'HONEST').length;
    const corruptCount = businessman.businesses.filter(b => b.mode === 'CORRUPT').length;
    const isPlayerLeaningHonest = businessman.alignment >= 0;

    const isAligned = (mayor.alignment === 'HONEST' && isPlayerLeaningHonest) ||
                      (mayor.alignment === 'CORRUPT' && !isPlayerLeaningHonest);

    if (isAligned) {
      mayor.relationWithPlayer = Math.min(100, mayor.relationWithPlayer + 3);
      mayor.subsidyMeter = Math.min(95, mayor.subsidyMeter + 3);

      if (date % 144 === 0) {
        if (mayor.alignment === 'HONEST') {
          const grantAmt = honestCount * 450 + 1200;
          mayor.lastActionText = `Mayor Vance awarded clean municipal enterprise grants to ethical local shops.`;
          newState.notifications.unshift({
            id: `mayor_clean_subs_${date}`,
            title: 'Municipal Enterprise Grant',
            message: `${mayor.name} commends your honest business leadership. Municipal subsidy meter increased to ${mayor.subsidyMeter}%!`,
            date,
            source: 'News',
            bias: 0,
          });
        } else {
          mayor.lastActionText = `Mayor Sterling channeled corporate discretionary slush funds to compliant syndicate allies.`;
          newState.notifications.unshift({
            id: `mayor_dark_subs_${date}`,
            title: 'City Hall Discretionary Slush',
            message: `${mayor.name}: 'A pleasure doing business. Discretionary subsidies increased to ${mayor.subsidyMeter}%. Enjoy the immunity.'`,
            date,
            source: 'Intel',
            bias: 20,
          });
        }
      }
    } else {
      mayor.relationWithPlayer = Math.max(-100, mayor.relationWithPlayer - 4);
      mayor.subsidyMeter = Math.max(0, mayor.subsidyMeter - 5);

      if (date % 120 === 0 && businessman.businesses.length > 0) {
        if (mayor.alignment === 'HONEST' && corruptCount > 0) {
          if (mayor.relationWithPlayer < -35 && Math.random() < 0.45) {
            const corruptBiz = businessman.businesses.find(b => b.mode === 'CORRUPT' && !b.isRaided);
            if (corruptBiz) {
              corruptBiz.isRaided = true;
              corruptBiz.raidTimer = 72;
              mayor.lastActionText = `Mayor Vance ordered Police Precinct 1 to shutter ${corruptBiz.name} for sweatshop & illicit operations!`;
              newState.notifications.unshift({
                id: `police_raid_${date}`,
                title: '🚨 POLICE RAID: Business Shut Down!',
                message: `${mayor.name} and municipal inspectors raided "${corruptBiz.name}" for illicit shadow operations! Revenue frozen for 3 days.`,
                date,
                source: 'System',
                bias: 0,
              });
            }
          } else {
            const fine = Math.min(newState.money, 3500);
            newState.money = Math.max(0, newState.money - fine);
            mayor.lastActionText = `Mayor Vance's labor board fined your operations $${fine.toLocaleString()} for non-compliance.`;
            newState.notifications.unshift({
              id: `labor_fine_${date}`,
              title: 'City Hall Fine: Labor Violation',
              message: `${mayor.name}'s task force issued a $${fine.toLocaleString()} municipal penalty for hazardous shadow working conditions!`,
              date,
              source: 'System',
              bias: 0,
            });
          }
        } else if (mayor.alignment === 'CORRUPT' && honestCount > 0) {
          const shakedown = Math.min(newState.money, 2800);
          newState.money = Math.max(0, newState.money - shakedown);
          mayor.lastActionText = `Mayor Sterling imposed an arbitrary $${shakedown.toLocaleString()} Commercial Compliance Surcharge on your stores.`;
          newState.notifications.unshift({
            id: `corrupt_shakedown_${date}`,
            title: 'City Hall Shakedown: Compliance Fee',
            message: `${mayor.name}'s political machine slapped your honest stores with $${shakedown.toLocaleString()} in arbitrary permit surcharges!`,
            date,
            source: 'Intel',
            bias: 40,
          });
        }
      }
    }

    mayor.lastActionDate = date;
    mayor.actionsTakenCount += 1;
  }

  // ---------------------------------------------------------------------------
  // 4. AUTONOMOUS CITY BUILDING & URBAN GROWTH (Every 8 in-game ticks)
  // ---------------------------------------------------------------------------
  if (date % 8 === 0) {
    executeComputerMayorUrbanDevelopment(newState, mayor, businessman);
  }

  newState.businessman = businessman;
  newState.computerMayor = mayor;
  return newState;
};

/**
 * Diagnostic metrics to evaluate the city's state and planning needs
 */
interface CityNeedsAssessment {
  developedCount: number;
  resCount: number;
  comCount: number;
  indCount: number;
  unpoweredCount: number;
  powerPlantCount: number;
  hospitalCount: number;
  schoolCount: number;
  universityCount: number;
  policeCount: number;
  fireCount: number;
  parkCount: number;
  sickCount: number;
  avgPollution: number;
  candidateSlots: number[];
  roadEndpoints: { x: number; y: number; dir: 'N' | 'S' | 'E' | 'W' }[];
}

const analyzeCityNeeds = (grid: Tile[], businessman: BusinessmanState): CityNeedsAssessment => {
  let developedCount = 0;
  let resCount = 0;
  let comCount = 0;
  let indCount = 0;
  let unpoweredCount = 0;
  let powerPlantCount = 0;
  let hospitalCount = 0;
  let schoolCount = 0;
  let universityCount = 0;
  let policeCount = 0;
  let fireCount = 0;
  let parkCount = 0;
  let sickCount = 0;
  let totalPollution = 0;

  const playerBizTileIndices = new Set(businessman.businesses.map(b => b.tileIndex));

  for (let i = 0; i < TOTAL_TILES; i++) {
    const tile = grid[i];
    if (tile.type !== TileType.EMPTY) {
      developedCount++;
      totalPollution += (tile.pollution || 0);

      if (!tile.hasPower && tile.type !== TileType.ROAD) {
        unpoweredCount++;
      }

      if (tile.type === TileType.RESIDENTIAL && !tile.isMultiPart) {
        resCount += tile.isMerged3x3 ? 9 : 1;
        if ((tile.illnessRate || 0) > 15) sickCount++;
      } else if (tile.type === TileType.COMMERCIAL && !tile.isMultiPart) {
        comCount++;
      } else if (tile.type === TileType.INDUSTRIAL && !tile.isMultiPart) {
        indCount++;
      } else if (tile.type === TileType.POWER_PLANT && !tile.isMultiPart) {
        powerPlantCount++;
      } else if (tile.type === TileType.HOSPITAL && !tile.isMultiPart) {
        hospitalCount++;
      } else if (tile.type === TileType.SCHOOL && !tile.isMultiPart) {
        schoolCount++;
      } else if (tile.type === TileType.UNIVERSITY && !tile.isMultiPart) {
        universityCount++;
      } else if (tile.type === TileType.POLICE_STATION && !tile.isMultiPart) {
        policeCount++;
      } else if (tile.type === TileType.FIRE_STATION && !tile.isMultiPart) {
        fireCount++;
      } else if (tile.type === TileType.PARK || tile.type === TileType.STATUE) {
        parkCount++;
      }
    }
  }

  // Find empty parcels directly adjacent to existing roads (excluding player estate & reserved spots)
  const candidateSlots: number[] = [];
  const roadEndpoints: { x: number; y: number; dir: 'N' | 'S' | 'E' | 'W' }[] = [];

  // Scanned radius around city center (49, 49) expanding up to 28 tiles
  const centerX = 49;
  const centerY = 49;
  const maxSpan = 26;

  for (let dy = -maxSpan; dy <= maxSpan; dy++) {
    for (let dx = -maxSpan; dx <= maxSpan; dx++) {
      const x = centerX + dx;
      const y = centerY + dy;
      if (x < 3 || x > GRID_SIZE - 4 || y < 3 || y > GRID_SIZE - 4) continue;

      const idx = getIndex(x, y);
      if (idx === -1) continue;

      // Never touch Vance Estate (45, 52) or City Hall (48..50, 48..50) or player business tiles
      if ((x === 45 && y === 52) || (x >= 48 && x <= 50 && y >= 48 && y <= 50) || playerBizTileIndices.has(idx)) {
        continue;
      }

      const tile = grid[idx];
      if (tile.type === TileType.EMPTY) {
        if (hasAdjacentRoad(grid, idx)) {
          candidateSlots.push(idx);
        }
      } else if (tile.type === TileType.ROAD) {
        // Check if road has empty space to continue
        const nN = getIndex(x, y - 1);
        const nS = getIndex(x, y + 1);
        const nE = getIndex(x + 1, y);
        const nW = getIndex(x - 1, y);
        if (nN !== -1 && grid[nN].type === TileType.EMPTY) roadEndpoints.push({ x, y, dir: 'N' });
        if (nS !== -1 && grid[nS].type === TileType.EMPTY) roadEndpoints.push({ x, y, dir: 'S' });
        if (nE !== -1 && grid[nE].type === TileType.EMPTY) roadEndpoints.push({ x, y, dir: 'E' });
        if (nW !== -1 && grid[nW].type === TileType.EMPTY) roadEndpoints.push({ x, y, dir: 'W' });
      }
    }
  }

  const avgPollution = developedCount > 0 ? Math.round(totalPollution / developedCount) : 0;

  return {
    developedCount,
    resCount,
    comCount,
    indCount,
    unpoweredCount,
    powerPlantCount,
    hospitalCount,
    schoolCount,
    universityCount,
    policeCount,
    fireCount,
    parkCount,
    sickCount,
    avgPollution,
    candidateSlots,
    roadEndpoints,
  };
};

/**
 * Autonomous city growth and civic construction engine executed by the Computer Mayor
 */
export const executeComputerMayorUrbanDevelopment = (
  state: GameState,
  mayor: ComputerMayorState,
  businessman: BusinessmanState
): void => {
  const grid = state.grid;
  const assessment = analyzeCityNeeds(grid, businessman);
  const isHonest = mayor.alignment === 'HONEST';
  const treasury = mayor.treasury || 50000;

  // ---------------------------------------------------------------------------
  // 1. UTILITY EMERGENCIES: POWER GRID EXPANSION (2x2 Power Plant)
  // ---------------------------------------------------------------------------
  // If developed buildings are dark and unpowered, or existing capacity is saturated:
  if ((assessment.unpoweredCount >= 3 || assessment.powerPlantCount === 0) && treasury >= 3500) {
    const spot = find2x2Site(grid, businessman, isHonest ? 'BUFFERED' : 'ANY');
    if (spot !== -1) {
      buildMultiTile(grid, spot, TileType.POWER_PLANT, 2, 2);
      mayor.treasury -= BUILD_COSTS[TileType.POWER_PLANT] || 3000;
      mayor.civicProjectsBuilt = (mayor.civicProjectsBuilt || 0) + 1;
      
      const px = spot % GRID_SIZE;
      const py = Math.floor(spot / GRID_SIZE);
      const projName = isHonest 
        ? `Clean Municipal Grid Substation at (${px}, ${py})` 
        : `Heavy Coal Turbines Plant at (${px}, ${py})`;

      mayor.currentProject = projName;
      mayor.lastActionText = `Mayor ${isHonest ? 'Vance' : 'Sterling'} commissioned a 2x2 Municipal Power Plant to illuminate city neighborhoods.`;

      state.notifications.unshift({
        id: `mayor_power_${state.date}`,
        title: '⚡ MUNICIPAL POWER EXPANSION',
        message: `${mayor.name} commissioned a new 2x2 Municipal Power Plant at (${px}, ${py}). Electricity restored to expanding districts!`,
        date: state.date,
        source: 'News',
        bias: 0,
      });
      return;
    }
  }

  // ---------------------------------------------------------------------------
  // 2. CIVIC HEALTHCARE & PUBLIC WELFARE (2x2 City Hospital)
  // ---------------------------------------------------------------------------
  // Honest Mayor prioritizes public health when sickness strikes or population grows:
  if (isHonest && (assessment.sickCount > 0 || assessment.avgPollution > 30 || (state.population > 350 && assessment.hospitalCount === 0))) {
    if (treasury >= 2500) {
      const spot = find2x2Site(grid, businessman, 'RESIDENTIAL_PROXIMITY');
      if (spot !== -1) {
        buildMultiTile(grid, spot, TileType.HOSPITAL, 2, 2);
        mayor.treasury -= BUILD_COSTS[TileType.HOSPITAL] || 1500;
        mayor.civicProjectsBuilt = (mayor.civicProjectsBuilt || 0) + 1;

        const hx = spot % GRID_SIZE;
        const hy = Math.floor(spot / GRID_SIZE);
        mayor.currentProject = `Erecting City General Hospital at (${hx}, ${hy})`;
        mayor.lastActionText = `Mayor Vance constructed a 2x2 City General Hospital to treat smog illness and protect citizen lives.`;

        state.notifications.unshift({
          id: `mayor_hospital_${state.date}`,
          title: '🏥 CITY GENERAL HOSPITAL OPENED',
          message: `${mayor.name} opened a comprehensive 2x2 Medical Center at (${hx}, ${hy}). Emergency healthcare coverage established!`,
          date: state.date,
          source: 'News',
          bias: 0,
        });
        return;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 3. HIGHER EDUCATION: COLLEGIATE UNIVERSITY (2x2)
  // ---------------------------------------------------------------------------
  if (isHonest && state.population > 750 && assessment.universityCount === 0 && treasury >= 5500) {
    const spot = find2x2Site(grid, businessman, 'RESIDENTIAL_PROXIMITY');
    if (spot !== -1) {
      buildMultiTile(grid, spot, TileType.UNIVERSITY, 2, 2);
      mayor.treasury -= BUILD_COSTS[TileType.UNIVERSITY] || 4500;
      mayor.civicProjectsBuilt = (mayor.civicProjectsBuilt || 0) + 1;

      const ux = spot % GRID_SIZE;
      const uy = Math.floor(spot / GRID_SIZE);
      mayor.currentProject = `Founding Veridia Metropolitan University at (${ux}, ${uy})`;
      mayor.lastActionText = `Mayor Vance chartered a Collegiate University campus to educate urban scholars.`;

      state.notifications.unshift({
        id: `mayor_univ_${state.date}`,
        title: '🎓 METROPOLITAN UNIVERSITY CHARTERED',
        message: `${mayor.name} chartered a grand 2x2 University campus at (${ux}, ${uy}), fueling technological progress and skyline arcologies!`,
        date: state.date,
        source: 'News',
        bias: 0,
      });
      return;
    }
  }

  // ---------------------------------------------------------------------------
  // 4. ESSENTIAL SERVICES (1x1 Police, Fire, Schools, Parks, Statues)
  // ---------------------------------------------------------------------------
  // A. Police Precincts (Fight crime)
  if (assessment.policeCount < Math.ceil(assessment.developedCount / 28) && treasury >= 1400) {
    const spot = find1x1Site(assessment.candidateSlots, grid);
    if (spot !== -1) {
      grid[spot] = { ...grid[spot], type: TileType.POLICE_STATION, level: 1, occupancy: 40, condition: 100 };
      mayor.treasury -= BUILD_COSTS[TileType.POLICE_STATION] || 1000;
      mayor.civicProjectsBuilt = (mayor.civicProjectsBuilt || 0) + 1;
      
      const px = spot % GRID_SIZE;
      const py = Math.floor(spot / GRID_SIZE);
      mayor.currentProject = `Commissioning Police Precinct at (${px}, ${py})`;
      mayor.lastActionText = `City Hall deployed a new Police Precinct to curb street crime and restore civic safety.`;
      return;
    }
  }

  // B. Fire Stations (Prevent decay)
  if (assessment.fireCount < Math.ceil(assessment.developedCount / 32) && treasury >= 1200) {
    const spot = find1x1Site(assessment.candidateSlots, grid);
    if (spot !== -1) {
      grid[spot] = { ...grid[spot], type: TileType.FIRE_STATION, level: 1, occupancy: 30, condition: 100 };
      mayor.treasury -= BUILD_COSTS[TileType.FIRE_STATION] || 800;
      mayor.civicProjectsBuilt = (mayor.civicProjectsBuilt || 0) + 1;

      const fx = spot % GRID_SIZE;
      const fy = Math.floor(spot / GRID_SIZE);
      mayor.currentProject = `Building Fire Station at (${fx}, ${fy})`;
      mayor.lastActionText = `City Hall constructed a Fire Station to protect structures from fire hazards.`;
      return;
    }
  }

  // C. Elementary Schools (Honest Mayor education focus)
  if (isHonest && assessment.schoolCount < Math.ceil(assessment.resCount / 14) && treasury >= 1600) {
    const spot = find1x1Site(assessment.candidateSlots, grid);
    if (spot !== -1) {
      grid[spot] = { ...grid[spot], type: TileType.SCHOOL, level: 1, occupancy: 120, condition: 100 };
      mayor.treasury -= BUILD_COSTS[TileType.SCHOOL] || 1200;
      mayor.civicProjectsBuilt = (mayor.civicProjectsBuilt || 0) + 1;

      const sx = spot % GRID_SIZE;
      const sy = Math.floor(spot / GRID_SIZE);
      mayor.currentProject = `Erecting Public School at (${sx}, ${sy})`;
      mayor.lastActionText = `Mayor Vance founded an Elementary School for neighborhood children.`;
      return;
    }
  }

  // D. Botanical Parks & Civic Statues (Honest Mayor: Air Cleaning & Morale)
  if (isHonest && (assessment.parkCount < Math.ceil(assessment.resCount / 4) || assessment.avgPollution > 22) && treasury >= 400) {
    const spot = find1x1Site(assessment.candidateSlots, grid);
    if (spot !== -1) {
      const isStatue = Math.random() < 0.25;
      const type = isStatue ? TileType.STATUE : TileType.PARK;
      grid[spot] = { ...grid[spot], type, level: 1, occupancy: 0, condition: 100 };
      mayor.treasury -= BUILD_COSTS[type] || 150;
      mayor.civicProjectsBuilt = (mayor.civicProjectsBuilt || 0) + 1;

      const pkx = spot % GRID_SIZE;
      const pky = Math.floor(spot / GRID_SIZE);
      mayor.currentProject = `Planting Botanical Gardens at (${pkx}, ${pky})`;
      mayor.lastActionText = `Mayor Vance dedicated lush Botanical Gardens to absorb urban smog and elevate morale.`;
      return;
    }
  }

  // ---------------------------------------------------------------------------
  // 5. ROAD NETWORK EXPANSION (Extending Avenues & Paving Cross-Streets)
  // ---------------------------------------------------------------------------
  // When available zoned frontage is running low (< 8 empty road-adjacent lots) or randomly to expand territory:
  if ((assessment.candidateSlots.length < 8 || Math.random() < 0.35) && treasury >= 500) {
    const pavedCount = paveRoadExtension(grid, assessment.roadEndpoints, mayor);
    if (pavedCount > 0) {
      mayor.treasury -= pavedCount * 50;
      mayor.civicProjectsBuilt = (mayor.civicProjectsBuilt || 0) + pavedCount;
      mayor.lastActionText = `Mayor ${isHonest ? 'Vance' : 'Sterling'} paved ${pavedCount} street parcels, extending the urban transit network.`;
      if (assessment.candidateSlots.length < 2) {
        return;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 6. STRATEGIC ZONING: RESIDENTIAL, COMMERCIAL, INDUSTRIAL (The 2:1:1 Golden Balance)
  // ---------------------------------------------------------------------------
  if (assessment.candidateSlots.length > 0 && treasury >= 300) {
    // Calculate current zoning balance ratio
    // Target: ~0.5 Commercial and ~0.5 Industrial per Residential parcel
    const res = Math.max(1, assessment.resCount);
    const targetCom = Math.max(1, Math.round(res * 0.5));
    const targetInd = Math.max(1, Math.round(res * 0.5));

    const comDeficit = targetCom - assessment.comCount;
    const indDeficit = targetInd - assessment.indCount;

    let selectedType: TileType = TileType.RESIDENTIAL;

    if (isHonest) {
      // Honest Mayor prioritizes Residential Garden communities, then balances with Commercial storefronts
      if (comDeficit > 0 && Math.random() < 0.55) {
        selectedType = TileType.COMMERCIAL;
      } else if (indDeficit > 0 && Math.random() < 0.3) {
        // Honest mayor limits industrial to what is strictly needed for jobs
        selectedType = TileType.INDUSTRIAL;
      } else {
        selectedType = TileType.RESIDENTIAL;
      }
    } else {
      // Corrupt Mayor is obsessed with Heavy Smokestack Industry and Commercial Monopolies!
      if (Math.random() < 0.5) {
        selectedType = TileType.INDUSTRIAL; // Machine factories & sweatshops
      } else if (Math.random() < 0.6) {
        selectedType = TileType.COMMERCIAL; // Lucrative corporate storefronts
      } else {
        selectedType = TileType.RESIDENTIAL; // Dense tenements
      }
    }

    // Zone 1 to 3 contiguous parcels for cohesive urban districts
    const zoneBatch = Math.min(3, assessment.candidateSlots.length);
    for (let b = 0; b < zoneBatch; b++) {
      const spot = assessment.candidateSlots[b];
      if (spot !== undefined && grid[spot] && grid[spot].type === TileType.EMPTY) {
        grid[spot] = {
          ...grid[spot],
          type: selectedType,
          level: 0, // Zones start at level 0 and naturally build up!
          occupancy: 0,
          condition: 100,
        };
        mayor.treasury -= BUILD_COSTS[selectedType] || 100;
        mayor.civicProjectsBuilt = (mayor.civicProjectsBuilt || 0) + 1;
      }
    }

    const typeLabel = selectedType === TileType.RESIDENTIAL ? 'Residential' : selectedType === TileType.COMMERCIAL ? 'Commercial' : 'Industrial';
    mayor.currentProject = `Zoning ${typeLabel} district expansion`;
    mayor.lastActionText = `Mayor ${isHonest ? 'Vance' : 'Sterling'} zoned new ${typeLabel} parcels along city transit corridors.`;
  }
};

/**
 * Paves 2 to 4 road tiles outward from road endpoints, creating connected urban blocks
 */
const paveRoadExtension = (
  grid: Tile[],
  endpoints: { x: number; y: number; dir: 'N' | 'S' | 'E' | 'W' }[],
  mayor: ComputerMayorState
): number => {
  if (endpoints.length === 0) return 0;

  // Pick a random road endpoint
  const ep = endpoints[Math.floor(Math.random() * endpoints.length)];
  let paved = 0;

  let curX = ep.x;
  let curY = ep.y;

  const dx = ep.dir === 'E' ? 1 : ep.dir === 'W' ? -1 : 0;
  const dy = ep.dir === 'S' ? 1 : ep.dir === 'N' ? -1 : 0;

  // Pave 2-3 tiles in this direction
  for (let step = 1; step <= 3; step++) {
    const nextX = curX + dx * step;
    const nextY = curY + dy * step;

    if (nextX < 4 || nextX > GRID_SIZE - 5 || nextY < 4 || nextY > GRID_SIZE - 5) break;

    // Never overwrite Vance Estate or City Hall
    if ((nextX === 45 && nextY === 52) || (nextX >= 48 && nextX <= 50 && nextY >= 48 && nextY <= 50)) {
      break;
    }

    const idx = getIndex(nextX, nextY);
    if (idx !== -1 && grid[idx].type === TileType.EMPTY) {
      grid[idx] = {
        ...grid[idx],
        type: TileType.ROAD,
        condition: 100,
      };
      paved++;
    } else {
      break;
    }
  }

  if (paved > 0) {
    const dirName = ep.dir === 'N' ? 'North' : ep.dir === 'S' ? 'South' : ep.dir === 'E' ? 'East' : 'West';
    mayor.currentProject = `Paving ${dirName} Avenue street grid extension`;
  }

  return paved;
};

/**
 * Finds a suitable 2x2 site for multi-tile municipal facilities
 */
const find2x2Site = (
  grid: Tile[],
  businessman: BusinessmanState,
  style: 'BUFFERED' | 'RESIDENTIAL_PROXIMITY' | 'ANY'
): number => {
  const playerBiz = new Set(businessman.businesses.map(b => b.tileIndex));
  const centerX = 49;
  const centerY = 49;
  const maxSpan = 22;

  const candidates: { idx: number; score: number }[] = [];

  for (let dy = -maxSpan; dy <= maxSpan; dy++) {
    for (let dx = -maxSpan; dx <= maxSpan; dx++) {
      const x = centerX + dx;
      const y = centerY + dy;
      if (x < 4 || x > GRID_SIZE - 6 || y < 4 || y > GRID_SIZE - 6) continue;

      const idx00 = getIndex(x, y);
      const idx10 = getIndex(x + 1, y);
      const idx01 = getIndex(x, y + 1);
      const idx11 = getIndex(x + 1, y + 1);

      if (idx00 === -1 || idx10 === -1 || idx01 === -1 || idx11 === -1) continue;

      // All 4 tiles must be empty
      if (
        grid[idx00].type !== TileType.EMPTY ||
        grid[idx10].type !== TileType.EMPTY ||
        grid[idx01].type !== TileType.EMPTY ||
        grid[idx11].type !== TileType.EMPTY
      ) {
        continue;
      }

      // Must not touch Vance Estate or City Hall or player businesses
      const tiles = [idx00, idx10, idx01, idx11];
      if (tiles.some(t => {
        const tx = t % GRID_SIZE;
        const ty = Math.floor(t / GRID_SIZE);
        return (tx === 45 && ty === 52) || (tx >= 48 && tx <= 50 && ty >= 48 && ty <= 50) || playerBiz.has(t);
      })) {
        continue;
      }

      // At least one tile of the 2x2 perimeter must be adjacent to a road
      const hasRoad = tiles.some(t => hasAdjacentRoad(grid, t));
      if (!hasRoad) continue;

      let score = Math.random() * 20;
      if (style === 'BUFFERED') {
        // Prefer outer ring to keep pollution away from homes
        score += Math.hypot(dx, dy);
      } else if (style === 'RESIDENTIAL_PROXIMITY') {
        // Prefer closer to downtown and residential wards for hospital/university access
        score -= Math.hypot(dx, dy);
      }

      candidates.push({ idx: idx00, score });
    }
  }

  if (candidates.length === 0) return -1;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].idx;
};

/**
 * Builds a 2x2 multi-tile municipal structure
 */
const buildMultiTile = (
  grid: Tile[],
  originIndex: number,
  type: TileType,
  w: number,
  h: number
): void => {
  const originX = originIndex % GRID_SIZE;
  const originY = Math.floor(originIndex / GRID_SIZE);

  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const idx = getIndex(originX + dx, originY + dy);
      if (idx !== -1) {
        grid[idx] = {
          ...grid[idx],
          type,
          level: 1,
          occupancy: type === TileType.POWER_PLANT ? 80 : type === TileType.HOSPITAL ? 150 : 250,
          condition: 100,
          masterIndex: originIndex,
          isMultiPart: !(dx === 0 && dy === 0),
          multiWidth: w,
          multiHeight: h,
          isMerged3x3: false,
        };
      }
    }
  }
};

/**
 * Picks an optimal single-tile site from candidate empty road-frontage slots
 */
const find1x1Site = (candidates: number[], grid: Tile[]): number => {
  if (candidates.length === 0) return -1;
  const chosenIdx = candidates[Math.floor(Math.random() * candidates.length)];
  return chosenIdx;
};

