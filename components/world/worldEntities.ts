import { TileType, Tile } from '../../types';
import { GRID_SIZE } from '../../constants';

export const WORLD_TILE_PX = 480;

export interface WorldPedestrian {
  id: string;
  x: number;
  y: number;
  destX: number;
  destY: number;
  speed: number;
  role: 'WORKER' | 'PARK_GOER' | 'COMMUTER';
  state: 'WALKING' | 'AT_DESTINATION' | 'RETURNING';
  stateTimer: number;
  facing: 'N' | 'S' | 'E' | 'W';
  hairColor: string;
  skinColor: string;
  shirtColor: string;
  pantsColor: string;
  hasDog: boolean;
  dogBreed: 'RETRIEVER' | 'BEAGLE' | 'CORGI' | 'DALMATIAN';
  dogColor: string;
  dogName?: string;
  accessory: 'NONE' | 'BRIEFCASE' | 'BACKPACK' | 'HARDHAT' | 'COFFEE';
  speechBubble?: string;
  speechTimer: number;
  walkCycle: number;
  waypoints: { x: number; y: number }[];
  targetName?: string;
  preferredSide?: 'NORTH_WEST' | 'SOUTH_EAST';
  lateralJitter?: number;
}

export interface WorldVehicle {
  id: string;
  x: number;
  y: number;
  tileX: number;
  tileY: number;
  dir: 'N' | 'S' | 'E' | 'W';
  targetTileX: number;
  targetTileY: number;
  speed: number;
  type: 'SEDAN' | 'TAXI' | 'TRUCK' | 'SPORTS' | 'POLICE' | 'FIRE_ENGINE' | 'COMPACT';
  color: string;
  laneOffset: number; // offset to drive on right lane
  turnProgress: number;
  waitingAtIntersection: boolean;
  waitTimer: number;
}

export interface WorldCat {
  id: string;
  x: number;
  y: number;
  destX: number;
  destY: number;
  breed: 'ORANGE_TABBY' | 'CALICO' | 'TUXEDO' | 'BLACK' | 'WHITE' | 'SIAMESE';
  state: 'WANDER' | 'SITTING' | 'GROOMING' | 'STRETCHING' | 'SLEEPING';
  stateTimer: number;
  facing: 'N' | 'S' | 'E' | 'W';
  speed: number;
  tailPhase: number;
}

export interface WorldEntitiesState {
  pedestrians: WorldPedestrian[];
  vehicles: WorldVehicle[];
  cats: WorldCat[];
}

const SHIRT_COLORS = [
  '#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', 
  '#0284c7', '#ea580c', '#475569', '#0d9488', '#e11d48'
];
const PANTS_COLORS = ['#1e293b', '#334155', '#1e3a8a', '#475569', '#3f3f46'];
const HAIR_COLORS = ['#451a03', '#78350f', '#0f172a', '#fbbf24', '#d97706', '#94a3b8'];
const SKIN_TONES = ['#fed7aa', '#fcd34d', '#fbcfe8', '#d97706', '#b45309', '#78350f'];

const DOG_BREEDS: Array<WorldPedestrian['dogBreed']> = ['RETRIEVER', 'BEAGLE', 'CORGI', 'DALMATIAN'];
const CAT_BREEDS: Array<WorldCat['breed']> = ['ORANGE_TABBY', 'CALICO', 'TUXEDO', 'BLACK', 'WHITE', 'SIAMESE'];

const VEHICLE_COLORS = [
  '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', 
  '#ffffff', '#1e293b', '#94a3b8', '#ec4899', '#06b6d4'
];

const WORKER_SPEECH = [
  'Off to work! 💼', 'Heading to the office!', 'Late for the morning shift!',
  'Coffee first, then work ☕', 'Another productive day in town!',
  'Meeting with the supervisor 📋', 'Keeping the city running!'
];

const PARK_SPEECH = [
  'Such lovely trees here! 🌳', 'Taking a peaceful stroll ✨',
  'Heading to the fountain ⛲', 'The air is so fresh here!',
  'Beautiful day for the park ☀️', 'Good boy! 🐕',
  'Time for fresh air and sunshine 🌸'
];

let idCounter = 1;

/**
 * Identify POIs in the city grid
 */
export function extractCityPOIs(grid: Tile[]) {
  const roadTiles: { x: number; y: number; index: number }[] = [];
  const parkTiles: { x: number; y: number; index: number }[] = [];
  const workTiles: { x: number; y: number; index: number; type: TileType }[] = [];
  const resTiles: { x: number; y: number; index: number }[] = [];

  for (let i = 0; i < grid.length; i++) {
    const tile = grid[i];
    if (tile.type === TileType.ROAD) {
      roadTiles.push({ x: tile.x, y: tile.y, index: i });
    } else if (tile.type === TileType.PARK || tile.type === TileType.STATUE) {
      parkTiles.push({ x: tile.x, y: tile.y, index: i });
    } else if (
      tile.type === TileType.COMMERCIAL || 
      tile.type === TileType.INDUSTRIAL || 
      tile.type === TileType.MAYORS_OFFICE ||
      tile.type === TileType.UNIVERSITY ||
      tile.type === TileType.SCHOOL ||
      tile.type === TileType.POLICE_STATION ||
      tile.type === TileType.FIRE_STATION
    ) {
      workTiles.push({ x: tile.x, y: tile.y, index: i, type: tile.type });
    } else if (tile.type === TileType.RESIDENTIAL) {
      resTiles.push({ x: tile.x, y: tile.y, index: i });
    }
  }

  // City hall center plaza is always a prime work/civic landmark
  if (!workTiles.some(w => w.x >= 48 && w.x <= 50 && w.y >= 48 && w.y <= 50)) {
    workTiles.push({ x: 49, y: 49, index: 49 * GRID_SIZE + 49, type: TileType.MAYORS_OFFICE });
  }

  return { roadTiles, parkTiles, workTiles, resTiles };
}

/**
 * Picks a random point safely on the sidewalk perimeter of a road tile
 */
export function pickSidewalkPoint(tileX: number, tileY: number): { x: number; y: number } {
  const ts = WORLD_TILE_PX; // 480
  const side = Math.floor(Math.random() * 4);
  let lx = 42;
  let ly = 42;
  if (side === 0) {
    // North sidewalk
    lx = 30 + Math.random() * (ts - 60);
    ly = 24 + Math.random() * 38;
  } else if (side === 1) {
    // South sidewalk
    lx = 30 + Math.random() * (ts - 60);
    ly = ts - 62 + Math.random() * 38;
  } else if (side === 2) {
    // West sidewalk
    lx = 24 + Math.random() * 38;
    ly = 30 + Math.random() * (ts - 60);
  } else {
    // East sidewalk
    lx = ts - 62 + Math.random() * 38;
    ly = 30 + Math.random() * (ts - 60);
  }
  return { x: tileX * ts + lx, y: tileY * ts + ly };
}

/**
 * Generates an authentic, atmospheric civic landmark or street name based on tile type and location
 */
