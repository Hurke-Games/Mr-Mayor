import { GameState, TileType, Tile, GameAction, Faction, Notification } from '../types';
import { GRID_SIZE, TOTAL_TILES, TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR, TICKS_PER_ELECTION } from '../constants';
import { simulateBusinessmanAndComputerMayor } from './businessmanSimulation';
import { simulateComputerBusinessmen } from './computerBusinessmanSimulation';

// Spatial helpers
export const getCoords = (index: number): { x: number; y: number } => ({
  x: index % GRID_SIZE,
  y: Math.floor(index / GRID_SIZE),
});

export const getIndex = (x: number, y: number): number => {
  if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return -1;
  return y * GRID_SIZE + x;
};

// Direct 4-way neighbors
export const getNeighbors = (index: number): number[] => {
  const neighbors: number[] = [];
  const x = index % GRID_SIZE;
  const y = Math.floor(index / GRID_SIZE);

  if (x > 0) neighbors.push(index - 1);
  if (x < GRID_SIZE - 1) neighbors.push(index + 1);
  if (y > 0) neighbors.push(index - GRID_SIZE);
  if (y < GRID_SIZE - 1) neighbors.push(index + GRID_SIZE);

  return neighbors;
};

// Check if a tile has adjacent road
export const hasAdjacentRoad = (grid: Tile[], index: number): boolean => {
  const neighbors = getNeighbors(index);
  return neighbors.some(n => grid[n] && grid[n].type === TileType.ROAD);
};

export const getMaintenanceCost = (tile: Tile): number => {
  if (tile.isMultiPart) return 0; // Only master tile incurs maintenance

  switch (tile.type) {
    case TileType.ROAD: return 2;
    case TileType.POLICE_STATION: return 50;
    case TileType.FIRE_STATION: return 40;
    case TileType.HOSPITAL: return 75; // Medical staff & equipment
    case TileType.SCHOOL: return 45;
    case TileType.UNIVERSITY: return 120;
    case TileType.POWER_PLANT: return 100;
    case TileType.UNION_HALL: return 20;
    case TileType.RESIDENTIAL: 
      if (tile.isMerged3x3) {
        return (tile.mergedLevel || 1) * 25;
      }
      return tile.level * 4;
    case TileType.COMMERCIAL: return 0; // Private sector
    case TileType.INDUSTRIAL: return 0; // Private sector
    case TileType.LUXURY_ESTATE: return 15;
    case TileType.MAYORS_OFFICE: return 0; // Funded by general civic treasury
    case TileType.PARK: return 15; // Groundskeeping & landscaping
    case TileType.STATUE: return 20; // Monument preservation
    default: return 0;
  }
};

export const getCapacity = (tile: Tile): number => {
  // 3x3 Merged Residential Superblocks:
  // Base residential capacity = 150 max per parcel (9 parcels = 1,350 base)
  // Level 1: 2x bonus = 9 * 150 * 2 = 2,700
  // Level 2 (Bigger 3x3): 5x bonus = 9 * 150 * 5 = 6,750
  // Level 3 (Max Skyscraper Arcology): 10x bonus = 9 * 150 * 10 = 13,500
  if (tile.isMerged3x3) {
    const lvl = tile.mergedLevel || 1;
    if (lvl === 1) return 9 * 150 * 2; // 2,700
    if (lvl === 2) return 9 * 150 * 5; // 6,750
    return 9 * 150 * 10; // 13,500
  }

  switch (tile.type) {
    case TileType.PARK: return 100; // Visitors enjoying green space
    case TileType.STATUE: return 60; // Tourists & sightseers
    case TileType.HOSPITAL: return 350; // Doctors, nurses, emergency patients
    case TileType.RESIDENTIAL:
      if (tile.level === 0) return 0;
      if (tile.level === 1) return 35; // Starter bungalows
      if (tile.level === 2) return 80; // Medium-density townhouses
      return 150; // High-density apartment tower: 150 people max
    case TileType.COMMERCIAL:
      if (tile.level === 0) return 0;
      if (tile.level === 1) return 60;
      if (tile.level === 2) return 150;
      return 350;
    case TileType.INDUSTRIAL:
      if (tile.level === 0) return 0;
      if (tile.level === 1) return 80;
      if (tile.level === 2) return 200;
      return 450;
    case TileType.MAYORS_OFFICE:
      return 400; // Municipal executive staff
    case TileType.UNIVERSITY:
      return 1200; // Students & faculty
    case TileType.SCHOOL:
      return 350; // Students
    case TileType.POLICE_STATION:
      return 100; // Officers
    case TileType.FIRE_STATION:
      return 60; // Firefighters
    case TileType.POWER_PLANT:
      return 80; // Engineers
    default:
      return 0;
  }
};

/**
 * Initialize grid with the Mayor's Office placed DEAD CENTER as a 3x3 building,
 * surrounded by an executive plaza boulevard and starter civic infrastructure.
 */
