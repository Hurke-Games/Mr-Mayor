import { TileType, Tile } from '../../types';
import { GRID_SIZE } from '../../constants';

export const WORLD_TILE_PX = 480;

export interface LivingCar {
  id: string;
  x: number;
  y: number;
  dir: 'E' | 'W' | 'N' | 'S';
  speed: number;
  color: string;
  roofType: 'plain' | 'taxi' | 'rack' | 'sunroof';
  model: 'sedan' | 'cab' | 'suv' | 'van';
  turnCooldown: number;
}

export interface LivingPedestrian {
  id: string;
  x: number;
  y: number;
  dir: 'E' | 'W' | 'N' | 'S';
  speed: number;
  purpose: 'WORK' | 'PARK' | 'STROLL';
  destX: number;
  destY: number;
  shirtColor: string;
  pantsColor: string;
  hairColor: string;
  skinTone: string;
  accessory: 'none' | 'briefcase' | 'hardHat' | 'backpack';
  walkPhase: number;
  dog?: {
    breed: 'retriever' | 'terrier' | 'dalmatian' | 'shepherd';
    color: string;
    collarColor: string;
    tailWagPhase: number;
  };
}

export interface LivingCat {
  id: string;
  x: number;
  y: number;
  dir: 'E' | 'W' | 'N' | 'S';
  speed: number;
  coat: 'ginger' | 'tuxedo' | 'calico' | 'white' | 'gray';
  state: 'walk' | 'sit' | 'groom';
  stateTimer: number;
  tailWag: number;
}

export interface LivingWorldState {
  cars: LivingCar[];
  pedestrians: LivingPedestrian[];
  cats: LivingCat[];
  lastUpdate: number;
}

export const createInitialLivingWorld = (): LivingWorldState => ({
  cars: [],
  pedestrians: [],
  cats: [],
  lastUpdate: performance.now(),
});

// Vibrant palettes for clothing, vehicles, and pets
const VEHICLE_COLORS = [
  '#f59e0b', // Taxi Yellow
  '#0284c7', // Sky Blue Sedan
  '#dc2626', // Crimson Red
  '#1e293b', // Midnight Black Luxury
  '#10b981', // Emerald Green Compact
  '#f8fafc', // Pearl White SUV
  '#8b5cf6', // Violet Cruiser
  '#ea580c', // Orange Delivery Van
];

const SHIRT_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#475569', '#ffffff', '#1e293b'
];

const PANTS_COLORS = [
  '#1e293b', '#334155', '#1e3a8a', '#475569', '#0f172a', '#b45309'
];

const HAIR_COLORS = [
  '#1e293b', '#78350f', '#d97706', '#94a3b8', '#451a03', '#fef08a'
];

const SKIN_TONES = [
  '#fbd5b5', '#f3c198', '#d08b5b', '#ae5d29', '#6e3814', '#ffe4ce'
];

/**
 * Helper to check if a tile coordinate is within grid bounds
 */
const isValidTile = (gx: number, gy: number): boolean => {
  return gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE;
};

/**
 * Helper to get tile type safely
 */
const getTileType = (grid: Tile[], gx: number, gy: number): TileType => {
  if (!isValidTile(gx, gy)) return TileType.EMPTY;
  return grid[gy * GRID_SIZE + gx]?.type ?? TileType.EMPTY;
};

/**
 * Scan city grid for candidate destinations and road segments near the camera
 */