export function generateLandmarkName(tileType: TileType, tx: number, ty: number): string {
  const seed = Math.abs((tx * 31 + ty * 97) ^ 0x4a3b);
  const streetNames = ['Maple St', 'Oak Ave', 'Pine Blvd', 'Elm St', 'Cedar Way', 'Willow Rd', '4th Ave', 'Grand Ave', 'Commerce St', 'Market St'];
  const streetName = streetNames[seed % streetNames.length];

  switch (tileType) {
    case TileType.PARK:
    case TileType.STATUE: {
      const parkNames = [
        'Central Botanical Gardens', 'Riverside Meadow Park', 'Veridia Green Commons', 
        'Highland Park', 'Oakwood Grove', 'Memorial Fountain Park', 'Heritage Rose Garden'
      ];
      return parkNames[seed % parkNames.length];
    }
    case TileType.HOSPITAL:
      return 'St. Jude Metropolitan Hospital';
    case TileType.POLICE_STATION:
      return `District #${(seed % 5) + 1} Police Precinct`;
    case TileType.FIRE_STATION:
      return `Rescue Engine Co. #${(seed % 8) + 1}`;
    case TileType.SCHOOL:
      return `${streetName.split(' ')[0]} Public Academy`;
    case TileType.UNIVERSITY:
      return 'Veridia University Campus';
    case TileType.MAYORS_OFFICE:
      return 'City Hall Plaza & Rotunda';
    case TileType.COMMERCIAL: {
      const commNames = [
        `${streetName} Shopping Promenade`, 'Downtown Commerce Arcade', 'Grand Central Market',
        'Metro Financial Center', `${streetName} Plaza & Cafes`, 'Veridia Tech Tower'
      ];
      return commNames[seed % commNames.length];
    }
    case TileType.INDUSTRIAL:
    case TileType.POWER_PLANT:
      return `${streetName.split(' ')[0]} Industrial Works`;
    case TileType.RESIDENTIAL: {
      const resNames = [
        `${streetName} Brownstones`, `${streetName} Townhomes`, 'Pinecrest Residences', 
        'Maplewood Apartments', `${streetName} Suburbs`, 'Highland Gardens Residences'
      ];
      return resNames[seed % resNames.length];
    }
    case TileType.ROAD:
      return `${streetName} Sidewalk`;
    default:
      return `${streetName} District`;
  }
}

/**
 * Returns pedestrian walkability traversal cost for pathfinding
 */
function getWalkableCost(tile: Tile | undefined, tx: number, ty: number): number {
  if (!tile) return 999;
  if (tx < 0 || tx >= GRID_SIZE || ty < 0 || ty >= GRID_SIZE) return 999;

  switch (tile.type) {
    case TileType.ROAD:
      return 1.0; // Sidewalks are preferred pedestrian thoroughfares
    case TileType.PARK:
    case TileType.STATUE:
      return 1.1; // Green lawns and garden promenades
    case TileType.MAYORS_OFFICE:
      return 1.2; // City Hall grand marble plaza
    case TileType.RESIDENTIAL:
      return 2.2; // Walkways, front garden paths
    case TileType.COMMERCIAL:
      return 2.0; // Storefront promenades & arcades
    case TileType.HOSPITAL:
    case TileType.SCHOOL:
    case TileType.UNIVERSITY:
    case TileType.POLICE_STATION:
    case TileType.FIRE_STATION:
      return 2.2;
    case TileType.EMPTY:
      return 2.8; // Grassy open fields
    case TileType.INDUSTRIAL:
    case TileType.POWER_PLANT:
      return 4.5;
    default:
      return 999;
  }
}

interface PathNode {
  x: number;
  y: number;
  g: number;
  f: number;
  parent?: PathNode;
}

/**
 * Fast A* tile pathfinder on the city grid
 */
export function findTilePath(
  grid: Tile[],
  startTx: number,
  startTy: number,
  endTx: number,
  endTy: number,
  maxIterations: number = 800
): { x: number; y: number }[] {
  if (startTx === endTx && startTy === endTy) {
    return [{ x: startTx, y: startTy }];
  }

  const openList: PathNode[] = [];
  const closedSet = new Uint8Array(GRID_SIZE * GRID_SIZE);

  const startH = Math.abs(endTx - startTx) + Math.abs(endTy - startTy);
  openList.push({
    x: startTx,
    y: startTy,
    g: 0,
    f: startH,
  });

  let closestNode: PathNode = openList[0];
  let closestDist = startH;
  let iterations = 0;

  const DIRS = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  while (openList.length > 0 && iterations++ < maxIterations) {
    let bestIdx = 0;
    let minF = openList[0].f;
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < minF) {
        minF = openList[i].f;
        bestIdx = i;
      }
    }

    const current = openList.splice(bestIdx, 1)[0];
    const currKey = current.y * GRID_SIZE + current.x;

    if (closedSet[currKey]) continue;
    closedSet[currKey] = 1;

    const h = Math.abs(endTx - current.x) + Math.abs(endTy - current.y);
    if (h < closestDist) {
      closestDist = h;
      closestNode = current;
    }

    if (current.x === endTx && current.y === endTy) {
      const path: { x: number; y: number }[] = [];
      let curr: PathNode | undefined = current;
      while (curr) {
        path.push({ x: curr.x, y: curr.y });
        curr = curr.parent;
      }
      path.reverse();
      return path;
    }

    for (const d of DIRS) {
      const nx = current.x + d.x;
      const ny = current.y + d.y;

      if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
      const nKey = ny * GRID_SIZE + nx;
      if (closedSet[nKey]) continue;

      const tile = grid[nKey];
      const stepCost = getWalkableCost(tile, nx, ny);
      if (stepCost >= 900) continue;

      const g = current.g + stepCost;
      const neighborH = Math.abs(endTx - nx) + Math.abs(endTy - ny);
      const f = g + neighborH * 1.05;

      openList.push({
        x: nx,
        y: ny,
        g,
        f,
        parent: current,
      });
    }
  }

  const path: { x: number; y: number }[] = [];
  let curr: PathNode | undefined = closestNode;
  while (curr) {
    path.push({ x: curr.x, y: curr.y });
    curr = curr.parent;
  }
  path.reverse();
  return path.length > 0 ? path : [{ x: startTx, y: startTy }, { x: endTx, y: endTy }];
}

/**
 * Converts a sequence of grid tiles into world pixel waypoints along sidewalks, crosswalks, and park pathways.
 * Guarantees pedestrians walk purposefully along sidewalks without bouncing into or off driving lanes.
 */