export const initializeGrid = (): Tile[] => {
  const grid: Tile[] = new Array(TOTAL_TILES).fill(null).map((_, i) => ({
    x: i % GRID_SIZE,
    y: Math.floor(i / GRID_SIZE),
    type: TileType.EMPTY,
    level: 0,
    occupancy: 0,
    condition: 100,
    crimeRisk: 10,
    hasPower: false,
    education: 0,
    fireProtection: 0,
  }));

  // Dead center coordinates in 100x100 grid:
  // Center is at (48, 48) spanning 3x3 -> x: 48..50, y: 48..50
  const mayoralStartX = Math.floor(GRID_SIZE / 2) - 2; // 48
  const mayoralStartY = Math.floor(GRID_SIZE / 2) - 2; // 48
  const mayoralMasterIdx = getIndex(mayoralStartX, mayoralStartY);

  // 1. Place 3x3 Mayor's Office
  for (let dy = 0; dy < 3; dy++) {
    for (let dx = 0; dx < 3; dx++) {
      const x = mayoralStartX + dx;
      const y = mayoralStartY + dy;
      const idx = getIndex(x, y);
      if (idx !== -1) {
        grid[idx] = {
          ...grid[idx],
          type: TileType.MAYORS_OFFICE,
          level: 3,
          occupancy: 350,
          condition: 100,
          crimeRisk: 0,
          hasPower: true,
          masterIndex: mayoralMasterIdx,
          isMultiPart: !(dx === 0 && dy === 0),
          multiWidth: 3,
          multiHeight: 3,
        };
      }
    }
  }

  // 2. Surround Mayor's Office with a Grand Civic Boulevard Ring (47..51)
  for (let x = mayoralStartX - 1; x <= mayoralStartX + 3; x++) {
    for (let y = mayoralStartY - 1; y <= mayoralStartY + 3; y++) {
      // If outside the 3x3 interior, pave with road
      const isInsideOffice = (x >= mayoralStartX && x <= mayoralStartX + 2 && y >= mayoralStartY && y <= mayoralStartY + 2);
      if (!isInsideOffice) {
        const idx = getIndex(x, y);
        if (idx !== -1) {
          grid[idx].type = TileType.ROAD;
          grid[idx].condition = 100;
        }
      }
    }
  }

  // 3. Arterial avenues stretching North, South, East, West
  const midX = mayoralStartX + 1; // 49
  const midY = mayoralStartY + 1; // 49
  for (let dist = -15; dist <= 15; dist++) {
    const vIdx = getIndex(midX, midY + dist);
    if (vIdx !== -1 && grid[vIdx].type !== TileType.MAYORS_OFFICE) {
      grid[vIdx].type = TileType.ROAD;
    }
    const hIdx = getIndex(midX + dist, midY);
    if (hIdx !== -1 && grid[hIdx].type !== TileType.MAYORS_OFFICE) {
      grid[hIdx].type = TileType.ROAD;
    }
  }

  // Additional grid cross-streets for starter neighborhoods
  const northStreetY = midY - 6;
  const southStreetY = midY + 6;
  for (let x = midX - 8; x <= midX + 8; x++) {
    const nIdx = getIndex(x, northStreetY);
    const sIdx = getIndex(x, southStreetY);
    if (nIdx !== -1) grid[nIdx].type = TileType.ROAD;
    if (sIdx !== -1) grid[sIdx].type = TileType.ROAD;
  }

  // 4. Starter Municipal Power Plant (2x2) at (midX - 7, midY - 7)
  const ppX = midX - 7;
  const ppY = midY - 7;
  const ppMasterIdx = getIndex(ppX, ppY);
  for (let dy = 0; dy < 2; dy++) {
    for (let dx = 0; dx < 2; dx++) {
      const idx = getIndex(ppX + dx, ppY + dy);
      if (idx !== -1) {
        grid[idx] = {
          ...grid[idx],
          type: TileType.POWER_PLANT,
          level: 1,
          occupancy: 60,
          condition: 100,
          crimeRisk: 5,
          hasPower: true,
          masterIndex: ppMasterIdx,
          isMultiPart: !(dx === 0 && dy === 0),
          multiWidth: 2,
          multiHeight: 2,
        };
      }
    }
  }

  // 5. Starter Police Precinct & Fire Station
  const policeIdx = getIndex(midX - 3, midY - 5);
  if (policeIdx !== -1) {
    grid[policeIdx].type = TileType.POLICE_STATION;
    grid[policeIdx].level = 1;
    grid[policeIdx].occupancy = 40;
    grid[policeIdx].condition = 100;
  }

  const fireIdx = getIndex(midX + 3, midY - 5);
  if (fireIdx !== -1) {
    grid[fireIdx].type = TileType.FIRE_STATION;
    grid[fireIdx].level = 1;
    grid[fireIdx].occupancy = 30;
    grid[fireIdx].condition = 100;
  }

  // 6. Starter Elementary/High School
  const schoolIdx = getIndex(midX + 5, midY + 3);
  if (schoolIdx !== -1) {
    grid[schoolIdx].type = TileType.SCHOOL;
    grid[schoolIdx].level = 1;
    grid[schoolIdx].occupancy = 120;
    grid[schoolIdx].condition = 100;
  }

  // 7. West Residential & Magnolia Boulevard (Direct paved street connecting West neighborhood to City Hall)
  for (let x = midX - 7; x <= midX - 1; x++) {
    const roadIdx = getIndex(x, midY + 2); // y = 51, x = 42..48
    if (roadIdx !== -1) {
      grid[roadIdx].type = TileType.ROAD;
      grid[roadIdx].condition = 100;
    }
  }

  // Starter Residential Neighborhood (South of Magnolia Boulevard: dy = 3..4 -> y = 52..53)
  for (let dx = -6; dx <= -2; dx++) {
    for (let dy = 3; dy <= 5; dy++) {
      const x = midX + dx;
      const y = midY + dy;
      const idx = getIndex(x, y);
      if (idx !== -1 && grid[idx].type === TileType.EMPTY) {
        if (x === 45 && y === 52) {
          // Dedicated Vance Private Estate & Residence (facing Magnolia Blvd street)
          grid[idx].type = TileType.RESIDENTIAL;
          grid[idx].level = 2;
          grid[idx].occupancy = 12;
          grid[idx].condition = 100;
        } else {
          grid[idx].type = TileType.RESIDENTIAL;
          const isBuilt = Math.random() > 0.3;
          grid[idx].level = isBuilt ? 1 : 0;
          grid[idx].occupancy = isBuilt ? Math.floor(40 + Math.random() * 50) : 0;
          grid[idx].condition = 95;
        }
      }
    }
  }

  // 8. Starter Commercial Shops (East neighborhood along avenue)
  for (let dy = -4; dy <= -2; dy++) {
    for (let dx = 2; dx <= 4; dx++) {
      const idx = getIndex(midX + dx, midY + dy);
      if (idx !== -1 && grid[idx].type === TileType.EMPTY) {
        grid[idx].type = TileType.COMMERCIAL;
        const isBuilt = Math.random() > 0.4;
        grid[idx].level = isBuilt ? 1 : 0;
        grid[idx].occupancy = isBuilt ? 50 : 0;
        grid[idx].condition = 90;
      }
    }
  }

  // 9. Starter Industrial Workshop (Southeast)
  for (let dy = 3; dy <= 5; dy++) {
    for (let dx = 3; dx <= 5; dx++) {
      const idx = getIndex(midX + dx, midY + dy);
      if (idx !== -1 && grid[idx].type === TileType.EMPTY) {
        grid[idx].type = TileType.INDUSTRIAL;
        grid[idx].level = 1;
        grid[idx].occupancy = 70;
        grid[idx].condition = 85;
      }
    }
  }

  // 10. Starter Botanical Park & Civic Statue (improves morale and fights initial pollution)
  const parkIdx = getIndex(midX - 4, midY - 2);
  if (parkIdx !== -1) {
    grid[parkIdx].type = TileType.PARK;
    grid[parkIdx].level = 1;
    grid[parkIdx].occupancy = 60;
    grid[parkIdx].condition = 100;
  }

  const statueIdx = getIndex(midX + 2, midY + 2);
  if (statueIdx !== -1) {
    grid[statueIdx].type = TileType.STATUE;
    grid[statueIdx].level = 1;
    grid[statueIdx].occupancy = 40;
    grid[statueIdx].condition = 100;
  }

  // Run initial power & service scan
  updatePowerAndServices(grid);
  return grid;
};

/**
 * Propagate power from Power Plants and calculate police/fire/education coverages,
 * as well as industrial & power plant pollution, park/statue absorption, road traffic, and citizen health/morale.
 */
