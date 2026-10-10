import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { GRID_SIZE, TILE_SIZE_PX, COLORS } from '../constants';
import { TileType, Tile } from '../types';
import { ZoomIn, ZoomOut, Compass, Zap, ShieldAlert, Eye, Wind, Car, Layers, Crosshair, Sparkles, Activity, MousePointer, Hammer, Trash2 } from 'lucide-react';

interface GameCanvasProps {
  onTileClick: (index: number) => void;
  activeTool: TileType | null;
  onToolSelect?: (tool: TileType | null) => void;
}

type ViewMode = 'NORMAL' | 'POWER' | 'CRIME' | 'POLLUTION' | 'TRAFFIC';

const GameCanvas: React.FC<GameCanvasProps> = ({ onTileClick, activeTool, onToolSelect }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const miniCanvasRef = useRef<HTMLCanvasElement>(null);
  const { state } = useGame();

  // Viewport mode
  const [viewMode, setViewMode] = useState<ViewMode>('NORMAL');

  // Radar interactive states
  const [isRadarDragging, setIsRadarDragging] = useState(false);
  const [radarHoverCoord, setRadarHoverCoord] = useState<{ x: number; y: number } | null>(null);

  // Camera state: start centered on Mayor's Office (grid coordinate 49, 49)
  const [offset, setOffset] = useState(() => {
    const mayoralCenterPx = 49.5 * TILE_SIZE_PX;
    // Assume typical initial viewport ~ 900x700
    return {
      x: 450 - mayoralCenterPx,
      y: 350 - mayoralCenterPx,
    };
  });
  const [scale, setScale] = useState(1.4); // Start at comfortable zoom where building details shine
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredTile, setHoveredTile] = useState<number | null>(null);
  const mouseDownPosRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const hasMovedRef = useRef<boolean>(false);

  // Animation frame counter for sirens, smoke, fountains, and traffic
  const animTimeRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);

  // Center camera directly on Mayor's Office (dead center at 49, 49)
  const centerOnMayorsOffice = useCallback(() => {
    if (!containerRef.current) return;
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;
    const mayoralCenterPx = 49.5 * TILE_SIZE_PX;
    setOffset({
      x: w / 2 - mayoralCenterPx * scale,
      y: h / 2 - mayoralCenterPx * scale,
    });
  }, [scale]);

  // Adjust canvas size on container resize
  useEffect(() => {
    const updateSize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      canvasRef.current.width = rect.width;
      canvasRef.current.height = rect.height;
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Road connection cache helper: returns 4-bit bitmask (N: 1, E: 2, S: 4, W: 8)
  const getRoadConnections = (grid: Tile[], x: number, y: number): number => {
    let mask = 0;
    // North
    if (y > 0 && grid[(y - 1) * GRID_SIZE + x]?.type === TileType.ROAD) mask |= 1;
    // East
    if (x < GRID_SIZE - 1 && grid[y * GRID_SIZE + (x + 1)]?.type === TileType.ROAD) mask |= 2;
    // South
    if (y < GRID_SIZE - 1 && grid[(y + 1) * GRID_SIZE + x]?.type === TileType.ROAD) mask |= 4;
    // West
    if (x > 0 && grid[y * GRID_SIZE + (x - 1)]?.type === TileType.ROAD) mask |= 8;
    return mask;
  };

  // Main Canvas Rendering Loop
  useEffect(() => {
    let active = true;

    const render = () => {
      animTimeRef.current += 1;
      const t = animTimeRef.current;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const cw = canvas.width;
      const ch = canvas.height;

      // 1. Clear background (Atmospheric dark slate landscape)
      ctx.fillStyle = '#0b1120';
      ctx.fillRect(0, 0, cw, ch);

      ctx.save();
      // Apply camera transform
      ctx.translate(offset.x, offset.y);
      ctx.scale(scale, scale);

      // 2. Viewport culling boundaries
      const minX = Math.max(0, Math.floor(-offset.x / (scale * TILE_SIZE_PX)) - 1);
      const maxX = Math.min(GRID_SIZE - 1, Math.ceil((cw - offset.x) / (scale * TILE_SIZE_PX)) + 1);
      const minY = Math.max(0, Math.floor(-offset.y / (scale * TILE_SIZE_PX)) - 1);
      const maxY = Math.min(GRID_SIZE - 1, Math.ceil((ch - offset.y) / (scale * TILE_SIZE_PX)) + 1);

      const ts = TILE_SIZE_PX;

      // 3. Render base terrain and roads
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const index = y * GRID_SIZE + x;
          const tile = state.grid[index];
          const px = x * ts;
          const py = y * ts;

          // Default Earth / Empty Tile
          if (tile.type === TileType.EMPTY) {
            ctx.fillStyle = '#141d2e';
            ctx.fillRect(px, py, ts, ts);

            // Subtle terrain texture
            if ((x + y) % 5 === 0) {
              ctx.fillStyle = '#172236';
              ctx.fillRect(px + 3, py + 3, ts - 6, ts - 6);
            }
            // Fine grid lines
            ctx.strokeStyle = '#1e293b22';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(px, py, ts, ts);
            continue;
          }

          // Roads (with autotiling crosswalks, curbs, and traffic)
          if (tile.type === TileType.ROAD) {
            ctx.fillStyle = '#2d3748'; // Asphalt
            ctx.fillRect(px, py, ts, ts);

            const mask = getRoadConnections(state.grid, x, y);
            const isNorth = (mask & 1) !== 0;
            const isEast = (mask & 2) !== 0;
            const isSouth = (mask & 4) !== 0;
            const isWest = (mask & 8) !== 0;

            // Curb borders
            ctx.strokeStyle = '#1a202c';
            ctx.lineWidth = 1;
            ctx.strokeRect(px, py, ts, ts);

            // Road markings (yellow dashed centerline or white crosswalks)
            const count = (isNorth ? 1 : 0) + (isEast ? 1 : 0) + (isSouth ? 1 : 0) + (isWest ? 1 : 0);

            if (count >= 3) {
              // Intersection with zebra crosswalks
              ctx.fillStyle = '#f8fafc88';
              // North crosswalk
              if (isNorth) {
                for (let k = 4; k < ts - 4; k += 4) ctx.fillRect(px + k, py + 1, 2, 3);
              }
              // South crosswalk
              if (isSouth) {
                for (let k = 4; k < ts - 4; k += 4) ctx.fillRect(px + k, py + ts - 4, 2, 3);
              }
              // West crosswalk
              if (isWest) {
                for (let k = 4; k < ts - 4; k += 4) ctx.fillRect(px + 1, py + k, 3, 2);
              }
              // East crosswalk
              if (isEast) {
                for (let k = 4; k < ts - 4; k += 4) ctx.fillRect(px + ts - 4, py + k, 3, 2);
              }
            } else if (isNorth && isSouth) {
              // Vertical straight road: yellow dashed divider
              ctx.fillStyle = '#fbbf2499';
              ctx.fillRect(px + ts / 2 - 0.5, py + 2, 1, 6);
              ctx.fillRect(px + ts / 2 - 0.5, py + ts / 2 + 2, 1, 6);
            } else if (isEast && isWest) {
              // Horizontal straight road: yellow dashed divider
              ctx.fillStyle = '#fbbf2499';
              ctx.fillRect(px + 2, py + ts / 2 - 0.5, 6, 1);
              ctx.fillRect(px + ts / 2 + 2, py + ts / 2 - 0.5, 6, 1);
            }

            // Animated Commuter Traffic (visible when zoomed in)
            if (scale > 0.8 && (x + y) % 3 === 0) {
              const carProgress = ((t * 0.8 + (x * 17) + (y * 31)) % 120) / 120;
              const carX = isEast || isWest ? px + carProgress * (ts - 6) + 3 : px + ts / 2 - 2;
              const carY = isNorth || isSouth ? py + carProgress * (ts - 6) + 3 : py + ts / 2 - 2;
              
              // Alternating taxi yellow and commuter blue
              ctx.fillStyle = (x + y) % 2 === 0 ? '#fbbf24' : '#38bdf8';
              ctx.fillRect(carX, carY, 4, 3);
              // Headlight glow
              ctx.fillStyle = '#ffffffaa';
              ctx.fillRect(carX + 3, carY, 1, 3);
            }

            continue;
          }
        }
      }

      // 4. Render Buildings & Zoned Plots (Multi-tile and Single-tile)
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const index = y * GRID_SIZE + x;
          const tile = state.grid[index];

          if (tile.type === TileType.EMPTY || tile.type === TileType.ROAD) continue;

          // If this tile is an offset piece of a multi-tile structure, skip base rendering
          // (the master tile renders the entire multi-tile structure)
          if (tile.isMultiPart) continue;

          const px = x * ts;
          const py = y * ts;

          // -------------------------------------------------------------
          // A. 3x3 MAYOR'S OFFICE (DEAD CENTER CIVIC PALACE)
          // -------------------------------------------------------------
          if (tile.type === TileType.MAYORS_OFFICE) {
            const size3 = ts * 3;

            // Grand plaza ground (marble paving with dark border)
            ctx.fillStyle = '#334155';
            ctx.fillRect(px, py, size3, size3);

            // Plaza stone perimeter trim
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(px + 1, py + 1, size3 - 2, size3 - 2);

            // Classical facade shadows
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(px + 4, py + 4, size3 - 8, size3 - 8);

            // Symmetrical Executive Wings (Limestone / Neoclassical off-white)
            ctx.fillStyle = '#e2e8f0';
            // West Wing
            ctx.fillRect(px + 5, py + 12, size3 * 0.28, size3 * 0.55);
            // East Wing
            ctx.fillRect(px + size3 * 0.72 - 5, py + 12, size3 * 0.28, size3 * 0.55);
            // Wing cornices & roofs (slate gray)
            ctx.fillStyle = '#475569';
            ctx.fillRect(px + 3, py + 10, size3 * 0.3, 4);
            ctx.fillRect(px + size3 * 0.7 - 3, py + 10, size3 * 0.3, 4);

            // Wing arched glowing windows
            ctx.fillStyle = '#fef08a';
            for (let wy = py + 18; wy < py + size3 * 0.6; wy += 8) {
              ctx.fillRect(px + 9, wy, 4, 5);
              ctx.fillRect(px + 16, wy, 4, 5);
              ctx.fillRect(px + size3 - 13, wy, 4, 5);
              ctx.fillRect(px + size3 - 20, wy, 4, 5);
            }

            // Central Grand Hall & Colonnade Portico
            const porticoW = size3 * 0.52;
            const porticoX = px + (size3 - porticoW) / 2;
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(porticoX, py + 10, porticoW, size3 * 0.42);

            // Grand Marble Stairs leading down to plaza
            for (let step = 0; step < 4; step++) {
              ctx.fillStyle = step % 2 === 0 ? '#cbd5e1' : '#e2e8f0';
              ctx.fillRect(porticoX - 3 - step * 2, py + 10 + size3 * 0.42 + step * 3, porticoW + 6 + step * 4, 3);
            }

            // 6 Classical Portico Columns
            ctx.fillStyle = '#94a3b8';
            const colSpacing = porticoW / 5;
            for (let c = 0; c < 6; c++) {
              ctx.fillRect(porticoX + c * colSpacing - 1.5, py + 14, 3, size3 * 0.35);
            }

            // Triangular Classical Pediment with Golden Mayoral Crest
            ctx.beginPath();
            ctx.moveTo(porticoX - 2, py + 10);
            ctx.lineTo(porticoX + porticoW / 2, py - 4);
            ctx.lineTo(porticoX + porticoW + 2, py + 10);
            ctx.closePath();
            ctx.fillStyle = '#f1f5f9';
            ctx.fill();
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Gold Mayoral Seal in pediment center
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(porticoX + porticoW / 2, py + 4, 3, 0, Math.PI * 2);
            ctx.fill();

            // Copper-verdigris Grand Rotunda Dome
            const domeCenterX = px + size3 / 2;
            const domeCenterY = py + 2;
            const domeR = size3 * 0.16;

            ctx.beginPath();
            ctx.arc(domeCenterX, domeCenterY, domeR, Math.PI, 0);
            ctx.closePath();
            ctx.fillStyle = '#0d9488'; // Verdigris oxidized copper
            ctx.fill();
            ctx.strokeStyle = '#115e59';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Dome Cupola & Golden Finial
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(domeCenterX - 2, domeCenterY - domeR - 4, 4, 4);
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(domeCenterX, domeCenterY - domeR - 5, 2, 0, Math.PI * 2);
            ctx.fill();

            // Animated Flying City Flag
            const flagWave = Math.sin(t * 0.1) * 3;
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(porticoX + 8, py - 6);
            ctx.lineTo(porticoX + 8, py + 8);
            ctx.stroke();

            // Pennant flag (Navy & Gold)
            ctx.fillStyle = '#2563eb';
            ctx.beginPath();
            ctx.moveTo(porticoX + 9, py - 6);
            ctx.lineTo(porticoX + 20 + flagWave, py - 3);
            ctx.lineTo(porticoX + 9, py);
            ctx.closePath();
            ctx.fill();

            // Front Plaza: Bronze Statue Fountain of the Founding Mayor
            const fountainY = py + size3 - 14;
            // Circular fountain basin
            ctx.fillStyle = '#0284c7';
            ctx.beginPath();
            ctx.arc(domeCenterX, fountainY, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Water ripple pulse
            const rippleR = (t * 0.2) % 7;
            ctx.strokeStyle = '#bae6fd88';
            ctx.beginPath();
            ctx.arc(domeCenterX, fountainY, rippleR, 0, Math.PI * 2);
            ctx.stroke();

            // Bronze Mayor Statue on plinth
            ctx.fillStyle = '#d97706';
            ctx.fillRect(domeCenterX - 2, fountainY - 4, 4, 6);
            ctx.beginPath();
            ctx.arc(domeCenterX, fountainY - 5, 2, 0, Math.PI * 2);
            ctx.fill();

            // Manicured Cypress Topiaries lining the sides of the plaza
            ctx.fillStyle = '#15803d';
            ctx.beginPath();
            ctx.arc(px + 10, py + size3 - 10, 4, 0, Math.PI * 2);
            ctx.arc(px + size3 - 10, py + size3 - 10, 4, 0, Math.PI * 2);
            ctx.fill();

            continue;
          }

          // -------------------------------------------------------------
          // B. 3x3 MERGED RESIDENTIAL MEGACOMPLEX (LEVELS 1, 2, 3)
          // -------------------------------------------------------------
          if (tile.isMerged3x3) {
            const size3 = ts * 3;
            const lvl = tile.mergedLevel || 1;

            // Merged base shadow & lot
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(px, py, size3, size3);

            if (lvl === 1) {
              // LEVEL 1: GARDEN MANOR QUAD (Mid-Rise Brick Courtyard)
              // Outer landscaped lawn
              ctx.fillStyle = '#166534';
              ctx.fillRect(px + 2, py + 2, size3 - 4, size3 - 4);

              // 4 Interconnected Brick Wings framing a central courtyard
              const wingW = size3 * 0.32;
              const wingH = size3 * 0.32;

              ctx.fillStyle = '#b91c1c'; // Red brick
              // NW Wing
              ctx.fillRect(px + 4, py + 4, wingW, wingH);
              // NE Wing
              ctx.fillRect(px + size3 - wingW - 4, py + 4, wingW, wingH);
              // SW Wing
              ctx.fillRect(px + 4, py + size3 - wingH - 4, wingW, wingH);
              // SE Wing
              ctx.fillRect(px + size3 - wingW - 4, py + size3 - wingH - 4, wingW, wingH);

              // Connecting covered wings
              ctx.fillStyle = '#991b1b';
              ctx.fillRect(px + wingW, py + 8, size3 - wingW * 2, 10);
              ctx.fillRect(px + wingW, py + size3 - 18, size3 - wingW * 2, 10);

              // Terracotta roofs
              ctx.fillStyle = '#ea580c';
              ctx.fillRect(px + 3, py + 3, wingW + 2, 5);
              ctx.fillRect(px + size3 - wingW - 5, py + 3, wingW + 2, 5);

              // Lit windows
              ctx.fillStyle = '#fef08a';
              ctx.fillRect(px + 8, py + 12, 4, 4);
              ctx.fillRect(px + size3 - 14, py + 12, 4, 4);
              ctx.fillRect(px + 8, py + size3 - 14, 4, 4);
              ctx.fillRect(px + size3 - 14, py + size3 - 14, 4, 4);

              // Central courtyard with stone fountain & paths
              const midQuadX = px + size3 / 2;
              const midQuadY = py + size3 / 2;
              ctx.fillStyle = '#0284c7';
              ctx.beginPath();
              ctx.arc(midQuadX, midQuadY, 6, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#cbd5e1';
              ctx.stroke();

              // Blooming courtyard trees
              ctx.fillStyle = '#22c55e';
              ctx.beginPath();
              ctx.arc(midQuadX - 10, midQuadY - 6, 3, 0, Math.PI * 2);
              ctx.arc(midQuadX + 10, midQuadY - 6, 3, 0, Math.PI * 2);
              ctx.fill();
            } else if (lvl === 2) {
              // LEVEL 2: TWIN SKYLINE HIGH-RISE TOWERS WITH SKYBRIDGE
              ctx.fillStyle = '#1e293b';
              ctx.fillRect(px + 2, py + 2, size3 - 4, size3 - 4);

              const towerW = size3 * 0.35;
              const towerH = size3 * 0.72;

              // Tower 1 (West)
              ctx.fillStyle = '#0284c7'; // Modern glass
              ctx.fillRect(px + 6, py + 6, towerW, towerH);
              // Tower 2 (East)
              ctx.fillRect(px + size3 - towerW - 6, py + 6, towerW, towerH);

              // Steel facade ribbing & windows
              ctx.fillStyle = '#38bdf8';
              for (let yOffset = py + 10; yOffset < py + towerH; yOffset += 6) {
                ctx.fillRect(px + 8, yOffset, towerW - 4, 2);
                ctx.fillRect(px + size3 - towerW - 4, yOffset, towerW - 4, 2);
              }

              // Elevated Glass Skybridge connecting the towers
              const bridgeY = py + towerH * 0.45;
              ctx.fillStyle = '#0369a1';
              ctx.fillRect(px + 6 + towerW, bridgeY, size3 - (towerW * 2) - 12, 8);
              ctx.fillStyle = '#bae6fd';
              ctx.fillRect(px + 6 + towerW, bridgeY + 2, size3 - (towerW * 2) - 12, 4);

              // Rooftop Helipad on East Tower
              const heliX = px + size3 - towerW / 2 - 6;
              const heliY = py + 12;
              ctx.fillStyle = '#334155';
              ctx.beginPath();
              ctx.arc(heliX, heliY, 7, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#facc15';
              ctx.lineWidth = 1;
              ctx.stroke();
              // "H" letter
              ctx.fillStyle = '#facc15';
              ctx.font = 'bold 8px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('H', heliX, heliY);

              // Ground entrance canopy
              ctx.fillStyle = '#0ea5e9';
              ctx.fillRect(px + size3 / 2 - 12, py + size3 - 10, 24, 6);
            } else {
              // LEVEL 3: METROPOLIS ARCOLOGY CITADEL (Futuristic Luxury Megatower)
              // Ziggurat stepped base with terraced hanging gardens
              ctx.fillStyle = '#0f172a';
              ctx.fillRect(px + 2, py + 2, size3 - 4, size3 - 4);

              // Tier 1 (Hanging Gardens)
              ctx.fillStyle = '#15803d';
              ctx.fillRect(px + 5, py + 5, size3 - 10, size3 - 10);

              // Tier 2 (Crystal Glass Core)
              ctx.fillStyle = '#0369a1';
              ctx.fillRect(px + 10, py + 8, size3 - 20, size3 - 16);

              // Tier 3 (Upper Citadel Tower)
              ctx.fillStyle = '#38bdf8';
              ctx.fillRect(px + 16, py + 12, size3 - 32, size3 - 26);

              // Vertical LED light strips
              const pulse = (Math.sin(t * 0.08) + 1) * 0.5;
              ctx.fillStyle = `rgba(56, 189, 248, ${0.4 + pulse * 0.5})`;
              ctx.fillRect(px + size3 / 2 - 2, py + 12, 4, size3 - 26);

              // Twin Needle Spires
              const spire1X = px + 18;
              const spire2X = px + size3 - 18;
              ctx.strokeStyle = '#94a3b8';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(spire1X, py + 12);
              ctx.lineTo(spire1X, py - 8);
              ctx.moveTo(spire2X, py + 12);
              ctx.lineTo(spire2X, py - 8);
              ctx.stroke();

              // Blinking red aviation warning lights on spires
              const beaconBlink = Math.floor(t / 20) % 2 === 0;
              if (beaconBlink) {
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(spire1X, py - 8, 2.5, 0, Math.PI * 2);
                ctx.arc(spire2X, py - 8, 2.5, 0, Math.PI * 2);
                ctx.fill();
              }

              // Rooftop Observatory Atrium Dome
              ctx.fillStyle = '#bae6fd';
              ctx.beginPath();
              ctx.arc(px + size3 / 2, py + 16, 7, Math.PI, 0);
              ctx.fill();
            }

            continue;
          }

          // -------------------------------------------------------------
          // C. POWER PLANT (2x2 Footprint)
          // -------------------------------------------------------------
          if (tile.type === TileType.POWER_PLANT) {
            const size2 = ts * 2;

            // Industrial concrete foundation
            ctx.fillStyle = '#334155';
            ctx.fillRect(px, py, size2, size2);
            ctx.strokeStyle = '#475569';
            ctx.strokeRect(px + 1, py + 1, size2 - 2, size2 - 2);

            // Huge Hyperbolic Cooling Tower (Left side)
            const towerCenterX = px + size2 * 0.35;
            const towerCenterY = py + size2 * 0.5;
            const towerR = size2 * 0.28;

            ctx.fillStyle = '#64748b';
            ctx.beginPath();
            ctx.arc(towerCenterX, towerCenterY, towerR, 0, Math.PI * 2);
            ctx.fill();

            // Inner dark rim
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.arc(towerCenterX, towerCenterY, towerR * 0.65, 0, Math.PI * 2);
            ctx.fill();

            // Animated Billowing White Steam Clouds from cooling tower
            const steamCount = 3;
            for (let s = 0; s < steamCount; s++) {
              const steamProg = ((t * 0.05 + s * 0.33) % 1);
              const steamX = towerCenterX + Math.sin(t * 0.08 + s) * 4;
              const steamY = towerCenterY - steamProg * 14;
              const steamAlpha = (1 - steamProg) * 0.7;

              ctx.fillStyle = `rgba(241, 245, 249, ${steamAlpha})`;
              ctx.beginPath();
              ctx.arc(steamX, steamY, 3 + steamProg * 6, 0, Math.PI * 2);
              ctx.fill();
            }

            // High-voltage Transformer Yard & Substation (Right side)
            const subX = px + size2 * 0.65;
            const subY = py + 6;
            ctx.fillStyle = '#475569';
            ctx.fillRect(subX, subY, size2 * 0.3, size2 * 0.4);

            // Generator Hall with Yellow Hazard Diagonal Stripes
            const genY = py + size2 * 0.55;
            ctx.fillStyle = '#eab308';
            ctx.fillRect(subX - 2, genY, size2 * 0.32, size2 * 0.35);

            ctx.fillStyle = '#0f172a';
            // Diagonal hazard lines
            for (let hz = 0; hz < 4; hz++) {
              ctx.fillRect(subX + hz * 4, genY, 2, size2 * 0.35);
            }

            // Power icon indicator
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(px + size2 - 6, py + 6, 3, 0, Math.PI * 2);
            ctx.fill();

            continue;
          }

          // -------------------------------------------------------------
          // D. UNIVERSITY CAMPUS (2x2 Footprint)
          // -------------------------------------------------------------
          if (tile.type === TileType.UNIVERSITY) {
            const size2 = ts * 2;

            // Campus Lawn Quad
            ctx.fillStyle = '#15803d';
            ctx.fillRect(px, py, size2, size2);

            // Diagonal Flagstone Walkways
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(px + 4, py + 4);
            ctx.lineTo(px + size2 - 4, py + size2 - 4);
            ctx.moveTo(px + size2 - 4, py + 4);
            ctx.lineTo(px + 4, py + size2 - 4);
            ctx.stroke();

            // Collegiate Gothic Academic Hall (North Wing)
            ctx.fillStyle = '#7c3aed'; // Academic violet trim
            ctx.fillRect(px + 6, py + 3, size2 - 12, 10);
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(px + 7, py + 5, size2 - 14, 7);

            // Library Clock Tower with Copper Dome
            const towerX = px + size2 / 2;
            const towerY = py + 8;
            ctx.fillStyle = '#f1f5f9';
            ctx.fillRect(towerX - 4, towerY - 4, 8, 8);
            ctx.fillStyle = '#0d9488'; // Copper dome
            ctx.beginPath();
            ctx.arc(towerX, towerY - 4, 4, Math.PI, 0);
            ctx.fill();

            // South Research Lab Wing
            ctx.fillStyle = '#6d28d9';
            ctx.fillRect(px + 6, py + size2 - 13, size2 - 12, 9);
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(px + 8, py + size2 - 11, size2 - 16, 6);

            // Central Scholar Statue
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(towerX, py + size2 / 2, 3, 0, Math.PI * 2);
            ctx.fill();

            continue;
          }

          // -------------------------------------------------------------
          // E. POLICE PRECINCT (1x1 Footprint)
          // -------------------------------------------------------------
          if (tile.type === TileType.POLICE_STATION) {
            // Dark blue granite station
            ctx.fillStyle = '#1e3a8a';
            ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 1;
            ctx.strokeRect(px + 2, py + 2, ts - 4, ts - 4);

            // Precinct roof and antenna
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(px + 4, py + 4, ts - 8, ts - 8);

            // Communication Antenna Mast
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(px + 5, py + 4);
            ctx.lineTo(px + 5, py - 3);
            ctx.stroke();

            // Animated Flashing Red & Blue Police Emergency Strobe
            const strobePhase = Math.floor(t / 10) % 2;
            ctx.fillStyle = strobePhase === 0 ? '#ef4444' : '#3b82f6';
            ctx.fillRect(px + ts - 8, py + 3, 4, 3);
            // Strobe glow
            ctx.fillStyle = strobePhase === 0 ? '#ef444466' : '#3b82f666';
            ctx.beginPath();
            ctx.arc(px + ts - 6, py + 4.5, 4, 0, Math.PI * 2);
            ctx.fill();

            // "PD" text emblem
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 7px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('PD', px + ts / 2, py + ts / 2 + 1);

            continue;
          }

          // -------------------------------------------------------------
          // F. FIRE STATION (1x1 Footprint)
          // -------------------------------------------------------------
          if (tile.type === TileType.FIRE_STATION) {
            // Classic Red Brick Firehouse
            ctx.fillStyle = '#b91c1c';
            ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
            ctx.strokeStyle = '#7f1d1d';
            ctx.strokeRect(px + 2, py + 2, ts - 4, ts - 4);

            // Twin Red Apparatus Vehicle Bay Doors
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(px + 4, py + ts - 9, 7, 7);
            ctx.fillRect(px + ts - 11, py + ts - 9, 7, 7);

            // Glass bay door paneling
            ctx.fillStyle = '#fee2e2';
            ctx.fillRect(px + 5, py + ts - 8, 5, 2);
            ctx.fillRect(px + ts - 10, py + ts - 8, 5, 2);

            // Hose Drying Tower
            ctx.fillStyle = '#991b1b';
            ctx.fillRect(px + ts - 8, py + 1, 6, 8);
            // Brass bell on tower
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(px + ts - 5, py + 2, 2, 0, Math.PI * 2);
            ctx.fill();

            // Gold Maltese Fire Cross
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(px + 8, py + 6, 2.5, 0, Math.PI * 2);
            ctx.fill();

            continue;
          }

          // -------------------------------------------------------------
          // G. SCHOOL (ELEMENTARY / HIGH SCHOOL - 1x1 Footprint)
          // -------------------------------------------------------------
          if (tile.type === TileType.SCHOOL) {
            // Red-brick schoolhouse
            ctx.fillStyle = '#9a3412';
            ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);

            // Slate roof
            ctx.fillStyle = '#475569';
            ctx.fillRect(px + 1, py + 2, ts - 2, 4);

            // White Clock Tower & Bell
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(px + ts / 2 - 3, py - 1, 6, 5);
            ctx.fillStyle = '#0284c7';
            ctx.beginPath();
            ctx.arc(px + ts / 2, py + 1.5, 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Yellow School Bus at Curb
            ctx.fillStyle = '#facc15';
            ctx.fillRect(px + 3, py + ts - 6, 8, 4);
            // Wheels
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(px + 4, py + ts - 2, 2, 1);
            ctx.fillRect(px + 8, py + ts - 2, 2, 1);

            // Schoolyard Athletic Green
            ctx.fillStyle = '#16a34a';
            ctx.fillRect(px + ts - 10, py + 8, 8, 12);
            // White sports field markings
            ctx.strokeStyle = '#ffffffaa';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(px + ts - 9, py + 9, 6, 10);

            continue;
          }

          // -------------------------------------------------------------
          // H. UNION HALL (1x1 Footprint)
          // -------------------------------------------------------------
          if (tile.type === TileType.UNION_HALL) {
            ctx.fillStyle = '#c2410c'; // Brick union hall
            ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
            ctx.strokeStyle = '#7c2d12';
            ctx.strokeRect(px + 2, py + 2, ts - 4, ts - 4);

            // Labor Gear emblem
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(px + ts / 2, py + ts / 2 - 1, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#c2410c';
            ctx.beginPath();
            ctx.arc(px + ts / 2, py + ts / 2 - 1, 2, 0, Math.PI * 2);
            ctx.fill();

            // Entry Banner
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(px + 4, py + ts - 6, ts - 8, 3);
            continue;
          }

          // -------------------------------------------------------------
          // I. LUXURY ESTATE (1x1 Footprint)
          // -------------------------------------------------------------
          if (tile.type === TileType.LUXURY_ESTATE) {
            // Manicured estate grounds
            ctx.fillStyle = '#15803d';
            ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);

            // Gilded Manor Mansion
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(px + 3, py + 3, ts * 0.55, ts * 0.45);
            ctx.fillStyle = '#9333ea'; // Purple slate roof
            ctx.fillRect(px + 2, py + 2, ts * 0.58, 3);

            // Turquoise Swimming Pool
            ctx.fillStyle = '#06b6d4';
            ctx.beginPath();
            ctx.arc(px + ts - 6, py + ts - 7, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#e0e7ff';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Tennis Court
            ctx.fillStyle = '#10b981';
            ctx.fillRect(px + ts - 9, py + 3, 7, 5);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(px + ts - 9, py + 3, 7, 5);
            continue;
          }

          // -------------------------------------------------------------
          // J. RESIDENTIAL ZONE (1x1 - LEVELS 0, 1, 2, 3)
          // -------------------------------------------------------------
          if (tile.type === TileType.RESIDENTIAL) {
            // Level 0: Undeveloped Zoned Lot (SimCity style)
            if (tile.level === 0) {
              ctx.fillStyle = '#064e3b'; // Zoned green dirt
              ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);

              // Wooden survey stakes & orange ribbon
              ctx.fillStyle = '#b45309';
              ctx.fillRect(px + 3, py + 3, 2, 4);
              ctx.fillRect(px + ts - 5, py + 3, 2, 4);
              ctx.fillRect(px + 3, py + ts - 7, 2, 4);
              ctx.fillRect(px + ts - 5, py + ts - 7, 2, 4);

              // Orange boundary tape
              ctx.strokeStyle = '#f97316';
              ctx.lineWidth = 0.8;
              ctx.strokeRect(px + 3, py + 3, ts - 6, ts - 6);

              // Zoned marker in center
              ctx.fillStyle = '#10b981aa';
              ctx.font = 'bold 7px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('R', px + ts / 2, py + ts / 2);
            } 
            // Level 1: Single-Family Bungalow / Craftsman Cottage
            else if (tile.level === 1) {
              // Green front yard
              ctx.fillStyle = '#15803d';
              ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);

              // House body
              ctx.fillStyle = '#f1f5f9';
              ctx.fillRect(px + 4, py + 5, ts - 9, ts - 9);

              // Pitched terracotta roof
              ctx.fillStyle = '#ea580c';
              ctx.beginPath();
              ctx.moveTo(px + 3, py + 5);
              ctx.lineTo(px + (ts - 1) / 2, py + 1);
              ctx.lineTo(px + ts - 4, py + 5);
              ctx.closePath();
              ctx.fill();

              // Chimney with tiny smoke wisp
              ctx.fillStyle = '#78350f';
              ctx.fillRect(px + ts - 7, py + 1, 2, 3);

              // Glowing window
              ctx.fillStyle = '#fef08a';
              ctx.fillRect(px + 6, py + 7, 3, 3);

              // Front yard tree
              ctx.fillStyle = '#22c55e';
              ctx.beginPath();
              ctx.arc(px + ts - 4, py + ts - 4, 2.5, 0, Math.PI * 2);
              ctx.fill();
            } 
            // Level 2: Brick Townhouses / Brownstone Duplex
            else if (tile.level === 2) {
              // Red/Brown Brick Facade
              ctx.fillStyle = '#991b1b';
              ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
              ctx.strokeStyle = '#7f1d1d';
              ctx.strokeRect(px + 2, py + 2, ts - 4, ts - 4);

              // Rooftop gravel & cornices
              ctx.fillStyle = '#334155';
              ctx.fillRect(px + 3, py + 3, ts - 6, 2);

              // Rooftop wooden water tank
              ctx.fillStyle = '#b45309';
              ctx.fillRect(px + ts - 7, py + 2, 3, 4);

              // Pairs of glowing sash windows
              ctx.fillStyle = '#fef08a';
              ctx.fillRect(px + 5, py + 6, 3, 4);
              ctx.fillRect(px + 11, py + 6, 3, 4);
              ctx.fillRect(px + 5, py + 13, 3, 4);
              ctx.fillRect(px + 11, py + 13, 3, 4);

              // Black metal fire escape ladder
              ctx.fillStyle = '#1e293b';
              ctx.fillRect(px + ts - 5, py + 5, 2, ts - 8);
            } 
            // Level 3: Modern Apartment High-Rise
            else {
              // Modernist Glass & Concrete Skyscraper
              ctx.fillStyle = '#0284c7'; // Blue glass curtain
              ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);

              // Floor bands
              ctx.fillStyle = '#38bdf8';
              ctx.fillRect(px + 2, py + 5, ts - 4, 1.5);
              ctx.fillRect(px + 2, py + 10, ts - 4, 1.5);
              ctx.fillRect(px + 2, py + 15, ts - 4, 1.5);

              // Balconies with white railings
              ctx.fillStyle = '#f8fafc';
              ctx.fillRect(px + 4, py + 7, 5, 2);
              ctx.fillRect(px + ts - 9, py + 7, 5, 2);
              ctx.fillRect(px + 4, py + 12, 5, 2);
              ctx.fillRect(px + ts - 9, py + 12, 5, 2);

              // Rooftop HVAC units & antenna
              ctx.fillStyle = '#475569';
              ctx.fillRect(px + 6, py + 2, 4, 2);
              ctx.strokeStyle = '#94a3b8';
              ctx.beginPath();
              ctx.moveTo(px + ts - 5, py + 2);
              ctx.lineTo(px + ts - 5, py - 2);
              ctx.stroke();
            }
            continue;
          }

          // -------------------------------------------------------------
          // K. COMMERCIAL ZONE (1x1 - LEVELS 0, 1, 2, 3)
          // -------------------------------------------------------------
          if (tile.type === TileType.COMMERCIAL) {
            // Level 0: Undeveloped Zoned Lot
            if (tile.level === 0) {
              ctx.fillStyle = '#0c4a6e';
              ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);

              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 0.8;
              ctx.strokeRect(px + 3, py + 3, ts - 6, ts - 6);

              ctx.fillStyle = '#38bdf8aa';
              ctx.font = 'bold 7px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('C', px + ts / 2, py + ts / 2);
            } 
            // Level 1: Corner Store / Diner with Striped Awning
            else if (tile.level === 1) {
              ctx.fillStyle = '#334155';
              ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);

              // Striped red-and-white awning
              for (let aw = 0; aw < ts - 6; aw += 3) {
                ctx.fillStyle = (aw / 3) % 2 === 0 ? '#ef4444' : '#f8fafc';
                ctx.fillRect(px + 3 + aw, py + 6, 3, 3);
              }

              // Storefront glass display
              ctx.fillStyle = '#38bdf8';
              ctx.fillRect(px + 4, py + 10, ts - 8, ts - 12);
            } 
            // Level 2: Department Store / Bank
            else if (tile.level === 2) {
              ctx.fillStyle = '#0284c7';
              ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
              // Classical cornices
              ctx.fillStyle = '#e2e8f0';
              ctx.fillRect(px + 1, py + 2, ts - 2, 2.5);
              // Illuminated marquee
              ctx.fillStyle = '#fbbf24';
              ctx.fillRect(px + 4, py + ts - 5, ts - 8, 2);
            } 
            // Level 3: Corporate Skyscraper Tower
            else {
              ctx.fillStyle = '#0369a1';
              ctx.fillRect(px + 2, py + 1, ts - 4, ts - 2);
              // Reflective grid
              ctx.fillStyle = '#7dd3fc';
              for (let gy = py + 3; gy < py + ts - 3; gy += 4) {
                ctx.fillRect(px + 4, gy, ts - 8, 2);
              }
              // Spire
              ctx.strokeStyle = '#bae6fd';
              ctx.beginPath();
              ctx.moveTo(px + ts / 2, py + 1);
              ctx.lineTo(px + ts / 2, py - 3);
              ctx.stroke();
            }
            continue;
          }

          // -------------------------------------------------------------
          // L. INDUSTRIAL ZONE (1x1 - LEVELS 0, 1, 2, 3)
          // -------------------------------------------------------------
          if (tile.type === TileType.INDUSTRIAL) {
            // Level 0: Undeveloped Zoned Lot
            if (tile.level === 0) {
              ctx.fillStyle = '#451a03';
              ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);
              ctx.strokeStyle = '#f59e0b';
              ctx.lineWidth = 0.8;
              ctx.strokeRect(px + 3, py + 3, ts - 6, ts - 6);

              ctx.fillStyle = '#f59e0baa';
              ctx.font = 'bold 7px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('I', px + ts / 2, py + ts / 2);
            } 
            // Level 1: Workshop / Warehouse
            else if (tile.level === 1) {
              ctx.fillStyle = '#78350f';
              ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
              // Corrugated metal roof
              ctx.fillStyle = '#94a3b8';
              ctx.fillRect(px + 2, py + 2, ts - 4, 4);
              // Cargo bay door
              ctx.fillStyle = '#475569';
              ctx.fillRect(px + 5, py + ts - 7, ts - 10, 5);
            } 
            // Level 2: Heavy Factory with Smokestacks
            else if (tile.level === 2) {
              ctx.fillStyle = '#475569';
              ctx.fillRect(px + 2, py + 4, ts - 4, ts - 6);

              // Brick Smokestacks
              ctx.fillStyle = '#b91c1c';
              ctx.fillRect(px + 4, py + 1, 3, 6);
              ctx.fillRect(px + ts - 7, py + 1, 3, 6);

              // Animated Smoke Wisps
              const smokeOffset = (t * 0.1) % 6;
              ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
              ctx.beginPath();
              ctx.arc(px + 5.5, py - smokeOffset, 2, 0, Math.PI * 2);
              ctx.arc(px + ts - 5.5, py - smokeOffset, 2, 0, Math.PI * 2);
              ctx.fill();
            } 
            // Level 3: High-Tech Cleanroom Facility
            else {
              ctx.fillStyle = '#334155';
              ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
              // Domed siloes
              ctx.fillStyle = '#0ea5e9';
              ctx.beginPath();
              ctx.arc(px + 6, py + 7, 3, 0, Math.PI * 2);
              ctx.arc(px + ts - 6, py + 7, 3, 0, Math.PI * 2);
              ctx.fill();
              // Solar panels
              ctx.fillStyle = '#1e3a8a';
              ctx.fillRect(px + 4, py + ts - 6, ts - 8, 3);
            }
            continue;
          }

          // -------------------------------------------------------------
          // M. BOTANICAL CITY PARK (1x1 Footprint)
          // -------------------------------------------------------------
          if (tile.type === TileType.PARK) {
            // Emerald manicured lawn
            ctx.fillStyle = '#15803d';
            ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);

            // Perimeter granite curb
            ctx.strokeStyle = '#166534';
            ctx.lineWidth = 0.8;
            ctx.strokeRect(px + 1, py + 1, ts - 2, ts - 2);

            // Diagonal cobblestone paths meeting in center
            ctx.strokeStyle = '#fef08a99';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(px + 3, py + 3);
            ctx.lineTo(px + ts - 3, py + ts - 3);
            ctx.moveTo(px + ts - 3, py + 3);
            ctx.lineTo(px + 3, py + ts - 3);
            ctx.stroke();

            // Central marble tiered water fountain
            ctx.fillStyle = '#0284c7';
            ctx.beginPath();
            ctx.arc(px + ts / 2, py + ts / 2, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#f8fafc';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Water ripple pulse
            const waterRipple = (t * 0.15) % 3.5;
            ctx.strokeStyle = '#bae6fd';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.arc(px + ts / 2, py + ts / 2, waterRipple, 0, Math.PI * 2);
            ctx.stroke();

            // 4 Botanical Shade Trees with canopy shadows
            const treePositions = [
              { x: px + 5, y: py + ts / 2 },
              { x: px + ts - 5, y: py + ts / 2 },
              { x: px + ts / 2, y: py + 5 },
              { x: px + ts / 2, y: py + ts - 5 }
            ];

            for (const tp of treePositions) {
              // Tree shadow
              ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
              ctx.beginPath();
              ctx.ellipse(tp.x + 1, tp.y + 1, 3, 2, 0, 0, Math.PI * 2);
              ctx.fill();

              // Foliage
              ctx.fillStyle = '#166534';
              ctx.beginPath();
              ctx.arc(tp.x, tp.y, 3, 0, Math.PI * 2);
              ctx.fill();

              // Leaf highlight
              ctx.fillStyle = '#22c55e';
              ctx.beginPath();
              ctx.arc(tp.x - 0.8, tp.y - 0.8, 1.8, 0, Math.PI * 2);
              ctx.fill();
            }

            // Rose flowerbeds in corners (crimson and yellow)
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(px + 3, py + 3, 1.5, 1.5);
            ctx.fillRect(px + ts - 4.5, py + ts - 4.5, 1.5, 1.5);
            ctx.fillStyle = '#facc15';
            ctx.fillRect(px + ts - 4.5, py + 3, 1.5, 1.5);
            ctx.fillRect(px + 3, py + ts - 4.5, 1.5, 1.5);

            continue;
          }

          // -------------------------------------------------------------
          // N. CIVIC HEROIC STATUE (1x1 Footprint)
          // -------------------------------------------------------------
          if (tile.type === TileType.STATUE) {
            // Classical granite plaza paving
            ctx.fillStyle = '#334155';
            ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);

            // Plaza stone border
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 1;
            ctx.strokeRect(px + 2, py + 2, ts - 4, ts - 4);

            // Multi-tiered stepped marble pedestal base
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(px + 5, py + 5, ts - 10, ts - 10);
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(px + 7, py + 7, ts - 14, ts - 14);

            // Gold Dedication Plaque on pedestal face
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(px + 8, py + ts - 8, ts - 16, 1.5);

            // Heroic Bronze Mayor Statue
            const sx = px + ts / 2;
            const sy = py + ts / 2 - 1;

            // Bronze pedestal shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.beginPath();
            ctx.ellipse(sx + 1, sy + 4, 4, 2, 0, 0, Math.PI * 2);
            ctx.fill();

            // Statue Body (burnished bronze)
            ctx.fillStyle = '#b45309';
            ctx.fillRect(sx - 2, sy - 2, 4, 5);

            // Outstretched arm with civic proclamation scroll
            ctx.fillStyle = '#d97706';
            ctx.fillRect(sx + 1.5, sy - 3, 3, 1.5);

            // Head and Executive Fedora
            ctx.fillStyle = '#d97706';
            ctx.beginPath();
            ctx.arc(sx, sy - 3.5, 2, 0, Math.PI * 2);
            ctx.fill();

            // Golden Fedora brim & crown
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(sx - 2.5, sy - 4.5, 5, 1);
            ctx.fillRect(sx - 1.5, sy - 6, 3, 1.8);

            // Twin waving flags on north-east and north-west corners
            const flagWave = Math.sin(t * 0.15) * 1.5;
            ctx.fillStyle = '#2563eb';
            ctx.fillRect(px + 3, py + 3, 3 + flagWave, 2);
            ctx.fillRect(px + ts - 6, py + 3, 3 + flagWave, 2);

            continue;
          }
        }
      }

      // 5. Overlays (Power Grid / Crime / Pollution Smog / Traffic Flow)
      if (viewMode === 'POWER') {
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            const index = y * GRID_SIZE + x;
            const tile = state.grid[index];
            if (tile.type === TileType.EMPTY) continue;
            const px = x * ts;
            const py = y * ts;

            if (tile.hasPower) {
              ctx.fillStyle = 'rgba(16, 185, 129, 0.25)'; // Green power glow
              ctx.fillRect(px, py, ts, ts);
            } else {
              ctx.fillStyle = 'rgba(239, 68, 68, 0.45)'; // Red unpowered alert
              ctx.fillRect(px, py, ts, ts);
              // Blinking lightning icon
              if (Math.floor(t / 15) % 2 === 0) {
                ctx.fillStyle = '#f87171';
                ctx.fillRect(px + ts / 2 - 1, py + ts / 2 - 2, 2, 4);
              }
            }
          }
        }
      } else if (viewMode === 'CRIME') {
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            const index = y * GRID_SIZE + x;
            const tile = state.grid[index];
            if (tile.type === TileType.EMPTY) continue;
            const px = x * ts;
            const py = y * ts;

            const alpha = Math.min(0.7, (tile.crimeRisk || 0) / 100);
            ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
            ctx.fillRect(px, py, ts, ts);
          }
        }
      } else if (viewMode === 'POLLUTION') {
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            const index = y * GRID_SIZE + x;
            const tile = state.grid[index];
            const px = x * ts;
            const py = y * ts;

            const poll = tile.pollution || 0;
            if (poll === 0) {
              // Clean air zone (Fresh emerald)
              ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
              ctx.fillRect(px, py, ts, ts);
            } else if (poll <= 25) {
              // Low / Clean (Teal)
              ctx.fillStyle = 'rgba(20, 184, 166, 0.25)';
              ctx.fillRect(px, py, ts, ts);
            } else if (poll <= 50) {
              // Moderate yellow smog
              const a = 0.25 + (poll / 50) * 0.25;
              ctx.fillStyle = `rgba(234, 179, 8, ${a})`;
              ctx.fillRect(px, py, ts, ts);
            } else if (poll <= 75) {
              // Unhealthy orange-red smog
              const a = 0.45 + ((poll - 50) / 25) * 0.25;
              ctx.fillStyle = `rgba(249, 115, 22, ${a})`;
              ctx.fillRect(px, py, ts, ts);
            } else {
              // Hazardous deep purple/crimson toxic smog plume
              const a = 0.65 + ((poll - 75) / 25) * 0.25;
              ctx.fillStyle = `rgba(168, 85, 247, ${a})`;
              ctx.fillRect(px, py, ts, ts);

              // Animated toxic particulates
              if ((x + y + Math.floor(t / 8)) % 3 === 0) {
                ctx.fillStyle = '#f43f5e';
                ctx.fillRect(px + 4 + ((t * 0.4) % (ts - 8)), py + 4 + ((t * 0.3) % (ts - 8)), 2, 2);
              }
            }

            // High illness indicator: pulsing red medical cross on sick residential plots!
            if ((tile.illnessRate || 0) > 0) {
              const pulse = Math.floor(t / 12) % 2 === 0;
              ctx.fillStyle = pulse ? '#ef4444' : '#ffffff';
              // Draw medical cross
              ctx.fillRect(px + ts / 2 - 1, py + ts / 2 - 3, 2, 6);
              ctx.fillRect(px + ts / 2 - 3, py + ts / 2 - 1, 6, 2);
            }
          }
        }
      } else if (viewMode === 'TRAFFIC') {
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            const index = y * GRID_SIZE + x;
            const tile = state.grid[index];
            const px = x * ts;
            const py = y * ts;

            if (tile.type !== TileType.ROAD) {
              // Dim non-road parcels for stark contrast
              ctx.fillStyle = 'rgba(11, 17, 32, 0.72)';
              ctx.fillRect(px, py, ts, ts);
              continue;
            }

            const tr = tile.traffic || 0;
            if (tr < 30) {
              // Free flow (Emerald green)
              ctx.fillStyle = 'rgba(16, 185, 129, 0.55)';
              ctx.fillRect(px, py, ts, ts);
            } else if (tr < 65) {
              // Moderate traffic (Amber)
              ctx.fillStyle = 'rgba(245, 158, 11, 0.65)';
              ctx.fillRect(px, py, ts, ts);
            } else if (tr < 85) {
              // Heavy congestion (Orange-Red)
              ctx.fillStyle = 'rgba(234, 88, 12, 0.75)';
              ctx.fillRect(px, py, ts, ts);
            } else {
              // Gridlock (Pulsing Bright Crimson)
              const flash = Math.floor(t / 10) % 2 === 0;
              ctx.fillStyle = flash ? 'rgba(239, 68, 68, 0.9)' : 'rgba(185, 28, 28, 0.8)';
              ctx.fillRect(px, py, ts, ts);
              // Gridlock warning border
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1;
              ctx.strokeRect(px + 2, py + 2, ts - 4, ts - 4);
            }
          }
        }
      }

      // 6. Hover and Selection Highlights
      // Selection highlight
      if (state.selectedTileIndex !== null) {
        const sTile = state.grid[state.selectedTileIndex];
        if (sTile) {
          const mIdx = sTile.masterIndex ?? state.selectedTileIndex;
          const master = state.grid[mIdx];
          const w = master.multiWidth || 1;
          const h = master.multiHeight || 1;
          const sx = (mIdx % GRID_SIZE) * ts;
          const sy = Math.floor(mIdx / GRID_SIZE) * ts;

          ctx.strokeStyle = '#fbbf24'; // Gold selection ring
          ctx.lineWidth = 2.5;
          ctx.strokeRect(sx, sy, w * ts, h * ts);

          // Pulsing corner accents
          const pulse = (Math.sin(t * 0.15) + 1) * 2;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.strokeRect(sx - pulse, sy - pulse, w * ts + pulse * 2, h * ts + pulse * 2);
        }
      }

      // Hover preview highlight with activeTool footprint
      if (hoveredTile !== null && activeTool !== null) {
        const hx = hoveredTile % GRID_SIZE;
        const hy = Math.floor(hoveredTile / GRID_SIZE);
        const is2x2 = activeTool === TileType.POWER_PLANT || activeTool === TileType.UNIVERSITY;
        const w = is2x2 ? 2 : 1;
        const h = is2x2 ? 2 : 1;

        if (activeTool === TileType.DEMOLISH) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.fillRect(hx * ts, hy * ts, w * ts, h * ts);
          ctx.strokeRect(hx * ts, hy * ts, w * ts, h * ts);

          // Red demolition cross
          ctx.strokeStyle = '#fca5a5';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(hx * ts + 6, hy * ts + 6);
          ctx.lineTo((hx + 1) * ts - 6, (hy + 1) * ts - 6);
          ctx.moveTo((hx + 1) * ts - 6, hy * ts + 6);
          ctx.lineTo(hx * ts + 6, (hy + 1) * ts - 6);
          ctx.stroke();
        } else {
          ctx.fillStyle = 'rgba(251, 191, 36, 0.25)';
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 1.5;
          ctx.fillRect(hx * ts, hy * ts, w * ts, h * ts);
          ctx.strokeRect(hx * ts, hy * ts, w * ts, h * ts);
        }
      }

      ctx.restore();

      // 7. Render City Radar on miniCanvasRef (140x140)
      const miniCanvas = miniCanvasRef.current;
      if (miniCanvas) {
        const mctx = miniCanvas.getContext('2d');
        if (mctx) {
          const mw = miniCanvas.width; // 140
          const mh = miniCanvas.height; // 140
          const scaleFactor = mw / GRID_SIZE; // 1.4

          // 1. Clear background
          mctx.fillStyle = '#0b1120';
          mctx.fillRect(0, 0, mw, mh);

          // 2. Subtle Quadrant Crosshairs & Range Rings
          mctx.strokeStyle = '#1e293b';
          mctx.lineWidth = 1;
          mctx.beginPath();
          mctx.moveTo(mw / 2, 0);
          mctx.lineTo(mw / 2, mh);
          mctx.moveTo(0, mh / 2);
          mctx.lineTo(mw, mh / 2);
          mctx.stroke();

          // Range circle
          mctx.strokeStyle = '#1e293b88';
          mctx.beginPath();
          mctx.arc(mw / 2, mh / 2, mw * 0.35, 0, Math.PI * 2);
          mctx.stroke();

          // 3. Draw Grid Pixels matching current viewMode
          for (let i = 0; i < state.grid.length; i++) {
            const tile = state.grid[i];
            const mx = Math.floor(tile.x * scaleFactor);
            const my = Math.floor(tile.y * scaleFactor);

            if (viewMode === 'NORMAL') {
              if (tile.type !== TileType.EMPTY) {
                mctx.fillStyle = COLORS[tile.type] || '#334155';
                mctx.fillRect(mx, my, 2, 2);
              }
            } else if (viewMode === 'POLLUTION') {
              const poll = tile.pollution || 0;
              if (poll > 0) {
                if (poll < 25) mctx.fillStyle = '#10b981';
                else if (poll < 50) mctx.fillStyle = '#eab308';
                else if (poll < 75) mctx.fillStyle = '#f97316';
                else mctx.fillStyle = '#d946ef';
                mctx.fillRect(mx, my, 2, 2);
              } else if (tile.type === TileType.PARK) {
                mctx.fillStyle = '#22c55e';
                mctx.fillRect(mx, my, 2, 2);
              }
            } else if (viewMode === 'TRAFFIC') {
              if (tile.type === TileType.ROAD) {
                const tr = tile.traffic || 0;
                if (tr < 30) mctx.fillStyle = '#10b981';
                else if (tr < 65) mctx.fillStyle = '#f59e0b';
                else if (tr < 85) mctx.fillStyle = '#ea580c';
                else mctx.fillStyle = '#ef4444';
                mctx.fillRect(mx, my, 2, 2);
              }
            } else if (viewMode === 'POWER') {
              if (tile.type !== TileType.EMPTY) {
                if (tile.hasPower) {
                  mctx.fillStyle = '#10b981';
                } else {
                  mctx.fillStyle = Math.floor(t / 12) % 2 === 0 ? '#ef4444' : '#7f1d1d';
                }
                mctx.fillRect(mx, my, 2, 2);
              }
            } else if (viewMode === 'CRIME') {
              if (tile.type !== TileType.EMPTY) {
                const c = tile.crimeRisk || 0;
                if (c > 50) mctx.fillStyle = '#ef4444';
                else if (c > 25) mctx.fillStyle = '#f97316';
                else mctx.fillStyle = '#3b82f6';
                mctx.fillRect(mx, my, 2, 2);
              }
            }
          }

          // 4. Draw Mayor's Office Marker (Center at 48, 48 -> 3x3)
          mctx.fillStyle = '#fbbf24';
          mctx.fillRect(Math.floor(48 * scaleFactor), Math.floor(48 * scaleFactor), 5, 5);

          // 5. Radar Phosphor Rotating Sweep Beam
          const sweepAngle = (t * 0.04) % (Math.PI * 2);
          mctx.save();
          mctx.translate(mw / 2, mh / 2);
          mctx.rotate(sweepAngle);
          mctx.strokeStyle = viewMode === 'POLLUTION' ? 'rgba(192, 38, 211, 0.4)' : viewMode === 'TRAFFIC' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)';
          mctx.lineWidth = 1.5;
          mctx.beginPath();
          mctx.moveTo(0, 0);
          mctx.lineTo(mw * 0.7, 0);
          mctx.stroke();
          mctx.restore();

          // 6. Viewport camera bounding box on radar
          if (containerRef.current) {
            const cw = containerRef.current.clientWidth;
            const ch = containerRef.current.clientHeight;
            const vx = (-offset.x / (scale * TILE_SIZE_PX)) * scaleFactor;
            const vy = (-offset.y / (scale * TILE_SIZE_PX)) * scaleFactor;
            const vw = (cw / (scale * TILE_SIZE_PX)) * scaleFactor;
            const vh = (ch / (scale * TILE_SIZE_PX)) * scaleFactor;

            mctx.strokeStyle = '#ffffff';
            mctx.lineWidth = 1.2;
            mctx.strokeRect(vx, vy, vw, vh);

            // Gold corner ticks on viewport
            mctx.fillStyle = '#fbbf24';
            mctx.fillRect(vx - 1, vy - 1, 3, 3);
            mctx.fillRect(vx + vw - 2, vy - 1, 3, 3);
            mctx.fillRect(vx - 1, vy + vh - 2, 3, 3);
            mctx.fillRect(vx + vw - 2, vy + vh - 2, 3, 3);
          }
        }
      }

      if (active) {
        rafIdRef.current = requestAnimationFrame(render);
      }
    };

    rafIdRef.current = requestAnimationFrame(render);
    return () => {
      active = false;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [state.grid, state.selectedTileIndex, offset, scale, activeTool, hoveredTile, viewMode]);

  // Event Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    hasMovedRef.current = false;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDragging && mouseDownPosRef.current) {
      const dist = Math.hypot(e.clientX - mouseDownPosRef.current.x, e.clientY - mouseDownPosRef.current.y);
      if (dist >= 8) {
        hasMovedRef.current = true;
        setOffset({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    }

    const gridX = Math.floor((mouseX - offset.x) / (scale * TILE_SIZE_PX));
    const gridY = Math.floor((mouseY - offset.y) / (scale * TILE_SIZE_PX));

    if (gridX >= 0 && gridX < GRID_SIZE && gridY >= 0 && gridY < GRID_SIZE) {
      setHoveredTile(gridY * GRID_SIZE + gridX);
    } else {
      setHoveredTile(null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const moveDist = mouseDownPosRef.current ? Math.hypot(e.clientX - mouseDownPosRef.current.x, e.clientY - mouseDownPosRef.current.y) : 0;
    const clickDuration = mouseDownPosRef.current ? (Date.now() - mouseDownPosRef.current.time) : 999;
    const isCleanClick = moveDist < 12 || (clickDuration < 350 && moveDist < 20);

    setIsDragging(false);
    mouseDownPosRef.current = null;
    hasMovedRef.current = false;

    // If mouse was actually dragged to pan across the screen, ignore click
    if (!isCleanClick) return;

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const gridX = Math.floor((mouseX - offset.x) / (scale * TILE_SIZE_PX));
      const gridY = Math.floor((mouseY - offset.y) / (scale * TILE_SIZE_PX));

      if (gridX >= 0 && gridX < GRID_SIZE && gridY >= 0 && gridY < GRID_SIZE) {
        const index = gridY * GRID_SIZE + gridX;

        // Right-click: deselect any active tool and select the tile for inspection
        if (e.button === 2) {
          if (onToolSelect && activeTool !== null) {
            onToolSelect(null);
          }
          onTileClick(index);
          return;
        }

        // Left-click: execute active build tool or select tile
        if (e.button === 0) {
          onTileClick(index);
        }
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newScale = Math.min(Math.max(0.4, scale * zoomFactor), 3.5);

    // Zoom centered on cursor
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newOffsetX = mouseX - (mouseX - offset.x) * (newScale / scale);
      const newOffsetY = mouseY - (mouseY - offset.y) * (newScale / scale);

      setScale(newScale);
      setOffset({ x: newOffsetX, y: newOffsetY });
    }
  };

  // Minimap Navigation
  const handleMinimapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const mmSize = rect.width;
    const targetGridX = (clickX / mmSize) * GRID_SIZE;
    const targetGridY = (clickY / mmSize) * GRID_SIZE;

    if (containerRef.current) {
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      setOffset({
        x: cw / 2 - targetGridX * TILE_SIZE_PX * scale,
        y: ch / 2 - targetGridY * TILE_SIZE_PX * scale,
      });
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="flex-1 relative overflow-hidden bg-slate-950 select-none cursor-crosshair"
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="block touch-none w-full h-full"
      />

      {/* Floating Canvas Controls HUD */}
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-900/90 backdrop-blur border border-slate-700 p-1.5 rounded-lg shadow-xl z-10">
        {/* Select / Inspect Tool vs Build Tool indicator */}
        {onToolSelect && (
          <>
            <button
              onClick={() => onToolSelect(null)}
              className={`px-2 py-1 text-[11px] font-bold rounded flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTool === null
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Select / Inspect Tool: Click any tile on the map to inspect details and metrics"
            >
              <MousePointer size={12} />
              <span>Inspect</span>
            </button>

            {activeTool !== null && (
              <button
                onClick={() => onToolSelect(null)}
                className="px-2 py-1 text-[10px] font-semibold bg-emerald-600/90 hover:bg-red-600/80 text-white rounded flex items-center gap-1 transition-all cursor-pointer border border-emerald-500/50"
                title="Active Build Tool - Click to switch back to Select/Inspect mode"
              >
                <Hammer size={11} />
                <span>Building (Clear)</span>
              </button>
            )}

            <div className="h-4 w-px bg-slate-700" />
          </>
        )}

        <button
          onClick={centerOnMayorsOffice}
          className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-slate-800 rounded transition-colors"
          title="Center on Mayor's Office (Dead Center)"
        >
          <Compass size={17} />
        </button>

        <div className="h-4 w-px bg-slate-700" />

        <button
          onClick={() => setScale(s => Math.min(3.5, s * 1.25))}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={() => setScale(s => Math.max(0.4, s * 0.8))}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>

        <div className="h-4 w-px bg-slate-700" />

        {/* View mode overlays: Normal, Power, Crime, Pollution, Traffic */}
        <div className="flex items-center gap-1 bg-slate-950/90 p-0.5 rounded-lg border border-slate-800 shadow-inner">
          <button
            onClick={() => setViewMode('NORMAL')}
            className={`px-2.5 py-1 text-[11px] font-medium rounded transition-all cursor-pointer ${
              viewMode === 'NORMAL' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Normal
          </button>
          <button
            onClick={() => setViewMode('POWER')}
            className={`px-2 py-1 text-[11px] font-medium rounded flex items-center gap-1 transition-all cursor-pointer ${
              viewMode === 'POWER' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Inspect electrical grid coverage and power plant distribution"
          >
            <Zap size={11} /> Power
          </button>
          <button
            onClick={() => setViewMode('CRIME')}
            className={`px-2 py-1 text-[11px] font-medium rounded flex items-center gap-1 transition-all cursor-pointer ${
              viewMode === 'CRIME' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Inspect neighborhood crime risk and police precinct coverage"
          >
            <ShieldAlert size={11} /> Crime
          </button>
          <button
            onClick={() => setViewMode('POLLUTION')}
            className={`px-2 py-1 text-[11px] font-medium rounded flex items-center gap-1 transition-all cursor-pointer ${
              viewMode === 'POLLUTION' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Inspect industrial smog, power plant emissions, and park absorption"
          >
            <Wind size={11} /> Pollution
            {state.averagePollution !== undefined && (
              <span className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold ${
                state.averagePollution > 50 ? 'bg-red-900 text-red-200' : 'bg-slate-800 text-purple-200'
              }`}>
                {state.averagePollution}
              </span>
            )}
          </button>
          <button
            onClick={() => setViewMode('TRAFFIC')}
            className={`px-2 py-1 text-[11px] font-medium rounded flex items-center gap-1 transition-all cursor-pointer ${
              viewMode === 'TRAFFIC' ? 'bg-amber-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Inspect arterial road traffic congestion and commuter bottlenecks"
          >
            <Car size={11} /> Traffic
          </button>
        </div>
      </div>

      {/* Floating Canvas Top-Right Quick Parcel Inspector Badge */}
      {state.selectedTileIndex !== null && state.grid[state.selectedTileIndex] && (
        <div className="absolute top-4 right-4 bg-slate-900/95 backdrop-blur border border-amber-500/70 px-3 py-1.5 rounded-xl shadow-2xl z-20 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: COLORS[state.grid[state.selectedTileIndex].type] || '#475569' }} />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white flex items-center gap-1">
                <span>
                  {state.grid[state.selectedTileIndex].type === TileType.EMPTY
                    ? 'Empty Land'
                    : state.grid[state.selectedTileIndex].type === TileType.ROAD
                    ? 'Paved Road'
                    : state.grid[state.selectedTileIndex].isMerged3x3
                    ? `Arcology Complex (Tier ${state.grid[state.selectedTileIndex].mergedLevel || 1})`
                    : `Tile [${state.selectedTileIndex % 100}, ${Math.floor(state.selectedTileIndex / 100)}]`}
                </span>
                <span className="text-[10px] font-mono text-amber-400">
                  [{state.selectedTileIndex % 100}, {Math.floor(state.selectedTileIndex / 100)}]
                </span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {state.grid[state.selectedTileIndex].hasPower ? '⚡ Grid Powered' : '⚠️ Power Outage'} • Crime: {state.grid[state.selectedTileIndex].crimeRisk || 0}% • AQI: {state.grid[state.selectedTileIndex].pollution || 0}
              </span>
            </div>
          </div>

          <button
            onClick={() => onTileClick(state.selectedTileIndex!)}
            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2 py-1 rounded transition-colors font-semibold"
          >
            Deselect
          </button>
        </div>
      )}

      {/* Dynamic Overlay Legend HUD */}
      {viewMode !== 'NORMAL' && (
        <div className="absolute top-16 left-4 bg-slate-900/90 backdrop-blur border border-slate-700/80 px-3 py-1.5 rounded-lg shadow-xl z-10 flex items-center gap-3 text-[10px] text-slate-300 animate-in fade-in slide-in-from-top-2">
          {viewMode === 'POLLUTION' && (
            <>
              <div className="flex items-center gap-1 font-semibold text-purple-300">
                <Wind size={12} /> Air Quality (AQI):
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" /> 0-25 Clean</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-yellow-500" /> 26-50 Mod</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-orange-500" /> 51-75 Unhealthy</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-purple-600" /> 76+ Toxic</span>
                <span className="flex items-center gap-1 text-red-400 font-bold ml-1">✚ Sick Residents</span>
              </div>
            </>
          )}

          {viewMode === 'TRAFFIC' && (
            <>
              <div className="flex items-center gap-1 font-semibold text-amber-300">
                <Car size={12} /> Traffic Flow:
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" /> &lt;30% Free</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-amber-500" /> 30-65% Mod</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-orange-600" /> 65-85% Heavy</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-red-600 animate-pulse" /> &gt;85% Gridlock</span>
              </div>
            </>
          )}

          {viewMode === 'POWER' && (
            <>
              <div className="flex items-center gap-1 font-semibold text-emerald-300">
                <Zap size={12} /> Electrical Grid:
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" /> Powered Grid</span>
                <span className="flex items-center gap-1 text-red-400"><span className="w-2.5 h-2.5 rounded-xs bg-red-600 animate-pulse" /> Power Outage (Needs Plant)</span>
              </div>
            </>
          )}

          {viewMode === 'CRIME' && (
            <>
              <div className="flex items-center gap-1 font-semibold text-red-300">
                <ShieldAlert size={12} /> Crime Threat:
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-blue-500/50" /> Safe Neighborhood</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-red-600/60" /> Elevated Crime</span>
                <span className="flex items-center gap-1 text-red-400"><span className="w-2.5 h-2.5 rounded-xs bg-red-600" /> Dangerous Sector</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Upgraded Tactical City Radar & Minimap */}
      <div className="absolute bottom-4 left-4 bg-slate-900/95 backdrop-blur border border-slate-700 p-2.5 rounded-2xl shadow-2xl z-10 hidden sm:block">
        {/* Radar Header */}
        <div className="flex items-center justify-between text-[11px] mb-2 gap-3">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>City Radar</span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-amber-400 border border-slate-700">
              {viewMode}
            </span>
          </div>
          
          <div className="text-[10px] font-mono text-slate-400">
            {radarHoverCoord ? (
              <span className="text-amber-400 font-semibold">[{radarHoverCoord.x}, {radarHoverCoord.y}]</span>
            ) : (
              <span>100x100 Grid</span>
            )}
          </div>
        </div>

        {/* Tactical Radar Display Frame with Compass points */}
        <div className="relative border border-slate-700 rounded-xl overflow-hidden bg-slate-950 p-1 group">
          {/* Compass Indicators */}
          <span className="absolute top-1.5 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-slate-400 pointer-events-none z-10 opacity-70">N</span>
          <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-slate-400 pointer-events-none z-10 opacity-70">S</span>
          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold text-slate-400 pointer-events-none z-10 opacity-70">W</span>
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold text-slate-400 pointer-events-none z-10 opacity-70">E</span>

          <canvas
            ref={miniCanvasRef}
            width={140}
            height={140}
            onClick={handleMinimapClick}
            onMouseDown={(e) => {
              setIsRadarDragging(true);
              handleMinimapClick(e);
            }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const gx = Math.floor(((e.clientX - rect.left) / rect.width) * GRID_SIZE);
              const gy = Math.floor(((e.clientY - rect.top) / rect.height) * GRID_SIZE);
              if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
                setRadarHoverCoord({ x: gx, y: gy });
              }
              if (isRadarDragging) {
                handleMinimapClick(e);
              }
            }}
            onMouseUp={() => setIsRadarDragging(false)}
            onMouseLeave={() => {
              setIsRadarDragging(false);
              setRadarHoverCoord(null);
            }}
            className="rounded-lg bg-slate-950 cursor-pointer block hover:border-amber-400/60 transition-colors w-[140px] h-[140px]"
            style={{ imageRendering: 'pixelated' }}
          />

          {/* Radar Sweep Reticle Overlay */}
          <div className="absolute inset-0 pointer-events-none rounded-xl border border-slate-700/50 shadow-inner" />
        </div>

        {/* Radar Footer: Quick Centering & District Info */}
        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-slate-400">
          <button
            onClick={centerOnMayorsOffice}
            className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium transition-colors cursor-pointer"
            title="Snap camera to City Hall (Dead Center)"
          >
            <Compass size={11} /> Center Hall
          </button>

          <span className="font-mono text-slate-400">
            {viewMode === 'POLLUTION' ? (
              <span className="text-purple-300">AQI: {state.averagePollution || 0}</span>
            ) : viewMode === 'TRAFFIC' ? (
              <span className="text-amber-300">Traffic View</span>
            ) : viewMode === 'POWER' ? (
              <span className="text-emerald-300">Grid Overlay</span>
            ) : (
              <span>Metropolis</span>
            )}
          </span>
        </div>
      </div>

      {/* Bottom Right Controls & Demolish Option */}
      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2 z-20">
        {/* Navigation & Interaction Help Hint */}
        <div className="bg-slate-900/90 backdrop-blur border border-slate-700/80 px-2.5 py-1 rounded-lg text-[10px] text-slate-400 opacity-80 pointer-events-none select-none shadow hidden md:block">
          MMB / Shift+Drag to Pan • Scroll to Zoom
        </div>

        {/* Demolish Option Button */}
        <button
          onClick={() => onToolSelect?.(activeTool === TileType.DEMOLISH ? null : TileType.DEMOLISH)}
          className={`group flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xl backdrop-blur border select-none ${
            activeTool === TileType.DEMOLISH
              ? 'bg-red-600 hover:bg-red-500 border-red-300 text-white ring-4 ring-red-500/40 shadow-red-950/80 scale-105 animate-pulse'
              : 'bg-slate-900/95 hover:bg-red-950/40 border-slate-700 hover:border-red-500/60 text-slate-200 hover:text-red-300'
          }`}
          title="Demolish ($25) - Clear and bulldoze parcels, roads, or structures"
        >
          <div className={`p-1.5 rounded-lg transition-colors ${
            activeTool === TileType.DEMOLISH ? 'bg-red-700 text-white' : 'bg-red-500/15 text-red-400 group-hover:bg-red-500/25'
          }`}>
            <Trash2 size={15} />
          </div>

          <div className="flex flex-col text-left leading-tight">
            <div className="flex items-center gap-1.5">
              <span>{activeTool === TileType.DEMOLISH ? 'Demolish Active' : 'Demolish'}</span>
              <span className={`text-[10px] font-mono px-1 py-0.2 rounded font-normal ${
                activeTool === TileType.DEMOLISH 
                  ? 'bg-red-800 text-red-100' 
                  : 'bg-slate-800 text-red-400 border border-slate-700'
              }`}>
                $25
              </span>
            </div>
            <span className="text-[10px] font-normal text-slate-400">
              {activeTool === TileType.DEMOLISH ? 'Click tile to bulldoze' : 'Bulldoze parcel'}
            </span>
          </div>

          {activeTool === TileType.DEMOLISH && (
            <span className="ml-1 text-[9px] bg-red-800 text-red-100 px-1.5 py-0.5 rounded font-mono font-semibold">
              ESC
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default GameCanvas;