export function generateSidewalkWaypoints(
  grid: Tile[],
  startPos: { x: number; y: number },
  tilePath: { x: number; y: number }[],
  destPos: { x: number; y: number },
  preferredSide: 'NORTH_WEST' | 'SOUTH_EAST',
  jitter: number
): { x: number; y: number }[] {
  const ts = WORLD_TILE_PX;
  const sw = 38; // Center of 78px wide paved sidewalk
  const waypoints: { x: number; y: number }[] = [];

  if (tilePath.length <= 1) {
    waypoints.push({ x: destPos.x, y: destPos.y });
    return waypoints;
  }

  const useNW = preferredSide === 'NORTH_WEST';
  let prevHeading: 'E' | 'W' | 'S' | 'N' | 'NONE' = 'NONE';

  for (let i = 0; i < tilePath.length; i++) {
    const curTile = tilePath[i];
    const nextTile = i < tilePath.length - 1 ? tilePath[i + 1] : null;
    const curType = grid[curTile.y * GRID_SIZE + curTile.x]?.type;

    if (!nextTile) {
      waypoints.push({ x: destPos.x, y: destPos.y });
      break;
    }

    const dtx = nextTile.x - curTile.x;
    const dty = nextTile.y - curTile.y;
    let heading: 'E' | 'W' | 'S' | 'N' = 'E';
    if (dtx > 0) heading = 'E';
    else if (dtx < 0) heading = 'W';
    else if (dty > 0) heading = 'S';
    else if (dty < 0) heading = 'N';

    if (curType === TileType.ROAD) {
      const px = curTile.x * ts;
      const py = curTile.y * ts;

      // Turning at sidewalk corner: add corner waypoint to round the curb smoothly
      if (prevHeading !== 'NONE' && prevHeading !== heading) {
        const cornerX = useNW ? px + sw + jitter : px + ts - sw + jitter;
        const cornerY = useNW ? py + sw + jitter : py + ts - sw + jitter;
        waypoints.push({ x: cornerX, y: cornerY });
      }

      // Add waypoint traversing along sidewalk across this tile
      if (heading === 'E') {
        const sy = useNW ? py + sw + jitter : py + ts - sw + jitter;
        waypoints.push({ x: px + ts, y: sy });
      } else if (heading === 'W') {
        const sy = useNW ? py + sw + jitter : py + ts - sw + jitter;
        waypoints.push({ x: px, y: sy });
      } else if (heading === 'S') {
        const sx = useNW ? px + sw + jitter : px + ts - sw + jitter;
        waypoints.push({ x: sx, y: py + ts });
      } else if (heading === 'N') {
        const sx = useNW ? px + sw + jitter : px + ts - sw + jitter;
        waypoints.push({ x: sx, y: py });
      }
    } else {
      // Park, plaza, or open building promenade
      const cx = curTile.x * ts + ts / 2 + Math.sin(i * 3 + jitter) * 35;
      const cy = curTile.y * ts + ts / 2 + Math.cos(i * 3 + jitter) * 35;
      waypoints.push({ x: cx, y: cy });
    }

    prevHeading = heading;
  }

  // Filter out redundant waypoints that are too close together
  const cleaned: { x: number; y: number }[] = [];
  for (const wp of waypoints) {
    if (cleaned.length === 0) {
      cleaned.push(wp);
    } else {
      const last = cleaned[cleaned.length - 1];
      if (Math.hypot(wp.x - last.x, wp.y - last.y) > 18) {
        cleaned.push(wp);
      }
    }
  }

  return cleaned.length > 0 ? cleaned : [{ x: destPos.x, y: destPos.y }];
}

/**
 * Assigns a new journey with purpose, destination landmark name, speech, and sidewalk pathfinding
 */
export function assignNewPedestrianJourney(
  ped: WorldPedestrian,
  pois: ReturnType<typeof extractCityPOIs>,
  grid: Tile[],
  camCenterX?: number,
  camCenterY?: number
) {
  const ts = WORLD_TILE_PX;
  const curTx = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(ped.x / ts)));
  const curTy = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(ped.y / ts)));

  let targetTx = curTx;
  let targetTy = curTy;
  let targetType = TileType.PARK;
  let targetRole: WorldPedestrian['role'] = 'COMMUTER';

  // Choose next destination based on current role / cycle
  if (ped.role === 'WORKER') {
    // Finished shift: head to a botanical park, commercial market, or home
    const rand = Math.random();
    if (rand < 0.45 && pois.parkTiles.length > 0) {
      const p = pois.parkTiles[Math.floor(Math.random() * pois.parkTiles.length)];
      targetTx = p.x;
      targetTy = p.y;
      targetType = TileType.PARK;
      targetRole = 'PARK_GOER';
    } else if (rand < 0.75 && pois.resTiles.length > 0) {
      const r = pois.resTiles[Math.floor(Math.random() * pois.resTiles.length)];
      targetTx = r.x;
      targetTy = r.y;
      targetType = TileType.RESIDENTIAL;
      targetRole = 'COMMUTER';
    } else if (pois.workTiles.length > 1) {
      const w = pois.workTiles[Math.floor(Math.random() * pois.workTiles.length)];
      targetTx = w.x;
      targetTy = w.y;
      targetType = w.type;
      targetRole = 'WORKER';
    } else if (pois.roadTiles.length > 0) {
      const rd = pois.roadTiles[Math.floor(Math.random() * pois.roadTiles.length)];
      targetTx = rd.x;
      targetTy = rd.y;
      targetType = TileType.ROAD;
      targetRole = 'COMMUTER';
    }
  } else if (ped.role === 'PARK_GOER') {
    // Finished park visit: head to work, shopping promenade, or home
    const rand = Math.random();
    if (rand < 0.5 && pois.resTiles.length > 0) {
      const r = pois.resTiles[Math.floor(Math.random() * pois.resTiles.length)];
      targetTx = r.x;
      targetTy = r.y;
      targetType = TileType.RESIDENTIAL;
      targetRole = 'COMMUTER';
    } else if (rand < 0.8 && pois.workTiles.length > 0) {
      const w = pois.workTiles[Math.floor(Math.random() * pois.workTiles.length)];
      targetTx = w.x;
      targetTy = w.y;
      targetType = w.type;
      targetRole = 'WORKER';
    } else if (pois.roadTiles.length > 0) {
      const rd = pois.roadTiles[Math.floor(Math.random() * pois.roadTiles.length)];
      targetTx = rd.x;
      targetTy = rd.y;
      targetType = TileType.ROAD;
      targetRole = 'COMMUTER';
    }
  } else {
    // Commuter: head to workplace or botanical park
    const rand = Math.random();
    if (rand < 0.55 && pois.workTiles.length > 0) {
      const w = pois.workTiles[Math.floor(Math.random() * pois.workTiles.length)];
      targetTx = w.x;
      targetTy = w.y;
      targetType = w.type;
      targetRole = 'WORKER';
    } else if (pois.parkTiles.length > 0) {
      const p = pois.parkTiles[Math.floor(Math.random() * pois.parkTiles.length)];
      targetTx = p.x;
      targetTy = p.y;
      targetType = TileType.PARK;
      targetRole = 'PARK_GOER';
    } else if (pois.roadTiles.length > 0) {
      const rd = pois.roadTiles[Math.floor(Math.random() * pois.roadTiles.length)];
      targetTx = rd.x;
      targetTy = rd.y;
      targetType = TileType.ROAD;
      targetRole = 'COMMUTER';
    }
  }

  const targetName = generateLandmarkName(targetType, targetTx, targetTy);
  let destX = targetTx * ts + ts / 2;
  let destY = targetTy * ts + ts / 2;

  if (targetType === TileType.ROAD) {
    const sw = pickSidewalkPoint(targetTx, targetTy);
    destX = sw.x;
    destY = sw.y;
  } else if (targetType === TileType.PARK || targetType === TileType.STATUE) {
    destX = targetTx * ts + 100 + Math.random() * (ts - 200);
    destY = targetTy * ts + 100 + Math.random() * (ts - 200);
  } else {
    destX = targetTx * ts + 120 + Math.random() * (ts - 240);
    destY = targetTy * ts + 120 + Math.random() * (ts - 240);
  }

  ped.role = targetRole;
  ped.destX = destX;
  ped.destY = destY;
  ped.targetName = targetName;
  ped.state = 'WALKING';
  ped.stateTimer = 0;

  // Run A* pathfinding and generate sidewalk waypoints
  const tilePath = findTilePath(grid, curTx, curTy, targetTx, targetTy);
  ped.waypoints = generateSidewalkWaypoints(
    grid,
    { x: ped.x, y: ped.y },
    tilePath,
    { x: destX, y: destY },
    ped.preferredSide || 'NORTH_WEST',
    ped.lateralJitter || 0
  );

  // Set purposeful walking speech
  const walkLines = [
    `Heading over to ${targetName}! 💼`,
    ped.hasDog ? `Walking ${ped.dogName || 'Max'} to ${targetName} 🐕` : `Taking the sidewalk to ${targetName} ✨`,
    `On my way to ${targetName} ☕`,
    `Heading down the sidewalk to ${targetName} 🌿`,
  ];
  ped.speechBubble = walkLines[Math.floor(Math.random() * walkLines.length)];
  ped.speechTimer = 4.5;
}