export const updatePowerAndServices = (grid: Tile[]) => {
  const powerPlants: { x: number; y: number }[] = [];
  const policeStations: { x: number; y: number }[] = [];
  const fireStations: { x: number; y: number }[] = [];
  const hospitals: { x: number; y: number }[] = [];
  const schools: { x: number; y: number }[] = [];
  const universities: { x: number; y: number }[] = [];
  const industrialEmitters: { x: number; y: number; level: number; occupancy: number }[] = [];
  const parks: { x: number; y: number }[] = [];
  const statues: { x: number; y: number }[] = [];

  // 1. Gather facilities and emitters
  for (let i = 0; i < TOTAL_TILES; i++) {
    const tile = grid[i];
    if (tile.type === TileType.POWER_PLANT && !tile.isMultiPart) {
      powerPlants.push({ x: tile.x, y: tile.y });
    } else if (tile.type === TileType.POLICE_STATION) {
      policeStations.push({ x: tile.x, y: tile.y });
    } else if (tile.type === TileType.FIRE_STATION) {
      fireStations.push({ x: tile.x, y: tile.y });
    } else if (tile.type === TileType.HOSPITAL && !tile.isMultiPart) {
      hospitals.push({ x: tile.x, y: tile.y });
    } else if (tile.type === TileType.SCHOOL) {
      schools.push({ x: tile.x, y: tile.y });
    } else if (tile.type === TileType.UNIVERSITY && !tile.isMultiPart) {
      universities.push({ x: tile.x, y: tile.y });
    } else if (tile.type === TileType.INDUSTRIAL && tile.level > 0) {
      industrialEmitters.push({ x: tile.x, y: tile.y, level: tile.level, occupancy: tile.occupancy });
    } else if (tile.type === TileType.PARK) {
      parks.push({ x: tile.x, y: tile.y });
    } else if (tile.type === TileType.STATUE) {
      statues.push({ x: tile.x, y: tile.y });
    }
  }

  // Balanced municipal service ranges
  const POWER_RADIUS = 32;
  const POLICE_RADIUS = 16;
  const FIRE_RADIUS = 16;
  const HOSPITAL_RADIUS = 20;
  const SCHOOL_RADIUS = 20;
  const UNIV_RADIUS = 32;
  const PARK_WALK_RADIUS = 8; // Direct walking proximity to botanical parks
  const STATUE_RADIUS = 6;    // Proximity to civic monuments

  // 2. Compute coverage, pollution, traffic & health for each tile
  for (let i = 0; i < TOTAL_TILES; i++) {
    const tile = grid[i];

    // --- A. POLLUTION DYNAMICS ---
    // Sources: Power Plants (heavy) and Industrial factories (medium-high)
    // Sinks: Botanical Parks (heavy scrubber) and Statues/Monuments (medium scrubber)
    let rawPollution = 0;

    // Power plant emissions: halved per mayoral decree (peak ~48, radius 16)
    for (const pp of powerPlants) {
      const dist = Math.hypot(tile.x - pp.x, tile.y - pp.y);
      if (dist <= 16) {
        rawPollution += 48 * (1 - dist / 16);
      }
    }

    // Industrial emissions: halved per mayoral decree (radius 7-11, peak 30/45/25)
    for (const ind of industrialEmitters) {
      const dist = Math.hypot(tile.x - ind.x, tile.y - ind.y);
      const rad = ind.level === 1 ? 7 : ind.level === 2 ? 11 : 8;
      const peak = ind.level === 1 ? 30 : ind.level === 2 ? 45 : 25;
      if (dist <= rad) {
        rawPollution += peak * (1 - dist / rad) * Math.max(0.4, ind.occupancy / 100);
      }
    }

    // Botanical Parks absorption: scrub up to 55 pollution within radius 8
    for (const pk of parks) {
      const dist = Math.hypot(tile.x - pk.x, tile.y - pk.y);
      if (dist <= 8) {
        rawPollution -= 55 * (1 - dist / 8);
      }
    }

    // Civic Statues absorption: scrub up to 35 pollution within radius 6
    for (const st of statues) {
      const dist = Math.hypot(tile.x - st.x, tile.y - st.y);
      if (dist <= 6) {
        rawPollution -= 35 * (1 - dist / 6);
      }
    }

    tile.pollution = Math.max(0, Math.min(100, Math.round(rawPollution)));

    // Empty tiles don't need detailed service metrics
    if (tile.type === TileType.EMPTY) {
      tile.traffic = 0;
      tile.morale = 50;
      tile.illnessRate = 0;
      tile.healthcare = 0;
      tile.hasParkAccess = false;
      continue;
    }

    // --- B. TRAFFIC CONGESTION DYNAMICS ---
    if (tile.type === TileType.ROAD) {
      let adjacentLoad = 0;
      const neighbors = getNeighbors(i);
      let roadNeighbors = 0;
      for (const n of neighbors) {
        const neighborTile = grid[n];
        if (neighborTile) {
          if (neighborTile.type === TileType.ROAD) {
            roadNeighbors++;
          } else if (neighborTile.occupancy > 0) {
            adjacentLoad += neighborTile.occupancy;
          }
        }
      }
      const densityTraffic = Math.min(70, Math.floor(adjacentLoad / 14));
      const intersectionBonus = roadNeighbors >= 3 ? 20 : roadNeighbors === 4 ? 30 : 0;
      tile.traffic = Math.max(10, Math.min(100, densityTraffic + intersectionBonus));
    } else {
      tile.traffic = 0;
    }

    // --- C. UTILITIES & SERVICES ---
    // Power check
    let hasPower = powerPlants.length === 0 ? false : false;
    for (const pp of powerPlants) {
      const dist = Math.hypot(tile.x - pp.x, tile.y - pp.y);
      if (dist <= POWER_RADIUS) {
        hasPower = true;
        break;
      }
    }
    tile.hasPower = hasPower;

    // Police coverage
    let minPoliceDist = 999;
    for (const p of policeStations) {
      const dist = Math.hypot(tile.x - p.x, tile.y - p.y);
      if (dist < minPoliceDist) minPoliceDist = dist;
    }
    const policeFactor = minPoliceDist <= POLICE_RADIUS ? Math.max(0, 100 - (minPoliceDist / POLICE_RADIUS) * 60) : 0;

    // Fire coverage
    let minFireDist = 999;
    for (const f of fireStations) {
      const dist = Math.hypot(tile.x - f.x, tile.y - f.y);
      if (dist < minFireDist) minFireDist = dist;
    }
    tile.fireProtection = minFireDist <= FIRE_RADIUS ? Math.max(0, 100 - (minFireDist / FIRE_RADIUS) * 60) : 0;

    // Healthcare & Hospital Coverage
    let minHospitalDist = 999;
    for (const h of hospitals) {
      const dist = Math.hypot(tile.x - h.x, tile.y - h.y);
      if (dist < minHospitalDist) minHospitalDist = dist;
    }
    tile.healthcare = minHospitalDist <= HOSPITAL_RADIUS ? Math.max(0, Math.round(100 - (minHospitalDist / HOSPITAL_RADIUS) * 60)) : 0;

    // Park & Recreation Proximity Access
    let minParkDist = 999;
    for (const pk of parks) {
      const d = Math.hypot(tile.x - pk.x, tile.y - pk.y);
      if (d < minParkDist) minParkDist = d;
    }
    let minStatueDist = 999;
    for (const st of statues) {
      const d = Math.hypot(tile.x - st.x, tile.y - st.y);
      if (d < minStatueDist) minStatueDist = d;
    }
    tile.hasParkAccess = minParkDist <= PARK_WALK_RADIUS || minStatueDist <= STATUE_RADIUS;

    // Education coverage
    let eduScore = 0;
    for (const s of schools) {
      const dist = Math.hypot(tile.x - s.x, tile.y - s.y);
      if (dist <= SCHOOL_RADIUS) {
        eduScore = Math.max(eduScore, 60 * (1 - dist / SCHOOL_RADIUS));
      }
    }
    for (const u of universities) {
      const dist = Math.hypot(tile.x - u.x, tile.y - u.y);
      if (dist <= UNIV_RADIUS) {
        eduScore = Math.max(eduScore, Math.min(100, eduScore + 50 * (1 - dist / UNIV_RADIUS)));
      }
    }
    tile.education = Math.round(eduScore);

    // Dynamic crime risk: Unpoliced neighborhoods face significant crime pressure
    const policeCoverageRatio = minPoliceDist <= POLICE_RADIUS ? Math.max(0, 1 - minPoliceDist / POLICE_RADIUS) : 0;
    const baseCrime = minPoliceDist <= POLICE_RADIUS ? Math.round(10 + (1 - policeCoverageRatio) * 15) : 55;
    const powerPenalty = tile.hasPower ? 0 : 25;
    tile.crimeRisk = Math.max(0, Math.min(100, baseCrime + powerPenalty));

    // --- D. MORALE & PUBLIC HEALTH (ILLNESS) ---
    if (tile.type === TileType.RESIDENTIAL) {
      let morale = 70;

      // Parks morale boost (+35 within walking radius 8)
      if (minParkDist <= PARK_WALK_RADIUS) {
        morale += Math.round(35 * (1 - minParkDist / PARK_WALK_RADIUS));
      } else {
        // Discontent for lack of walkable green space
        morale -= 8;
      }

      // Statue morale boost (+30 within radius 6)
      if (minStatueDist <= STATUE_RADIUS) {
        morale += Math.round(30 * (1 - minStatueDist / STATUE_RADIUS));
      }

      // Civic infrastructure bonuses
      if (tile.hasPower) morale += 8;
      if ((tile.education || 0) > 30) morale += 8;
      if (tile.crimeRisk < 20) morale += 8;
      if ((tile.healthcare || 0) > 25) morale += 10; // Peace of mind from nearby medical care
      else morale -= 8; // Anxiety over lack of emergency hospital

      // High pollution severely damages morale and causes illness!
      const poll = tile.pollution || 0;
      if (poll > 30) {
        morale -= Math.round((poll - 30) * 1.3);
      }

      // Illness threshold: If pollution > 50, citizens get ill!
      if (poll >= 50) {
        let baseIllness = Math.round((poll - 45) * 2.2);
        // Hospital treatment scrubs illness
        if ((tile.healthcare || 0) > 20) {
          baseIllness = Math.round(baseIllness * (1 - (tile.healthcare! / 100) * 0.75));
        }
        tile.illnessRate = Math.min(100, Math.max(0, baseIllness));
        // Severe untreated sickness causes population decay or flight
        if (tile.illnessRate > 50 && tile.occupancy > 15) {
          tile.occupancy = Math.max(5, tile.occupancy - 1);
        }
      } else {
        tile.illnessRate = 0;
      }

      tile.morale = Math.max(5, Math.min(100, morale));
    } else if (tile.type === TileType.PARK || tile.type === TileType.STATUE) {
      tile.morale = 100;
      tile.illnessRate = 0;
    }
  }
};