const getCityLandmarks = (grid: Tile[], camX: number, camY: number, radiusTiles: number = 16) => {
  const centerGx = Math.floor(camX / WORLD_TILE_PX);
  const centerGy = Math.floor(camY / WORLD_TILE_PX);

  const roadTiles: { x: number; y: number }[] = [];
  const parkTiles: { x: number; y: number }[] = [];
  const workTiles: { x: number; y: number }[] = [];
  const resTiles: { x: number; y: number }[] = [];

  const minGx = Math.max(0, centerGx - radiusTiles);
  const maxGx = Math.min(GRID_SIZE - 1, centerGx + radiusTiles);
  const minGy = Math.max(0, centerGy - radiusTiles);
  const maxGy = Math.min(GRID_SIZE - 1, centerGy + radiusTiles);

  for (let gy = minGy; gy <= maxGy; gy++) {
    for (let gx = minGx; gx <= maxGx; gx++) {
      const tile = grid[gy * GRID_SIZE + gx];
      if (!tile) continue;

      if (tile.type === TileType.ROAD) {
        roadTiles.push({ x: gx, y: gy });
      } else if (tile.type === TileType.PARK || tile.type === TileType.STATUE) {
        parkTiles.push({ x: gx, y: gy });
      } else if (tile.type === TileType.COMMERCIAL || tile.type === TileType.INDUSTRIAL) {
        workTiles.push({ x: gx, y: gy });
      } else if (tile.type === TileType.RESIDENTIAL) {
        resTiles.push({ x: gx, y: gy });
      }
    }
  }

  return { roadTiles, parkTiles, workTiles, resTiles };
};

/**
 * Update and simulate the living city entities:
 * Spawns, moves, steers, and scales cars, pedestrians, dogs, and cats based on population
 */
