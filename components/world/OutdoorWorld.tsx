import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { GRID_SIZE, COLORS, TICKS_PER_DAY, DAYS_PER_MONTH } from '../../constants';
import { TileType, Tile, CivilianRole, GamePhase } from '../../types';
import { officeAudio } from '../office/officeAudio';
import { 
  Building2, Compass, Play, Pause, Zap, 
  Volume2, VolumeX, ZoomIn, ZoomOut,
  Sun, Moon, MousePointer, Briefcase, Landmark, Home, Store, Factory, DollarSign, Vote, ArrowRight,
  Maximize2, Minimize2, Wind, Smile, ShieldAlert
} from 'lucide-react';
import { useFullscreen } from '../../utils/fullscreen';
import { 
  WorldEntitiesState, updateWorldEntities, drawWorldVehicle, drawWorldPedestrian, drawWorldCat 
} from './worldEntities';
import { BusinessmanHUD } from '../businessman/BusinessmanHUD';
import { BusinessModal } from '../businessman/BusinessModal';
import { PoliticsModal } from '../businessman/PoliticsModal';
import { PortfolioModal } from '../businessman/PortfolioModal';
import { HomeSanctuaryModal } from '../businessman/HomeSanctuaryModal';

interface OutdoorWorldProps {
  onEnterCityHall: () => void;
  onOpenDesk: () => void;
  onTileClick?: (index: number) => void;
  onReturnToMenu?: () => void;
}

// In the enlarged real world, everything is tripled in size!
// Base tile size is 480px (tripled from 160px) for a grand, massive street scale.
const WORLD_TILE_PX = 480;

// Businessman Residence Location (Tile 45, 52)
const HOME_TX = 45;
const HOME_TY = 52;
// Vance Estate Front Entrance & Courtyard on tile (45, 52)
const HOME_ESTATE_X = HOME_TX * WORLD_TILE_PX + WORLD_TILE_PX / 2; // 21840
const HOME_ESTATE_Y = HOME_TY * WORLD_TILE_PX + 240; // 25200 (main house entrance)
const HOME_GATE_Y = HOME_TY * WORLD_TILE_PX + 40; // 25000 (front gates)

// Street Exit & Spawn Location on Magnolia Boulevard (Tile 45, 51)
// Guaranteed open street roadway directly in front of the Vance Estate
const HOME_STREET_EXIT_X = HOME_TX * WORLD_TILE_PX + WORLD_TILE_PX / 2; // 21840
const HOME_STREET_EXIT_Y = 51 * WORLD_TILE_PX + WORLD_TILE_PX / 2; // 24720 (center of Magnolia Boulevard street)

// Mayor character speed scaled for human scale in the large city
const BASE_MAYOR_SPEED = 400; // pixels per second
const SPRINT_MAYOR_SPEED = 680; // sprint speed with Shift

// Mayor character collision bounding radius (1/3rd size: 16px)
const MAYOR_RADIUS = 16;

interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  label?: string;
}