/**
 * Scan for eligible 3x3 residential areas and merge them into high-density superblocks.
 * Also upgrades existing 3x3 mega-complexes across 3 distinct development levels.
 */
export const checkAndMerge3x3Residential = (grid: Tile[], notifications: Notification[], date: number): void => {
  // Check random 3x3 coordinates to keep performance blazing
  const attempts = 40;
  for (let a = 0; a < attempts; a++) {
    const startX = Math.floor(Math.random() * (GRID_SIZE - 4)) + 1;
    const startY = Math.floor(Math.random() * (GRID_SIZE - 4)) + 1;
    const masterIdx = getIndex(startX, startY);
    const masterTile = grid[masterIdx];

    // Case 1: Check if already a merged 3x3 residential complex -> check upgrade
    if (masterTile.isMerged3x3 && !masterTile.isMultiPart) {
      const currentLevel = masterTile.mergedLevel || 1;
      // Upgrade Level 1 (2,700 cap) -> Level 2 (6,750 cap - 5x)
      if (currentLevel === 1 && masterTile.occupancy >= 2000 && masterTile.condition >= 75) {
        masterTile.mergedLevel = 2;
        notifications.unshift({
          id: `merge_lvl2_${date}_${masterIdx}`,
          title: 'Skyline Transformation',
          message: `Residential Superblock at (${startX}, ${startY}) has evolved into Twin High-Rise Towers (Level 2 - 6,750 capacity, 5x bonus)!`,
          date,
          source: 'News',
          bias: 0,
        });
      } 
      // Upgrade Level 2 (6,750 cap) -> Level 3 (13,500 cap - 10x Skyscraper Arcology)
      else if (currentLevel === 2 && masterTile.occupancy >= 5000 && masterTile.condition >= 85 && (masterTile.education || 0) > 40) {
        masterTile.mergedLevel = 3;
        notifications.unshift({
          id: `merge_lvl3_${date}_${masterIdx}`,
          title: 'Arcology Completed',
          message: `A magnificent Metropolis Arcology Skyscraper (Level 3 - 13,500 capacity, 10x bonus) has risen at (${startX}, ${startY})!`,
          date,
          source: 'News',
          bias: 0,
        });
      }
      continue;
    }

    // Case 2: Check if all 9 tiles in the 3x3 square are Residential and unmerged
    let allResidential = true;
    let totalOccupancy = 0;
    let avgLevel = 0;

    for (let dy = 0; dy < 3 && allResidential; dy++) {
      for (let dx = 0; dx < 3; dx++) {
        const idx = getIndex(startX + dx, startY + dy);
        const tile = grid[idx];
        if (!tile || tile.type !== TileType.RESIDENTIAL || tile.isMerged3x3 || tile.isMultiPart) {
          allResidential = false;
          break;
        }
        totalOccupancy += tile.occupancy;
        avgLevel += tile.level;
      }
    }

    avgLevel /= 9;

    // Merge condition: All 9 tiles are residential, with avg level >= 1 and healthy occupancy
    if (allResidential && (avgLevel >= 1 || totalOccupancy >= 250)) {
      // Merge into 3x3 Superblock
      for (let dy = 0; dy < 3; dy++) {
        for (let dx = 0; dx < 3; dx++) {
          const idx = getIndex(startX + dx, startY + dy);
          grid[idx] = {
            ...grid[idx],
            type: TileType.RESIDENTIAL,
            isMerged3x3: true,
            mergedLevel: 1, // Level 1: Garden Manor Quad
            level: 3,
            masterIndex: masterIdx,
            isMultiPart: !(dx === 0 && dy === 0),
            multiWidth: 3,
            multiHeight: 3,
            occupancy: dx === 0 && dy === 0 ? Math.max(500, totalOccupancy) : 0,
            condition: 100,
          };
        }
      }

      notifications.unshift({
        id: `merge_new_${date}_${masterIdx}`,
        title: 'Superblock Consolidation',
        message: `9 residential parcels have consolidated into a Garden Manor Quad Megacomplex at (${startX}, ${startY})!`,
        date,
        source: 'News',
        bias: 0,
      });
    }
  }
};

/**
 * Main simulation tick
 */