export const updateLivingEntities = (
  world: LivingWorldState,
  grid: Tile[],
  mayorPos: { x: number; y: number },
  population: number,
  dt: number,
  time: number
) => {
  const ts = WORLD_TILE_PX;
  const landmarks = getCityLandmarks(grid, mayorPos.x, mayorPos.y, 14);

  // Dynamic entity count target scaling:
  // Scales upward as city population grows from small town (120) to bustling metropolis (15,000+)
  const pop = Math.max(120, population);
  const targetCars = Math.min(36, Math.max(4, Math.floor(pop / 250) + 4));
  const targetPeds = Math.min(48, Math.max(6, Math.floor(pop / 180) + 6));
  const targetCats = Math.min(14, Math.max(3, Math.floor(pop / 500) + 3));

  // -------------------------------------------------------------------------
  // 1. CAR SIMULATION & SPAWNING
  // -------------------------------------------------------------------------
  if (landmarks.roadTiles.length > 0 && world.cars.length < targetCars) {
    const road = landmarks.roadTiles[Math.floor(Math.random() * landmarks.roadTiles.length)];
    const dirs: ('E' | 'W' | 'N' | 'S')[] = ['E', 'W', 'N', 'S'];
    const dir = dirs[Math.floor(Math.random() * dirs.length)];

    let spawnX = road.x * ts + ts / 2;
    let spawnY = road.y * ts + ts / 2;

    if (dir === 'E') { spawnY += 45; }
    else if (dir === 'W') { spawnY -= 45; }
    else if (dir === 'S') { spawnX -= 45; }
    else if (dir === 'N') { spawnX += 45; }

    const isCab = Math.random() < 0.25;
    const model: 'sedan' | 'cab' | 'suv' | 'van' = isCab 
      ? 'cab' 
      : Math.random() < 0.3 ? 'suv' : Math.random() < 0.2 ? 'van' : 'sedan';

    world.cars.push({
      id: `car_${Date.now()}_${Math.random()}`,
      x: spawnX,
      y: spawnY,
      dir,
      speed: 180 + Math.random() * 80,
      color: isCab ? '#f59e0b' : VEHICLE_COLORS[Math.floor(Math.random() * VEHICLE_COLORS.length)],
      roofType: isCab ? 'taxi' : Math.random() < 0.2 ? 'rack' : Math.random() < 0.3 ? 'sunroof' : 'plain',
      model,
      turnCooldown: 1.5 + Math.random() * 2,
    });
  }

  // Update existing cars
  const despawnDist = 18 * ts;
  for (let i = world.cars.length - 1; i >= 0; i--) {
    const car = world.cars[i];
    const distToMayor = Math.hypot(car.x - mayorPos.x, car.y - mayorPos.y);

    // Despawn if too far away from mayor or outside map
    if (distToMayor > despawnDist || car.x < 0 || car.x > GRID_SIZE * ts || car.y < 0 || car.y > GRID_SIZE * ts) {
      world.cars.splice(i, 1);
      continue;
    }

    // Drive in current direction
    let moveDist = car.speed * dt;
    if (car.dir === 'E') car.x += moveDist;
    else if (car.dir === 'W') car.x -= moveDist;
    else if (car.dir === 'S') car.y += moveDist;
    else if (car.dir === 'N') car.y -= moveDist;

    // Check road tile beneath car center
    const curGx = Math.floor(car.x / ts);
    const curGy = Math.floor(car.y / ts);
    const curTileType = getTileType(grid, curGx, curGy);

    car.turnCooldown -= dt;

    // If car drove off road, remove or turn
    if (curTileType !== TileType.ROAD) {
      world.cars.splice(i, 1);
      continue;
    }

    // Turn decision at intersections (when close to center of a tile)
    if (car.turnCooldown <= 0) {
      const tileCenterX = curGx * ts + ts / 2;
      const tileCenterY = curGy * ts + ts / 2;
      const distToCenter = Math.hypot(car.x - tileCenterX, car.y - tileCenterY);

      if (distToCenter < 60) {
        // Look for connected roads in 4 directions
        const hasE = getTileType(grid, curGx + 1, curGy) === TileType.ROAD;
        const hasW = getTileType(grid, curGx - 1, curGy) === TileType.ROAD;
        const hasS = getTileType(grid, curGx, curGy + 1) === TileType.ROAD;
        const hasN = getTileType(grid, curGx, curGy - 1) === TileType.ROAD;

        const options: ('E' | 'W' | 'N' | 'S')[] = [];
        if (hasE && car.dir !== 'W') options.push('E');
        if (hasW && car.dir !== 'E') options.push('W');
        if (hasS && car.dir !== 'N') options.push('S');
        if (hasN && car.dir !== 'S') options.push('N');

        // Turn randomly if options exist
        if (options.length > 0 && Math.random() < 0.4) {
          const nextDir = options[Math.floor(Math.random() * options.length)];
          car.dir = nextDir;
          car.turnCooldown = 2.0;

          // Realign to proper lane for new direction
          if (nextDir === 'E') car.y = curGy * ts + ts / 2 + 45;
          else if (nextDir === 'W') car.y = curGy * ts + ts / 2 - 45;
          else if (nextDir === 'S') car.x = curGx * ts + ts / 2 - 45;
          else if (nextDir === 'N') car.x = curGx * ts + ts / 2 + 45;
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // 2. PEDESTRIAN & DOG WALKER SIMULATION & SPAWNING
  // -------------------------------------------------------------------------
  if (world.pedestrians.length < targetPeds) {
    const startTile = (landmarks.resTiles.length > 0 && Math.random() < 0.6)
      ? landmarks.resTiles[Math.floor(Math.random() * landmarks.resTiles.length)]
      : (landmarks.roadTiles.length > 0)
      ? landmarks.roadTiles[Math.floor(Math.random() * landmarks.roadTiles.length)]
      : { x: Math.floor(mayorPos.x / ts), y: Math.floor(mayorPos.y / ts) };

    const purpose: 'WORK' | 'PARK' | 'STROLL' = (landmarks.workTiles.length > 0 && Math.random() < 0.45)
      ? 'WORK'
      : (landmarks.parkTiles.length > 0 && Math.random() < 0.35)
      ? 'PARK'
      : 'STROLL';

    let targetTile = startTile;
    if (purpose === 'WORK' && landmarks.workTiles.length > 0) {
      targetTile = landmarks.workTiles[Math.floor(Math.random() * landmarks.workTiles.length)];
    } else if (purpose === 'PARK' && landmarks.parkTiles.length > 0) {
      targetTile = landmarks.parkTiles[Math.floor(Math.random() * landmarks.parkTiles.length)];
    } else if (landmarks.roadTiles.length > 0) {
      targetTile = landmarks.roadTiles[Math.floor(Math.random() * landmarks.roadTiles.length)];
    }

    // Spawn on sidewalk
    const sx = startTile.x * ts + 42 + Math.random() * (ts - 84);
    const sy = startTile.y * ts + 42 + Math.random() * (ts - 84);
    const dx = targetTile.x * ts + ts / 2 + (Math.random() - 0.5) * 160;
    const dy = targetTile.y * ts + ts / 2 + (Math.random() - 0.5) * 160;

    // ~30% of pedestrians walk dogs!
    const hasDog = Math.random() < 0.32;
    const breeds: ('retriever' | 'terrier' | 'dalmatian' | 'shepherd')[] = ['retriever', 'terrier', 'dalmatian', 'shepherd'];
    const dogBreed = breeds[Math.floor(Math.random() * breeds.length)];
    const dogColor = dogBreed === 'retriever' ? '#d97706' : dogBreed === 'dalmatian' ? '#f8fafc' : dogBreed === 'terrier' ? '#78350f' : '#334155';

    world.pedestrians.push({
      id: `ped_${Date.now()}_${Math.random()}`,
      x: sx,
      y: sy,
      dir: dx > sx ? 'E' : 'W',
      speed: 75 + Math.random() * 45,
      purpose,
      destX: dx,
      destY: dy,
      shirtColor: SHIRT_COLORS[Math.floor(Math.random() * SHIRT_COLORS.length)],
      pantsColor: PANTS_COLORS[Math.floor(Math.random() * PANTS_COLORS.length)],
      hairColor: HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)],
      skinTone: SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)],
      accessory: purpose === 'WORK' 
        ? (Math.random() < 0.6 ? 'briefcase' : 'hardHat') 
        : (Math.random() < 0.3 ? 'backpack' : 'none'),
      walkPhase: Math.random() * Math.PI * 2,
      dog: hasDog ? {
        breed: dogBreed,
        color: dogColor,
        collarColor: Math.random() < 0.5 ? '#dc2626' : '#2563eb',
        tailWagPhase: Math.random() * Math.PI * 2,
      } : undefined,
    });
  }

  // Update existing pedestrians
  for (let i = world.pedestrians.length - 1; i >= 0; i--) {
    const ped = world.pedestrians[i];
    const distToMayor = Math.hypot(ped.x - mayorPos.x, ped.y - mayorPos.y);

    if (distToMayor > despawnDist) {
      world.pedestrians.splice(i, 1);
      continue;
    }

    // Step towards destination
    const toDx = ped.destX - ped.x;
    const toDy = ped.destY - ped.y;
    const distToDest = Math.hypot(toDx, toDy);

    if (distToDest < 30) {
      // Reached destination! Pick new destination or despawn
      if (Math.random() < 0.5 && landmarks.parkTiles.length > 0) {
        const pk = landmarks.parkTiles[Math.floor(Math.random() * landmarks.parkTiles.length)];
        ped.destX = pk.x * ts + ts / 2 + (Math.random() - 0.5) * 160;
        ped.destY = pk.y * ts + ts / 2 + (Math.random() - 0.5) * 160;
        ped.purpose = 'PARK';
      } else {
        world.pedestrians.splice(i, 1);
        continue;
      }
    } else {
      const moveStep = ped.speed * dt;
      const angle = Math.atan2(toDy, toDx);
      ped.x += Math.cos(angle) * moveStep;
      ped.y += Math.sin(angle) * moveStep;
      ped.walkPhase += dt * 10;

      if (Math.abs(toDx) > Math.abs(toDy)) {
        ped.dir = toDx > 0 ? 'E' : 'W';
      } else {
        ped.dir = toDy > 0 ? 'S' : 'N';
      }

      if (ped.dog) {
        ped.dog.tailWagPhase += dt * 14;
      }
    }
  }

  // -------------------------------------------------------------------------
  // 3. ROAMING CATS SIMULATION & SPAWNING
  // -------------------------------------------------------------------------
  if (world.cats.length < targetCats) {
    const coats: ('ginger' | 'tuxedo' | 'calico' | 'white' | 'gray')[] = ['ginger', 'tuxedo', 'calico', 'white', 'gray'];
    const chosenCoat = coats[Math.floor(Math.random() * coats.length)];

    // Spawn near sidewalks, park lawns, or brownstone steps
    const spawnTile = (landmarks.parkTiles.length > 0 && Math.random() < 0.5)
      ? landmarks.parkTiles[Math.floor(Math.random() * landmarks.parkTiles.length)]
      : (landmarks.resTiles.length > 0 && Math.random() < 0.5)
      ? landmarks.resTiles[Math.floor(Math.random() * landmarks.resTiles.length)]
      : { x: Math.floor(mayorPos.x / ts), y: Math.floor(mayorPos.y / ts) };

    const cx = spawnTile.x * ts + 60 + Math.random() * (ts - 120);
    const cy = spawnTile.y * ts + 60 + Math.random() * (ts - 120);

    world.cats.push({
      id: `cat_${Date.now()}_${Math.random()}`,
      x: cx,
      y: cy,
      dir: Math.random() < 0.5 ? 'E' : 'W',
      speed: 45 + Math.random() * 30,
      coat: chosenCoat,
      state: Math.random() < 0.4 ? 'sit' : 'walk',
      stateTimer: 3 + Math.random() * 5,
      tailWag: Math.random() * Math.PI * 2,
    });
  }

  // Update existing cats
  for (let i = world.cats.length - 1; i >= 0; i--) {
    const cat = world.cats[i];
    const distToMayor = Math.hypot(cat.x - mayorPos.x, cat.y - mayorPos.y);

    if (distToMayor > despawnDist) {
      world.cats.splice(i, 1);
      continue;
    }

    cat.stateTimer -= dt;
    cat.tailWag += dt * 4;

    if (cat.stateTimer <= 0) {
      // Transition state: walk, sit, groom, rest
      const states: ('walk' | 'sit' | 'groom')[] = ['walk', 'sit', 'groom'];
      cat.state = states[Math.floor(Math.random() * states.length)];
      cat.stateTimer = 2.5 + Math.random() * 4.5;

      if (cat.state === 'walk') {
        const dirs: ('E' | 'W' | 'N' | 'S')[] = ['E', 'W', 'N', 'S'];
        cat.dir = dirs[Math.floor(Math.random() * dirs.length)];
      }
    }

    if (cat.state === 'walk') {
      const step = cat.speed * dt;
      if (cat.dir === 'E') cat.x += step;
      else if (cat.dir === 'W') cat.x -= step;
      else if (cat.dir === 'S') cat.y += step;
      else if (cat.dir === 'N') cat.y -= step;
    }
  }

  world.lastUpdate = time;
};