/**
 * Spawns a pedestrian with realistic destination, sidewalk habit, and intelligent pathfinding
 */
function createPedestrian(
  pois: ReturnType<typeof extractCityPOIs>, 
  grid: Tile[],
  biasNearX?: number, 
  biasNearY?: number
): WorldPedestrian {
  const id = `ped_${idCounter++}`;
  const ts = WORLD_TILE_PX;
  const role: WorldPedestrian['role'] = Math.random() < 0.45 
    ? 'WORKER' 
    : Math.random() < 0.8 && pois.parkTiles.length > 0 
    ? 'PARK_GOER' 
    : 'COMMUTER';

  // Origin position: near residential or road or bias position
  let startX = 49.5 * ts;
  let startY = 51.5 * ts;

  if (biasNearX !== undefined && biasNearY !== undefined && Math.random() < 0.6) {
    startX = biasNearX + (Math.random() - 0.5) * ts * 2.5;
    startY = biasNearY + (Math.random() - 0.5) * ts * 2.5;
  } else if (pois.resTiles.length > 0 && Math.random() < 0.7) {
    const origin = pois.resTiles[Math.floor(Math.random() * pois.resTiles.length)];
    startX = (origin.x + 0.2 + Math.random() * 0.6) * ts;
    startY = (origin.y + 0.2 + Math.random() * 0.6) * ts;
  } else if (pois.roadTiles.length > 0) {
    const r = pois.roadTiles[Math.floor(Math.random() * pois.roadTiles.length)];
    const sw = pickSidewalkPoint(r.x, r.y);
    startX = sw.x;
    startY = sw.y;
  }

  // Personal sidewalk habits (which side of the street they prefer & lateral jitter)
  const preferredSide: 'NORTH_WEST' | 'SOUTH_EAST' = Math.random() < 0.5 ? 'NORTH_WEST' : 'SOUTH_EAST';
  const lateralJitter = (Math.random() - 0.5) * 18;

  const hasDog = role === 'PARK_GOER' ? Math.random() < 0.45 : Math.random() < 0.22;
  const dogBreed = DOG_BREEDS[Math.floor(Math.random() * DOG_BREEDS.length)];
  const dogColor = dogBreed === 'RETRIEVER' ? '#f59e0b' : dogBreed === 'BEAGLE' ? '#92400e' : dogBreed === 'CORGI' ? '#ea580c' : '#ffffff';
  const dogName = hasDog ? ['Buddy', 'Max', 'Luna', 'Bailey', 'Bella', 'Charlie', 'Rocky', 'Daisy', 'Teddy', 'Milo'][Math.floor(Math.random() * 10)] : undefined;

  let accessory: WorldPedestrian['accessory'] = 'NONE';
  if (role === 'WORKER') {
    accessory = Math.random() < 0.5 ? 'BRIEFCASE' : Math.random() < 0.3 ? 'HARDHAT' : 'COFFEE';
  } else if (Math.random() < 0.3) {
    accessory = 'BACKPACK';
  }

  const ped: WorldPedestrian = {
    id,
    x: startX,
    y: startY,
    destX: startX,
    destY: startY,
    speed: 85 + Math.random() * 45,
    role,
    state: 'WALKING',
    stateTimer: 0,
    facing: 'E',
    hairColor: HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)],
    skinColor: SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)],
    shirtColor: SHIRT_COLORS[Math.floor(Math.random() * SHIRT_COLORS.length)],
    pantsColor: PANTS_COLORS[Math.floor(Math.random() * PANTS_COLORS.length)],
    hasDog,
    dogBreed,
    dogColor,
    dogName,
    accessory,
    speechTimer: 4 + Math.random() * 3,
    walkCycle: Math.random() * 10,
    waypoints: [],
    preferredSide,
    lateralJitter,
  };

  // Assign journey immediately using pathfinding!
  assignNewPedestrianJourney(ped, pois, grid, biasNearX, biasNearY);

  return ped;
}

/**
 * Spawns a vehicle on a road tile
 */