export const processTick = (state: GameState): GameState => {
  let newState: GameState = { 
    ...state, 
    grid: [...state.grid],
    factions: { ...state.factions },
    notifications: [...state.notifications],
  };

  // Run utility & service coverage every 6 ticks
  if (newState.date % 6 === 0) {
    updatePowerAndServices(newState.grid);
  }

  // Check 3x3 residential merges every 12 ticks
  if (newState.date % 12 === 0) {
    checkAndMerge3x3Residential(newState.grid, newState.notifications, newState.date);
  }

  // --- 1. DAILY CALCULATIONS (Economy, Taxes, Maintenance) ---
  if (newState.date % 24 === 0) {
    const regulationPenalty = 1 - (newState.regulationLevel / 250);
    const popIncome = newState.population * 12;
    const bizIncome = newState.population * 16;
    const grossGDP = (popIncome + bizIncome) * regulationPenalty;
    const dailyTaxRevenue = Math.floor(grossGDP * newState.taxRate);

    newState.money += dailyTaxRevenue;

    // Subsidies & Maintenance
    const dailySubsidyCost = Math.floor(newState.subsidyLevel * 40);
    let totalMaintenance = 0;

    for (let i = 0; i < TOTAL_TILES; i++) {
      if (newState.grid[i].type !== TileType.EMPTY) {
        totalMaintenance += getMaintenanceCost(newState.grid[i]);
      }
    }

    newState.money -= (totalMaintenance + dailySubsidyCost);

    // Demand shifts - rewards well-supported and balanced cities
    if (newState.taxRate <= 0.12) newState.housingDemand += 2;
    if (newState.taxRate > 0.16) newState.housingDemand -= 3;
    if (newState.taxRate < 0.08) newState.housingDemand += 3;
    if (newState.subsidyLevel > 35) newState.housingDemand += 3;
    if (newState.safety > 60) newState.housingDemand += 2;
    if (newState.safety < 45) newState.housingDemand -= 3;

    newState.housingDemand = Math.max(15, Math.min(100, newState.housingDemand));
  }

  // --- 2. ZONING & ECONOMIC BALANCE RATIOS ---
  // "We should need commercial and industrial at about half as many residential zones to support the populations needs for work, services and goods. A bad balance should slow growth."
  let resParcels = 0;
  let comParcels = 0;
  let indParcels = 0;

  for (let i = 0; i < TOTAL_TILES; i++) {
    const tile = newState.grid[i];
    if (tile.type === TileType.RESIDENTIAL && !tile.isMultiPart) {
      resParcels += tile.isMerged3x3 ? 9 : 1;
    } else if (tile.type === TileType.COMMERCIAL && !tile.isMultiPart) {
      comParcels += 1;
    } else if (tile.type === TileType.INDUSTRIAL && !tile.isMultiPart) {
      indParcels += 1;
    }
  }

  // Target: Commercial and Industrial should each be about half (~0.5x) the residential count
  const targetCommercial = Math.max(1, Math.round(resParcels * 0.5));
  const targetIndustrial = Math.max(1, Math.round(resParcels * 0.5));

  const commercialRatio = resParcels > 0 ? Math.min(2.0, comParcels / targetCommercial) : 1.0;
  const industrialRatio = resParcels > 0 ? Math.min(2.0, indParcels / targetIndustrial) : 1.0;

  // Combined balance factor: 0.15 (severe shortage of jobs/goods) up to 1.0 (balanced)
  const balanceFactor = Math.min(1.0, Math.min(commercialRatio, industrialRatio));
  const growthModifier = Math.max(0.15, balanceFactor);

  newState.commercialRatio = Math.round(commercialRatio * 100) / 100;
  newState.industrialRatio = Math.round(industrialRatio * 100) / 100;
  newState.economicBalance = Math.round(balanceFactor * 100);
  newState.growthRateModifier = Math.round(growthModifier * 100) / 100;

  // Periodic notification if balance is critically lagging
  if (newState.date % 48 === 0 && resParcels >= 4 && balanceFactor < 0.6) {
    newState.notifications.unshift({
      id: `imbalance_alert_${newState.date}`,
      title: 'Economic & Services Imbalance',
      message: `Commercial/Industrial support is below required 1:2 ratio (${Math.round(commercialRatio * 50)}% shops, ${Math.round(industrialRatio * 50)}% jobs). Population growth has slowed to ${Math.round(growthModifier * 100)}%! Zone more Commercial and Industrial parcels to restore full growth.`,
      date: newState.date,
      source: 'News',
      bias: 0,
    });
  }

  // --- 3. ZONE DEVELOPMENT (SimCity Level Progression: 0 -> 1 -> 2 -> 3) ---
  const samples = 140; // Increased sample rate for noticeable, responsive city evolution
  const baseGrowthChance = 0.55 + (newState.subsidyLevel / 150);

  for (let i = 0; i < samples; i++) {
    const idx = Math.floor(Math.random() * TOTAL_TILES);
    const tile = newState.grid[idx];

    if (tile.type === TileType.EMPTY || tile.type === TileType.ROAD || tile.isMultiPart) continue;

    const roadNearby = hasAdjacentRoad(newState.grid, idx);
    const powered = !!tile.hasPower;

    // A. 3x3 Merged Residential Growth
    // Levels: Lv1 (2,700), Lv2 (6,750), Lv3 (13,500)
    if (tile.isMerged3x3) {
      const cap = getCapacity(tile);
      if (tile.occupancy < cap && newState.housingDemand > 15) {
        const growthStep = Math.max(2, Math.floor((20 + (newState.housingDemand / 3)) * growthModifier));
        tile.occupancy = Math.min(cap, tile.occupancy + (powered ? growthStep : Math.floor(growthStep / 2)));
      }
      continue;
    }

    // B. Standard Residential Development (150 people max)
    if (tile.type === TileType.RESIDENTIAL) {
      // Level 0 (Zoned): Start building quickly if road nearby and demand is positive
      if (tile.level === 0) {
        if (roadNearby && newState.housingDemand > 15 && Math.random() < (baseGrowthChance * growthModifier)) {
          tile.level = 1; // Built first single-family house / cottage (cap 35)
          tile.occupancy = 15;
          tile.condition = 100;
        }
      } 
      // Level 1 (Cottage / Bungalow - cap 35): Grow occupancy, then upgrade to Townhouses
      else if (tile.level === 1) {
        const cap = getCapacity(tile); // 35
        if (tile.occupancy < cap && newState.housingDemand > 15) {
          tile.occupancy = Math.min(cap, tile.occupancy + Math.max(1, Math.round((powered ? 4 : 1) * growthModifier)));
        }
        // Upgrade Level 1 -> Level 2 (Brick Townhouses: cap 80)
        if (tile.occupancy >= 30 && tile.condition >= 50 && powered && Math.random() < (0.35 * growthModifier)) {
          tile.level = 2;
          tile.occupancy = 40;
        }
      } 
      // Level 2 (Townhouses / Brownstones - cap 80): Grow occupancy, then upgrade to Apartment Tower
      else if (tile.level === 2) {
        const cap = getCapacity(tile); // 80
        if (tile.occupancy < cap && newState.housingDemand > 25) {
          tile.occupancy = Math.min(cap, tile.occupancy + Math.max(1, Math.round((powered ? 6 : 2) * growthModifier)));
        }
        // Upgrade Level 2 -> Level 3 (Modern High-Rise Apartment: 150 people max)
        if (tile.occupancy >= 70 && tile.condition >= 65 && powered && tile.crimeRisk < 45 && Math.random() < (0.25 * growthModifier)) {
          tile.level = 3;
          tile.occupancy = 90;
        }
      } 
      // Level 3 (High-Rise Condo Tower - 150 max)
      else if (tile.level === 3) {
        const cap = getCapacity(tile); // 150 max
        if (tile.occupancy < cap && newState.housingDemand > 30) {
          tile.occupancy = Math.min(cap, tile.occupancy + Math.max(1, Math.round((powered ? 8 : 2) * growthModifier)));
        }
      }
    }

    // C. Commercial Zone Development
    if (tile.type === TileType.COMMERCIAL) {
      if (tile.level === 0 && roadNearby && Math.random() < 0.5) {
        tile.level = 1; // Local shop / diner
        tile.occupancy = 30;
      } else if (tile.level === 1 && tile.occupancy < 80) {
        tile.occupancy = Math.min(80, tile.occupancy + (powered ? 5 : 2));
        if (tile.occupancy >= 60 && powered && Math.random() < 0.3) {
          tile.level = 2; // Department store / commercial center
          tile.occupancy = 90;
        }
      } else if (tile.level === 2 && tile.occupancy < 220) {
        tile.occupancy = Math.min(220, tile.occupancy + (powered ? 8 : 3));
        if (tile.occupancy >= 160 && powered && Math.random() < 0.25) {
          tile.level = 3; // Corporate skyscraper
          tile.occupancy = 220;
        }
      } else if (tile.level === 3 && tile.occupancy < 550) {
        tile.occupancy = Math.min(550, tile.occupancy + (powered ? 12 : 4));
      }
    }

    // D. Industrial Zone Development
    if (tile.type === TileType.INDUSTRIAL) {
      if (tile.level === 0 && roadNearby && Math.random() < 0.5) {
        tile.level = 1; // Workshop / warehouse
        tile.occupancy = 40;
      } else if (tile.level === 1 && tile.occupancy < 120) {
        tile.occupancy = Math.min(120, tile.occupancy + (powered ? 6 : 2));
        if (tile.occupancy >= 85 && powered && Math.random() < 0.3) {
          tile.level = 2; // Factory with smokestacks
          tile.occupancy = 125;
        }
      } else if (tile.level === 2 && tile.occupancy < 300) {
        tile.occupancy = Math.min(300, tile.occupancy + (powered ? 10 : 3));
        if (tile.occupancy >= 220 && powered && (tile.education || 0) > 20 && Math.random() < 0.25) {
          tile.level = 3; // High-tech tech plant
          tile.occupancy = 280;
        }
      } else if (tile.level === 3 && tile.occupancy < 700) {
        tile.occupancy = Math.min(700, tile.occupancy + (powered ? 14 : 5));
      }
    }

    // Condition & Decay
    if (tile.condition > 0 && Math.random() > 0.92) {
      const protection = (tile.fireProtection || 0) / 100;
      tile.condition = Math.max(10, tile.condition - Math.floor(1 * (1 - protection * 0.7)));
    }
  }

  // --- 3. ACCURATE CITY POPULATION, POLLUTION & HEALTH COUNT ---
  let totalPop = 0;
  let totalPollution = 0;
  let totalIllness = 0;
  let totalMorale = 0;
  let developedTileCount = 0;
  let sickParcels = 0;

  for (let i = 0; i < TOTAL_TILES; i++) {
    const tile = newState.grid[i];
    if (tile.type !== TileType.EMPTY) {
      totalPollution += (tile.pollution || 0);
      developedTileCount++;
    }
    if (tile.type === TileType.RESIDENTIAL && !tile.isMultiPart) {
      totalPop += tile.occupancy;
      totalMorale += (tile.morale || 70);
      totalIllness += (tile.illnessRate || 0);
      if ((tile.illnessRate || 0) > 30) {
        sickParcels++;
      }
    }
  }

  newState.population = Math.max(120, totalPop);
  const avgPoll = developedTileCount > 0 ? Math.round(totalPollution / developedTileCount) : 0;
  newState.averagePollution = avgPoll;
  
  const resCount = Math.max(1, developedTileCount);
  const avgIllness = Math.round(totalIllness / Math.max(1, sickParcels > 0 ? sickParcels : 1));
  newState.averageHealth = Math.max(10, Math.min(100, 100 - avgIllness));
  newState.cityMorale = Math.max(10, Math.min(100, Math.round(totalMorale / Math.max(1, resCount > 0 ? (totalPop > 0 ? 1 : 1) : 1))));

  // Environmental & Health Advisory Notifications
  if (newState.date % 48 === 0) { // Every 2 days
    if (sickParcels > 0 && avgPoll > 40) {
      newState.notifications.unshift({
        id: `smog_health_alert_${newState.date}`,
        title: 'Toxic Smog & Health Emergency',
        message: `High pollution (${avgPoll} AQI) from industrial smokestacks and power plants is sickening residents! Plant Botanical Parks and Civic Statues to absorb the smog and elevate morale.`,
        date: newState.date,
        source: 'News',
        bias: 0,
      });
    } else if (avgPoll <= 25 && newState.date > 100) {
      // Occasional praise for clean air
      if (Math.random() < 0.2) {
        newState.notifications.unshift({
          id: `clean_air_${newState.date}`,
          title: 'Clean Skies & High Morale',
          message: 'Citizens enjoy fresh air and lush parkland. Public health is robust and citizen morale has reached peak satisfaction!',
          date: newState.date,
          source: 'News',
          bias: 0,
        });
      }
    }
  }

  // --- 4. FACTION BALANCE & CIVIC DRIFT ---
  const targetSafety = Math.min(100, Math.max(20, (100 - (newState.corruption / 2)) + (newState.regulationLevel / 4)));
  if (newState.safety < targetSafety) newState.safety += 0.2;
  else newState.safety -= 0.2;

  if (newState.regulationLevel < 30) newState.corruption += 0.04;
  if (newState.regulationLevel > 70) newState.corruption -= 0.04;
  newState.corruption = Math.max(0, Math.min(100, newState.corruption));

  // High pollution damages Gray Collective (citizens) and Union (working class health)
  if (avgPoll > 50) {
    newState.factions.gray.happiness -= 0.05;
    newState.factions.union.happiness -= 0.03;
  }

  // Factions
  if (newState.taxRate > 0.18) newState.factions.elite.happiness -= 0.02;
  if (newState.regulationLevel > 60) newState.factions.elite.happiness -= 0.02;
  else if (newState.regulationLevel < 35) newState.factions.elite.happiness += 0.02;

  if (newState.regulationLevel > 45) newState.factions.union.happiness += 0.02;
  if (newState.corruption > 40) newState.factions.union.happiness -= 0.04;

  if (newState.subsidyLevel > 45) newState.factions.gray.happiness += 0.02;

  Object.values(newState.factions).forEach(f => {
    f.happiness = Math.max(0, Math.min(100, f.happiness));
    f.influence = Math.max(0, Math.min(100, f.influence));
  });

  newState.date += 1;

  // --- 5. 5-YEAR GENERAL ELECTION SYSTEM ---
  if (!newState.nextElectionDate) {
    newState.nextElectionDate = TICKS_PER_ELECTION;
    newState.termNumber = 1;
  }

  // Trigger Election when election date arrives!
  if (newState.date >= newState.nextElectionDate) {
    // A. If player is playing as Businessman and has qualified on the ballot for Mayor:
    if (newState.role === 'CIVILIAN' && newState.civilianJob === 'Business Owner') {
      const biz = newState.businessman;
      const isQualified = biz && (biz.isBallotQualified || biz.donatedToRecall >= 200000);

      if (isQualified && biz) {
        const cp = biz.campaignProgress || {
          runningAdsPayments: 0,
          communityProjectsPayments: 0,
          campaignSpeechesPayments: 0,
          bribePoliceChiefPayments: 0,
          plantBadStoriesPayments: 0,
          bribePollWorkersPayments: 0,
        };

        const goodOdds = (cp.runningAdsPayments + cp.communityProjectsPayments + cp.campaignSpeechesPayments) * (50 / 15);
        const corruptOdds = (cp.bribePoliceChiefPayments + cp.plantBadStoriesPayments + cp.bribePollWorkersPayments) * 6;
        const effectiveOdds = Math.min(100, Math.max(goodOdds, corruptOdds));

        const roll = Math.random() * 100;
        const won = roll < effectiveOdds;

        if (won) {
          // Businessman wins election and becomes the Mayor at the 5th year!
          newState.role = 'MAYOR' as any;
          newState.civilianJob = 'Unemployed' as any;
          newState.activeView = 'OFFICE';
          newState.speed = 1;
          newState.termNumber = (newState.termNumber || 1) + 1;
          newState.nextElectionDate = newState.date + TICKS_PER_ELECTION;
          newState.showElectionModal = true;

          newState.lastElectionResult = {
            termNumber: newState.termNumber - 1,
            won: true,
            votePct: Math.max(51, Math.round(effectiveOdds)),
            opponentVotePct: 100 - Math.max(51, Math.round(effectiveOdds)),
            turnoutPct: 78,
            votesFor: Math.round(newState.population * 0.78 * (Math.max(51, effectiveOdds) / 100)),
            votesAgainst: Math.round(newState.population * 0.78 * ((100 - Math.max(51, effectiveOdds)) / 100)),
            date: newState.date,
            keyReason: `You achieved a historic campaign victory with ${Math.round(effectiveOdds)}% win probability! Your time as private businessman ends; you now assume office in City Hall as Mayor!`,
          };

          newState.notifications.unshift({
            id: `election_biz_win_${newState.date}`,
            title: '🎉 ELECTION VICTORY: You Are Sworn In as Mayor!',
            message: `Congratulations! Your mayoral campaign triumphed in the 5th-Year General Election. You now assume executive authority in City Hall as Mayor of New Veridia!`,
            date: newState.date,
            source: 'News',
            bias: 0,
          });
          return newState;
        } else {
          // Businessman lost the election, incumbent retains office
          newState.termNumber = (newState.termNumber || 1) + 1;
          newState.nextElectionDate = newState.date + TICKS_PER_ELECTION;

          newState.notifications.unshift({
            id: `election_biz_loss_${newState.date}`,
            title: '🗳️ 5th-Year Election Results: Challenger Defeat',
            message: `The 5th-Year Election concluded. Despite your campaign (${Math.round(effectiveOdds)}% odds), incumbent ${newState.computerMayor?.name || 'Mayor'} narrowly retained office. Your private enterprise empire remains intact for the next 5-year cycle!`,
            date: newState.date,
            source: 'News',
            bias: 0,
          });
        }
      } else {
        // Player didn't run for office; computer mayor general election cycle continues
        newState.termNumber = (newState.termNumber || 1) + 1;
        newState.nextElectionDate = newState.date + TICKS_PER_ELECTION;
        newState.notifications.unshift({
          id: `election_cm_${newState.date}`,
          title: `🗳️ 5th-Year General Election: ${newState.computerMayor?.name || 'Mayor'} Re-Elected`,
          message: `The 5-Year General Election concluded. ${newState.computerMayor?.name || 'The Mayor'} secured another 5-year term.`,
          date: newState.date,
          source: 'News',
          bias: 0,
        });
      }
    } 
    // B. Player is currently serving as Mayor:
    else {
      const grievances = calculateCityGrievances(newState);
      const turnoutPct = Math.round(68 + Math.random() * 18); // 68% - 86% voter turnout
      const pollingNoise = (Math.random() - 0.5) * 6;
      let votePct = Math.max(15, Math.min(96, Math.round(grievances.overallApprovalPct + pollingNoise)));
      let won = votePct >= 50;

      // Check for active Computer Businessman ouster efforts against the Mayor
      let ousterSuccessTycoon = null;
      if (newState.computerBusinessmen && newState.computerBusinessmen.length > 0) {
        for (const cb of newState.computerBusinessmen) {
          if (cb.isAttemptingOuster && cb.effectiveOdds > 0) {
            const roll = Math.random() * 100;
            if (roll < cb.effectiveOdds) {
              ousterSuccessTycoon = cb;
              won = false;
              votePct = Math.min(46, Math.max(22, 100 - Math.round(cb.effectiveOdds * 0.8 + 20)));
              break;
            }
          }
        }
      }

      const opponentVotePct = 100 - votePct;
      const totalVotes = Math.round(newState.population * (turnoutPct / 100));
      const votesFor = Math.round(totalVotes * (votePct / 100));
      const votesAgainst = totalVotes - votesFor;

      let keyReason = won 
        ? `Citizens certified your municipal leadership with ${votePct}% of the vote! Low discontent in ${grievances.topApproved}.`
        : `Voters rebuked City Hall over ${grievances.topGrievance}. Re-election secured only ${votePct}% of the vote!`;

      if (ousterSuccessTycoon) {
        if (ousterSuccessTycoon.ousterMethod === 'HONEST') {
          keyReason = `Julian Croft's Clean Governance Coalition successfully ousted your administration with ${ousterSuccessTycoon.effectiveOdds}% reform momentum! Anti-corruption ad campaigns and community civic projects swayed a decisive majority.`;
        } else {
          keyReason = `Silas Cross's Shadow Syndicate machine captured the election with ${ousterSuccessTycoon.effectiveOdds}% corrupt odds! Union boss buy-offs, media smears, and compromised precinct poll workers flipped the vote.`;
        }
      }

      newState.lastElectionResult = {
        termNumber: newState.termNumber || 1,
        won,
        votePct,
        opponentVotePct,
        turnoutPct,
        votesFor,
        votesAgainst,
        date: newState.date,
        keyReason,
      };

      newState.showElectionModal = true;
      newState.termNumber = (newState.termNumber || 1) + 1;
      newState.nextElectionDate = newState.date + TICKS_PER_ELECTION;

      // High-priority news broadcast
      newState.notifications.unshift({
        id: `election_${newState.date}`,
        title: won ? `🗳️ ELECTION VICTORY: Term ${newState.termNumber - 1} Certified!` : `🗳️ ELECTION CRISIS: Mayoral Re-Election Defeat!`,
        message: won
          ? `The Board of Elections certifies your victory with ${votePct}% of the vote against the coalition challenger (${turnoutPct}% turnout, ${votesFor.toLocaleString()} ballots). You have been sworn in for another 5-year mayoral term!`
          : `Election results: Challenger coalition secured ${opponentVotePct}% against your ${votePct}%. ${keyReason}`,
        date: newState.date,
        source: 'News',
        bias: 0,
      });
    }
  }

  // --- 5. BUSINESSMAN & COMPUTER MAYOR SIMULATION ---
  if (newState.role === 'CIVILIAN' && newState.civilianJob === 'Business Owner') {
    newState = simulateBusinessmanAndComputerMayor(newState);
  }

  // --- 6. COMPUTER BUSINESSMAN SIMULATION (Good & Corrupt Tycoons) ---
  newState = simulateComputerBusinessmen(newState);

  return newState;
};