export const OutdoorWorld: React.FC<OutdoorWorldProps> = ({ 
  onEnterCityHall, 
  onOpenDesk,
  onTileClick,
  onReturnToMenu,
}) => {
  const { state, dispatch } = useGame();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isBusinessman = state.civilianJob === CivilianRole.BUSINESS_OWNER || (!!state.businessman && state.role === GamePhase.CIVILIAN);

  // Living real-world entities: citizens going to parks/work, cars driving, dogs, cats
  const entitiesRef = useRef<WorldEntitiesState>({
    pedestrians: [],
    vehicles: [],
    cats: [],
  });

  // Character position in world pixels.
  // Businessman starts out on Magnolia Boulevard street (Tile 45, 51); Mayor starts at City Hall marble steps (49.5, 51.15)
  const [mayorPos, setMayorPos] = useState(() => {
    if (isBusinessman) {
      return { x: HOME_STREET_EXIT_X, y: HOME_STREET_EXIT_Y };
    }
    return {
      x: 49.5 * WORLD_TILE_PX,
      y: 51.15 * WORLD_TILE_PX,
    };
  });

  // Sync starting location when role changes
  useEffect(() => {
    if (isBusinessman) {
      setMayorPos({ x: HOME_STREET_EXIT_X, y: HOME_STREET_EXIT_Y });
      setFacing('N');
    }
  }, [isBusinessman]);

  // Autonomous Computer Mayor state (for Businessman mode)
  const [computerMayorPos, setComputerMayorPos] = useState({
    x: 49.5 * WORLD_TILE_PX,
    y: 51.5 * WORLD_TILE_PX,
  });
  const [computerMayorFacing, setComputerMayorFacing] = useState<'S' | 'N' | 'E' | 'W'>('S');
  const [computerMayorWalking, setComputerMayorWalking] = useState(false);
  const [computerMayorSpeech, setComputerMayorSpeech] = useState<string>('Inspecting city operations!');
  const computerMayorTargetRef = useRef<{ x: number; y: number } | null>(null);
  const computerMayorTimerRef = useRef<number>(2.0);

  // Businessman Modals state
  const [activeBusinessTileIndex, setActiveBusinessTileIndex] = useState<number | null>(null);
  const [showPoliticsModal, setShowPoliticsModal] = useState(false);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [showHomeModal, setShowHomeModal] = useState(false);

  const [facing, setFacing] = useState<'S' | 'N' | 'E' | 'W'>('S');
  const [isWalking, setIsWalking] = useState(false);
  const [isSprinting, setIsSprinting] = useState(false);
  const [targetPos, setTargetPos] = useState<{ x: number; y: number } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraZoom, setCameraZoom] = useState(1.0); // Close 3rd person perspective

  // Real world time-of-day: 60 minutes real time = 24 in-game hours (1,440 in-game minutes)
  // Starts at 08:00 AM bright morning (480 minutes)
  const timeOfDayMinutesRef = useRef(480);
  const lastHudMinRef = useRef(480);
  const [hudTime, setHudTime] = useState({ hour: 8, minute: 0, isNight: false, ampm: 'AM' });

  // Animation frame timing
  const animTimeRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const stepSoundCooldown = useRef(0);
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Proximity to City Hall entrance doors (around 49.5 * 480, 50.75 * 480)
  // Distance threshold tripled to 360px
  const isNearCityHallEntrance = useMemo(() => {
    const doorX = 49.5 * WORLD_TILE_PX;
    const doorY = 50.75 * WORLD_TILE_PX;
    const dist = Math.hypot(mayorPos.x - doorX, mayorPos.y - doorY);
    return dist < 360;
  }, [mayorPos]);

  // Proximity to Computer Mayor (for lobbying / diplomacy)
  const isNearComputerMayor = useMemo(() => {
    if (!isBusinessman) return false;
    const dist = Math.hypot(mayorPos.x - computerMayorPos.x, mayorPos.y - computerMayorPos.y);
    return dist < 220;
  }, [isBusinessman, mayorPos, computerMayorPos]);

  // Proximity to Vance Residence & Executive Home Office (Tile 45, 52)
  // Tightened so it only triggers when near the estate gate curb (leaving Magnolia Blvd street completely free)
  const isNearHome = useMemo(() => {
    if (!isBusinessman) return false;
    const dist = Math.hypot(mayorPos.x - HOME_ESTATE_X, mayorPos.y - HOME_GATE_Y);
    return dist < 140;
  }, [isBusinessman, mayorPos]);

  // Find nearby Commercial / Industrial property to buy or manage
  const nearbyCommercialOrIndustrial = useMemo(() => {
    if (!isBusinessman) return null;
    const playerTx = Math.floor(mayorPos.x / WORLD_TILE_PX);
    const playerTy = Math.floor(mayorPos.y / WORLD_TILE_PX);
    
    let bestCandidate: { index: number; tile: Tile; dist: number } | null = null;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tx = playerTx + dx;
        const ty = playerTy + dy;
        if (tx < 0 || tx >= GRID_SIZE || ty < 0 || ty >= GRID_SIZE) continue;
        const idx = ty * GRID_SIZE + tx;
        const tile = state.grid[idx];
        if (tile && (tile.type === TileType.COMMERCIAL || tile.type === TileType.INDUSTRIAL)) {
          const tileCenterX = tx * WORLD_TILE_PX + WORLD_TILE_PX / 2;
          const tileCenterY = ty * WORLD_TILE_PX + WORLD_TILE_PX / 2;
          const dist = Math.hypot(mayorPos.x - tileCenterX, mayorPos.y - tileCenterY);
          if (dist < 320 && (!bestCandidate || dist < bestCandidate.dist)) {
            bestCandidate = { index: idx, tile, dist };
          }
        }
      }
    }
    return bestCandidate;
  }, [isBusinessman, mayorPos, state.grid]);

  const ownedNearbyBiz = useMemo(() => {
    if (!nearbyCommercialOrIndustrial || !state.businessman) return null;
    return state.businessman.businesses.find(b => b.tileIndex === nearbyCommercialOrIndustrial.index) || null;
  }, [nearbyCommercialOrIndustrial, state.businessman]);

  // Handle entering City Hall
  const handleEnterCityHall = useCallback(() => {
    officeAudio.playStandUp();
    onEnterCityHall();
  }, [onEnterCityHall]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
      keysPressed.current[e.key] = true;

      if (e.shiftKey) {
        setIsSprinting(true);
      }

      if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) || ['W', 'A', 'S', 'D'].includes(e.key)) {
        setTargetPos(null);
      }

      if (e.key.toLowerCase() === 'e' || e.key === ' ') {
        if (isNearComputerMayor) {
          e.preventDefault();
          officeAudio.playClick();
          setShowPoliticsModal(true);
          return;
        }
        if (isNearHome) {
          e.preventDefault();
          officeAudio.playClick();
          setShowHomeModal(true);
          return;
        }
        if (nearbyCommercialOrIndustrial) {
          e.preventDefault();
          officeAudio.playClick();
          setActiveBusinessTileIndex(nearbyCommercialOrIndustrial.index);
          return;
        }
        if (isNearCityHallEntrance) {
          e.preventDefault();
          if (isBusinessman) {
            officeAudio.playClick();
            setShowPoliticsModal(true);
          } else {
            handleEnterCityHall();
          }
          return;
        }
      }

      if (e.key.toLowerCase() === 'm') {
        onOpenDesk();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
      keysPressed.current[e.key] = false;
      if (!e.shiftKey) {
        setIsSprinting(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    isNearCityHallEntrance, 
    isNearComputerMayor, 
    isNearHome, 
    nearbyCommercialOrIndustrial, 
    isBusinessman, 
    handleEnterCityHall, 
    onOpenDesk
  ]);

  // Canvas click: walk, select, or build on the world map
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const cw = canvas.width;
    const ch = canvas.height;

    // Convert screen coordinates to world coordinates based on camera centered on player
    const worldX = mayorPos.x + (mouseX - cw / 2) / cameraZoom;
    const worldY = mayorPos.y + (mouseY - ch / 2) / cameraZoom;

    // Check click near Computer Mayor
    if (isBusinessman && Math.hypot(worldX - computerMayorPos.x, worldY - computerMayorPos.y) < 80) {
      officeAudio.playClick();
      setShowPoliticsModal(true);
      return;
    }

    // Check click near Vance Estate
    // Only intercept if clicked specifically on the estate grounds (y >= 52 * WORLD_TILE_PX - 20)
    // Clicks on Magnolia Boulevard street (y < 52 * WORLD_TILE_PX - 20) will WALK the character along the street!
    if (isBusinessman && worldY >= 52 * WORLD_TILE_PX - 20 && worldY <= 53 * WORLD_TILE_PX) {
      if (Math.abs(worldX - HOME_ESTATE_X) < 180) {
        officeAudio.playClick();
        setShowHomeModal(true);
        return;
      }
    }

    // Check click on Commercial or Industrial parcel to buy or manage
    if (isBusinessman) {
      const clickTx = Math.floor(worldX / WORLD_TILE_PX);
      const clickTy = Math.floor(worldY / WORLD_TILE_PX);
      if (clickTx >= 0 && clickTx < GRID_SIZE && clickTy >= 0 && clickTy < GRID_SIZE) {
        const clickIdx = clickTy * GRID_SIZE + clickTx;
        const clickedTile = state.grid[clickIdx];
        if (clickedTile && (clickedTile.type === TileType.COMMERCIAL || clickedTile.type === TileType.INDUSTRIAL)) {
          const distToClick = Math.hypot(mayorPos.x - worldX, mayorPos.y - worldY);
          if (distToClick < 450) {
            officeAudio.playClick();
            setActiveBusinessTileIndex(clickIdx);
            return;
          }
        }
      }
    }

    // Walk the character to clicked destination
    const maxWorld = GRID_SIZE * WORLD_TILE_PX;
    setTargetPos({
      x: Math.max(100, Math.min(maxWorld - 100, worldX)),
      y: Math.max(100, Math.min(maxWorld - 100, worldY)),
    });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldX = mayorPos.x + (mouseX - canvas.width / 2) / cameraZoom;
    const worldY = mayorPos.y + (mouseY - canvas.height / 2) / cameraZoom;
    const maxWorld = GRID_SIZE * WORLD_TILE_PX;
    setTargetPos({
      x: Math.max(100, Math.min(maxWorld - 100, worldX)),
      y: Math.max(100, Math.min(maxWorld - 100, worldY)),
    });
  };

  // Resize handling
  useEffect(() => {
    const updateSize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      canvasRef.current.width = containerRef.current.clientWidth;
      canvasRef.current.height = containerRef.current.clientHeight;
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Road autotiling helper
  const getRoadConnections = (grid: Tile[], x: number, y: number): number => {
    let mask = 0;
    if (y > 0 && grid[(y - 1) * GRID_SIZE + x]?.type === TileType.ROAD) mask |= 1;
    if (x < GRID_SIZE - 1 && grid[y * GRID_SIZE + (x + 1)]?.type === TileType.ROAD) mask |= 2;
    if (y < GRID_SIZE - 1 && grid[(y + 1) * GRID_SIZE + x]?.type === TileType.ROAD) mask |= 4;
    if (x > 0 && grid[y * GRID_SIZE + (x - 1)]?.type === TileType.ROAD) mask |= 8;
    return mask;
  };

  // Deterministic wildflower & grass patterns on unbuilt plains
  const getGrassPattern = (x: number, y: number) => {
    const seed = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
    return {
      flowerType: Math.abs(seed) % 6,
      f1X: (Math.abs(seed >> 3) % 330) + 75,
      f1Y: (Math.abs(seed >> 7) % 330) + 75,
      f2X: (Math.abs(seed >> 11) % 330) + 75,
      f2Y: (Math.abs(seed >> 15) % 330) + 75,
      tuft1X: (Math.abs(seed >> 17) % 300) + 90,
      tuft1Y: (Math.abs(seed >> 19) % 300) + 90,
    };
  };

  // ---------------------------------------------------------------------------
  // BUILDING OBJECT PHYSICS (COLLISION BOXES GENERATOR - ALL TRIPLED!)
  // ---------------------------------------------------------------------------
  const getNearbyCollisionObstacles = useCallback((currX: number, currY: number): BoundingBox[] => {
    const obstacles: BoundingBox[] = [];
    const ts = WORLD_TILE_PX; // 480px
    const centerTileX = Math.floor(currX / ts);
    const centerTileY = Math.floor(currY / ts);

    // Scan 3 tiles in every direction for obstacles
    for (let ty = Math.max(0, centerTileY - 3); ty <= Math.min(GRID_SIZE - 1, centerTileY + 3); ty++) {
      for (let tx = Math.max(0, centerTileX - 3); tx <= Math.min(GRID_SIZE - 1, centerTileX + 3); tx++) {
        const tile = state.grid[ty * GRID_SIZE + tx];
        if (tile.type === TileType.EMPTY || tile.type === TileType.ROAD) continue;

        const px = tx * ts;
        const py = ty * ts;

        // 1. City Hall (3x3 Civic Palace - 1440px x 1440px)
        if (tile.type === TileType.MAYORS_OFFICE && !tile.isMultiPart) {
          const s3 = ts * 3; // 1440px
          // West Wing solid mass
          obstacles.push({
            minX: px + 60,
            minY: py + 120,
            maxX: px + s3 * 0.35,
            maxY: py + s3 * 0.75,
            label: "City Hall West Wing",
          });
          // East Wing solid mass
          obstacles.push({
            minX: px + s3 * 0.65,
            minY: py + 120,
            maxX: px + s3 - 60,
            maxY: py + s3 * 0.75,
            label: "City Hall East Wing",
          });
          // Central Rotunda Main Back Structure
          obstacles.push({
            minX: px + s3 * 0.35,
            minY: py + 60,
            maxX: px + s3 * 0.65,
            maxY: py + s3 * 0.52,
            label: "City Hall Rotunda",
          });
          // Front Plaza Bronze Fountain pool obstacle (tripled: radius 108px)
          const fX = px + s3 / 2;
          const fY = py + s3 - 210;
          obstacles.push({
            minX: fX - 108,
            minY: fY - 108,
            maxX: fX + 108,
            maxY: fY + 108,
            label: "Mayor Statue Fountain",
          });
          // Note: The grand staircase and entrance doors path between X: 0.35..0.65 and Y: 0.52..0.85 remains walkable!
          continue;
        }

        // 2. 3x3 Merged Residential Superblocks (1440px x 1440px)
        if (tile.isMerged3x3 && !tile.isMultiPart) {
          const s3 = ts * 3;
          obstacles.push({
            minX: px + 90,
            minY: py + 90,
            maxX: px + s3 - 90,
            maxY: py + s3 - 90,
            label: "Residential Superblock Complex",
          });
          continue;
        }

        // 3. Power Plant (2x2 - 960px x 960px)
        if (tile.type === TileType.POWER_PLANT && !tile.isMultiPart) {
          const s2 = ts * 2;
          obstacles.push({
            minX: px + 75,
            minY: py + 75,
            maxX: px + s2 - 75,
            maxY: py + s2 - 75,
            label: "Power Plant Reactor Facility",
          });
          continue;
        }

        // 4. University (2x2 - 960px x 960px)
        if (tile.type === TileType.UNIVERSITY && !tile.isMultiPart) {
          const s2 = ts * 2;
          // North lecture hall
          obstacles.push({
            minX: px + 90,
            minY: py + 60,
            maxX: px + s2 - 90,
            maxY: py + s2 * 0.45,
            label: "Collegiate Academic Hall",
          });
          // South research labs
          obstacles.push({
            minX: px + 90,
            minY: py + s2 * 0.65,
            maxX: px + s2 - 90,
            maxY: py + s2 - 60,
            label: "University Research Complex",
          });
          continue;
        }

        // 5. Botanical Parks (Open walkable ground with center fountain basin obstacle)
        if (tile.type === TileType.PARK) {
          obstacles.push({
            minX: px + ts / 2 - 45,
            minY: py + ts / 2 - 45,
            maxX: px + ts / 2 + 45,
            maxY: py + ts / 2 + 45,
            label: "Botanical Park Fountain",
          });
          continue;
        }

        // 6. Civic Heroic Statue (Open walkable plaza with center pedestal obstacle)
        if (tile.type === TileType.STATUE) {
          obstacles.push({
            minX: px + ts / 2 - 35,
            minY: py + ts / 2 - 35,
            maxX: px + ts / 2 + 35,
            maxY: py + ts / 2 + 35,
            label: "Civic Statue Pedestal",
          });
          continue;
        }

        // 7. Standard 1x1 Buildings (Police, Fire, School, Residential Lv1-3, Commercial Lv1-3, Industrial Lv1-3)
        // Footprint is 480px x 480px. Solid core leaving 78px sidewalks walkable around edges!
        if (!tile.isMultiPart) {
          if (tile.level === 0) continue; // Zoned plot is flat dirt & walkable

          if (isBusinessman && tx === HOME_TX && ty === HOME_TY) {
            // Vance Estate Mansion (leaves front courtyard, gates, and entire driveway open from py to py + 185)
            obstacles.push({
              minX: px + 80,
              minY: py + 185,
              maxX: px + ts - 80,
              maxY: py + ts - 40,
              label: "Vance Estate Mansion",
            });
            continue;
          }

          obstacles.push({
            minX: px + 84,
            minY: py + 72,
            maxX: px + ts - 84,
            maxY: py + ts - 72,
            label: "Building",
          });
        }
      }
    }

    return obstacles;
  }, [state.grid, isBusinessman]);

  // Circle vs AABB collision test
  const checkCircleBoxCollision = (cx: number, cy: number, r: number, box: BoundingBox): boolean => {
    const closestX = Math.max(box.minX, Math.min(cx, box.maxX));
    const closestY = Math.max(box.minY, Math.min(cy, box.maxY));
    const distX = cx - closestX;
    const distY = cy - closestY;
    return (distX * distX + distY * distY) < (r * r);
  };

  // Main outdoor world game loop
  useEffect(() => {
    let rafId: number;
    let active = true;

    const loop = (currentTimestamp: number) => {
      const dt = Math.min(0.08, (currentTimestamp - lastTimeRef.current) / 1000);
      lastTimeRef.current = currentTimestamp;
      animTimeRef.current += dt;
      const t = animTimeRef.current;

      // Advance real-world day & night cycle:
      // 60 minutes real time = 3600 seconds = 1440 in-game minutes at 1x speed.
      // Rate = 1440 / 3600 = 0.4 in-game minutes per real second.
      if (state.speed > 0) {
        const ratePerSec = 0.4 * state.speed;
        timeOfDayMinutesRef.current = (timeOfDayMinutesRef.current + dt * ratePerSec) % 1440;
      }

      // Update HUD clock state smoothly
      const curM = Math.floor(timeOfDayMinutesRef.current);
      if (curM !== lastHudMinRef.current) {
        lastHudMinRef.current = curM;
        const h24 = Math.floor(curM / 60);
        const m = curM % 60;
        const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
        const ampm = h24 >= 12 ? 'PM' : 'AM';
        const isNight = h24 >= 20 || h24 < 6;
        setHudTime({ hour: h12, minute: m, isNight, ampm });
      }

      // Update living entities in the real world (citizens going to work/parks, dogs, cars, cats)
      entitiesRef.current = updateWorldEntities(
        entitiesRef.current,
        state.grid,
        state.population,
        dt,
        mayorPos.x,
        mayorPos.y
      );

      // Autonomous Computer Mayor AI & strolls around Civic Center (when in Businessman mode)
      if (isBusinessman && state.computerMayor) {
        computerMayorTimerRef.current -= dt;
        if (computerMayorTimerRef.current <= 0) {
          computerMayorTimerRef.current = 4.0 + Math.random() * 5.0;
          // Choose target waypoint around civic plaza sidewalks (X: 47.8..51.5, Y: 50.8..53.2)
          const targetTx = 47.8 + Math.random() * 3.7;
          const targetTy = 50.8 + Math.random() * 2.4;
          computerMayorTargetRef.current = {
            x: targetTx * WORLD_TILE_PX,
            y: targetTy * WORLD_TILE_PX,
          };
          setComputerMayorWalking(true);

          const isHonestMayor = state.computerMayor.alignment === 'HONEST';
          const rel = state.computerMayor.relationWithPlayer;
          const distToPlayer = Math.hypot(mayorPos.x - computerMayorPos.x, mayorPos.y - computerMayorPos.y);

          if (distToPlayer < 280) {
            if (isHonestMayor && rel >= 20) {
              setComputerMayorSpeech("Vance! Clean business builds a strong New Veridia. 🏛️");
            } else if (isHonestMayor && rel < 0) {
              setComputerMayorSpeech("Inspectors are examining your sweatshops, Vance. ⚠️");
            } else if (!isHonestMayor && rel >= 20) {
              setComputerMayorSpeech("Victor, my partner! Our slush subsidies flow freely. 💰");
            } else if (!isHonestMayor && rel < 0) {
              setComputerMayorSpeech("Pay your municipal compliance surcharges, Vance. ⚖️");
            } else {
              setComputerMayorSpeech("Managing New Veridia requires iron municipal authority.");
            }
          } else {
            const activeProj = state.computerMayor.currentProject;
            if (activeProj && Math.random() < 0.45) {
              setComputerMayorSpeech(`Active Works: ${activeProj}! 🏗️`);
            } else if (isHonestMayor) {
              const sayings = [
                "Allocating subsidies to ethical small business! 🌿",
                "Reviewing environmental and hospital standards. 🏥",
                "Parks and schools are the foundation of our city. 🌳",
                "Paving walkable boulevards for our citizens! 🛣️",
                "New Veridia will not tolerate kickbacks or graft! ⚖️",
              ];
              setComputerMayorSpeech(sayings[Math.floor(Math.random() * sayings.length)]);
            } else {
              const sayings = [
                "Expanding our industrial machine factories! 🏭",
                "A healthy corporate donation keeps City Hall happy! 💼",
                "Approving discretionary commercial slush funds. 🏦",
                "Deregulating zoning for our corporate partners! 🏗️",
                "The party machine maintains supreme control. 🏛️",
              ];
              setComputerMayorSpeech(sayings[Math.floor(Math.random() * sayings.length)]);
            }
          }
        }

        // Move Computer Mayor towards target waypoint
        if (computerMayorTargetRef.current) {
          const cdx = computerMayorTargetRef.current.x - computerMayorPos.x;
          const cdy = computerMayorTargetRef.current.y - computerMayorPos.y;
          const cdist = Math.hypot(cdx, cdy);
          if (cdist > 16) {
            const cspeed = 135;
            const cstep = Math.min(cdist, cspeed * dt);
            const ncx = computerMayorPos.x + (cdx / cdist) * cstep;
            const ncy = computerMayorPos.y + (cdy / cdist) * cstep;
            setComputerMayorPos({ x: ncx, y: ncy });
            if (Math.abs(cdx) > Math.abs(cdy)) {
              setComputerMayorFacing(cdx > 0 ? 'E' : 'W');
            } else {
              setComputerMayorFacing(cdy > 0 ? 'S' : 'N');
            }
            setComputerMayorWalking(true);
          } else {
            computerMayorTargetRef.current = null;
            setComputerMayorWalking(false);
          }
        }
      }

      // 1. Movement Inputs
      let inputDx = 0;
      let inputDy = 0;
      const keys = keysPressed.current;

      if (keys['w'] || keys['W'] || keys['ArrowUp']) inputDy -= 1;
      if (keys['s'] || keys['S'] || keys['ArrowDown']) inputDy += 1;
      if (keys['a'] || keys['A'] || keys['ArrowLeft']) inputDx -= 1;
      if (keys['d'] || keys['D'] || keys['ArrowRight']) inputDx += 1;

      if (inputDx !== 0 && inputDy !== 0) {
        inputDx *= 0.7071;
        inputDy *= 0.7071;
      }

      // Click to walk navigation
      if (targetPos) {
        const toTargetX = targetPos.x - mayorPos.x;
        const toTargetY = targetPos.y - mayorPos.y;
        const dist = Math.hypot(toTargetX, toTargetY);

        if (dist > 10) {
          inputDx = toTargetX / dist;
          inputDy = toTargetY / dist;
        } else {
          setTargetPos(null);
        }
      }

      const moving = inputDx !== 0 || inputDy !== 0;
      setIsWalking(moving);

      if (moving) {
        if (Math.abs(inputDx) > Math.abs(inputDy)) {
          setFacing(inputDx > 0 ? 'E' : 'W');
        } else {
          setFacing(inputDy > 0 ? 'S' : 'N');
        }

        const moveSpeed = (isSprinting || keys['Shift']) ? SPRINT_MAYOR_SPEED : BASE_MAYOR_SPEED;
        const moveDistX = inputDx * moveSpeed * dt;
        const moveDistY = inputDy * moveSpeed * dt;

        // -------------------------------------------------------------
        // OBJECT PHYSICS & SLIDING COLLISION RESOLUTION (TRIPLED RADIUS)
        // -------------------------------------------------------------
        const obstacles = getNearbyCollisionObstacles(mayorPos.x, mayorPos.y);
        let nextX = mayorPos.x;
        let nextY = mayorPos.y;

        // Resolve X-axis movement
        const testX = mayorPos.x + moveDistX;
        let collideX = false;
        for (const obs of obstacles) {
          if (checkCircleBoxCollision(testX, mayorPos.y, MAYOR_RADIUS, obs)) {
            collideX = true;
            break;
          }
        }
        if (!collideX) {
          nextX = testX;
        }

        // Resolve Y-axis movement (allows smooth sliding along walls!)
        const testY = mayorPos.y + moveDistY;
        let collideY = false;
        for (const obs of obstacles) {
          if (checkCircleBoxCollision(nextX, testY, MAYOR_RADIUS, obs)) {
            collideY = true;
            break;
          }
        }
        if (!collideY) {
          nextY = testY;
        }

        // Anti-stuck safeguard: if character is ever inside an obstacle, smoothly push them out towards open ground
        for (const obs of obstacles) {
          if (nextX >= obs.minX && nextX <= obs.maxX && nextY >= obs.minY && nextY <= obs.maxY) {
            // Push towards closest obstacle edge; if near Vance Estate, bias North towards Magnolia Blvd street
            if (isBusinessman && Math.abs(nextX - HOME_ESTATE_X) < 320 && nextY > 24800 && nextY < 25500) {
              nextY = obs.minY - MAYOR_RADIUS - 8;
            } else {
              const dNorth = Math.abs(nextY - obs.minY);
              const dSouth = Math.abs(nextY - obs.maxY);
              const dWest = Math.abs(nextX - obs.minX);
              const dEast = Math.abs(nextX - obs.maxX);
              const minD = Math.min(dNorth, dSouth, dWest, dEast);
              if (minD === dNorth) nextY = obs.minY - MAYOR_RADIUS - 6;
              else if (minD === dSouth) nextY = obs.maxY + MAYOR_RADIUS + 6;
              else if (minD === dWest) nextX = obs.minX - MAYOR_RADIUS - 6;
              else nextX = obs.maxX + MAYOR_RADIUS + 6;
            }
          }
        }

        // Boundary limits
        const maxWorld = GRID_SIZE * WORLD_TILE_PX;
        nextX = Math.max(MAYOR_RADIUS + 20, Math.min(maxWorld - MAYOR_RADIUS - 20, nextX));
        nextY = Math.max(MAYOR_RADIUS + 20, Math.min(maxWorld - MAYOR_RADIUS - 20, nextY));

        setMayorPos({ x: nextX, y: nextY });

        // Footstep audio
        stepSoundCooldown.current -= dt;
        if (stepSoundCooldown.current <= 0 && soundEnabled) {
          officeAudio.playFootstep();
          stepSoundCooldown.current = isSprinting ? 0.22 : 0.32;
        }
      }

      // 2. Rendering
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const cw = canvas.width;
          const ch = canvas.height;
          const ts = WORLD_TILE_PX; // 480px

          // Smooth close 3rd-person follow camera centered on the Mayor
          const camX = mayorPos.x - (cw / 2) / cameraZoom;
          const camY = mayorPos.y - (ch / 2) / cameraZoom;

          // Clear background (Lush grassy meadow)
          ctx.fillStyle = '#14532d';
          ctx.fillRect(0, 0, cw, ch);

          ctx.save();
          // Scale for close 3rd-person perspective
          ctx.scale(cameraZoom, cameraZoom);
          ctx.translate(-camX, -camY);

          // Viewport culling bounds
          const minTileX = Math.max(0, Math.floor(camX / ts) - 1);
          const maxTileX = Math.min(GRID_SIZE - 1, Math.ceil((camX + cw / cameraZoom) / ts) + 1);
          const minTileY = Math.max(0, Math.floor(camY / ts) - 1);
          const maxTileY = Math.min(GRID_SIZE - 1, Math.ceil((camY + ch / cameraZoom) / ts) + 1);

          // -----------------------------------------------------------
          // LAYER 1: ROLLING GRASSY PLAINS & MEADOW TERRAIN (TRIPLED)
          // -----------------------------------------------------------
          for (let y = minTileY; y <= maxTileY; y++) {
            for (let x = minTileX; x <= maxTileX; x++) {
              const tile = state.grid[y * GRID_SIZE + x];
              const px = x * ts;
              const py = y * ts;

              // UNBUILT PLAIN: Natural, vast grassy meadow
              if (tile.type === TileType.EMPTY) {
                // Alternating natural meadow grass patches
                ctx.fillStyle = (x + y) % 2 === 0 ? '#15803d' : '#166534';
                ctx.fillRect(px, py, ts, ts);

                // Prairie grass blades & wildflowers (tripled dimensions)
                const pat = getGrassPattern(x, y);
                ctx.strokeStyle = '#22c55e44';
                ctx.lineWidth = 4.5;
                ctx.beginPath();
                ctx.moveTo(px + pat.tuft1X, py + pat.tuft1Y);
                ctx.lineTo(px + pat.tuft1X - 15, py + pat.tuft1Y - 36);
                ctx.moveTo(px + pat.tuft1X + 12, py + pat.tuft1Y);
                ctx.lineTo(px + pat.tuft1X + 24, py + pat.tuft1Y - 42);
                ctx.stroke();

                // Wildflowers scattered across natural plains
                if (pat.flowerType === 1) {
                  // Bluebonnets
                  ctx.fillStyle = '#38bdf8';
                  ctx.beginPath();
                  ctx.arc(px + pat.f1X, py + pat.f1Y, 12, 0, Math.PI * 2);
                  ctx.arc(px + pat.f2X, py + pat.f2Y, 9, 0, Math.PI * 2);
                  ctx.fill();
                } else if (pat.flowerType === 2) {
                  // Golden Dandelions
                  ctx.fillStyle = '#facc15';
                  ctx.beginPath();
                  ctx.arc(px + pat.f1X, py + pat.f1Y, 12, 0, Math.PI * 2);
                  ctx.arc(px + pat.f2X, py + pat.f2Y, 9, 0, Math.PI * 2);
                  ctx.fill();
                } else if (pat.flowerType === 3) {
                  // White Clover
                  ctx.fillStyle = '#f8fafc';
                  ctx.beginPath();
                  ctx.arc(px + pat.f1X, py + pat.f1Y, 10, 0, Math.PI * 2);
                  ctx.fill();
                }

                continue;
              }

              // -------------------------------------------------------
              // ROADS WITH CLEAR PAVED SIDEWALKS & STREET FURNITURE (TRIPLED)
              // -------------------------------------------------------
              if (tile.type === TileType.ROAD) {
                const sidewalkW = 78; // 78px wide paved pedestrian sidewalks!

                // Full tile concrete sidewalk base
                ctx.fillStyle = '#94a3b8'; // Paved concrete sidewalk
                ctx.fillRect(px, py, ts, ts);

                // Sidewalk concrete expansion lines
                ctx.strokeStyle = '#64748b66';
                ctx.lineWidth = 2.5;
                for (let sx = 0; sx < ts; sx += 96) {
                  ctx.beginPath();
                  ctx.moveTo(px + sx, py);
                  ctx.lineTo(px + sx, py + ts);
                  ctx.stroke();
                }
                for (let sy = 0; sy < ts; sy += 96) {
                  ctx.beginPath();
                  ctx.moveTo(px, py + sy);
                  ctx.lineTo(px + ts, py + sy);
                  ctx.stroke();
                }

                // Roadway Asphalt Center (Inside the sidewalks)
                ctx.fillStyle = '#334155'; // Dark asphalt
                ctx.fillRect(px + sidewalkW, py + sidewalkW, ts - sidewalkW * 2, ts - sidewalkW * 2);

                // Granite Curb stone border separating sidewalk from roadway
                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 7.5;
                ctx.strokeRect(px + sidewalkW, py + sidewalkW, ts - sidewalkW * 2, ts - sidewalkW * 2);

                const mask = getRoadConnections(state.grid, x, y);
                const isN = (mask & 1) !== 0;
                const isE = (mask & 2) !== 0;
                const isS = (mask & 4) !== 0;
                const isW = (mask & 8) !== 0;

                // Seamless roadway connections
                if (isN) {
                  ctx.fillStyle = '#334155';
                  ctx.fillRect(px + sidewalkW, py, ts - sidewalkW * 2, sidewalkW);
                  ctx.strokeStyle = '#cbd5e1';
                  ctx.lineWidth = 7.5;
                  ctx.beginPath();
                  ctx.moveTo(px + sidewalkW, py);
                  ctx.lineTo(px + sidewalkW, py + sidewalkW);
                  ctx.moveTo(px + ts - sidewalkW, py);
                  ctx.lineTo(px + ts - sidewalkW, py + sidewalkW);
                  ctx.stroke();
                }
                if (isS) {
                  ctx.fillStyle = '#334155';
                  ctx.fillRect(px + sidewalkW, py + ts - sidewalkW, ts - sidewalkW * 2, sidewalkW);
                  ctx.strokeStyle = '#cbd5e1';
                  ctx.lineWidth = 7.5;
                  ctx.beginPath();
                  ctx.moveTo(px + sidewalkW, py + ts - sidewalkW);
                  ctx.lineTo(px + sidewalkW, py + ts);
                  ctx.moveTo(px + ts - sidewalkW, py + ts - sidewalkW);
                  ctx.lineTo(px + ts - sidewalkW, py + ts);
                  ctx.stroke();
                }
                if (isW) {
                  ctx.fillStyle = '#334155';
                  ctx.fillRect(px, py + sidewalkW, sidewalkW, ts - sidewalkW * 2);
                  ctx.strokeStyle = '#cbd5e1';
                  ctx.lineWidth = 7.5;
                  ctx.beginPath();
                  ctx.moveTo(px, py + sidewalkW);
                  ctx.lineTo(px + sidewalkW, py + sidewalkW);
                  ctx.moveTo(px, py + ts - sidewalkW);
                  ctx.lineTo(px + sidewalkW, py + ts - sidewalkW);
                  ctx.stroke();
                }
                if (isE) {
                  ctx.fillStyle = '#334155';
                  ctx.fillRect(px + ts - sidewalkW, py + sidewalkW, sidewalkW, ts - sidewalkW * 2);
                  ctx.strokeStyle = '#cbd5e1';
                  ctx.lineWidth = 7.5;
                  ctx.beginPath();
                  ctx.moveTo(px + ts - sidewalkW, py + sidewalkW);
                  ctx.lineTo(px + ts, py + sidewalkW);
                  ctx.moveTo(px + ts - sidewalkW, py + ts - sidewalkW);
                  ctx.lineTo(px + ts, py + ts - sidewalkW);
                  ctx.stroke();
                }

                // Road Markings (Yellow Double Centerline or Zebra Crosswalks)
                const count = (isN ? 1 : 0) + (isE ? 1 : 0) + (isS ? 1 : 0) + (isW ? 1 : 0);

                if (count >= 3) {
                  // Intersection Zebra Crossings across the roadway (tripled stripes)
                  ctx.fillStyle = '#f8fafcaa';
                  if (isN) for (let k = sidewalkW + 24; k < ts - sidewalkW - 24; k += 48) ctx.fillRect(px + k, py + 6, 24, 54);
                  if (isS) for (let k = sidewalkW + 24; k < ts - sidewalkW - 24; k += 48) ctx.fillRect(px + k, py + ts - 60, 24, 54);
                  if (isW) for (let k = sidewalkW + 24; k < ts - sidewalkW - 24; k += 48) ctx.fillRect(px + 6, py + k, 54, 24);
                  if (isE) for (let k = sidewalkW + 24; k < ts - sidewalkW - 24; k += 48) ctx.fillRect(px + ts - 60, py + k, 54, 24);
                } else if (isN && isS) {
                  // Double Yellow Centerline (tripled width)
                  ctx.fillStyle = '#fbbf24';
                  ctx.fillRect(px + ts / 2 - 9, py + 12, 6, 96);
                  ctx.fillRect(px + ts / 2 + 3, py + 12, 6, 96);
                  ctx.fillRect(px + ts / 2 - 9, py + ts / 2 + 12, 6, 96);
                  ctx.fillRect(px + ts / 2 + 3, py + ts / 2 + 12, 6, 96);
                } else if (isE && isW) {
                  // Double Yellow Centerline
                  ctx.fillStyle = '#fbbf24';
                  ctx.fillRect(px + 12, py + ts / 2 - 9, 96, 6);
                  ctx.fillRect(px + 12, py + ts / 2 + 3, 96, 6);
                  ctx.fillRect(px + ts / 2 + 12, py + ts / 2 - 9, 96, 6);
                  ctx.fillRect(px + ts / 2 + 12, py + ts / 2 + 3, 96, 6);
                }

                // Sidewalk Amenities: Retro Streetlamp & Fire Hydrant (tripled)
                if ((x + y) % 3 === 0) {
                  // Cast-iron Streetlamp post on sidewalk
                  ctx.fillStyle = '#1e293b';
                  ctx.fillRect(px + 24, py + 24, 18, 18);
                  // Warm glowing amber lantern
                  ctx.fillStyle = '#fef08a';
                  ctx.beginPath();
                  ctx.arc(px + 33, py + 33, 12, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.fillStyle = 'rgba(254, 240, 138, 0.25)';
                  ctx.beginPath();
                  ctx.arc(px + 33, py + 33, 42, 0, Math.PI * 2);
                  ctx.fill();
                } else if ((x + y) % 4 === 1) {
                  // Red fire hydrant on sidewalk
                  ctx.fillStyle = '#ef4444';
                  ctx.fillRect(px + ts - 54, py + 24, 24, 30);
                  ctx.fillStyle = '#cbd5e1';
                  ctx.fillRect(px + ts - 60, py + 33, 36, 9);
                }

                continue;
              }
            }
          }

          // -----------------------------------------------------------
          // LAYER 1.5: DYNAMIC AUTOMOTIVE TRAFFIC (Cars Driving Around)
          // -----------------------------------------------------------
          const vehHalfW = (cw / cameraZoom) / 2 + 300;
          const vehHalfH = (ch / cameraZoom) / 2 + 300;

          for (const veh of entitiesRef.current.vehicles) {
            if (Math.abs(veh.x - mayorPos.x) < vehHalfW && Math.abs(veh.y - mayorPos.y) < vehHalfH) {
              drawWorldVehicle(ctx, veh, t, hudTime.isNight);
            }
          }

          // -----------------------------------------------------------
          // LAYER 2: BUILDINGS & LARGE MULTI-TILE STRUCTURES (TRIPLED)
          // -----------------------------------------------------------
          for (let y = minTileY; y <= maxTileY; y++) {
            for (let x = minTileX; x <= maxTileX; x++) {
              const tile = state.grid[y * GRID_SIZE + x];
              if (tile.type === TileType.EMPTY || tile.type === TileType.ROAD || tile.isMultiPart) continue;

              const px = x * ts;
              const py = y * ts;

              // -------------------------------------------------------
              // 1. CITY HALL (3x3 Civic Palace Dead Center - 1440px x 1440px)
              // -------------------------------------------------------
              if (tile.type === TileType.MAYORS_OFFICE) {
                const s3 = ts * 3; // 1440px x 1440px

                // Grand Plaza paving
                ctx.fillStyle = '#475569';
                ctx.fillRect(px, py, s3, s3);
                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 9;
                ctx.strokeRect(px + 18, py + 18, s3 - 36, s3 - 36);

                // Neoclassical Palace Wings
                ctx.fillStyle = '#f1f5f9';
                // West Wing (Solid building mass)
                ctx.fillRect(px + 60, py + 120, s3 * 0.3, s3 * 0.5);
                // East Wing (Solid building mass)
                ctx.fillRect(px + s3 * 0.7 - 60, py + 120, s3 * 0.3, s3 * 0.5);

                // Slate Roofs with stone balustrades
                ctx.fillStyle = '#334155';
                ctx.fillRect(px + 48, py + 102, s3 * 0.32, 48);
                ctx.fillRect(px + s3 * 0.68 - 48, py + 102, s3 * 0.32, 48);

                // Glowing arched executive windows
                ctx.fillStyle = '#fef08a';
                for (let wy = py + 192; wy < py + s3 * 0.7; wy += 96) {
                  ctx.fillRect(px + 120, wy, 48, 66);
                  ctx.fillRect(px + 240, wy, 48, 66);
                  ctx.fillRect(px + s3 - 168, wy, 48, 66);
                  ctx.fillRect(px + s3 - 288, wy, 48, 66);
                }

                // Central Grand Hall with Monumental Colonnade Portico
                const porticoW = s3 * 0.52; // ~750px
                const porticoX = px + (s3 - porticoW) / 2;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(porticoX, py + 120, porticoW, s3 * 0.42);

                // Grand Marble Stairs leading down to plaza
                for (let step = 0; step < 7; step++) {
                  ctx.fillStyle = step % 2 === 0 ? '#cbd5e1' : '#f8fafc';
                  ctx.fillRect(porticoX - 36 - step * 18, py + 120 + s3 * 0.42 + step * 24, porticoW + 72 + step * 36, 24);
                }

                // 6 Corinthian Portico Columns
                ctx.fillStyle = '#94a3b8';
                const colSpacing = porticoW / 5;
                for (let c = 0; c < 6; c++) {
                  ctx.fillRect(porticoX + c * colSpacing - 18, py + 168, 36, s3 * 0.32);
                }

                // Double Bronze Grand Entrance Doors
                const doorCenter = porticoX + porticoW / 2;
                ctx.fillStyle = '#78350f'; // Dark bronze
                ctx.fillRect(doorCenter - 84, py + 120 + s3 * 0.42 - 102, 168, 126);
                ctx.fillStyle = '#d97706';
                ctx.fillRect(doorCenter - 72, py + 120 + s3 * 0.42 - 90, 66, 102);
                ctx.fillRect(doorCenter + 6, py + 120 + s3 * 0.42 - 90, 66, 102);

                // Triangular Pediment with Golden Mayoral Crest
                ctx.beginPath();
                ctx.moveTo(porticoX - 24, py + 120);
                ctx.lineTo(porticoX + porticoW / 2, py - 48);
                ctx.lineTo(porticoX + porticoW + 24, py + 120);
                ctx.closePath();
                ctx.fillStyle = '#f8fafc';
                ctx.fill();
                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 9;
                ctx.stroke();

                // Golden Municipal Seal
                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.arc(porticoX + porticoW / 2, py + 36, 36, 0, Math.PI * 2);
                ctx.fill();

                // Copper Rotunda Dome
                const domeCenterX = px + s3 / 2;
                const domeCenterY = py + 24;
                const domeR = s3 * 0.16; // ~230px

                ctx.beginPath();
                ctx.arc(domeCenterX, domeCenterY, domeR, Math.PI, 0);
                ctx.fillStyle = '#0d9488'; // Oxidized copper
                ctx.fill();
                ctx.strokeStyle = '#115e59';
                ctx.lineWidth = 9;
                ctx.stroke();

                // Lantern Cupola
                ctx.fillStyle = '#fef08a';
                ctx.fillRect(domeCenterX - 24, domeCenterY - domeR - 48, 48, 48);
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.arc(domeCenterX, domeCenterY - domeR - 60, 24, 0, Math.PI * 2);
                ctx.fill();

                // Animated Flying City Flag
                const flagWave = Math.sin(t * 3.5) * 24;
                ctx.strokeStyle = '#64748b';
                ctx.lineWidth = 9;
                ctx.beginPath();
                ctx.moveTo(porticoX + 72, py - 60);
                ctx.lineTo(porticoX + 72, py + 90);
                ctx.stroke();

                ctx.fillStyle = '#2563eb';
                ctx.beginPath();
                ctx.moveTo(porticoX + 78, py - 60);
                ctx.lineTo(porticoX + 192 + flagWave, py - 30);
                ctx.lineTo(porticoX + 78, py);
                ctx.closePath();
                ctx.fill();

                // Front Plaza: Bronze Statue Fountain of the Founding Mayor (tripled: basin radius 102px)
                const fountainY = py + s3 - 210;
                ctx.fillStyle = '#0284c7';
                ctx.beginPath();
                ctx.arc(domeCenterX, fountainY, 102, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#e2e8f0';
                ctx.lineWidth = 12;
                ctx.stroke();

                // Water ripples
                const ripR = (t * 72) % 96;
                ctx.strokeStyle = '#bae6fd99';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(domeCenterX, fountainY, ripR, 0, Math.PI * 2);
                ctx.stroke();

                // Bronze statue
                ctx.fillStyle = '#b45309';
                ctx.fillRect(domeCenterX - 24, fountainY - 54, 48, 78);
                ctx.beginPath();
                ctx.arc(domeCenterX, fountainY - 72, 27, 0, Math.PI * 2);
                ctx.fill();

                continue;
              }

              // -------------------------------------------------------
              // 2. 3x3 MERGED RESIDENTIAL SUPERBLOCKS (1440px x 1440px)
              // -------------------------------------------------------
              if (tile.isMerged3x3) {
                const s3 = ts * 3;
                const lvl = tile.mergedLevel || 1;

                ctx.fillStyle = '#0f172a';
                ctx.fillRect(px, py, s3, s3);

                if (lvl === 1) {
                  // Garden Manor Quad
                  ctx.fillStyle = '#166534';
                  ctx.fillRect(px + 24, py + 24, s3 - 48, s3 - 48);

                  const wingW = s3 * 0.32;
                  const wingH = s3 * 0.32;

                  ctx.fillStyle = '#b91c1c';
                  ctx.fillRect(px + 48, py + 48, wingW, wingH);
                  ctx.fillRect(px + s3 - wingW - 48, py + 48, wingW, wingH);
                  ctx.fillRect(px + 48, py + s3 - wingH - 48, wingW, wingH);
                  ctx.fillRect(px + s3 - wingW - 48, py + s3 - wingH - 48, wingW, wingH);

                  // Courtyard fountain
                  ctx.fillStyle = '#0284c7';
                  ctx.beginPath();
                  ctx.arc(px + s3 / 2, py + s3 / 2, 84, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.strokeStyle = '#cbd5e1';
                  ctx.lineWidth = 9;
                  ctx.stroke();
                } else if (lvl === 2) {
                  // Twin Skyline Towers with Skybridge
                  const towerW = s3 * 0.34;
                  const towerH = s3 * 0.74;

                  ctx.fillStyle = '#0284c7';
                  ctx.fillRect(px + 72, py + 72, towerW, towerH);
                  ctx.fillRect(px + s3 - towerW - 72, py + 72, towerW, towerH);

                  // Elevated Skybridge
                  ctx.fillStyle = '#0369a1';
                  ctx.fillRect(px + 72 + towerW, py + towerH * 0.45, s3 - towerW * 2 - 144, 108);
                  ctx.fillStyle = '#bae6fd';
                  ctx.fillRect(px + 72 + towerW, py + towerH * 0.45 + 24, s3 - towerW * 2 - 144, 60);

                  // Helipad
                  const heliX = px + s3 - towerW / 2 - 72;
                  const heliY = py + 144;
                  ctx.fillStyle = '#334155';
                  ctx.beginPath();
                  ctx.arc(heliX, heliY, 78, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.strokeStyle = '#facc15';
                  ctx.lineWidth = 9;
                  ctx.stroke();
                } else {
                  // Metropolis Arcology Citadel
                  ctx.fillStyle = '#15803d'; // Terraces
                  ctx.fillRect(px + 48, py + 48, s3 - 96, s3 - 96);

                  ctx.fillStyle = '#0369a1';
                  ctx.fillRect(px + 120, py + 120, s3 - 240, s3 - 216);

                  ctx.fillStyle = '#38bdf8';
                  ctx.fillRect(px + 216, py + 192, s3 - 432, s3 - 360);

                  // Spire
                  ctx.strokeStyle = '#94a3b8';
                  ctx.lineWidth = 12;
                  ctx.beginPath();
                  ctx.moveTo(px + s3 / 2, py + 192);
                  ctx.lineTo(px + s3 / 2, py - 96);
                  ctx.stroke();

                  // Blinking red beacon
                  if (Math.floor(t * 3) % 2 === 0) {
                    ctx.fillStyle = '#ef4444';
                    ctx.beginPath();
                    ctx.arc(px + s3 / 2, py - 96, 24, 0, Math.PI * 2);
                    ctx.fill();
                  }
                }
                continue;
              }

              // -------------------------------------------------------
              // 3. POWER PLANT (2x2 - 960px x 960px)
              // -------------------------------------------------------
              if (tile.type === TileType.POWER_PLANT) {
                const s2 = ts * 2; // 960px
                ctx.fillStyle = '#334155';
                ctx.fillRect(px, py, s2, s2);

                const towerX = px + s2 * 0.35;
                const towerY = py + s2 * 0.5;
                const towerR = s2 * 0.28;

                ctx.fillStyle = '#64748b';
                ctx.beginPath();
                ctx.arc(towerX, towerY, towerR, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#1e293b';
                ctx.beginPath();
                ctx.arc(towerX, towerY, towerR * 0.65, 0, Math.PI * 2);
                ctx.fill();

                // Billowing steam clouds (tripled volumetric clouds)
                for (let s = 0; s < 3; s++) {
                  const steamProg = ((t * 0.4 + s * 0.33) % 1);
                  const steamX = towerX + Math.sin(t * 2 + s) * 48;
                  const steamY = towerY - steamProg * 168;
                  ctx.fillStyle = `rgba(241, 245, 249, ${(1 - steamProg) * 0.65})`;
                  ctx.beginPath();
                  ctx.arc(steamX, steamY, 36 + steamProg * 72, 0, Math.PI * 2);
                  ctx.fill();
                }

                // Substation transformers
                ctx.fillStyle = '#475569';
                ctx.fillRect(px + s2 * 0.65, py + 72, s2 * 0.28, s2 * 0.45);
                continue;
              }

              // -------------------------------------------------------
              // 4. UNIVERSITY (2x2 - 960px x 960px)
              // -------------------------------------------------------
              if (tile.type === TileType.UNIVERSITY) {
                const s2 = ts * 2;
                ctx.fillStyle = '#15803d'; // Green lawn quad
                ctx.fillRect(px, py, s2, s2);

                // Academic hall
                ctx.fillStyle = '#f1f5f9';
                ctx.fillRect(px + 84, py + 60, s2 - 168, 132);

                // Library clock dome
                ctx.fillStyle = '#0d9488';
                ctx.beginPath();
                ctx.arc(px + s2 / 2, py + 96, 54, Math.PI, 0);
                ctx.fill();

                // Diagonal stone walkways
                ctx.strokeStyle = '#e2e8f0';
                ctx.lineWidth = 12;
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(px + s2, py + s2);
                ctx.moveTo(px + s2, py);
                ctx.lineTo(px, py + s2);
                ctx.stroke();
                continue;
              }

              // -------------------------------------------------------
              // 5. POLICE STATION (1x1 - 480px)
              // -------------------------------------------------------
              if (tile.type === TileType.POLICE_STATION) {
                ctx.fillStyle = '#1e3a8a'; // Blue brick fortress
                ctx.fillRect(px + 18, py + 18, ts - 36, ts - 36);

                // Police garage bay & cruiser
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(px + 48, py + ts - 150, 150, 120);

                ctx.fillStyle = '#f8fafc'; // Police cruiser
                ctx.fillRect(px + 66, py + ts - 120, 114, 72);

                // Flashing emergency beacon (tripled)
                const flash = Math.floor(t * 8) % 2 === 0;
                ctx.fillStyle = flash ? '#ef4444' : '#3b82f6';
                ctx.beginPath();
                ctx.arc(px + 120, py + ts - 135, 18, 0, Math.PI * 2);
                ctx.fill();
                continue;
              }

              // -------------------------------------------------------
              // 6. FIRE STATION (1x1 - 480px)
              // -------------------------------------------------------
              if (tile.type === TileType.FIRE_STATION) {
                ctx.fillStyle = '#b91c1c'; // Red station
                ctx.fillRect(px + 18, py + 18, ts - 36, ts - 36);

                // Twin Engine Bays
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(px + 48, py + ts - 160, 160, 130);
                ctx.fillRect(px + ts - 208, py + ts - 160, 160, 130);

                // Fire Truck
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(px + 66, py + ts - 135, 126, 84);

                // Maltese cross gold crest
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.arc(px + ts / 2, py + 72, 36, 0, Math.PI * 2);
                ctx.fill();
                continue;
              }

              // -------------------------------------------------------
              // 7. SCHOOL (1x1 - 480px)
              // -------------------------------------------------------
              if (tile.type === TileType.SCHOOL) {
                ctx.fillStyle = '#9a3412';
                ctx.fillRect(px + 36, py + 36, ts - 72, ts - 72);

                // Clock tower
                ctx.fillStyle = '#f8fafc';
                ctx.fillRect(px + ts / 2 - 42, py + 6, 84, 72);
                ctx.fillStyle = '#0284c7';
                ctx.beginPath();
                ctx.arc(px + ts / 2, py + 42, 21, 0, Math.PI * 2);
                ctx.fill();

                // Yellow school bus
                ctx.fillStyle = '#facc15';
                ctx.fillRect(px + 54, py + ts - 102, 126, 54);
                continue;
              }

              // -------------------------------------------------------
              // 8. RESIDENTIAL (1x1 Levels 0, 1, 2, 3 - 480px)
              // -------------------------------------------------------
              if (tile.type === TileType.RESIDENTIAL) {
                if (tile.level === 0) {
                  // Zoned lot (walkable)
                  ctx.fillStyle = '#064e3b';
                  ctx.fillRect(px + 18, py + 18, ts - 36, ts - 36);
                  ctx.strokeStyle = '#f97316';
                  ctx.lineWidth = 9;
                  ctx.strokeRect(px + 48, py + 48, ts - 96, ts - 96);
                } else if (tile.level === 1) {
                  // Single-Family Cottage
                  ctx.fillStyle = '#15803d'; // Green yard
                  ctx.fillRect(px + 24, py + 24, ts - 48, ts - 48);

                  ctx.fillStyle = '#f1f5f9'; // House body (solid collision)
                  ctx.fillRect(px + 84, py + 108, ts - 168, ts - 192);

                  ctx.fillStyle = '#ea580c'; // Terracotta roof
                  ctx.beginPath();
                  ctx.moveTo(px + 60, py + 108);
                  ctx.lineTo(px + ts / 2, py + 36);
                  ctx.lineTo(px + ts - 60, py + 108);
                  ctx.closePath();
                  ctx.fill();

                  // Chimney smoke
                  const smokeY = (t * 54) % 72;
                  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                  ctx.beginPath();
                  ctx.arc(px + ts - 114, py + 24 - smokeY, 18, 0, Math.PI * 2);
                  ctx.fill();
                } else if (tile.level === 2) {
                  if (isBusinessman && x === HOME_TX && y === HOME_TY) {
                    // Victor Vance Private Neoclassical Estate & Executive Manor
                    // 1. Manicured estate grounds & courtyard
                    ctx.fillStyle = '#064e3b'; // Lush emerald estate lawn
                    ctx.fillRect(px + 24, py + 24, ts - 48, ts - 48);

                    // 2. Cobblestone driveway connecting courtyard straight out to Magnolia Blvd
                    ctx.fillStyle = '#334155';
                    ctx.fillRect(px + ts / 2 - 40, py, 80, 200);
                    ctx.strokeStyle = '#f59e0b';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(px + ts / 2 - 40, py, 80, 200);

                    // 3. Stately Limestone Manor Mansion (in the southern half of the tile)
                    ctx.fillStyle = '#1e293b'; // Foundation shadow
                    ctx.fillRect(px + 76, py + 186, ts - 152, ts - 220);
                    ctx.fillStyle = '#e2e8f0'; // French limestone facade
                    ctx.fillRect(px + 80, py + 190, ts - 160, ts - 230);

                    // 4. Mansard Slate Roof with gold filigree
                    ctx.fillStyle = '#0f172a'; // Deep slate roof
                    ctx.beginPath();
                    ctx.moveTo(px + 60, py + 190);
                    ctx.lineTo(px + 100, py + 140);
                    ctx.lineTo(px + ts - 100, py + 140);
                    ctx.lineTo(px + ts - 60, py + 190);
                    ctx.closePath();
                    ctx.fill();
                    ctx.strokeStyle = '#f59e0b';
                    ctx.lineWidth = 3;
                    ctx.stroke();

                    // 5. Neoclassical Pillars / Portico
                    ctx.fillStyle = '#f8fafc';
                    ctx.fillRect(px + ts / 2 - 50, py + 180, 16, 70);
                    ctx.fillRect(px + ts / 2 - 16, py + 180, 14, 70);
                    ctx.fillRect(px + ts / 2 + 10, py + 180, 16, 70);

                    // 6. Gilded Executive Windows & Chandelier Glow
                    ctx.fillStyle = '#fef08a';
                    ctx.fillRect(px + 110, py + 210, 40, 50);
                    ctx.fillRect(px + ts - 150, py + 210, 40, 50);
                    ctx.fillRect(px + 110, py + 280, 40, 50);
                    ctx.fillRect(px + ts - 150, py + 280, 40, 50);

                    // 7. Polished Brass Front Doors
                    ctx.fillStyle = '#78350f';
                    ctx.fillRect(px + ts / 2 - 24, py + 215, 48, 45);
                    ctx.fillStyle = '#f59e0b';
                    ctx.fillRect(px + ts / 2 - 20, py + 220, 18, 35);
                    ctx.fillRect(px + ts / 2 + 2, py + 220, 18, 35);
                  } else {
                    // Brick Townhouses
                    ctx.fillStyle = '#991b1b';
                    ctx.fillRect(px + 48, py + 48, ts - 96, ts - 96);

                    // Glowing windows
                    ctx.fillStyle = '#fef08a';
                    ctx.fillRect(px + 84, py + 96, 54, 72);
                    ctx.fillRect(px + 192, py + 96, 54, 72);
                    ctx.fillRect(px + 84, py + 228, 54, 72);
                    ctx.fillRect(px + 192, py + 228, 54, 72);

                    // Iron fire escape
                    ctx.fillStyle = '#1e293b';
                    ctx.fillRect(px + ts - 84, py + 72, 24, ts - 132);
                  }
                } else {
                  // Modern Skyscraper
                  ctx.fillStyle = '#0284c7';
                  ctx.fillRect(px + 48, py + 36, ts - 96, ts - 60);

                  // Balconies
                  ctx.fillStyle = '#f8fafc';
                  ctx.fillRect(px + 78, py + 114, 102, 24);
                  ctx.fillRect(px + ts - 180, py + 114, 102, 24);
                  ctx.fillRect(px + 78, py + 240, 102, 24);
                  ctx.fillRect(px + ts - 180, py + 240, 102, 24);
                }
                continue;
              }

              // -------------------------------------------------------
              // 9. COMMERCIAL (1x1 Levels 0, 1, 2, 3 - 480px)
              // -------------------------------------------------------
              if (tile.type === TileType.COMMERCIAL) {
                if (tile.level === 0) {
                  ctx.fillStyle = '#0c4a6e';
                  ctx.fillRect(px + 18, py + 18, ts - 36, ts - 36);
                  ctx.strokeStyle = '#38bdf8';
                  ctx.lineWidth = 9;
                  ctx.strokeRect(px + 48, py + 48, ts - 96, ts - 96);
                } else if (tile.level === 1) {
                  // Diner
                  ctx.fillStyle = '#334155';
                  ctx.fillRect(px + 48, py + 48, ts - 96, ts - 96);
                  // Awning
                  for (let a = 0; a < ts - 108; a += 54) {
                    ctx.fillStyle = (a / 54) % 2 === 0 ? '#ef4444' : '#f8fafc';
                    ctx.fillRect(px + 54 + a, py + 96, 54, 54);
                  }
                } else if (tile.level === 2) {
                  // Department store
                  ctx.fillStyle = '#0284c7';
                  ctx.fillRect(px + 48, py + 48, ts - 96, ts - 96);
                  ctx.fillStyle = '#e2e8f0';
                  ctx.fillRect(px + 30, py + 48, ts - 60, 42);
                } else {
                  // Corporate skyscraper
                  ctx.fillStyle = '#0369a1';
                  ctx.fillRect(px + 48, py + 36, ts - 96, ts - 60);
                  ctx.fillStyle = '#7dd3fc';
                  ctx.fillRect(px + 72, py + 96, ts - 144, 24);
                  ctx.fillRect(px + 72, py + 192, ts - 144, 24);
                  ctx.fillRect(px + 72, py + 288, ts - 144, 24);
                }
                continue;
              }

              // -------------------------------------------------------
              // 10. INDUSTRIAL (1x1 Levels 0, 1, 2, 3 - 480px)
              // -------------------------------------------------------
              if (tile.type === TileType.INDUSTRIAL) {
                if (tile.level === 0) {
                  ctx.fillStyle = '#451a03';
                  ctx.fillRect(px + 18, py + 18, ts - 36, ts - 36);
                  ctx.strokeStyle = '#f59e0b';
                  ctx.lineWidth = 9;
                  ctx.strokeRect(px + 48, py + 48, ts - 96, ts - 96);
                } else if (tile.level === 1) {
                  ctx.fillStyle = '#78350f';
                  ctx.fillRect(px + 48, py + 48, ts - 96, ts - 96);
                  ctx.fillStyle = '#94a3b8';
                  ctx.fillRect(px + 48, py + 48, ts - 96, 66);
                } else if (tile.level === 2) {
                  ctx.fillStyle = '#475569';
                  ctx.fillRect(px + 48, py + 84, ts - 96, ts - 120);
                  // Smokestacks
                  ctx.fillStyle = '#b91c1c';
                  ctx.fillRect(px + 84, py + 24, 42, 84);
                  ctx.fillRect(px + ts - 126, py + 24, 42, 84);
                } else {
                  ctx.fillStyle = '#334155';
                  ctx.fillRect(px + 48, py + 48, ts - 96, ts - 96);
                  ctx.fillStyle = '#0ea5e9';
                  ctx.beginPath();
                  ctx.arc(px + 132, py + 132, 60, 0, Math.PI * 2);
                  ctx.fill();
                }
                continue;
              }

              // -------------------------------------------------------
              // 11. UNION HALL & LUXURY ESTATE (480px)
              // -------------------------------------------------------
              if (tile.type === TileType.UNION_HALL) {
                ctx.fillStyle = '#c2410c';
                ctx.fillRect(px + 48, py + 48, ts - 96, ts - 96);
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.arc(px + ts / 2, py + ts / 2 - 18, 60, 0, Math.PI * 2);
                ctx.fill();
                continue;
              }

              if (tile.type === TileType.LUXURY_ESTATE) {
                ctx.fillStyle = '#15803d';
                ctx.fillRect(px + 24, py + 24, ts - 48, ts - 48);
                // Pool
                ctx.fillStyle = '#06b6d4';
                ctx.beginPath();
                ctx.arc(px + ts - 132, py + ts - 132, 78, 0, Math.PI * 2);
                ctx.fill();
                // Manor mansion
                ctx.fillStyle = '#f8fafc';
                ctx.fillRect(px + 60, py + 60, 240, 180);
                continue;
              }

              // -------------------------------------------------------
              // 12. BOTANICAL CITY PARK (480px x 480px Walkable Green Oasis)
              // -------------------------------------------------------
              if (tile.type === TileType.PARK) {
                // Verdant manicured lawn
                ctx.fillStyle = '#16a34a';
                ctx.fillRect(px + 12, py + 12, ts - 24, ts - 24);

                // Perimeter hedge / granite border
                ctx.strokeStyle = '#15803d';
                ctx.lineWidth = 6;
                ctx.strokeRect(px + 15, py + 15, ts - 30, ts - 30);

                // Cobblestone walking paths (36px wide) radiating from 4 edges to center
                const pMidX = px + ts / 2;
                const pMidY = py + ts / 2;
                ctx.fillStyle = '#e2e8f0';

                // North-South pathway
                ctx.fillRect(pMidX - 18, py + 12, 36, ts - 24);
                // East-West pathway
                ctx.fillRect(px + 12, pMidY - 18, ts - 24, 36);

                // Central circular stone plaza
                ctx.fillStyle = '#cbd5e1';
                ctx.beginPath();
                ctx.arc(pMidX, pMidY, 78, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 3;
                ctx.stroke();

                // Marble Fountain Pool
                ctx.fillStyle = '#0284c7';
                ctx.beginPath();
                ctx.arc(pMidX, pMidY, 52, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#f8fafc';
                ctx.lineWidth = 5;
                ctx.stroke();

                // Water ripples and fountain jet
                const rip1 = (t * 24) % 48;
                const rip2 = (t * 24 + 24) % 48;
                ctx.strokeStyle = 'rgba(186, 230, 253, 0.7)';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(pMidX, pMidY, rip1, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(pMidX, pMidY, rip2, 0, Math.PI * 2);
                ctx.stroke();

                // Center fountain tiered nozzle
                ctx.fillStyle = '#cbd5e1';
                ctx.beginPath();
                ctx.arc(pMidX, pMidY, 14, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#38bdf8';
                ctx.beginPath();
                ctx.arc(pMidX, pMidY, 6, 0, Math.PI * 2);
                ctx.fill();

                // 4 Botanical Shade Trees with canopy shadows
                const trees = [
                  { x: px + 90, y: py + 90, r: 42 },
                  { x: px + ts - 90, y: py + 90, r: 38 },
                  { x: px + 90, y: py + ts - 90, r: 39 },
                  { x: px + ts - 90, y: py + ts - 90, r: 44 },
                ];

                for (const tr of trees) {
                  // Soft drop shadow
                  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
                  ctx.beginPath();
                  ctx.ellipse(tr.x + 8, tr.y + 12, tr.r * 1.1, tr.r * 0.7, 0, 0, Math.PI * 2);
                  ctx.fill();

                  // Base foliage
                  ctx.fillStyle = '#15803d';
                  ctx.beginPath();
                  ctx.arc(tr.x, tr.y, tr.r, 0, Math.PI * 2);
                  ctx.fill();

                  // Highlight foliage cluster
                  ctx.fillStyle = '#22c55e';
                  ctx.beginPath();
                  ctx.arc(tr.x - 8, tr.y - 8, tr.r * 0.65, 0, Math.PI * 2);
                  ctx.fill();
                }

                // 4 Park Benches along paths
                const benches = [
                  { x: pMidX - 60, y: pMidY - 32, w: 30, h: 10 },
                  { x: pMidX + 30, y: pMidY - 32, w: 30, h: 10 },
                  { x: pMidX - 60, y: pMidY + 22, w: 30, h: 10 },
                  { x: pMidX + 30, y: pMidY + 22, w: 30, h: 10 },
                ];
                for (const b of benches) {
                  ctx.fillStyle = '#78350f';
                  ctx.fillRect(b.x, b.y, b.w, b.h);
                  ctx.fillStyle = '#1e293b';
                  ctx.fillRect(b.x, b.y, 4, b.h);
                  ctx.fillRect(b.x + b.w - 4, b.y, 4, b.h);
                }

                // Blooming Rose Flowerbeds (crimson & yellow blossoms)
                const flowerbeds = [
                  { x: px + 150, y: py + 48, w: 60, h: 24 },
                  { x: px + ts - 210, y: py + 48, w: 60, h: 24 },
                  { x: px + 150, y: py + ts - 72, w: 60, h: 24 },
                  { x: px + ts - 210, y: py + ts - 72, w: 60, h: 24 },
                ];
                for (const fb of flowerbeds) {
                  ctx.fillStyle = '#14532d';
                  ctx.fillRect(fb.x, fb.y, fb.w, fb.h);
                  // Blooms
                  for (let bx = fb.x + 8; bx < fb.x + fb.w - 6; bx += 14) {
                    ctx.fillStyle = (bx % 28 === 0) ? '#ef4444' : '#facc15';
                    ctx.beginPath();
                    ctx.arc(bx, fb.y + 12, 4, 0, Math.PI * 2);
                    ctx.fill();
                  }
                }
                continue;
              }

              // -------------------------------------------------------
              // 13. CIVIC HEROIC STATUE (480px x 480px Walkable Civic Plaza)
              // -------------------------------------------------------
              if (tile.type === TileType.STATUE) {
                // Classical Granite Paved Plaza
                ctx.fillStyle = '#334155';
                ctx.fillRect(px + 12, py + 12, ts - 24, ts - 24);

                // Polished granite border
                ctx.strokeStyle = '#64748b';
                ctx.lineWidth = 6;
                ctx.strokeRect(px + 15, py + 15, ts - 30, ts - 30);

                // Paving grid lines
                ctx.strokeStyle = '#47556944';
                ctx.lineWidth = 1.5;
                for (let gx = px + 48; gx < px + ts - 24; gx += 48) {
                  ctx.beginPath();
                  ctx.moveTo(gx, py + 12);
                  ctx.lineTo(gx, py + ts - 12);
                  ctx.stroke();
                }
                for (let gy = py + 48; gy < py + ts - 24; gy += 48) {
                  ctx.beginPath();
                  ctx.moveTo(px + 12, gy);
                  ctx.lineTo(px + ts - 12, gy);
                  ctx.stroke();
                }

                const sMidX = px + ts / 2;
                const sMidY = py + ts / 2;

                // Multi-tiered stepped marble pedestal
                // Step Tier 1
                ctx.fillStyle = '#64748b';
                ctx.fillRect(sMidX - 84, sMidY - 84, 168, 168);
                // Step Tier 2
                ctx.fillStyle = '#94a3b8';
                ctx.fillRect(sMidX - 66, sMidY - 66, 132, 132);
                // Step Tier 3
                ctx.fillStyle = '#cbd5e1';
                ctx.fillRect(sMidX - 48, sMidY - 48, 96, 96);

                // Pedestal core (Solid collision box is ~70x70)
                ctx.fillStyle = '#475569';
                ctx.fillRect(sMidX - 35, sMidY - 35, 70, 70);

                // Gold Dedication Plaque on south face
                ctx.fillStyle = '#fbbf24';
                ctx.fillRect(sMidX - 25, sMidY + 18, 50, 10);
                ctx.strokeStyle = '#d97706';
                ctx.lineWidth = 1;
                ctx.strokeRect(sMidX - 25, sMidY + 18, 50, 10);

                // Heroic Bronze Founder Mayor Statue (burnished bronze)
                // Drop shadow
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.beginPath();
                ctx.ellipse(sMidX + 10, sMidY + 16, 26, 12, 0, 0, Math.PI * 2);
                ctx.fill();

                // Bronze Body & executive trenchcoat
                ctx.fillStyle = '#b45309';
                ctx.fillRect(sMidX - 16, sMidY - 20, 32, 38);

                // Outstretched arm with civic charter scroll
                ctx.fillStyle = '#d97706';
                ctx.fillRect(sMidX + 14, sMidY - 18, 22, 10);
                // White proclamation scroll
                ctx.fillStyle = '#f8fafc';
                ctx.fillRect(sMidX + 32, sMidY - 22, 8, 16);

                // Bronze Head and Executive Fedora
                ctx.fillStyle = '#d97706';
                ctx.beginPath();
                ctx.arc(sMidX, sMidY - 30, 16, 0, Math.PI * 2);
                ctx.fill();

                // Gilded Fedora brim & crown
                ctx.fillStyle = '#f59e0b';
                ctx.fillRect(sMidX - 20, sMidY - 36, 40, 6);
                ctx.fillRect(sMidX - 13, sMidY - 50, 26, 16);

                // 4 Bronze Corner Gas Lanterns on fluted posts
                const lanterns = [
                  { x: sMidX - 120, y: sMidY - 120 },
                  { x: sMidX + 120, y: sMidY - 120 },
                  { x: sMidX - 120, y: sMidY + 120 },
                  { x: sMidX + 120, y: sMidY + 120 },
                ];
                for (const l of lanterns) {
                  ctx.fillStyle = '#1e293b';
                  ctx.fillRect(l.x - 4, l.y - 12, 8, 24);
                  // Golden glowing lamp head
                  ctx.fillStyle = '#fef08a';
                  ctx.beginPath();
                  ctx.arc(l.x, l.y - 14, 8, 0, Math.PI * 2);
                  ctx.fill();
                }

                // Ceremonial City Flagpoles (North edge)
                const flagWave = Math.sin(t * 8) * 8;
                // West flagpole
                ctx.fillStyle = '#94a3b8';
                ctx.fillRect(sMidX - 140, py + 30, 6, 70);
                ctx.fillStyle = '#2563eb'; // Blue banner
                ctx.fillRect(sMidX - 134, py + 30, 36 + flagWave, 22);

                // East flagpole
                ctx.fillStyle = '#94a3b8';
                ctx.fillRect(sMidX + 134, py + 30, 6, 70);
                ctx.fillStyle = '#fbbf24'; // Gold banner
                ctx.fillRect(sMidX + 140, py + 30, 36 + flagWave, 22);

                continue;
              }
            }
          }

          // -----------------------------------------------------------
          // LAYER 3: CLICK-TO-WALK TARGET INDICATOR & PROPERTY OVERLAYS
          // -----------------------------------------------------------
          if (targetPos) {
            const pulse = (Math.sin(t * 8) + 1) * 0.5;
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(targetPos.x, targetPos.y, 16 + pulse * 8, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
            ctx.fill();
          }

          // A. Vance Private Residence & Headquarters Entrance (Tile 45, 52)
          if (isBusinessman) {
            const hx = HOME_ESTATE_X;
            const hy = HOME_TY * ts; // Northern parcel boundary directly meeting Magnolia Blvd street

            // Grand Polished Granite Driveway & Walkway leading onto Magnolia Boulevard
            ctx.fillStyle = '#334155';
            ctx.fillRect(hx - 36, hy - 30, 72, 90);
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2;
            ctx.strokeRect(hx - 36, hy - 30, 72, 90);

            // Wrought-Iron Gilded Estate Gates (at the curb border)
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(hx - 44, hy - 14, 12, 64);
            ctx.fillRect(hx + 32, hy - 14, 12, 64);
            ctx.fillStyle = '#f59e0b';
            // Gold finials
            ctx.beginPath();
            ctx.arc(hx - 38, hy - 18, 6, 0, Math.PI * 2);
            ctx.arc(hx + 38, hy - 18, 6, 0, Math.PI * 2);
            ctx.fill();

            // Brass Archway Banner Overhead
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(hx - 75, hy - 40, 150, 24);
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2;
            ctx.strokeRect(hx - 75, hy - 40, 150, 24);
            ctx.font = 'bold 10px sans-serif';
            ctx.fillStyle = '#fbbf24';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🏛️ VANCE ESTATE & HQ', hx, hy - 28);

            // Street name curb engraving on Magnolia Boulevard
            ctx.font = 'bold 9px monospace';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('MAGNOLIA BLVD', hx, hy - 58);

            // Pulsing Home Beacon
            const beaconPulse = (Math.sin(t * 4) + 1) * 0.5;
            ctx.strokeStyle = `rgba(16, 185, 129, ${0.4 + beaconPulse * 0.4})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(hx, hy + 20, 36 + beaconPulse * 6, 0, Math.PI * 2);
            ctx.stroke();
          }

          // B. Owned Commercial & Industrial Business Marquee Signs
          if (isBusinessman && state.businessman) {
            for (const biz of state.businessman.businesses) {
              const btx = (biz.tileIndex % GRID_SIZE) * ts;
              const bty = Math.floor(biz.tileIndex / GRID_SIZE) * ts;
              const bMidX = btx + ts / 2;
              const bMidY = bty + 64; // Rooftop marquee position

              // Sign background
              ctx.fillStyle = biz.mode === 'HONEST' ? 'rgba(6, 78, 59, 0.95)' : 'rgba(88, 28, 135, 0.95)';
              ctx.fillRect(bMidX - 110, bMidY - 32, 220, 34);
              ctx.strokeStyle = biz.mode === 'HONEST' ? '#10b981' : '#f59e0b';
              ctx.lineWidth = 2.5;
              ctx.strokeRect(bMidX - 110, bMidY - 32, 220, 34);

              // Sign text
              ctx.font = 'bold 11px sans-serif';
              ctx.fillStyle = '#ffffff';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(biz.name.length > 24 ? biz.name.substring(0, 22) + '...' : biz.name, bMidX, bMidY - 21);

              // Mode badge & revenue pill
              ctx.font = 'bold 9px monospace';
              const modePill = biz.mode === 'HONEST' 
                ? `🌿 HONEST · Lvl ${biz.level} · +$${biz.dailyRevenue}/d` 
                : `💰 RACKET · Lvl ${biz.level} · +$${biz.dailyRevenue}/d`;
              ctx.fillStyle = biz.mode === 'HONEST' ? '#6ee7b7' : '#fde047';
              ctx.fillText(modePill, bMidX, bMidY - 8);

              // Raided warning tape
              if (biz.isRaided) {
                ctx.fillStyle = 'rgba(220, 38, 38, 0.95)';
                ctx.fillRect(bMidX - 90, bMidY + 6, 180, 18);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(bMidX - 90, bMidY + 6, 180, 18);
                ctx.font = 'bold 10px monospace';
                ctx.fillStyle = '#ffffff';
                ctx.fillText('🚨 POLICE RAIDED - SHUTTERED', bMidX, bMidY + 15);
              }
            }
          }

          // -----------------------------------------------------------
          // LAYER 4: CHARACTERS, CITIZENS, DOGS, CATS & MAYOR (DEPTH-SORTED)
          // -----------------------------------------------------------
          const drawPlayerCharacter = () => {
            const mx = mayorPos.x;
            const my = mayorPos.y;
            const walkBob = isWalking ? Math.sin(t * 16) * 4 : Math.sin(t * 2) * 1.5;
            const legStride = isWalking ? Math.sin(t * 16) * 14 : 0;

            // Character Drop Shadow on ground (24x10px)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.beginPath();
            ctx.ellipse(mx, my + 26, 24, 10, 0, 0, Math.PI * 2);
            ctx.fill();

            // Physical Collision boundary indicator (subtle feet ring - radius 16px)
            ctx.strokeStyle = isBusinessman ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.25)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(mx, my + 14, MAYOR_RADIUS, 0, Math.PI * 2);
            ctx.stroke();

            // Legs & Shoes (Dark charcoal trousers - width 9, height 18)
            ctx.fillStyle = '#0f172a';
            if (facing === 'N' || facing === 'S') {
              ctx.fillRect(mx - 12, my + 12, 9, 18 + (isWalking ? legStride * 0.5 : 0));
              ctx.fillRect(mx + 3, my + 12, 9, 18 - (isWalking ? legStride * 0.5 : 0));
            } else {
              ctx.fillRect(mx - 6 + legStride * 0.7, my + 12, 12, 18);
            }

            if (isBusinessman) {
              // -------------------------------------------------------
              // BUSINESSMAN SPRITE: Bespoke Emerald/Charcoal Suit & Briefcase
              // -------------------------------------------------------
              // Tailored Blazer Torso (Dark forest-green or charcoal)
              ctx.fillStyle = '#064e3b';
              ctx.fillRect(mx - 18, my - 22 + walkBob, 36, 36);

              // Fine golden pinstripe accent lines
              ctx.strokeStyle = '#10b981';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(mx - 10, my - 20 + walkBob); ctx.lineTo(mx - 10, my + 12 + walkBob);
              ctx.moveTo(mx + 10, my - 20 + walkBob); ctx.lineTo(mx + 10, my + 12 + walkBob);
              ctx.stroke();

              // Silk Gold Necktie
              if (facing !== 'N') {
                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.moveTo(mx - 4, my - 16 + walkBob);
                ctx.lineTo(mx + 4, my - 16 + walkBob);
                ctx.lineTo(mx + 5, my + 4 + walkBob);
                ctx.lineTo(mx, my + 11 + walkBob);
                ctx.lineTo(mx - 5, my + 4 + walkBob);
                ctx.closePath();
                ctx.fill();

                // Crisp White Collar
                ctx.fillStyle = '#f8fafc';
                ctx.beginPath();
                ctx.moveTo(mx - 8, my - 20 + walkBob);
                ctx.lineTo(mx - 3, my - 14 + walkBob);
                ctx.lineTo(mx - 7, my - 12 + walkBob);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(mx + 8, my - 20 + walkBob);
                ctx.lineTo(mx + 3, my - 14 + walkBob);
                ctx.lineTo(mx + 7, my - 12 + walkBob);
                ctx.closePath();
                ctx.fill();
              }

              // Executive Leather Briefcase in Hand (swings during walk)
              const briefcaseSway = isWalking ? Math.sin(t * 16) * 6 : 0;
              const bx = mx + 18;
              const by = my - 2 + walkBob + briefcaseSway;
              // Leather case body (rich mahogany brown)
              ctx.fillStyle = '#78350f';
              ctx.fillRect(bx - 3, by, 18, 14);
              // Gold brass corner protectors & clasps
              ctx.fillStyle = '#fbbf24';
              ctx.fillRect(bx - 3, by, 3, 3);
              ctx.fillRect(bx + 12, by, 3, 3);
              ctx.fillRect(bx - 3, by + 11, 3, 3);
              ctx.fillRect(bx + 12, by + 11, 3, 3);
              ctx.fillRect(bx + 4, by + 5, 4, 3); // Brass center latch
              // Leather handle
              ctx.strokeStyle = '#451a03';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(bx + 6, by - 2, 4, Math.PI, 0);
              ctx.stroke();

              // Gleaming Gold Rolex Watch on Left Wrist
              ctx.fillStyle = '#fbbf24';
              ctx.fillRect(mx - 20, my - 2 + walkBob, 4, 5);
              // Glint
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(mx - 19, my - 1 + walkBob, 2, 2);

              // Head & Face
              ctx.fillStyle = '#fed7aa';
              ctx.beginPath();
              ctx.arc(mx, my - 36 + walkBob, 14, 0, Math.PI * 2);
              ctx.fill();

              // Slicked dark magnate hair
              ctx.fillStyle = '#1e1b4b';
              ctx.beginPath();
              ctx.arc(mx, my - 41 + walkBob, 14, Math.PI, 0);
              ctx.fill();

              // Tailored emerald executive fedora hat
              ctx.fillStyle = '#064e3b';
              ctx.beginPath();
              ctx.ellipse(mx, my - 43 + walkBob, 20, 6, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillRect(mx - 12, my - 54 + walkBob, 24, 12);
              // Gold hat ribbon band
              ctx.fillStyle = '#f59e0b';
              ctx.fillRect(mx - 12, my - 46 + walkBob, 24, 3.5);
            } else {
              // -------------------------------------------------------
              // MAYOR SPRITE: Navy Double-Breasted Suit & Lapel Pin
              // -------------------------------------------------------
              ctx.fillStyle = '#1e3a8a';
              ctx.fillRect(mx - 18, my - 22 + walkBob, 36, 36);

              // Crimson Power Tie
              if (facing !== 'N') {
                ctx.fillStyle = '#dc2626';
                ctx.beginPath();
                ctx.moveTo(mx - 4, my - 16 + walkBob);
                ctx.lineTo(mx + 4, my - 16 + walkBob);
                ctx.lineTo(mx + 5, my + 4 + walkBob);
                ctx.lineTo(mx, my + 10 + walkBob);
                ctx.lineTo(mx - 5, my + 4 + walkBob);
                ctx.closePath();
                ctx.fill();

                // Gold Mayoral Lapel Pin (radius 3px)
                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.arc(mx - 11, my - 12 + walkBob, 3, 0, Math.PI * 2);
                ctx.fill();
              }

              // Head & Face (radius 14px)
              ctx.fillStyle = '#fbcfe8'; // Skin tone
              ctx.beginPath();
              ctx.arc(mx, my - 36 + walkBob, 14, 0, Math.PI * 2);
              ctx.fill();

              // Distinguished graying executive hair (radius 14px)
              ctx.fillStyle = '#94a3b8';
              ctx.beginPath();
              ctx.arc(mx, my - 41 + walkBob, 14, Math.PI, 0);
              ctx.fill();

              // Classic Executive Fedora Hat (stylish mayoral headwear)
              ctx.fillStyle = '#0f172a';
              ctx.beginPath();
              ctx.ellipse(mx, my - 43 + walkBob, 20, 6, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillRect(mx - 12, my - 54 + walkBob, 24, 12);
              // Crimson hat ribbon band
              ctx.fillStyle = '#dc2626';
              ctx.fillRect(mx - 12, my - 46 + walkBob, 24, 3.5);
            }
          };

          // Draw the Autonomous Computer Mayor (when in Businessman mode)
          const drawComputerMayorCharacter = () => {
            const cmx = computerMayorPos.x;
            const cmy = computerMayorPos.y;
            const walkBob = computerMayorWalking ? Math.sin(t * 16) * 4 : Math.sin(t * 2) * 1.5;
            const legStride = computerMayorWalking ? Math.sin(t * 16) * 14 : 0;

            // Character Drop Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.beginPath();
            ctx.ellipse(cmx, cmy + 26, 24, 10, 0, 0, Math.PI * 2);
            ctx.fill();

            // Pulsing Interactive Golden Halo on Ground
            const haloPulse = (Math.sin(t * 6) + 1) * 0.5;
            ctx.strokeStyle = `rgba(245, 158, 11, ${0.4 + haloPulse * 0.5})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cmx, cmy + 14, 22 + haloPulse * 4, 0, Math.PI * 2);
            ctx.stroke();

            // Legs
            ctx.fillStyle = '#0f172a';
            if (computerMayorFacing === 'N' || computerMayorFacing === 'S') {
              ctx.fillRect(cmx - 12, cmy + 12, 9, 18 + (computerMayorWalking ? legStride * 0.5 : 0));
              ctx.fillRect(cmx + 3, cmy + 12, 9, 18 - (computerMayorWalking ? legStride * 0.5 : 0));
            } else {
              ctx.fillRect(cmx - 6 + legStride * 0.7, cmy + 12, 12, 18);
            }

            // Navy Double-Breasted Suit Torso
            ctx.fillStyle = '#1e3a8a';
            ctx.fillRect(cmx - 18, cmy - 22 + walkBob, 36, 36);

            // Mayoral Diagonal Sash (Gold ceremonial ribbon across chest)
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.moveTo(cmx - 16, cmy - 20 + walkBob);
            ctx.lineTo(cmx - 10, cmy - 22 + walkBob);
            ctx.lineTo(cmx + 16, cmy + 10 + walkBob);
            ctx.lineTo(cmx + 10, cmy + 12 + walkBob);
            ctx.closePath();
            ctx.fill();

            // Crimson Power Tie
            if (computerMayorFacing !== 'N') {
              ctx.fillStyle = '#dc2626';
              ctx.beginPath();
              ctx.moveTo(cmx - 4, cmy - 16 + walkBob);
              ctx.lineTo(cmx + 4, cmy - 16 + walkBob);
              ctx.lineTo(cmx + 5, cmy + 4 + walkBob);
              ctx.lineTo(cmx, cmy + 10 + walkBob);
              ctx.lineTo(cmx - 5, cmy + 4 + walkBob);
              ctx.closePath();
              ctx.fill();

              // Gold Mayoral Lapel Pin
              ctx.fillStyle = '#f59e0b';
              ctx.beginPath();
              ctx.arc(cmx - 11, cmy - 12 + walkBob, 3, 0, Math.PI * 2);
              ctx.fill();
            }

            // Head & Face
            ctx.fillStyle = '#fbcfe8';
            ctx.beginPath();
            ctx.arc(cmx, cmy - 36 + walkBob, 14, 0, Math.PI * 2);
            ctx.fill();

            // Distinguished gray hair
            ctx.fillStyle = '#94a3b8';
            ctx.beginPath();
            ctx.arc(cmx, cmy - 41 + walkBob, 14, Math.PI, 0);
            ctx.fill();

            // Fedora Hat
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.ellipse(cmx, cmy - 43 + walkBob, 20, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(cmx - 12, cmy - 54 + walkBob, 24, 12);
            // Crimson hat band
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(cmx - 12, cmy - 46 + walkBob, 24, 3.5);

            // Speech Bubble & Title Overhead
            const mayorName = state.computerMayor?.name || 'Mayor';
            const mayorAlign = state.computerMayor?.alignment || 'HONEST';

            // Title Tag
            ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
            ctx.strokeStyle = mayorAlign === 'HONEST' ? '#10b981' : '#f59e0b';
            ctx.lineWidth = 1.5;
            const tagW = 160;
            ctx.fillRect(cmx - tagW / 2, cmy - 80 + walkBob, tagW, 20);
            ctx.strokeRect(cmx - tagW / 2, cmy - 80 + walkBob, tagW, 20);

            ctx.font = 'bold 10px sans-serif';
            ctx.fillStyle = mayorAlign === 'HONEST' ? '#6ee7b7' : '#fde047';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`🏛️ ${mayorName.toUpperCase()}`, cmx, cmy - 70 + walkBob);

            // Speech bubble
            if (computerMayorSpeech) {
              ctx.font = '11px sans-serif';
              const textW = Math.min(260, ctx.measureText(computerMayorSpeech).width + 24);
              ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
              ctx.strokeStyle = '#0f172a';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.roundRect(cmx - textW / 2, cmy - 114 + walkBob, textW, 26, 6);
              ctx.fill();
              ctx.stroke();

              // Speech pointer triangle
              ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
              ctx.beginPath();
              ctx.moveTo(cmx - 5, cmy - 88 + walkBob);
              ctx.lineTo(cmx + 5, cmy - 88 + walkBob);
              ctx.lineTo(cmx, cmy - 82 + walkBob);
              ctx.closePath();
              ctx.fill();

              ctx.fillStyle = '#0f172a';
              ctx.font = 'bold 10px sans-serif';
              ctx.fillText(computerMayorSpeech, cmx, cmy - 101 + walkBob);
            }
          };

          // Depth-sort visible Mayor, Pedestrians (with dogs), Cats, and Computer Mayor
          type WorldYSortedEntity = 
            | { type: 'PLAYER'; y: number }
            | { type: 'COMPUTER_MAYOR'; y: number }
            | { type: 'PEDESTRIAN'; y: number; data: typeof entitiesRef.current.pedestrians[0] }
            | { type: 'CAT'; y: number; data: typeof entitiesRef.current.cats[0] };

          const ySortedEntities: WorldYSortedEntity[] = [
            { type: 'PLAYER', y: mayorPos.y }
          ];

          if (isBusinessman) {
            ySortedEntities.push({ type: 'COMPUTER_MAYOR', y: computerMayorPos.y });
          }

          const charViewHalfW = (cw / cameraZoom) / 2 + 250;
          const charViewHalfH = (ch / cameraZoom) / 2 + 250;

          for (const p of entitiesRef.current.pedestrians) {
            if (Math.abs(p.x - mayorPos.x) < charViewHalfW && Math.abs(p.y - mayorPos.y) < charViewHalfH) {
              ySortedEntities.push({ type: 'PEDESTRIAN', y: p.y, data: p });
            }
          }

          for (const c of entitiesRef.current.cats) {
            if (Math.abs(c.x - mayorPos.x) < charViewHalfW && Math.abs(c.y - mayorPos.y) < charViewHalfH) {
              ySortedEntities.push({ type: 'CAT', y: c.y, data: c });
            }
          }

          ySortedEntities.sort((a, b) => a.y - b.y);

          for (const ent of ySortedEntities) {
            if (ent.type === 'PLAYER') {
              drawPlayerCharacter();
            } else if (ent.type === 'COMPUTER_MAYOR') {
              drawComputerMayorCharacter();
            } else if (ent.type === 'PEDESTRIAN') {
              drawWorldPedestrian(ctx, ent.data, t);
            } else if (ent.type === 'CAT') {
              drawWorldCat(ctx, ent.data, t);
            }
          }

          // -----------------------------------------------------------
          // LAYER 5: DYNAMIC DAY & NIGHT ATMOSPHERE & LIGHTING (~60M CYCLE)
          // -----------------------------------------------------------
          const timeHours = (timeOfDayMinutesRef.current % 1440) / 60;
          let ambientDarkness = 0;
          let isNightTime = false;
          let isSunset = false;
          let isSunrise = false;

          if (timeHours >= 20.5 || timeHours < 5.5) {
            // Deep Midnight (20:30 to 05:30)
            ambientDarkness = 0.65;
            isNightTime = true;
          } else if (timeHours >= 18.0 && timeHours < 20.5) {
            // Sunset / Dusk (18:00 to 20:30)
            const duskProg = (timeHours - 18.0) / 2.5;
            ambientDarkness = duskProg * 0.65;
            isSunset = true;
          } else if (timeHours >= 5.5 && timeHours < 7.5) {
            // Sunrise / Dawn (05:30 to 07:30)
            const dawnProg = (timeHours - 5.5) / 2.0;
            ambientDarkness = (1 - dawnProg) * 0.65;
            isSunrise = true;
          }

          if (ambientDarkness > 0.04) {
            // 1. Streetlamp warm light pools on sidewalks
            for (let y = minTileY; y <= maxTileY; y++) {
              for (let x = minTileX; x <= maxTileX; x++) {
                const tile = state.grid[y * GRID_SIZE + x];
                if (tile.type === TileType.ROAD && (x + y) % 3 === 0) {
                  const lampX = x * ts + 33;
                  const lampY = y * ts + 33;
                  const lampGrad = ctx.createRadialGradient(lampX, lampY, 10, lampX, lampY, 90);
                  lampGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
                  lampGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.18)');
                  lampGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
                  ctx.fillStyle = lampGrad;
                  ctx.beginPath();
                  ctx.arc(lampX, lampY, 90, 0, Math.PI * 2);
                  ctx.fill();
                }
              }
            }

            // 2. Mayor lantern illumination aura
            const mayorAuraX = mayorPos.x;
            const mayorAuraY = mayorPos.y + 14;
            const mayorGrad = ctx.createRadialGradient(mayorAuraX, mayorAuraY, 15, mayorAuraX, mayorAuraY, 120);
            mayorGrad.addColorStop(0, 'rgba(254, 240, 138, 0.35)');
            mayorGrad.addColorStop(0.6, 'rgba(254, 240, 138, 0.12)');
            mayorGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
            ctx.fillStyle = mayorGrad;
            ctx.beginPath();
            ctx.arc(mayorAuraX, mayorAuraY, 120, 0, Math.PI * 2);
            ctx.fill();

            // 3. Ambient sky overlay over visible viewport
            const viewLeft = camX - 100;
            const viewTop = camY - 100;
            const viewW = (cw / cameraZoom) + 200;
            const viewH = (ch / cameraZoom) + 200;

            if (isSunset) {
              // Warm golden hour twilight
              ctx.fillStyle = `rgba(249, 115, 22, ${ambientDarkness * 0.4})`;
              ctx.fillRect(viewLeft, viewTop, viewW, viewH);
            } else if (isSunrise) {
              // Soft morning dawn
              ctx.fillStyle = `rgba(251, 146, 60, ${ambientDarkness * 0.35})`;
              ctx.fillRect(viewLeft, viewTop, viewW, viewH);
            }

            // Midnight atmospheric tint
            ctx.fillStyle = `rgba(15, 23, 42, ${ambientDarkness})`;
            ctx.fillRect(viewLeft, viewTop, viewW, viewH);
          }

          // 4. Selection Highlight on the World Map
          if (state.selectedTileIndex !== null) {
            const sTile = state.grid[state.selectedTileIndex];
            if (sTile) {
              const smIdx = sTile.masterIndex ?? state.selectedTileIndex;
              const smaster = state.grid[smIdx];
              const sw = (smaster?.multiWidth || (smaster?.isMerged3x3 ? 3 : 1)) * ts;
              const sh = (smaster?.multiHeight || (smaster?.isMerged3x3 ? 3 : 1)) * ts;
              const spx = (smIdx % GRID_SIZE) * ts;
              const spy = Math.floor(smIdx / GRID_SIZE) * ts;
              ctx.strokeStyle = '#fbbf24';
              ctx.lineWidth = 6;
              ctx.strokeRect(spx, spy, sw, sh);
              // Corner accents
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(spx - 4, spy - 4, 16, 16);
              ctx.fillRect(spx + sw - 12, spy - 4, 16, 16);
              ctx.fillRect(spx - 4, spy + sh - 12, 16, 16);
              ctx.fillRect(spx + sw - 12, spy + sh - 12, 16, 16);
            }
          }

          ctx.restore();
        }
      }

      if (active) {
        rafId = requestAnimationFrame(loop);
      }
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      active = false;
      cancelAnimationFrame(rafId);
    };
  }, [mayorPos, targetPos, facing, isWalking, isSprinting, state.grid, state.selectedTileIndex, soundEnabled, cameraZoom, getNearbyCollisionObstacles]);

  const totalDays = Math.floor(state.date / TICKS_PER_DAY);
  const currentMonth = Math.floor(totalDays / DAYS_PER_MONTH) + 1;
  const currentDay = (totalDays % DAYS_PER_MONTH) + 1;

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full bg-slate-950 overflow-hidden select-none"
    >
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onContextMenu={handleContextMenu}
        className="w-full h-full block cursor-crosshair"
      />

      {/* Top Street HUD */}
      {isBusinessman ? (
        <BusinessmanHUD 
          onOpenPolitics={() => setShowPoliticsModal(true)}
          onOpenPortfolio={() => setShowPortfolioModal(true)}
          onGoToHome={() => setShowHomeModal(true)}
          onReturnToMenu={onReturnToMenu || (() => {})}
        />
      ) : (
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-30">
          <div className="flex items-center gap-3 pointer-events-auto">
            {/* Enter City Hall Button */}
            <button
              onClick={handleEnterCityHall}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-amber-600/30 border border-slate-700 hover:border-amber-500/50 text-slate-200 hover:text-amber-300 transition-all text-xs font-bold shadow-xl backdrop-blur cursor-pointer"
              title="Step inside the Mayor's Executive Suite"
            >
              <Building2 size={16} className="text-amber-400" />
              <span>Enter City Hall</span>
              <kbd className="hidden sm:inline px-1 py-0.2 bg-slate-800 text-[10px] text-slate-400 rounded font-mono border border-slate-700">E</kbd>
            </button>

            {/* Open Desk Terminal (City Management Overview) */}
            <button
              onClick={onOpenDesk}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-transform active:scale-95 text-xs font-black shadow-xl cursor-pointer"
              title="Open City Management Terminal (Map & Zoning)"
            >
              <Compass size={16} />
              <span>Desk Terminal (Manage City)</span>
              <kbd className="hidden sm:inline px-1.5 py-0.2 bg-amber-600 text-[10px] text-slate-950 rounded font-mono">M</kbd>
            </button>
          </div>

          {/* Live Simulation Stats, Camera Zoom, Date & Fullscreen Controls */}
          <div className="flex items-center gap-2 sm:gap-3.5 bg-slate-900/90 backdrop-blur border border-slate-700 px-3 sm:px-4 py-2 rounded-xl shadow-xl pointer-events-auto flex-wrap">
            {/* Real-World Clock & Day/Night Indicator */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-semibold">
                {hudTime.isNight ? <Moon size={11} className="text-indigo-400" /> : <Sun size={11} className="text-amber-400" />}
                <span>Time of Day</span>
              </div>
              <span className="font-mono text-amber-300 font-bold text-xs flex items-center gap-1">
                <span>{hudTime.hour}:{hudTime.minute < 10 ? '0' : ''}{hudTime.minute} {hudTime.ampm}</span>
                <span className={`text-[9px] px-1 py-0.2 rounded font-semibold uppercase ${
                  hudTime.isNight ? 'bg-indigo-950 text-indigo-300 border border-indigo-700' : 'bg-amber-950 text-amber-300 border border-amber-700'
                }`}>
                  {hudTime.isNight ? 'Night' : 'Day'}
                </span>
              </span>
            </div>

            <div className="h-6 w-px bg-slate-700 hidden sm:block" />

            <div className="flex flex-col">
              <div className="flex items-center gap-1 text-slate-400 text-[10px] uppercase font-semibold">
                <span>Calendar</span>
              </div>
              <span className="font-mono text-slate-200 font-bold text-xs">
                Month {currentMonth}, Day {currentDay}
              </span>
            </div>

            <div className="h-6 w-px bg-slate-700 hidden sm:block" />

            <div className="flex flex-col">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Treasury</span>
              <span className="font-mono text-emerald-400 font-bold text-xs">
                ${state.money.toLocaleString()}
              </span>
            </div>

            <div className="h-6 w-px bg-slate-700 hidden sm:block" />

            <div className="flex flex-col">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Population</span>
              <span className="font-mono text-slate-200 font-bold text-xs">
                {state.population.toLocaleString()}
              </span>
            </div>

            {/* Additional details fully visible in full screen mode */}
            <div className="h-6 w-px bg-slate-700 hidden md:block" />

            <div className="hidden md:flex flex-col">
              <span className="text-slate-400 text-[10px] uppercase font-semibold flex items-center gap-1">
                <Wind size={10} className={(state.averagePollution || 0) > 40 ? 'text-purple-400' : 'text-emerald-400'} />
                Air Quality
              </span>
              <span className={`font-mono font-bold text-xs ${(state.averagePollution || 0) > 40 ? 'text-purple-300' : 'text-emerald-400'}`}>
                {state.averagePollution || 0} AQI
              </span>
            </div>

            <div className="h-6 w-px bg-slate-700 hidden lg:block" />

            <div className="hidden lg:flex flex-col">
              <span className="text-slate-400 text-[10px] uppercase font-semibold flex items-center gap-1">
                <Smile size={10} className={(state.cityMorale || 75) > 60 ? 'text-emerald-400' : 'text-amber-400'} />
                Morale
              </span>
              <span className="font-mono font-bold text-xs text-amber-300">
                {state.cityMorale || 75}%
              </span>
            </div>

            <div className="h-6 w-px bg-slate-700 hidden xl:block" />

            <div className="hidden xl:flex flex-col">
              <span className="text-slate-400 text-[10px] uppercase font-semibold flex items-center gap-1">
                <ShieldAlert size={10} className={state.corruption > 40 ? 'text-amber-400' : 'text-blue-400'} />
                Corruption
              </span>
              <span className={`font-mono font-bold text-xs ${state.corruption > 40 ? 'text-amber-400' : 'text-blue-400'}`}>
                {state.corruption}%
              </span>
            </div>

            {/* Camera Zoom Toggle */}
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setCameraZoom(z => Math.max(0.4, z - 0.2))}
                className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut size={13} />
              </button>
              <span className="text-[10px] font-mono text-slate-300 px-1">{Math.round(cameraZoom * 100)}%</span>
              <button
                onClick={() => setCameraZoom(z => Math.min(1.6, z + 0.2))}
                className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                title="Zoom In (Close 3rd Person)"
              >
                <ZoomIn size={13} />
              </button>
            </div>

            {/* Real World Speed Controls: ~60 min day & night cycle by default */}
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => dispatch({ type: 'SET_SPEED', payload: 0 })}
                className={`p-1 rounded cursor-pointer ${state.speed === 0 ? 'bg-red-500/20 text-red-400' : 'text-slate-400 hover:text-white'}`}
                title="Pause Simulation"
              >
                <Pause size={12} />
              </button>
              <button
                onClick={() => dispatch({ type: 'SET_SPEED', payload: 1 })}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${state.speed === 1 ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'}`}
                title="1x Default Real-World Pace: ~60 min full Day & Night cycle"
              >
                1x (60m)
              </button>
              <button
                onClick={() => dispatch({ type: 'SET_SPEED', payload: 2 })}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${state.speed === 2 ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-white'}`}
                title="2x Double Pace: ~30 min Day & Night cycle"
              >
                2x (30m)
              </button>
              <button
                onClick={() => dispatch({ type: 'SET_SPEED', payload: 4 })}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${state.speed >= 4 ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-white'}`}
                title="4x High Speed: ~15 min Day & Night cycle"
              >
                4x (15m)
              </button>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                officeAudio.enabled = next;
              }}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
            >
              {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen Mode"}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>

            {/* Return to Menu Button */}
            {onReturnToMenu && (
              <button
                onClick={onReturnToMenu}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors border border-slate-700 cursor-pointer flex items-center gap-1"
                title="Return to Main Menu"
              >
                <Home size={12} className="text-amber-400" />
                <span className="hidden sm:inline">Menu</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Prompt near Computer Mayor */}
      {isNearComputerMayor && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-slate-900/95 border-2 border-amber-500 px-5 py-2.5 rounded-full shadow-2xl z-30 animate-bounce flex items-center gap-2.5 text-white text-xs font-bold">
          <Landmark size={18} className="text-amber-400" />
          <span>Speak with {state.computerMayor?.name || 'Mayor'}</span>
          <button
            onClick={() => {
              officeAudio.playClick();
              setShowPoliticsModal(true);
            }}
            className="ml-2 px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 rounded-full text-[11px] font-black cursor-pointer shadow hover:scale-105 transition-transform"
          >
            Lobby & Recall PAC [E]
          </button>
        </div>
      )}

      {/* Floating Prompt near Vance Home Residence */}
      {!isNearComputerMayor && isNearHome && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-slate-900/95 border-2 border-emerald-500 px-5 py-2.5 rounded-full shadow-2xl z-30 animate-bounce flex items-center gap-2.5 text-white text-xs font-bold">
          <Home size={18} className="text-emerald-400" />
          <span>Victor Vance Private Estate</span>
          <button
            onClick={() => {
              officeAudio.playClick();
              setShowHomeModal(true);
            }}
            className="ml-2 px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-full text-[11px] font-black cursor-pointer shadow hover:scale-105 transition-transform"
          >
            Enter Home Office [E]
          </button>
        </div>
      )}

      {/* Floating Prompt near Commercial / Industrial building to Buy or Manage */}
      {!isNearComputerMayor && !isNearHome && nearbyCommercialOrIndustrial && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-slate-900/95 border-2 border-cyan-500 px-5 py-2.5 rounded-full shadow-2xl z-30 animate-bounce flex items-center gap-2.5 text-white text-xs font-bold">
          {nearbyCommercialOrIndustrial.tile.type === TileType.COMMERCIAL ? (
            <Store size={18} className="text-cyan-400" />
          ) : (
            <Factory size={18} className="text-amber-400" />
          )}

          {ownedNearbyBiz ? (
            <>
              <span>
                {ownedNearbyBiz.name} ({ownedNearbyBiz.mode === 'HONEST' ? '🌿 Honest' : '💰 Corrupt'})
              </span>
              <button
                onClick={() => {
                  officeAudio.playClick();
                  setActiveBusinessTileIndex(nearbyCommercialOrIndustrial.index);
                }}
                className="ml-2 px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-full text-[11px] font-black cursor-pointer shadow hover:scale-105 transition-transform"
              >
                Manage Enterprise [E]
              </button>
            </>
          ) : (
            <>
              <span>
                Available {nearbyCommercialOrIndustrial.tile.type === TileType.COMMERCIAL ? 'Commercial' : 'Industrial'} Zone
              </span>
              <button
                onClick={() => {
                  officeAudio.playClick();
                  setActiveBusinessTileIndex(nearbyCommercialOrIndustrial.index);
                }}
                className="ml-2 px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-full text-[11px] font-black cursor-pointer shadow hover:scale-105 transition-transform"
              >
                Acquire Property [E]
              </button>
            </>
          )}
        </div>
      )}

      {/* Floating Prompt near City Hall Entrance (if not interacting with other targets) */}
      {!isNearComputerMayor && !isNearHome && !nearbyCommercialOrIndustrial && isNearCityHallEntrance && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-slate-900/95 border-2 border-amber-500 px-5 py-2.5 rounded-full shadow-2xl z-30 animate-bounce flex items-center gap-2 text-white text-xs font-bold">
          <Building2 size={16} className="text-amber-400" />
          <span>{isBusinessman ? 'City Hall Civic Chambers' : 'Press [E] or Click to Enter City Hall'}</span>
          <button
            onClick={() => {
              if (isBusinessman) {
                officeAudio.playClick();
                setShowPoliticsModal(true);
              } else {
                handleEnterCityHall();
              }
            }}
            className="ml-2 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-full text-[11px] font-black cursor-pointer"
          >
            {isBusinessman ? 'Lobby Mayor [E]' : 'Enter [E]'}
          </button>
        </div>
      )}

      {/* Minimap Radar in Corner */}
      <div className="absolute bottom-4 left-4 bg-slate-900/95 backdrop-blur border border-slate-700 p-2.5 rounded-2xl shadow-2xl z-20 hidden sm:block">
        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5 font-mono">
          <span className="font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {isBusinessman ? 'Enterprise Map' : 'Outdoor Radar'}
          </span>
          <span className="text-amber-400 font-bold">
            [{Math.floor(mayorPos.x / WORLD_TILE_PX)}, {Math.floor(mayorPos.y / WORLD_TILE_PX)}]
          </span>
        </div>
        <div className="relative border border-slate-700 rounded-lg overflow-hidden bg-slate-950 p-0.5">
          <canvas
            width={120}
            height={120}
            className="rounded bg-slate-950 block w-[120px] h-[120px]"
            style={{ imageRendering: 'pixelated' }}
            ref={(miniCanvas) => {
              if (!miniCanvas) return;
              const ctx = miniCanvas.getContext('2d');
              if (!ctx) return;
              ctx.fillStyle = '#0b1120';
              ctx.fillRect(0, 0, 120, 120);

              const s = 120 / GRID_SIZE; // 1.2

              // Subtle crosshairs
              ctx.strokeStyle = '#1e293b';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(60, 0);
              ctx.lineTo(60, 120);
              ctx.moveTo(0, 60);
              ctx.lineTo(120, 60);
              ctx.stroke();

              // Draw city grid dots
              for (let i = 0; i < state.grid.length; i++) {
                const tile = state.grid[i];
                if (tile.type !== TileType.EMPTY) {
                  ctx.fillStyle = COLORS[tile.type] || '#475569';
                  ctx.fillRect(Math.floor(tile.x * s), Math.floor(tile.y * s), 2, 2);
                }
              }

              // Highlight player-owned businesses
              if (isBusinessman && state.businessman) {
                for (const b of state.businessman.businesses) {
                  const bx = (b.tileIndex % GRID_SIZE) * s;
                  const by = Math.floor(b.tileIndex / GRID_SIZE) * s;
                  ctx.fillStyle = b.mode === 'HONEST' ? '#10b981' : '#f59e0b';
                  ctx.fillRect(Math.floor(bx), Math.floor(by), 3, 3);
                }
              }

              // Businessman Home Marker (Tile 45, 52)
              if (isBusinessman) {
                ctx.fillStyle = '#34d399';
                ctx.fillRect(Math.floor(HOME_TX * s), Math.floor(HOME_TY * s), 3, 3);
              }

              // Mayor's Office Marker (Center)
              ctx.fillStyle = '#fbbf24';
              ctx.fillRect(Math.floor(48 * s), Math.floor(48 * s), 4, 4);

              // Computer Mayor position (if businessman)
              if (isBusinessman) {
                const cmX = (computerMayorPos.x / WORLD_TILE_PX) * s;
                const cmY = (computerMayorPos.y / WORLD_TILE_PX) * s;
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(cmX, cmY, 2.5, 0, Math.PI * 2);
                ctx.fill();
              }

              // Player location pulsing marker
              const playerTileX = (mayorPos.x / WORLD_TILE_PX) * s;
              const playerTileY = (mayorPos.y / WORLD_TILE_PX) * s;
              ctx.fillStyle = isBusinessman ? '#10b981' : '#f59e0b';
              ctx.beginPath();
              ctx.arc(playerTileX, playerTileY, 3.5, 0, Math.PI * 2);
              ctx.fill();

              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.arc(playerTileX, playerTileY, 5, 0, Math.PI * 2);
              ctx.stroke();
            }}
          />
        </div>
      </div>

      {/* Street Command Bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur border border-slate-700 p-1.5 rounded-2xl shadow-2xl z-30 flex items-center gap-2 max-w-[96vw] overflow-x-auto">
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
            <span>{isBusinessman ? '💼 Businessman Free Roam' : '🚶 Free Roam'}</span>
          </div>

          {isBusinessman ? (
            <>
              <button
                onClick={() => setShowPortfolioModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer bg-slate-800 hover:bg-emerald-600/30 text-emerald-400 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/50 shadow-sm"
              >
                <Store size={13} className="text-emerald-400" />
                <span>Empire Portfolio ({state.businessman?.businesses.length || 0})</span>
              </button>

              <button
                onClick={() => setShowPoliticsModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow-sm"
              >
                <Vote size={13} className="text-amber-400" />
                <span>Lobby & Recall PAC</span>
              </button>

              <button
                onClick={() => {
                  officeAudio.playClick();
                  setShowHomeModal(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                title="Open Vance Private Estate & Home Office"
              >
                <Home size={13} className="text-emerald-400" />
                <span>Home HQ</span>
              </button>
            </>
          ) : (
            <button
              onClick={onOpenDesk}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer bg-slate-800 hover:bg-emerald-600/30 text-emerald-400 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/50 shadow-sm"
              title="Open City Desk Terminal [M] - Building and Zoning is conducted at the Desk"
            >
              <Compass size={13} className="text-emerald-400" />
              <span>Build at City Desk</span>
              <kbd className="hidden sm:inline px-1 py-0.2 bg-slate-900 text-[10px] text-slate-400 rounded font-mono border border-slate-700">M</kbd>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Controls Help */}
      <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur border border-slate-700/80 px-3 py-1.5 rounded-lg text-[11px] text-slate-400 opacity-80 pointer-events-none select-none shadow">
        {isBusinessman 
          ? 'WASD / Arrow Keys to Walk • Hold Shift to Sprint • [E] Interact with Buildings & Mayor' 
          : 'WASD / Arrow Keys to Walk • Hold Shift to Sprint • [M] Open City Management'
        }
      </div>

      {/* Businessman Modals */}
      {activeBusinessTileIndex !== null && (
        <BusinessModal 
          tileIndex={activeBusinessTileIndex} 
          onClose={() => setActiveBusinessTileIndex(null)} 
        />
      )}

      {showPoliticsModal && (
        <PoliticsModal 
          onClose={() => setShowPoliticsModal(false)} 
        />
      )}

      {showPortfolioModal && (
        <PortfolioModal 
          onClose={() => setShowPortfolioModal(false)} 
          onSelectBusinessTile={(tIdx) => {
            setShowPortfolioModal(false);
            const btx = (tIdx % GRID_SIZE) * WORLD_TILE_PX + WORLD_TILE_PX / 2;
            const bty = Math.floor(tIdx / GRID_SIZE) * WORLD_TILE_PX + WORLD_TILE_PX / 2;
            setMayorPos({ x: btx, y: bty });
            setActiveBusinessTileIndex(tIdx);
          }}
        />
      )}

      {showHomeModal && (
        <HomeSanctuaryModal 
          onClose={() => {
            setShowHomeModal(false);
            setMayorPos({ x: HOME_STREET_EXIT_X, y: HOME_STREET_EXIT_Y });
            setFacing('N');
          }} 
          onOpenPolitics={() => {
            setShowHomeModal(false);
            setMayorPos({ x: HOME_STREET_EXIT_X, y: HOME_STREET_EXIT_Y });
            setFacing('N');
            setShowPoliticsModal(true);
          }}
          onOpenPortfolio={() => {
            setShowHomeModal(false);
            setMayorPos({ x: HOME_STREET_EXIT_X, y: HOME_STREET_EXIT_Y });
            setFacing('N');
            setShowPortfolioModal(true);
          }}
        />
      )}
    </div>
  );
};