function createVehicle(
  pois: ReturnType<typeof extractCityPOIs>, 
  grid: Tile[], 
  biasNearX?: number, 
  biasNearY?: number
): WorldVehicle | null {
  if (pois.roadTiles.length === 0) return null;

  // Filter roads near bias if available
  let road = pois.roadTiles[Math.floor(Math.random() * pois.roadTiles.length)];
  if (biasNearX !== undefined && biasNearY !== undefined) {
    const nearRoads = pois.roadTiles.filter(r => {
      const dist = Math.hypot(r.x * WORLD_TILE_PX - biasNearX, r.y * WORLD_TILE_PX - biasNearY);
      return dist < WORLD_TILE_PX * 5;
    });
    if (nearRoads.length > 0 && Math.random() < 0.7) {
      road = nearRoads[Math.floor(Math.random() * nearRoads.length)];
    }
  }

  // Find neighbor roads to establish heading direction
  const neighbors: { dir: 'N' | 'S' | 'E' | 'W'; tx: number; ty: number }[] = [];
  if (road.y > 0 && grid[(road.y - 1) * GRID_SIZE + road.x]?.type === TileType.ROAD) {
    neighbors.push({ dir: 'N', tx: road.x, ty: road.y - 1 });
  }
  if (road.x < GRID_SIZE - 1 && grid[road.y * GRID_SIZE + (road.x + 1)]?.type === TileType.ROAD) {
    neighbors.push({ dir: 'E', tx: road.x + 1, ty: road.y });
  }
  if (road.y < GRID_SIZE - 1 && grid[(road.y + 1) * GRID_SIZE + road.x]?.type === TileType.ROAD) {
    neighbors.push({ dir: 'S', tx: road.x, ty: road.y + 1 });
  }
  if (road.x > 0 && grid[road.y * GRID_SIZE + (road.x - 1)]?.type === TileType.ROAD) {
    neighbors.push({ dir: 'W', tx: road.x - 1, ty: road.y });
  }

  const chosenNeighbor = neighbors.length > 0 ? neighbors[Math.floor(Math.random() * neighbors.length)] : { dir: 'E' as const, tx: road.x + 1, ty: road.y };
  const dir = chosenNeighbor.dir;

  // Right-hand traffic lane offset:
  // Center of road is 240px. Right lane is +65px perpendicular to travel
  let startX = road.x * WORLD_TILE_PX + 240;
  let startY = road.y * WORLD_TILE_PX + 240;

  if (dir === 'N') startX += 60;
  if (dir === 'S') startX -= 60;
  if (dir === 'E') startY += 60;
  if (dir === 'W') startY -= 60;

  const randType = Math.random();
  const type: WorldVehicle['type'] = randType < 0.22 
    ? 'TAXI' 
    : randType < 0.45 
    ? 'SEDAN' 
    : randType < 0.65 
    ? 'COMPACT' 
    : randType < 0.8 
    ? 'TRUCK' 
    : randType < 0.92 
    ? 'SPORTS' 
    : Math.random() < 0.5 ? 'POLICE' : 'FIRE_ENGINE';

  const color = type === 'TAXI' ? '#f59e0b' : type === 'POLICE' ? '#1e293b' : type === 'FIRE_ENGINE' ? '#dc2626' : VEHICLE_COLORS[Math.floor(Math.random() * VEHICLE_COLORS.length)];

  return {
    id: `veh_${idCounter++}`,
    x: startX,
    y: startY,
    tileX: road.x,
    tileY: road.y,
    dir,
    targetTileX: chosenNeighbor.tx,
    targetTileY: chosenNeighbor.ty,
    speed: 210 + Math.random() * 110,
    type,
    color,
    laneOffset: 60,
    turnProgress: 0,
    waitingAtIntersection: false,
    waitTimer: 0,
  };
}

/**
 * Spawns a cute little cat wandering around
 */
function createCat(pois: ReturnType<typeof extractCityPOIs>, biasNearX?: number, biasNearY?: number): WorldCat {
  let startX = 49.5 * WORLD_TILE_PX;
  let startY = 51.5 * WORLD_TILE_PX;

  if (biasNearX !== undefined && biasNearY !== undefined && Math.random() < 0.7) {
    startX = biasNearX + (Math.random() - 0.5) * WORLD_TILE_PX * 2;
    startY = biasNearY + (Math.random() - 0.5) * WORLD_TILE_PX * 2;
  } else if (pois.parkTiles.length > 0 && Math.random() < 0.5) {
    const p = pois.parkTiles[Math.floor(Math.random() * pois.parkTiles.length)];
    startX = (p.x + 0.15 + Math.random() * 0.7) * WORLD_TILE_PX;
    startY = (p.y + 0.15 + Math.random() * 0.7) * WORLD_TILE_PX;
  } else if (pois.resTiles.length > 0) {
    const r = pois.resTiles[Math.floor(Math.random() * pois.resTiles.length)];
    startX = (r.x + 0.1 + Math.random() * 0.8) * WORLD_TILE_PX;
    startY = (r.y + 0.1 + Math.random() * 0.8) * WORLD_TILE_PX;
  }

  const breed = CAT_BREEDS[Math.floor(Math.random() * CAT_BREEDS.length)];
  const destX = startX + (Math.random() - 0.5) * 160;
  const destY = startY + (Math.random() - 0.5) * 160;

  return {
    id: `cat_${idCounter++}`,
    x: startX,
    y: startY,
    destX,
    destY,
    breed,
    state: Math.random() < 0.4 ? 'WANDER' : Math.random() < 0.7 ? 'SITTING' : 'GROOMING',
    stateTimer: 2 + Math.random() * 5,
    facing: Math.random() < 0.5 ? 'E' : 'W',
    speed: 45 + Math.random() * 30,
    tailPhase: Math.random() * 10,
  };
}

/**
 * Main simulation step for all living entities in the real world
 */