export interface CityGrievanceReport {
  unhappyCrimePct: number;
  unhappyPollutionPct: number;
  unhappyTrafficPct: number;
  unhappyJobsPct: number;
  unhappyEducationPct: number;
  unhappyRecreationPct: number;
  unhappyHealthcarePct: number;
  unhappyPowerPct: number;
  unhappyFirePct: number;
  unhappyTaxesPct: number;
  overallApprovalPct: number;
  overallDiscontentPct: number;

  // Service Effective Coverage Stats (% of citizens covered within balanced service ranges)
  coverageParkWalkPct: number; // Within 8-tile walking proximity of a botanical park or 6-tile monument
  coveragePolicePct: number;   // Within 16-tile police patrol radius
  coverageFirePct: number;     // Within 16-tile fire engine radius
  coverageHospitalPct: number; // Within 20-tile hospital ambulance radius
  coverageSchoolPct: number;   // Within 20-tile school or 32-tile university radius
  coveragePowerPct: number;    // Within 32-tile power plant electrical radius

  totalResidents: number;
  totalJobs: number;
  workforce: number;
  jobsCoveragePct: number;

  // 5-Year General Election system
  termNumber: number;
  yearsUntilElection: number;
  monthsUntilElection: number;
  daysUntilElection: number;
  electionForecast: 'LANDSLIDE_WIN' | 'FAVORED' | 'TOSS_UP' | 'VULNERABLE' | 'DEFEAT';
  topGrievance: string;
  topApproved: string;
  chiefOfStaffAdvice: string;
}