/**
 * Render all living entities on canvas (Cars, Pedestrians, Dogs, Cats)
 */
export const renderLivingEntities = (
  ctx: CanvasRenderingContext2D,
  world: LivingWorldState,
  isDarkness: boolean,
  animTime: number
) => {
  // -------------------------------------------------------------------------
  // A. RENDER CARS
  // -------------------------------------------------------------------------
  for (const car of world.cars) {
    const cx = car.x;
    const cy = car.y;
    const isEW = car.dir === 'E' || car.dir === 'W';
    const carLen = 76;
    const carWid = 42;

    ctx.save();
    ctx.translate(cx, cy);

    // Rotate according to driving direction
    let angle = 0;
    if (car.dir === 'E') angle = 0;
    else if (car.dir === 'W') angle = Math.PI;
    else if (car.dir === 'S') angle = Math.PI / 2;
    else if (car.dir === 'N') angle = -Math.PI / 2;
    ctx.rotate(angle);

    // Car Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.roundRect(-carLen / 2 + 2, -carWid / 2 + 4, carLen + 4, carWid + 2, 8);
    ctx.fill();

    // Rubber Tires (4 wheels)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-carLen / 2 + 10, -carWid / 2 - 3, 16, 5);
    ctx.fillRect(carLen / 2 - 24, -carWid / 2 - 3, 16, 5);
    ctx.fillRect(-carLen / 2 + 10, carWid / 2 - 2, 16, 5);
    ctx.fillRect(carLen / 2 - 24, carWid / 2 - 2, 16, 5);

    // Vehicle Chassis / Body
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.roundRect(-carLen / 2, -carWid / 2, carLen, carWid, 7);
    ctx.fill();

    // Metallic chassis rim
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Cabin / Windshields
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(-carLen / 2 + 18, -carWid / 2 + 5, carLen - 34, carWid - 10, 5);
    ctx.fill();

    // Windshield glass reflections
    ctx.fillStyle = 'rgba(147, 197, 253, 0.55)'; // Light blue reflection
    // Front windshield
    ctx.fillRect(carLen / 2 - 22, -carWid / 2 + 7, 5, carWid - 14);
    // Rear windshield
    ctx.fillRect(-carLen / 2 + 19, -carWid / 2 + 7, 4, carWid - 14);

    // Roof Top
    ctx.fillStyle = car.color;
    ctx.fillRect(-carLen / 2 + 25, -carWid / 2 + 7, carLen - 48, carWid - 14);

    // Model-specific roof accents
    if (car.roofType === 'taxi') {
      // Glowing Taxi Roof Sign
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-6, -carWid / 2 + 14, 14, carWid - 28);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('TAXI', -4, 2);
    } else if (car.roofType === 'sunroof') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(-carLen / 2 + 28, -carWid / 2 + 10, 16, carWid - 20);
    } else if (car.roofType === 'rack') {
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-carLen / 2 + 25, -carWid / 2 + 7, carLen - 48, 2);
      ctx.fillRect(-carLen / 2 + 25, carWid / 2 - 9, carLen - 48, 2);
    }

    // Headlights (Front: +X direction in local coordinates)
    ctx.fillStyle = isDarkness ? '#fef08a' : '#ffffff';
    ctx.fillRect(carLen / 2 - 2, -carWid / 2 + 4, 3, 8);
    ctx.fillRect(carLen / 2 - 2, carWid / 2 - 12, 3, 8);

    // Taillights (Rear: -X direction)
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-carLen / 2 - 1, -carWid / 2 + 4, 2, 7);
    ctx.fillRect(-carLen / 2 - 1, carWid / 2 - 11, 2, 7);

    // Warm Headlight Cones on Road Asphalt when dark
    if (isDarkness) {
      ctx.save();
      const beamGrad = ctx.createRadialGradient(carLen / 2, 0, 10, carLen / 2 + 120, 0, 140);
      beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
      beamGrad.addColorStop(0.6, 'rgba(254, 240, 138, 0.15)');
      beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');

      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(carLen / 2, -carWid / 2 + 4);
      ctx.lineTo(carLen / 2 + 150, -carWid / 2 - 35);
      ctx.lineTo(carLen / 2 + 150, carWid / 2 + 35);
      ctx.lineTo(carLen / 2, carWid / 2 - 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  // -------------------------------------------------------------------------
  // B. RENDER PEDESTRIANS & DOG WALKERS
  // -------------------------------------------------------------------------
  for (const ped of world.pedestrians) {
    const px = ped.x;
    const py = ped.y;
    const stride = Math.sin(ped.walkPhase) * 9;
    const bob = Math.abs(Math.sin(ped.walkPhase)) * 2;

    // Pedestrian Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(px, py + 16, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = ped.pantsColor;
    if (ped.dir === 'E' || ped.dir === 'W') {
      ctx.fillRect(px - 5 + stride * 0.7, py + 4, 5, 12);
      ctx.fillRect(px + 1 - stride * 0.7, py + 4, 5, 12);
    } else {
      ctx.fillRect(px - 6, py + 4, 5, 12 + stride * 0.5);
      ctx.fillRect(px + 1, py + 4, 5, 12 - stride * 0.5);
    }

    // Torso (Shirt / Jacket)
    ctx.fillStyle = ped.shirtColor;
    ctx.beginPath();
    ctx.roundRect(px - 9, py - 14 + bob, 18, 19, 3);
    ctx.fill();

    // Head & Neck
    ctx.fillStyle = ped.skinTone;
    ctx.beginPath();
    ctx.arc(px, py - 20 + bob, 7, 0, Math.PI * 2);
    ctx.fill();

    // Hair / Hat
    ctx.fillStyle = ped.hairColor;
    if (ped.accessory === 'hardHat') {
      // Construction yellow safety helmet
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(px, py - 22 + bob, 8.5, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(px - 10, py - 22 + bob, 20, 3);
    } else {
      ctx.beginPath();
      ctx.arc(px, py - 23 + bob, 7.5, Math.PI, 0);
      ctx.fill();
    }

    // Accessories
    if (ped.accessory === 'briefcase') {
      // Commuter Leather Briefcase
      ctx.fillStyle = '#78350f';
      const bSide = ped.dir === 'W' ? px - 14 : px + 8;
      ctx.fillRect(bSide, py - 5 + bob, 7, 9);
      ctx.fillStyle = '#fbbf24'; // Brass lock
      ctx.fillRect(bSide + 2, py - 4 + bob, 3, 2);
    } else if (ped.accessory === 'backpack') {
      ctx.fillStyle = '#047857';
      const bpX = ped.dir === 'W' ? px + 3 : px - 11;
      ctx.fillRect(bpX, py - 12 + bob, 8, 12);
    }

    // -----------------------------------------------------------------------
    // DOG COMPANION (Trotting alongside on leash)
    // -----------------------------------------------------------------------
    if (ped.dog) {
      const dogOffset = ped.dir === 'W' ? -28 : 28;
      const dogX = px + dogOffset;
      const dogY = py + 8;
      const dogStride = Math.sin(ped.dog.tailWagPhase) * 6;
      const tailWag = Math.sin(ped.dog.tailWagPhase * 1.5) * 8;

      // Leash line from owner hand to dog collar
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(ped.dir === 'W' ? px - 7 : px + 7, py - 4 + bob);
      ctx.quadraticCurveTo(
        (px + dogX) / 2, 
        py + 2, 
        ped.dir === 'W' ? dogX + 10 : dogX - 10, 
        dogY - 6
      );
      ctx.stroke();

      // Dog Drop Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(dogX, dogY + 7, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dog Paws (Trotting)
      ctx.fillStyle = ped.dog.color;
      ctx.fillRect(dogX - 6 + dogStride * 0.6, dogY + 2, 3, 5);
      ctx.fillRect(dogX - 1 - dogStride * 0.6, dogY + 2, 3, 5);
      ctx.fillRect(dogX + 4 + dogStride * 0.6, dogY + 2, 3, 5);

      // Dog Body
      ctx.fillStyle = ped.dog.color;
      ctx.beginPath();
      ctx.roundRect(dogX - 9, dogY - 5, 18, 9, 3);
      ctx.fill();

      // Dalmatian spots
      if (ped.dog.breed === 'dalmatian') {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(dogX - 5, dogY - 3, 2, 2);
        ctx.fillRect(dogX + 2, dogY - 2, 2, 2);
        ctx.fillRect(dogX - 1, dogY - 1, 2, 2);
      }

      // Dog Head
      const headX = ped.dir === 'W' ? dogX - 9 : dogX + 9;
      ctx.fillStyle = ped.dog.color;
      ctx.beginPath();
      ctx.arc(headX, dogY - 4, 5, 0, Math.PI * 2);
      ctx.fill();

      // Snout & Nose
      ctx.fillStyle = '#000000';
      const noseX = ped.dir === 'W' ? headX - 4 : headX + 4;
      ctx.fillRect(noseX, dogY - 5, 2, 2);

      // Collar
      ctx.fillStyle = ped.dog.collarColor;
      ctx.fillRect(ped.dir === 'W' ? headX + 1 : headX - 3, dogY - 4, 2, 5);

      // Floppy / Perked Ear
      ctx.fillStyle = ped.dog.breed === 'retriever' ? '#b45309' : ped.dog.color;
      ctx.fillRect(headX - 1, dogY - 9, 3, 4);

      // Wagging Tail
      ctx.strokeStyle = ped.dog.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const tailBaseX = ped.dir === 'W' ? dogX + 9 : dogX - 9;
      ctx.moveTo(tailBaseX, dogY - 2);
      ctx.lineTo(ped.dir === 'W' ? tailBaseX + 7 : tailBaseX - 7, dogY - 8 + tailWag);
      ctx.stroke();
    }
  }

  // -------------------------------------------------------------------------
  // C. RENDER ROAMING CATS
  // -------------------------------------------------------------------------
  for (const cat of world.cats) {
    const cx = cat.x;
    const cy = cat.y;
    const isSitting = cat.state === 'sit' || cat.state === 'groom';
    const catTail = Math.sin(cat.tailWag) * 6;

    // Cat Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 6, isSitting ? 7 : 10, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cat Coat Colors
    let catMain = '#f97316'; // Ginger
    let catUnder = '#fed7aa';
    if (cat.coat === 'tuxedo') {
      catMain = '#0f172a';
      catUnder = '#ffffff';
    } else if (cat.coat === 'calico') {
      catMain = '#ea580c';
      catUnder = '#ffffff';
    } else if (cat.coat === 'white') {
      catMain = '#f8fafc';
      catUnder = '#f1f5f9';
    } else if (cat.coat === 'gray') {
      catMain = '#64748b';
      catUnder = '#94a3b8';
    }

    if (isSitting) {
      // Sitting Cat Body
      ctx.fillStyle = catMain;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 6, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // White chest patch
      if (cat.coat === 'tuxedo' || cat.coat === 'calico') {
        ctx.fillStyle = catUnder;
        ctx.fillRect(cx - 2, cy - 3, 4, 6);
      }

      // Cat Head
      ctx.fillStyle = catMain;
      ctx.beginPath();
      ctx.arc(cx, cy - 8, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Triangle Perked Ears
      ctx.fillStyle = catMain;
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy - 10);
      ctx.lineTo(cx - 2, cy - 14);
      ctx.lineTo(cx, cy - 10);
      ctx.moveTo(cx, cy - 10);
      ctx.lineTo(cx + 2, cy - 14);
      ctx.lineTo(cx + 4, cy - 10);
      ctx.fill();

      // Pink inner ears
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(cx - 3, cy - 12, 1.5, 2);
      ctx.fillRect(cx + 1.5, cy - 12, 1.5, 2);

      // Curled Swishing Tail
      ctx.strokeStyle = catMain;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 3, cy + 4);
      ctx.quadraticCurveTo(cx - 9 + catTail, cy + 6, cx - 8 + catTail, cy - 2);
      ctx.stroke();
    } else {
      // Walking Cat Body
      const pawStep = Math.sin(cat.tailWag * 2) * 3;

      // Paws
      ctx.fillStyle = catUnder;
      ctx.fillRect(cx - 5 + pawStep, cy + 2, 2, 4);
      ctx.fillRect(cx + 3 - pawStep, cy + 2, 2, 4);

      // Body
      ctx.fillStyle = catMain;
      ctx.beginPath();
      ctx.roundRect(cx - 7, cy - 4, 14, 7, 3);
      ctx.fill();

      // Head
      const hx = cat.dir === 'W' ? cx - 7 : cx + 7;
      ctx.fillStyle = catMain;
      ctx.beginPath();
      ctx.arc(hx, cy - 3, 4, 0, Math.PI * 2);
      ctx.fill();

      // Ears
      ctx.beginPath();
      ctx.moveTo(hx - 2, cy - 5);
      ctx.lineTo(hx - 1, cy - 8);
      ctx.lineTo(hx + 1, cy - 5);
      ctx.fill();

      // Swishing Tail
      ctx.strokeStyle = catMain;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const tx = cat.dir === 'W' ? cx + 7 : cx - 7;
      ctx.moveTo(tx, cy - 2);
      ctx.quadraticCurveTo(
        cat.dir === 'W' ? tx + 5 : tx - 5, 
        cy - 6 + catTail, 
        cat.dir === 'W' ? tx + 4 : tx - 4, 
        cy - 10 + catTail
      );
      ctx.stroke();
    }
  }
};