export function updateWorldEntities(
  state: WorldEntitiesState,
  grid: Tile[],
  population: number,
  dt: number,
  camCenterX: number,
  camCenterY: number
): WorldEntitiesState {
  const pois = extractCityPOIs(grid);
  const maxWorld = GRID_SIZE * WORLD_TILE_PX;

  // 1. DYNAMIC POPULATION SCALING
  // Exactly ~1 person in the real world for every 100 population in the city!
  const targetPeds = population <= 0 ? 0 : Math.max(1, Math.min(120, Math.round(population / 100)));
  const targetVehicles = pois.roadTiles.length === 0 ? 0 : Math.max(3, Math.min(50, Math.floor(3 + pois.roadTiles.length * 0.25 + population / 250)));
  const targetCats = Math.max(3, Math.min(20, Math.floor(3 + Math.sqrt(population) * 0.25 + pois.parkTiles.length * 0.8)));

  // A. Pedestrians update
  const updatedPeds: WorldPedestrian[] = [];
  for (const ped of state.pedestrians) {
    ped.walkCycle += dt * (ped.speed / 10);
    ped.stateTimer += dt;
    if (ped.speechTimer > 0) {
      ped.speechTimer -= dt;
      if (ped.speechTimer <= 0) ped.speechBubble = undefined;
    }

    // Citizen greets the Mayor when passing by
    const distToMayor = Math.hypot(ped.x - camCenterX, ped.y - camCenterY);
    if (distToMayor < 130 && ped.speechTimer <= 0 && Math.random() < 0.12) {
      const mayorGreetings = [
        `Good day Mr. Mayor! Heading to ${ped.targetName || 'work'}!`,
        `Hello Mr. Mayor! Great sidewalks in our city!`,
        `Good morning Mayor! Walking to ${ped.targetName || 'the park'}!`,
        `Greetings Mr. Mayor! Beautiful day for a walk ✨`,
        `Keep up the great work Mr. Mayor!`,
      ];
      ped.speechBubble = mayorGreetings[Math.floor(Math.random() * mayorGreetings.length)];
      ped.speechTimer = 4.2;
    }

    if (ped.state === 'WALKING') {
      if (ped.waypoints && ped.waypoints.length > 0) {
        const nextWp = ped.waypoints[0];
        const dx = nextWp.x - ped.x;
        const dy = nextWp.y - ped.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= 22) {
          // Reached intermediate sidewalk waypoint! Pop and move to next
          ped.waypoints.shift();
          if (ped.waypoints.length === 0) {
            // Reached destination!
            ped.state = 'AT_DESTINATION';
            ped.stateTimer = 0;
            const destLabel = ped.targetName || 'my destination';
            if (ped.role === 'PARK_GOER') {
              ped.speechBubble = `Arrived at ${destLabel}! So peaceful 🌳`;
            } else if (ped.role === 'WORKER') {
              ped.speechBubble = `Arrived at ${destLabel}! Time to clock in 💼`;
            } else {
              ped.speechBubble = `Arrived at ${destLabel}! ✨`;
            }
            ped.speechTimer = 5;
          }
        } else {
          // Steer smoothly toward current waypoint (never bounces into or off roadway)
          const moveStep = Math.min(dist, ped.speed * dt);
          ped.x += (dx / dist) * moveStep;
          ped.y += (dy / dist) * moveStep;
          ped.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'E' : 'W') : (dy > 0 ? 'S' : 'N');

          // Periodic speech bubble indicating where they are going
          if (ped.speechTimer <= 0 && Math.random() < 0.005) {
            const periodicLines = [
              `Heading to ${ped.targetName || 'town'}! ✨`,
              ped.hasDog ? `Taking ${ped.dogName || 'Max'} to ${ped.targetName || 'the park'} 🐕` : `Walking down the sidewalk to ${ped.targetName || 'work'} 💼`,
              `Lovely stroll down the sidewalk today! 🌿`,
              `On the way to ${ped.targetName || 'my stop'} ☕`,
            ];
            ped.speechBubble = periodicLines[Math.floor(Math.random() * periodicLines.length)];
            ped.speechTimer = 3.5;
          }
        }
      } else {
        // No waypoints active: check if close to destination or recalculate path
        const dx = ped.destX - ped.x;
        const dy = ped.destY - ped.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= 24) {
          ped.state = 'AT_DESTINATION';
          ped.stateTimer = 0;
        } else {
          // Recalculate sidewalk waypoints
          const curTx = Math.floor(ped.x / WORLD_TILE_PX);
          const curTy = Math.floor(ped.y / WORLD_TILE_PX);
          const endTx = Math.floor(ped.destX / WORLD_TILE_PX);
          const endTy = Math.floor(ped.destY / WORLD_TILE_PX);
          const tilePath = findTilePath(grid, curTx, curTy, endTx, endTy);
          ped.waypoints = generateSidewalkWaypoints(
            grid,
            { x: ped.x, y: ped.y },
            tilePath,
            { x: ped.destX, y: ped.destY },
            ped.preferredSide || 'NORTH_WEST',
            ped.lateralJitter || 0
          );
        }
      }
    } else if (ped.state === 'AT_DESTINATION') {
      // Gentle leisure step / resting at destination
      if (Math.random() < 0.04) {
        ped.walkCycle += dt * 3;
      }
      // When leisure or shift timer completes, assign next journey!
      if (ped.stateTimer > 9 + Math.random() * 8) {
        assignNewPedestrianJourney(ped, pois, grid, camCenterX, camCenterY);
      }
    }

    // Keep within world limits
    ped.x = Math.max(40, Math.min(maxWorld - 40, ped.x));
    ped.y = Math.max(40, Math.min(maxWorld - 40, ped.y));

    // Cull pedestrians that are far beyond camera if over target
    if (distToMayor < WORLD_TILE_PX * 14 || updatedPeds.length < targetPeds) {
      updatedPeds.push(ped);
    }
  }

  // Spawn new pedestrians if below target
  while (updatedPeds.length < targetPeds) {
    updatedPeds.push(createPedestrian(pois, grid, camCenterX, camCenterY));
  }

  // B. Vehicles update
  const updatedVehicles: WorldVehicle[] = [];
  for (const veh of state.vehicles) {
    if (veh.waitingAtIntersection) {
      veh.waitTimer -= dt;
      if (veh.waitTimer <= 0) {
        veh.waitingAtIntersection = false;
      }
      updatedVehicles.push(veh);
      continue;
    }

    // Compute target pixel coordinates for the vehicle's right lane
    const targetCenterX = veh.targetTileX * WORLD_TILE_PX + 240;
    const targetCenterY = veh.targetTileY * WORLD_TILE_PX + 240;
    let targetPxX = targetCenterX;
    let targetPxY = targetCenterY;

    if (veh.dir === 'N') targetPxX += veh.laneOffset;
    if (veh.dir === 'S') targetPxX -= veh.laneOffset;
    if (veh.dir === 'E') targetPxY += veh.laneOffset;
    if (veh.dir === 'W') targetPxY -= veh.laneOffset;

    const toTargetX = targetPxX - veh.x;
    const toTargetY = targetPxY - veh.y;
    const distToTarget = Math.hypot(toTargetX, toTargetY);

    if (distToTarget > 12) {
      veh.x += (toTargetX / distToTarget) * veh.speed * dt;
      veh.y += (toTargetY / distToTarget) * veh.speed * dt;
    } else {
      // Arrived at next tile!
      veh.tileX = veh.targetTileX;
      veh.tileY = veh.targetTileY;

      // Scan available neighbor roads to pick next path
      const neighbors: { dir: 'N' | 'S' | 'E' | 'W'; tx: number; ty: number }[] = [];
      const oppositeDir: Record<string, string> = { N: 'S', S: 'N', E: 'W', W: 'E' };

      if (veh.tileY > 0 && grid[(veh.tileY - 1) * GRID_SIZE + veh.tileX]?.type === TileType.ROAD) {
        neighbors.push({ dir: 'N', tx: veh.tileX, ty: veh.tileY - 1 });
      }
      if (veh.tileX < GRID_SIZE - 1 && grid[veh.tileY * GRID_SIZE + (veh.tileX + 1)]?.type === TileType.ROAD) {
        neighbors.push({ dir: 'E', tx: veh.tileX + 1, ty: veh.tileY });
      }
      if (veh.tileY < GRID_SIZE - 1 && grid[(veh.tileY + 1) * GRID_SIZE + veh.tileX]?.type === TileType.ROAD) {
        neighbors.push({ dir: 'S', tx: veh.tileX, ty: veh.tileY + 1 });
      }
      if (veh.tileX > 0 && grid[veh.tileY * GRID_SIZE + (veh.tileX - 1)]?.type === TileType.ROAD) {
        neighbors.push({ dir: 'W', tx: veh.tileX - 1, ty: veh.tileY });
      }

      // Filter out immediate U-turns unless dead end
      const forwardNeighbors = neighbors.filter(n => n.dir !== oppositeDir[veh.dir]);
      const validOptions = forwardNeighbors.length > 0 ? forwardNeighbors : neighbors;

      if (validOptions.length > 0) {
        // Chance of brief intersection pause
        if (neighbors.length >= 3 && Math.random() < 0.25) {
          veh.waitingAtIntersection = true;
          veh.waitTimer = 0.8 + Math.random() * 1.2;
        }
        const next = validOptions[Math.floor(Math.random() * validOptions.length)];
        veh.dir = next.dir;
        veh.targetTileX = next.tx;
        veh.targetTileY = next.ty;
      }
    }

    const distFromCam = Math.hypot(veh.x - camCenterX, veh.y - camCenterY);
    if (distFromCam < WORLD_TILE_PX * 16 || updatedVehicles.length < targetVehicles) {
      updatedVehicles.push(veh);
    }
  }

  // Spawn new vehicles if below target
  while (updatedVehicles.length < targetVehicles && pois.roadTiles.length > 0) {
    const newVeh = createVehicle(pois, grid, camCenterX, camCenterY);
    if (newVeh) updatedVehicles.push(newVeh);
    else break;
  }

  // C. Cats update
  const updatedCats: WorldCat[] = [];
  for (const cat of state.cats) {
    cat.tailPhase += dt * 3;
    cat.stateTimer -= dt;

    if (cat.state === 'WANDER') {
      const dx = cat.destX - cat.x;
      const dy = cat.destY - cat.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 8) {
        cat.x += (dx / dist) * cat.speed * dt;
        cat.y += (dy / dist) * cat.speed * dt;
        cat.facing = dx > 0 ? 'E' : 'W';
      } else {
        // Switch state
        const rand = Math.random();
        cat.state = rand < 0.4 ? 'SITTING' : rand < 0.65 ? 'GROOMING' : rand < 0.85 ? 'STRETCHING' : 'SLEEPING';
        cat.stateTimer = 3 + Math.random() * 7;
      }
    } else {
      if (cat.stateTimer <= 0) {
        // Pick next wander point nearby
        cat.state = 'WANDER';
        cat.destX = cat.x + (Math.random() - 0.5) * 180;
        cat.destY = cat.y + (Math.random() - 0.5) * 180;
        cat.destX = Math.max(60, Math.min(maxWorld - 60, cat.destX));
        cat.destY = Math.max(60, Math.min(maxWorld - 60, cat.destY));
      }
    }

    const distFromCam = Math.hypot(cat.x - camCenterX, cat.y - camCenterY);
    if (distFromCam < WORLD_TILE_PX * 12 || updatedCats.length < targetCats) {
      updatedCats.push(cat);
    }
  }

  while (updatedCats.length < targetCats) {
    updatedCats.push(createCat(pois, camCenterX, camCenterY));
  }

  return {
    pedestrians: updatedPeds,
    vehicles: updatedVehicles,
    cats: updatedCats,
  };
}