/**
 * Computes exact citizen dissatisfaction percentages across all municipal sectors:
 * Crime, Pollution, Traffic, Jobs, Education, Access to Recreation, Healthcare, Power, Fire, and Taxes.
 */
export const calculateCityGrievances = (state: GameState): CityGrievanceReport => {
  let totalResidents = 0;
  let crimeUnhappyCount = 0;
  let pollutionUnhappyCount = 0;
  let trafficUnhappyCount = 0;
  let educationUnhappyCount = 0;
  let recreationUnhappyCount = 0;
  let healthcareUnhappyCount = 0;
  let powerUnhappyCount = 0;
  let fireUnhappyCount = 0;

  let parkCoveredCount = 0;
  let policeCoveredCount = 0;
  let fireCoveredCount = 0;
  let hospitalCoveredCount = 0;
  let schoolCoveredCount = 0;
  let powerCoveredCount = 0;

  for (let i = 0; i < TOTAL_TILES; i++) {
    const tile = state.grid[i];
    if (tile.type === TileType.RESIDENTIAL && !tile.isMultiPart && tile.occupancy > 0) {
      const pop = tile.occupancy;
      totalResidents += pop;

      // Service coverage counts
      if (tile.hasParkAccess) parkCoveredCount += pop;
      if (tile.crimeRisk <= 22) policeCoveredCount += pop;
      if ((tile.fireProtection || 0) >= 30) fireCoveredCount += pop;
      if ((tile.healthcare || 0) >= 25) hospitalCoveredCount += pop;
      if ((tile.education || 0) >= 30) schoolCoveredCount += pop;
      if (tile.hasPower) powerCoveredCount += pop;

      // Crime (% in unsafe sectors or outside police coverage)
      if (tile.crimeRisk > 22) {
        crimeUnhappyCount += pop;
      }

      // Pollution (% afflicted by industrial smog or toxic power emissions)
      if ((tile.pollution || 0) > 25) {
        pollutionUnhappyCount += pop;
      }

      // Traffic (% experiencing severe road congestion or dead-end unpaved lots)
      if (!hasAdjacentRoad(state.grid, i) || (tile.traffic || 0) > 42) {
        trafficUnhappyCount += pop;
      }

      // Education (% beyond reach of schools/universities)
      if ((tile.education || 0) < 30) {
        educationUnhappyCount += pop;
      }

      // Access to Recreation (% living beyond 8-tile walking distance to a botanical park or 6-tile monument)
      if (!tile.hasParkAccess) {
        recreationUnhappyCount += pop;
      }

      // Healthcare (% living beyond 20-tile hospital coverage or suffering from illness)
      if ((tile.healthcare || 0) < 25 || (tile.illnessRate || 0) > 10) {
        healthcareUnhappyCount += pop;
      }

      // Power (% living in dark, unpowered parcels or brownouts)
      if (!tile.hasPower) {
        powerUnhappyCount += pop;
      }

      // Fire protection (% outside 16-tile fire engine radius)
      if ((tile.fireProtection || 0) < 30) {
        fireUnhappyCount += pop;
      }
    }
  }

  const effectivePop = Math.max(1, totalResidents);

  const unhappyCrimePct = Math.round((crimeUnhappyCount / effectivePop) * 100);
  const unhappyPollutionPct = Math.round((pollutionUnhappyCount / effectivePop) * 100);
  const unhappyTrafficPct = Math.round((trafficUnhappyCount / effectivePop) * 100);
  const unhappyEducationPct = Math.round((educationUnhappyCount / effectivePop) * 100);
  const unhappyRecreationPct = Math.round((recreationUnhappyCount / effectivePop) * 100);
  const unhappyHealthcarePct = Math.round((healthcareUnhappyCount / effectivePop) * 100);
  const unhappyPowerPct = Math.round((powerUnhappyCount / effectivePop) * 100);
  const unhappyFirePct = Math.round((fireUnhappyCount / effectivePop) * 100);

  const coverageParkWalkPct = Math.round((parkCoveredCount / effectivePop) * 100);
  const coveragePolicePct = Math.round((policeCoveredCount / effectivePop) * 100);
  const coverageFirePct = Math.round((fireCoveredCount / effectivePop) * 100);
  const coverageHospitalPct = Math.round((hospitalCoveredCount / effectivePop) * 100);
  const coverageSchoolPct = Math.round((schoolCoveredCount / effectivePop) * 100);
  const coveragePowerPct = Math.round((powerCoveredCount / effectivePop) * 100);

  // Jobs: Commercial & Industrial capacity vs workforce (approx 60% of population)
  let totalJobs = 0;
  for (let i = 0; i < TOTAL_TILES; i++) {
    const tile = state.grid[i];
    if (tile.type === TileType.COMMERCIAL || tile.type === TileType.INDUSTRIAL) {
      totalJobs += tile.occupancy;
    }
  }
  const workforce = Math.max(1, Math.round(state.population * 0.60));
  let unhappyJobsPct = 6;
  if (totalJobs < workforce) {
    unhappyJobsPct = Math.min(95, Math.round(((workforce - totalJobs) / workforce) * 100));
  } else {
    unhappyJobsPct = Math.max(3, Math.round((1 - (workforce / totalJobs)) * 8));
  }
  const jobsCoveragePct = Math.min(100, Math.round((totalJobs / workforce) * 100));

  // Taxes
  let unhappyTaxesPct = 12;
  if (state.taxRate <= 0.08) unhappyTaxesPct = 5;
  else if (state.taxRate <= 0.12) unhappyTaxesPct = 15;
  else if (state.taxRate <= 0.16) unhappyTaxesPct = 38;
  else if (state.taxRate <= 0.22) unhappyTaxesPct = 65;
  else unhappyTaxesPct = 88;

  // Weighted overall disapproval
  const weightedDiscontent = (
    unhappyCrimePct * 0.15 +
    unhappyPollutionPct * 0.13 +
    unhappyJobsPct * 0.16 +
    unhappyHealthcarePct * 0.14 +
    unhappyRecreationPct * 0.10 +
    unhappyEducationPct * 0.10 +
    unhappyTrafficPct * 0.08 +
    unhappyPowerPct * 0.08 +
    unhappyFirePct * 0.06
  );

  const overallApprovalPct = Math.max(8, Math.min(98, Math.round(100 - weightedDiscontent)));
  const overallDiscontentPct = 100 - overallApprovalPct;

  // 5-Year Election countdown
  const nextElectionDate = state.nextElectionDate || (TICKS_PER_YEAR * 5);
  const remainingTicks = Math.max(0, nextElectionDate - state.date);
  const daysUntilElection = Math.floor(remainingTicks / TICKS_PER_DAY);
  const monthsUntilElection = Math.floor(remainingTicks / TICKS_PER_MONTH);
  const yearsUntilElection = parseFloat((remainingTicks / TICKS_PER_YEAR).toFixed(1));

  // Election forecast
  let electionForecast: CityGrievanceReport['electionForecast'] = 'FAVORED';
  if (overallApprovalPct >= 68) electionForecast = 'LANDSLIDE_WIN';
  else if (overallApprovalPct >= 55) electionForecast = 'FAVORED';
  else if (overallApprovalPct >= 47) electionForecast = 'TOSS_UP';
  else if (overallApprovalPct >= 38) electionForecast = 'VULNERABLE';
  else electionForecast = 'DEFEAT';

  // Identify top grievance and customized mayoral advice
  const grievances = [
    { name: 'Lack of Healthcare Access', pct: unhappyHealthcarePct, advice: 'Sir, our outer residential wards are outside General Hospital ambulance range (20 blocks). Build a General Hospital to treat sickness and secure voter confidence.' },
    { name: 'Lack of Recreation & Green Parks', pct: unhappyRecreationPct, advice: 'Citizens feel trapped in concrete blocks without green space. Our parks are too far away (need to be within 8 blocks of homes). Commission a Botanical Park to restore civic happiness.' },
    { name: 'Unemployment & Job Shortage', pct: unhappyJobsPct, advice: 'Job seekers are desperate. Zone more Commercial storefronts and Industrial workshops to absorb our expanding workforce.' },
    { name: 'Crime Risk & Public Safety', pct: unhappyCrimePct, advice: 'Residents are afraid in unpatrolled neighborhoods. Build a Police Precinct so patrol cruisers protect homes within 16 blocks.' },
    { name: 'Industrial Pollution & Smog', pct: unhappyPollutionPct, advice: 'Smokestack soot and power emissions are sickening families. Plant botanical parks near industrial zones to absorb the toxic air.' },
    { name: 'Lack of Electrical Power', pct: unhappyPowerPct, advice: 'Blackouts will destroy our re-election chances! Expand power plant capacity and wire all unpowered neighborhood blocks.' },
    { name: 'Education Deficit', pct: unhappyEducationPct, advice: 'Families want schools for their children. Construct elementary schools (20-block range) or an academic university campus.' },
    { name: 'Traffic Gridlock & Unpaved Corridors', pct: unhappyTrafficPct, advice: 'Commuters are stalled in gridlock. Pave road avenues and connect dead-end residential parcels to transit.' },
    { name: 'Municipal Tax Burden', pct: unhappyTaxesPct, advice: 'Citizens are grumbling about their tax bill. Lowering property tax rates toward 10% will win over voters quickly.' },
    { name: 'Fire Protection Deficit', pct: unhappyFirePct, advice: 'Fire hazards threaten aging buildings. Place a Fire Station within 16 blocks to protect neighborhoods.' },
  ].sort((a, b) => b.pct - a.pct);

  const topGrievance = grievances[0].name;
  const topApproved = grievances[grievances.length - 1].name;
  const chiefOfStaffAdvice = grievances[0].advice;

  return {
    unhappyCrimePct,
    unhappyPollutionPct,
    unhappyTrafficPct,
    unhappyJobsPct,
    unhappyEducationPct,
    unhappyRecreationPct,
    unhappyHealthcarePct,
    unhappyPowerPct,
    unhappyFirePct,
    unhappyTaxesPct,
    overallApprovalPct,
    overallDiscontentPct,
    coverageParkWalkPct,
    coveragePolicePct,
    coverageFirePct,
    coverageHospitalPct,
    coverageSchoolPct,
    coveragePowerPct,
    totalResidents,
    totalJobs,
    workforce,
    jobsCoveragePct,
    termNumber: state.termNumber || 1,
    yearsUntilElection,
    monthsUntilElection,
    daysUntilElection,
    electionForecast,
    topGrievance,
    topApproved,
    chiefOfStaffAdvice,
  };
};