/**
 * Render a vehicle on the road with headlights, wheels, chassis
 */
export function drawWorldVehicle(ctx: CanvasRenderingContext2D, v: WorldVehicle, t: number, isNight: boolean) {
  ctx.save();
  ctx.translate(v.x, v.y);

  // Rotate vehicle according to travel direction
  const rotation = v.dir === 'N' ? -Math.PI / 2 : v.dir === 'S' ? Math.PI / 2 : v.dir === 'W' ? Math.PI : 0;
  ctx.rotate(rotation);

  // Dimensions based on type
  const len = v.type === 'FIRE_ENGINE' ? 84 : v.type === 'TRUCK' ? 76 : v.type === 'SPORTS' ? 62 : 68;
  const wid = v.type === 'FIRE_ENGINE' ? 38 : v.type === 'TRUCK' ? 36 : 32;

  // Drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(-len / 2 + 2, -wid / 2 + 4, len, wid);

  // Wheels (4 black rubber tires)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-len / 2 + 10, -wid / 2 - 4, 14, 6);
  ctx.fillRect(len / 2 - 24, -wid / 2 - 4, 14, 6);
  ctx.fillRect(-len / 2 + 10, wid / 2 - 2, 14, 6);
  ctx.fillRect(len / 2 - 24, wid / 2 - 2, 14, 6);

  // Main vehicle body
  ctx.fillStyle = v.color;
  ctx.beginPath();
  ctx.roundRect(-len / 2, -wid / 2, len, wid, 6);
  ctx.fill();

  // Roof / cabin
  const cabinLen = len * 0.48;
  const cabinWid = wid * 0.74;
  ctx.fillStyle = '#1e293b'; // Tinted glass
  ctx.beginPath();
  ctx.roundRect(-len / 2 + len * 0.22, -cabinWid / 2, cabinLen, cabinWid, 4);
  ctx.fill();

  // Windshield highlight
  ctx.fillStyle = '#64748b';
  ctx.fillRect(len * 0.12, -cabinWid / 2 + 3, 5, cabinWid - 6);

  // Special Taxi checkerboard or Police lightbar
  if (v.type === 'TAXI') {
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-6, -8, 12, 16);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-2, -6, 4, 12);
  } else if (v.type === 'POLICE' || v.type === 'FIRE_ENGINE') {
    // Flashing emergency beacon
    const flash = Math.sin(t * 18) > 0;
    ctx.fillStyle = flash ? '#ef4444' : '#3b82f6';
    ctx.fillRect(-4, -wid / 2 + 4, 8, wid - 8);
  }

  // Headlights (Front is +X in local space)
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(len / 2 - 3, -wid / 2 + 3, 4, 7);
  ctx.fillRect(len / 2 - 3, wid / 2 - 10, 4, 7);

  // Taillights
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(-len / 2 - 1, -wid / 2 + 3, 3, 6);
  ctx.fillRect(-len / 2 - 1, wid / 2 - 9, 3, 6);

  // Headlight beams projected onto road at night!
  if (isNight) {
    const beamGrad = ctx.createLinearGradient(len / 2, 0, len / 2 + 180, 0);
    beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.4)');
    beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');

    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(len / 2, -wid / 2);
    ctx.lineTo(len / 2 + 180, -wid / 2 - 60);
    ctx.lineTo(len / 2 + 180, wid / 2 + 60);
    ctx.lineTo(len / 2, wid / 2);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Render a walking citizen with dog, accessories, and speech
 */
export function drawWorldPedestrian(ctx: CanvasRenderingContext2D, p: WorldPedestrian, t: number) {
  const px = p.x;
  const py = p.y;
  const legSwing = Math.sin(p.walkCycle * 2.5) * 8;
  const bob = Math.abs(Math.sin(p.walkCycle * 2.5)) * 2;

  ctx.save();

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(px, py + 12, 10, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs & Shoes
  ctx.fillStyle = p.pantsColor;
  if (p.facing === 'E' || p.facing === 'W') {
    ctx.fillRect(px - 4 + legSwing * 0.6, py + 4, 8, 10);
  } else {
    ctx.fillRect(px - 6, py + 4 + legSwing * 0.4, 5, 10);
    ctx.fillRect(px + 1, py + 4 - legSwing * 0.4, 5, 10);
  }

  // Torso / Shirt
  ctx.fillStyle = p.shirtColor;
  ctx.fillRect(px - 9, py - 12 - bob, 18, 18);

  // Arms
  ctx.fillStyle = p.shirtColor;
  ctx.fillRect(px - 12, py - 10 - bob - legSwing * 0.3, 4, 12);
  ctx.fillRect(px + 8, py - 10 - bob + legSwing * 0.3, 4, 12);

  // Accessories: Briefcase or Coffee
  if (p.accessory === 'BRIEFCASE') {
    ctx.fillStyle = '#78350f';
    ctx.fillRect(px + 10, py - 2 - bob, 8, 7);
  } else if (p.accessory === 'HARDHAT') {
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(px, py - 22 - bob, 10, Math.PI, 0);
    ctx.fill();
  } else if (p.accessory === 'COFFEE') {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(px + 9, py - 6 - bob, 4, 6);
  }

  // Head & Skin
  ctx.fillStyle = p.skinColor;
  ctx.beginPath();
  ctx.arc(px, py - 19 - bob, 7.5, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  if (p.accessory !== 'HARDHAT') {
    ctx.fillStyle = p.hairColor;
    ctx.beginPath();
    ctx.arc(px, py - 22 - bob, 7.5, Math.PI, 0);
    ctx.fill();
  }

  // -------------------------------------------------------------
  // PET DOG ON LEASH
  // -------------------------------------------------------------
  if (p.hasDog) {
    const dogDist = 28;
    // Dog trots slightly to the right or behind
    const dogX = px + (p.facing === 'W' ? 24 : -24);
    const dogY = py + 4 + Math.sin(t * 8) * 1.5;
    const tailWag = Math.sin(t * 16) * 5;

    // Leash connecting citizen's hand to dog collar
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(px + (p.facing === 'W' ? 10 : -10), py - 4 - bob);
    ctx.lineTo(dogX, dogY - 4);
    ctx.stroke();

    // Dog shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(dogX, dogY + 7, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dog body
    ctx.fillStyle = p.dogColor;
    ctx.beginPath();
    ctx.roundRect(dogX - 10, dogY - 4, 20, 10, 3);
    ctx.fill();

    // Dog legs (trotting)
    const dLeg = Math.sin(t * 14) * 3;
    ctx.fillStyle = p.dogColor;
    ctx.fillRect(dogX - 8, dogY + 4, 3, 5 + dLeg);
    ctx.fillRect(dogX + 4, dogY + 4, 3, 5 - dLeg);

    // Dog head
    const headSide = p.facing === 'W' ? -1 : 1;
    ctx.beginPath();
    ctx.arc(dogX + headSide * 8, dogY - 6, 5, 0, Math.PI * 2);
    ctx.fill();

    // Dog snout
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(dogX + headSide * 11, dogY - 6, 2, 2);

    // Floppy ears
    ctx.fillStyle = '#78350f';
    ctx.fillRect(dogX + headSide * 5, dogY - 9, 3, 5);

    // Wagging tail
    ctx.strokeStyle = p.dogColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(dogX - headSide * 8, dogY - 2);
    ctx.lineTo(dogX - headSide * 14, dogY - 8 + tailWag);
    ctx.stroke();
  }

  // -------------------------------------------------------------
  // SPEECH BUBBLE & DESTINATION INDICATOR
  // -------------------------------------------------------------
  if (p.speechBubble) {
    ctx.font = 'bold 11px sans-serif';
    const textWidth = ctx.measureText(p.speechBubble).width;
    const bubbleW = textWidth + 14;
    const bubbleH = 22;
    const bx = px - bubbleW / 2;
    const by = py - 46 - bob;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bx, by, bubbleW, bubbleH, 6);
    ctx.fill();
    ctx.stroke();

    // Bubble pointer down to citizen
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.moveTo(px - 4, by + bubbleH);
    ctx.lineTo(px, by + bubbleH + 5);
    ctx.lineTo(px + 4, by + bubbleH);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.speechBubble, px, by + bubbleH / 2);
  } else if (p.state === 'WALKING' && p.targetName) {
    // Destination indicator pill showing citizens know where they are going
    ctx.font = 'bold 9.5px sans-serif';
    const label = `📍 ${p.targetName}`;
    const textWidth = ctx.measureText(label).width;
    const badgeW = textWidth + 12;
    const badgeH = 17;
    const bx = px - badgeW / 2;
    const by = py - 38 - bob;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#38bdf888';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bx, by, badgeW, badgeH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#7dd3fc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, px, by + badgeH / 2);
  }

  ctx.restore();
}

/**
 * Render a cute little cat roaming around
 */
export function drawWorldCat(ctx: CanvasRenderingContext2D, c: WorldCat, t: number) {
  const cx = c.x;
  const cy = c.y;
  const tailWave = Math.sin(t * 4 + c.tailPhase) * 6;

  ctx.save();

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 5, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  let bodyColor = '#f97316'; // orange tabby
  let stripeColor = '#c2410c';

  if (c.breed === 'CALICO') {
    bodyColor = '#f8fafc';
    stripeColor = '#ea580c';
  } else if (c.breed === 'TUXEDO' || c.breed === 'BLACK') {
    bodyColor = '#0f172a';
    stripeColor = '#334155';
  } else if (c.breed === 'WHITE') {
    bodyColor = '#f8fafc';
    stripeColor = '#e2e8f0';
  } else if (c.breed === 'SIAMESE') {
    bodyColor = '#fef3c7';
    stripeColor = '#78350f';
  }

  const side = c.facing === 'W' ? -1 : 1;

  if (c.state === 'SLEEPING') {
    // Curled up sleeping ball
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();

    // Cute curled tail
    ctx.strokeStyle = stripeColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI);
    ctx.stroke();

    // Tiny Zzz
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('z', cx + 6, cy - 8);
    ctx.restore();
    return;
  }

  // Cat body
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.roundRect(cx - 7, cy - 3, 14, 7, 3);
  ctx.fill();

  // Calico or tabby spots
  if (c.breed === 'ORANGE_TABBY' || c.breed === 'CALICO') {
    ctx.fillStyle = stripeColor;
    ctx.fillRect(cx - 3, cy - 3, 2, 6);
    ctx.fillRect(cx + 1, cy - 3, 2, 6);
  }

  // Tiny legs
  ctx.fillStyle = bodyColor;
  ctx.fillRect(cx - 5, cy + 3, 2, 3);
  ctx.fillRect(cx + 3, cy + 3, 2, 3);

  // Cat head with pointed ears
  ctx.beginPath();
  ctx.arc(cx + side * 6, cy - 4, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Pointy ears
  ctx.fillStyle = stripeColor;
  ctx.beginPath();
  ctx.moveTo(cx + side * 4, cy - 7);
  ctx.lineTo(cx + side * 6, cy - 10);
  ctx.lineTo(cx + side * 8, cy - 7);
  ctx.fill();

  // Curled arched tail
  ctx.strokeStyle = stripeColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - side * 6, cy);
  ctx.quadraticCurveTo(cx - side * 12, cy - 6 + tailWave * 0.4, cx - side * 10, cy - 10 + tailWave);
  ctx.stroke();

  ctx.restore();
}
