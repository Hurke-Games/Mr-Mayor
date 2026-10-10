import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import { OfficeHUD } from './OfficeHUD';
import { OfficeModal, OfficeInteractableType } from './OfficeModal';
import { StepDownModal } from './StepDownModal';
import { officeAudio } from './officeAudio';

interface MayorsOfficeProps {
  onSitAtDesk: () => void;
  onGoOutside?: () => void;
  onReturnToMenu?: () => void;
}

// Room dimensions in virtual canvas pixels
const ROOM_W = 1000;
const ROOM_H = 650;
const MAYOR_SPEED = 180; // pixels per second

// Interactable zones in the office
interface InteractableObject {
  id: OfficeInteractableType;
  label: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  prompt: string;
}

const INTERACTABLES: InteractableObject[] = [
  {
    id: 'DESK',
    label: 'Executive Desk',
    name: "Mayor's Workstation",
    x: 500,
    y: 250,
    radius: 75,
    prompt: 'Sit at Desk (Open City Management)',
  },
  {
    id: 'WINDOW',
    label: 'Skyline Window',
    name: 'Panoramic Skyline',
    x: 500,
    y: 120,
    radius: 70,
    prompt: 'Look out Window',
  },
  {
    id: 'ADVISOR',
    label: 'Arthur Holloway',
    name: 'Chief of Staff (Civic Grievance Report)',
    x: 770,
    y: 230,
    radius: 75,
    prompt: 'Review Chief of Staff Report (5-Year Election & Grievances) [E]',
  },
  {
    id: 'CORKBOARD',
    label: 'Faction Web',
    name: 'Power Strategy Corkboard',
    x: 100,
    y: 210,
    radius: 65,
    prompt: 'Inspect Power Web',
  },
  {
    id: 'SAFE',
    label: 'Secret Safe',
    name: 'Founder Portrait & Safe',
    x: 190,
    y: 110,
    radius: 60,
    prompt: 'Inspect Wall Safe',
  },
  {
    id: 'BAR',
    label: 'Bar Cart',
    name: 'Bourbon Decanter & Glasses',
    x: 890,
    y: 310,
    radius: 65,
    prompt: 'Pour a Drink',
  },
  {
    id: 'SOFA',
    label: 'Lounge Sofa',
    name: 'Chesterfield & Daily Chronicle',
    x: 150,
    y: 470,
    radius: 75,
    prompt: 'Read Morning Newspaper',
  },
  {
    id: 'DOORS',
    label: 'Corridor to City Streets',
    name: 'City Hall Grand Entrance Doors',
    x: 500,
    y: 590,
    radius: 75,
    prompt: 'Walk Outside to City Streets (E)',
  },
];

// Solid obstacle bounding boxes (Mayor cannot walk inside these)
const OBSTACLES = [
  // Outer perimeter walls (handled in clamp)
  // Executive desk
  { x1: 400, y1: 215, x2: 600, y2: 285 },
  // Advisor standing spot & staff briefing desk
  { x1: 745, y1: 195, x2: 795, y2: 245 },
  // Corkboard & side filing cabinet
  { x1: 40, y1: 150, x2: 120, y2: 240 },
  // Sofa & coffee table
  { x1: 60, y1: 430, x2: 210, y2: 520 },
  // Bar cart
  { x1: 850, y1: 270, x2: 940, y2: 340 },
  // Plants in upper corners
  { x1: 50, y1: 50, x2: 110, y2: 120 },
  { x1: 890, y1: 50, x2: 950, y2: 120 },
];

export const MayorsOffice: React.FC<MayorsOfficeProps> = ({ onSitAtDesk, onGoOutside, onReturnToMenu }) => {
  const { state } = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Character State
  const [mayorPos, setMayorPos] = useState({ x: 500, y: 380 });
  const [facing, setFacing] = useState<'S' | 'N' | 'E' | 'W'>('N');
  const [isWalking, setIsWalking] = useState(false);
  const [targetPos, setTargetPos] = useState<{ x: number; y: number } | null>(null);
  const [isSitting, setIsSitting] = useState(false);

  // Active interaction
  const [activeModal, setActiveModal] = useState<OfficeInteractableType | null>(null);
  const [nearbyInteractable, setNearbyInteractable] = useState<InteractableObject | null>(null);
  const [showStepDownModal, setShowStepDownModal] = useState(false);

  // Cloud/smoke animation time
  const animTimeRef = useRef(0);
  const stepSoundCooldownRef = useRef(0);

  // Keyboard input tracking
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Trigger sitting sequence then notify parent
  const handleTriggerSitAtDesk = useCallback(() => {
    if (isSitting) return;
    setIsSitting(true);
    setTargetPos({ x: 500, y: 210 });
    setFacing('S');
    officeAudio.playStandUp();
    setTimeout(() => {
      officeAudio.playTerminalChime();
      onSitAtDesk();
    }, 600);
  }, [isSitting, onSitAtDesk]);

  // Primary interact handler (keyboard 'E' or button click)
  const handleInteract = useCallback(() => {
    if (!nearbyInteractable) return;
    if (nearbyInteractable.id === 'DESK') {
      handleTriggerSitAtDesk();
    } else if (nearbyInteractable.id === 'DOORS' && onGoOutside) {
      officeAudio.playStandUp();
      onGoOutside();
    } else {
      officeAudio.playPaperRustle();
      setActiveModal(nearbyInteractable.id);
    }
  }, [nearbyInteractable, handleTriggerSitAtDesk, onGoOutside]);

  // Handle keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keys if modal is open
      if (activeModal) {
        if (e.key === 'Escape') setActiveModal(null);
        return;
      }

      keysPressed.current[e.key.toLowerCase()] = true;
      keysPressed.current[e.key] = true;

      // Cancel click-to-move when keyboard is touched
      if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) || ['W', 'A', 'S', 'D'].includes(e.key)) {
        setTargetPos(null);
      }

      if (e.key.toLowerCase() === 'e' || e.key === ' ') {
        e.preventDefault();
        handleInteract();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
      keysPressed.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeModal, handleInteract]);

  // Mouse / Touch click to walk
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeModal || isSitting) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = ROOM_W / rect.width;
    const scaleY = ROOM_H / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Check if clicked directly on an interactable object
    for (const obj of INTERACTABLES) {
      const dist = Math.hypot(clickX - obj.x, clickY - obj.y);
      if (dist <= obj.radius) {
        setTargetPos({ x: obj.x, y: obj.y + (obj.id === 'DESK' ? -40 : 30) });
        return;
      }
    }

    setTargetPos({
      x: Math.max(70, Math.min(ROOM_W - 70, clickX)),
      y: Math.max(140, Math.min(ROOM_H - 70, clickY)),
    });
  };

  // Virtual directional pad input from touch HUD
  const handleDirectionInput = (dx: number, dy: number) => {
    setTargetPos(null);
    setMayorPos((prev) => {
      const nextX = Math.max(70, Math.min(ROOM_W - 70, prev.x + dx * 25));
      const nextY = Math.max(140, Math.min(ROOM_H - 70, prev.y + dy * 25));
      if (dy < 0) setFacing('N');
      else if (dy > 0) setFacing('S');
      else if (dx < 0) setFacing('W');
      else if (dx > 0) setFacing('E');
      return { x: nextX, y: nextY };
    });
    officeAudio.playFootstep();
  };

  // Main game loop (Movement physics, animations, and rendering)
  useEffect(() => {
    let animationFrameId: number;
    let lastTimestamp = performance.now();

    const loop = (currentTimestamp: number) => {
      const dt = Math.min((currentTimestamp - lastTimestamp) / 1000, 0.1);
      lastTimestamp = currentTimestamp;
      animTimeRef.current += dt;

      if (!activeModal && !isSitting) {
        let vx = 0;
        let vy = 0;

        // Check keys
        const k = keysPressed.current;
        if (k['w'] || k['arrowup']) vy -= 1;
        if (k['s'] || k['arrowdown']) vy += 1;
        if (k['a'] || k['arrowleft']) dxCheck: vx -= 1;
        if (k['d'] || k['arrowright']) vx += 1;

        if (vx !== 0 || vy !== 0) {
          // Normalize diagonal
          const len = Math.hypot(vx, vy);
          vx = (vx / len) * MAYOR_SPEED;
          vy = (vy / len) * MAYOR_SPEED;

          if (Math.abs(vx) > Math.abs(vy)) {
            setFacing(vx > 0 ? 'E' : 'W');
          } else {
            setFacing(vy > 0 ? 'S' : 'N');
          }
          setIsWalking(true);

          // Footstep sound
          stepSoundCooldownRef.current -= dt;
          if (stepSoundCooldownRef.current <= 0) {
            officeAudio.playFootstep();
            stepSoundCooldownRef.current = 0.32;
          }
        } else if (targetPos) {
          // Walking to clicked target
          const dx = targetPos.x - mayorPos.x;
          const dy = targetPos.y - mayorPos.y;
          const dist = Math.hypot(dx, dy);

          if (dist > 6) {
            vx = (dx / dist) * MAYOR_SPEED;
            vy = (dy / dist) * MAYOR_SPEED;
            if (Math.abs(dx) > Math.abs(dy)) {
              setFacing(dx > 0 ? 'E' : 'W');
            } else {
              setFacing(dy > 0 ? 'S' : 'N');
            }
            setIsWalking(true);

            stepSoundCooldownRef.current -= dt;
            if (stepSoundCooldownRef.current <= 0) {
              officeAudio.playFootstep();
              stepSoundCooldownRef.current = 0.32;
            }
          } else {
            setTargetPos(null);
            setIsWalking(false);
          }
        } else {
          setIsWalking(false);
        }

        // Apply new position with collision checking
        if (vx !== 0 || vy !== 0) {
          let newX = mayorPos.x + vx * dt;
          let newY = mayorPos.y + vy * dt;

          // Room boundary clamp
          newX = Math.max(80, Math.min(ROOM_W - 80, newX));
          newY = Math.max(150, Math.min(ROOM_H - 75, newY));

          // Check obstacles
          const mayorRadius = 16;
          let collided = false;
          for (const obs of OBSTACLES) {
            if (
              newX + mayorRadius > obs.x1 &&
              newX - mayorRadius < obs.x2 &&
              newY + mayorRadius > obs.y1 &&
              newY - mayorRadius < obs.y2
            ) {
              // Try sliding along axes
              collided = true;
              break;
            }
          }

          if (!collided) {
            setMayorPos({ x: newX, y: newY });
          } else {
            // Attempt X-only slide
            let canSlideX = true;
            for (const obs of OBSTACLES) {
              if (
                newX + mayorRadius > obs.x1 &&
                newX - mayorRadius < obs.x2 &&
                mayorPos.y + mayorRadius > obs.y1 &&
                mayorPos.y - mayorRadius < obs.y2
              ) {
                canSlideX = false;
                break;
              }
            }
            if (canSlideX) {
              setMayorPos((p) => ({ x: newX, y: p.y }));
            } else {
              // Attempt Y-only slide
              let canSlideY = true;
              for (const obs of OBSTACLES) {
                if (
                  mayorPos.x + mayorRadius > obs.x1 &&
                  mayorPos.x - mayorRadius < obs.x2 &&
                  newY + mayorRadius > obs.y1 &&
                  newY - mayorRadius < obs.y2
                ) {
                  canSlideY = false;
                  break;
                }
              }
              if (canSlideY) {
                setMayorPos((p) => ({ x: p.x, y: newY }));
              }
            }
          }
        }

        // Check proximity to interactables
        let foundNearby: InteractableObject | null = null;
        for (const item of INTERACTABLES) {
          const d = Math.hypot(mayorPos.x - item.x, mayorPos.y - item.y);
          if (d <= item.radius) {
            foundNearby = item;
            break;
          }
        }
        setNearbyInteractable(foundNearby);
      }

      // Render Frame
      renderCanvas();

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [mayorPos, targetPos, activeModal, isSitting]);

  // Master Canvas Drawing Function
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const t = animTimeRef.current;
    const hour = state.date % 24;
    const isNight = hour < 6 || hour >= 20;
    const isDusk = hour >= 17 && hour < 20;

    // Clear
    ctx.clearRect(0, 0, ROOM_W, ROOM_H);

    // ==========================================
    // 1. SKYLINE THROUGH PANORAMIC WINDOW
    // ==========================================
    const winX = 260;
    const winY = 16;
    const winW = 480;
    const winH = 114;

    ctx.save();
    // Clip to window frame
    ctx.beginPath();
    ctx.rect(winX, winY, winW, winH);
    ctx.clip();

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(winX, winY, winX, winY + winH);
    if (isNight) {
      skyGrad.addColorStop(0, '#030712');
      skyGrad.addColorStop(0.6, '#0f172a');
      skyGrad.addColorStop(1, '#1e1b4b');
    } else if (isDusk) {
      skyGrad.addColorStop(0, '#31103f');
      skyGrad.addColorStop(0.5, '#9a3412');
      skyGrad.addColorStop(1, '#f59e0b');
    } else {
      skyGrad.addColorStop(0, '#0284c7');
      skyGrad.addColorStop(0.6, '#38bdf8');
      skyGrad.addColorStop(1, '#bae6fd');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(winX, winY, winW, winH);

    // Drifting clouds
    ctx.fillStyle = isNight ? 'rgba(30, 41, 59, 0.4)' : isDusk ? 'rgba(254, 215, 170, 0.35)' : 'rgba(255, 255, 255, 0.6)';
    for (let c = 0; c < 3; c++) {
      const cx = ((winX + (t * 8 + c * 180)) % (winW + 100)) - 50 + winX;
      const cy = winY + 20 + c * 15;
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.arc(cx + 15, cy - 5, 22, 0, Math.PI * 2);
      ctx.arc(cx + 35, cy, 16, 0, Math.PI * 2);
      ctx.fill();
    }

    // Distant skyscraper silhouettes
    const buildings = [
      { x: 270, w: 32, h: 70, winColor: '#fef08a' },
      { x: 308, w: 42, h: 90, winColor: '#38bdf8' },
      { x: 355, w: 26, h: 60, winColor: '#fef08a' },
      { x: 386, w: 48, h: 105, winColor: '#fed7aa' },
      { x: 440, w: 35, h: 80, winColor: '#fef08a' },
      { x: 480, w: 50, h: 95, winColor: '#38bdf8' },
      { x: 535, w: 30, h: 65, winColor: '#fef08a' },
      { x: 570, w: 44, h: 100, winColor: '#fed7aa' },
      { x: 620, w: 36, h: 75, winColor: '#38bdf8' },
      { x: 660, w: 46, h: 85, winColor: '#fef08a' },
      { x: 710, w: 25, h: 55, winColor: '#fef08a' },
    ];

    buildings.forEach((b) => {
      const bY = winY + winH - b.h;
      ctx.fillStyle = isNight ? '#090d16' : isDusk ? '#1c1917' : '#334155';
      ctx.fillRect(b.x, bY, b.w, b.h);

      // Antenna with blinking red light
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(b.x + b.w / 2, bY);
      ctx.lineTo(b.x + b.w / 2, bY - 14);
      ctx.stroke();

      if (Math.sin(t * 4 + b.x) > 0) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(b.x + b.w / 2, bY - 14, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Windows
      ctx.fillStyle = isNight ? (Math.random() > 0.3 ? b.winColor : '#1e293b') : 'rgba(255, 255, 255, 0.4)';
      for (let r = 8; r < b.h - 10; r += 12) {
        for (let col = 4; col < b.w - 6; col += 8) {
          ctx.fillRect(b.x + col, bY + r, 4, 6);
        }
      }
    });

    // Factory smoke plumes from industrial expansion
    ctx.fillStyle = isNight ? 'rgba(71, 85, 105, 0.3)' : 'rgba(100, 116, 139, 0.35)';
    for (let s = 0; s < 4; s++) {
      const sx = winX + 60 + s * 110;
      const sy = winY + winH - 20 - ((t * 15 + s * 25) % 80);
      const sRadius = 8 + ((t * 10 + s * 25) % 80) * 0.2;
      ctx.beginPath();
      ctx.arc(sx + Math.sin(t + s) * 6, sy, sRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Window frame (Arched mahogany panes & brass dividers)
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 8;
    ctx.strokeRect(winX, winY, winW, winH);

    // Panes
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 3;
    for (let col = 1; col < 6; col++) {
      const px = winX + (winW / 6) * col;
      ctx.beginPath();
      ctx.moveTo(px, winY);
      ctx.lineTo(px, winY + winH);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(winX, winY + winH / 2);
    ctx.lineTo(winX + winW, winY + winH / 2);
    ctx.stroke();

    // ==========================================
    // 2. WALLS & WOOD WAINSCOTING
    // ==========================================
    // Back wall above wainscoting
    const wallGrad = ctx.createLinearGradient(0, 0, 0, 140);
    wallGrad.addColorStop(0, '#1c1917');
    wallGrad.addColorStop(1, '#292524');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, winX, 140);
    ctx.fillRect(winX + winW, 0, ROOM_W - (winX + winW), 140);
    ctx.fillRect(winX, 0, winW, winY);

    // Crown molding
    ctx.fillStyle = '#451a03';
    ctx.fillRect(0, 0, ROOM_W, 10);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(0, 10, ROOM_W, 3);

    // Wainscoting chair rail
    ctx.fillStyle = '#451a03';
    ctx.fillRect(0, 132, ROOM_W, 8);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(0, 138, ROOM_W, 2);

    // ==========================================
    // 3. FLOOR (HERRINGBONE PARQUET & PERSIAN RUG)
    // ==========================================
    // Parquet background
    ctx.fillStyle = '#1e140d';
    ctx.fillRect(0, 140, ROOM_W, ROOM_H - 140);

    // Parquet plank stripes
    ctx.strokeStyle = '#2a1a0f';
    ctx.lineWidth = 1;
    for (let y = 140; y < ROOM_H; y += 22) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(ROOM_W, y);
      ctx.stroke();
    }
    for (let x = 0; x < ROOM_W; x += 44) {
      ctx.beginPath();
      ctx.moveTo(x, 140);
      ctx.lineTo(x, ROOM_H);
      ctx.stroke();
    }

    // Big Ornate Persian Executive Rug (Center floor)
    const rugX = 180;
    const rugY = 190;
    const rugW = 640;
    const rugH = 390;

    // Rug fringe
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(rugX - 6, rugY + 4, 6, rugH - 8);
    ctx.fillRect(rugX + rugW, rugY + 4, 6, rugH - 8);

    // Rug base rich burgundy
    ctx.fillStyle = '#581c1c';
    ctx.fillRect(rugX, rugY, rugW, rugH);

    // Rug border navy & gold
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 8;
    ctx.strokeRect(rugX + 8, rugY + 8, rugW - 16, rugH - 16);

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.strokeRect(rugX + 16, rugY + 16, rugW - 32, rugH - 32);

    // Rug center medallion
    ctx.fillStyle = '#310d0d';
    ctx.beginPath();
    ctx.ellipse(rugX + rugW / 2, rugY + rugH / 2 + 10, 130, 80, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2;
    ctx.stroke();

    // ==========================================
    // 4. FURNITURE & ROOM OBJECTS
    // ==========================================

    // A. Founder Portrait & Safe (North-West Wall)
    ctx.fillStyle = '#78350f';
    ctx.fillRect(140, 40, 90, 85);
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 4;
    ctx.strokeRect(140, 40, 90, 85);
    // Painting canvas
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(146, 46, 78, 73);
    // Founder face silhouette
    ctx.fillStyle = '#a16207';
    ctx.beginPath();
    ctx.arc(185, 75, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#451a03';
    ctx.fillRect(170, 92, 30, 24);
    // Brass safe dial peek
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.arc(220, 115, 6, 0, Math.PI * 2);
    ctx.fill();

    // B. Faction Strategy Corkboard (West Wall)
    ctx.fillStyle = '#92400e';
    ctx.fillRect(40, 150, 80, 80);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 150, 80, 80);
    // Pinned notes
    ctx.fillStyle = '#f97316'; // Iron Union
    ctx.fillRect(48, 160, 18, 14);
    ctx.fillStyle = '#a855f7'; // Gilded Circle
    ctx.fillRect(88, 165, 18, 14);
    ctx.fillStyle = '#64748b'; // Gray Collective
    ctx.fillRect(66, 195, 20, 14);
    // Red yarn lines
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(57, 167);
    ctx.lineTo(97, 172);
    ctx.lineTo(76, 202);
    ctx.closePath();
    ctx.stroke();

    // C. Chesterfield Leather Sofa & Coffee Table (South-West)
    // Chesterfield deep hunter green
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(70, 430, 130, 60);
    ctx.strokeStyle = '#022c22';
    ctx.lineWidth = 4;
    ctx.strokeRect(70, 430, 130, 60);
    // Button tufting
    ctx.fillStyle = '#022c22';
    for (let bx = 85; bx <= 185; bx += 25) {
      for (let by = 445; by <= 475; by += 15) {
        ctx.beginPath();
        ctx.arc(bx, by, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Low mahogany coffee table
    ctx.fillStyle = '#451a03';
    ctx.fillRect(85, 500, 100, 30);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;
    ctx.strokeRect(85, 500, 100, 30);
    // The Daily Chronicle on table
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(115, 506, 35, 18);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(118, 509, 20, 3);
    ctx.fillRect(118, 514, 28, 2);

    // D. Executive Bar Cart & Scotch Decanter (East Wall)
    ctx.fillStyle = '#b45309';
    ctx.fillRect(865, 270, 75, 65);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3;
    ctx.strokeRect(865, 270, 75, 65);
    // Glass surface
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(870, 275, 65, 55);
    // Crystal decanter with scotch
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(880, 285, 14, 20);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(880, 285, 14, 20);
    // Two glasses
    ctx.strokeStyle = '#93c5fd';
    ctx.strokeRect(902, 290, 8, 10);
    ctx.strokeRect(915, 290, 8, 10);

    // E. Potted Fiddle Leaf Fig Plants (Corners)
    const drawPlant = (px: number, py: number) => {
      // Brass pot
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(px - 14, py + 25);
      ctx.lineTo(px + 14, py + 25);
      ctx.lineTo(px + 10, py + 45);
      ctx.lineTo(px - 10, py + 45);
      ctx.closePath();
      ctx.fill();
      // Leaves
      ctx.fillStyle = '#15803d';
      for (let l = 0; l < 5; l++) {
        const lx = px + Math.cos((l * Math.PI) / 2.5) * 16;
        const ly = py + 10 + Math.sin((l * Math.PI) / 2.5) * 12;
        ctx.beginPath();
        ctx.ellipse(lx, ly, 10, 6, (l * Math.PI) / 3, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    drawPlant(80, 70);
    drawPlant(920, 70);

    // F. Chief of Staff Arthur Holloway (Standing in top right near x: 770, y: 220)
    const ax = 770;
    const ay = 220;
    const advisorBob = Math.sin(t * 2) * 1.5;

    // Aide Briefing Stand / Mahogany Lectern
    ctx.fillStyle = '#291307';
    ctx.fillRect(ax - 28, ay + 8, 20, 26);
    ctx.fillStyle = '#451a03';
    ctx.fillRect(ax - 30, ay + 5, 24, 6);
    // Stack of grievance dossier papers on stand
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(ax - 28, ay + 2, 16, 4);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(ax - 27, ay + 3, 14, 2);

    // Arthur Holloway Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(ax, ay + 32, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Legs
    ctx.fillStyle = '#334155';
    ctx.fillRect(ax - 6, ay + 15, 5, 15);
    ctx.fillRect(ax + 1, ay + 15, 5, 15);
    // Torso / Vest & Tie
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(ax - 9, ay - 8 + advisorBob, 18, 24);
    ctx.fillStyle = '#f8fafc'; // White shirt
    ctx.fillRect(ax - 3, ay - 8 + advisorBob, 6, 12);
    ctx.fillStyle = '#0284c7'; // Blue tie
    ctx.fillRect(ax - 1, ay - 6 + advisorBob, 2, 10);
    // Head & Glasses
    ctx.fillStyle = '#fcd34d';
    ctx.beginPath();
    ctx.arc(ax, ay - 16 + advisorBob, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a'; // Hair
    ctx.beginPath();
    ctx.arc(ax, ay - 20 + advisorBob, 8, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d97706'; // Glasses
    ctx.lineWidth = 1;
    ctx.strokeRect(ax - 3, ay - 18 + advisorBob, 6, 3);
    // Clipboard in hands
    ctx.fillStyle = '#78350f';
    ctx.fillRect(ax + 4, ay - 2 + advisorBob, 10, 14);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ax + 6, ay + advisorBob, 6, 10);

    // Floating Chief of Staff badge & speech indicator
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(ax - 36, ay - 42 + advisorBob, 72, 14);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.strokeRect(ax - 36, ay - 42 + advisorBob, 72, 14);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CHIEF OF STAFF', ax, ay - 35 + advisorBob);

    // Speech indicator ping over Arthur
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(ax, ay - 48 + advisorBob, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', ax, ay - 48 + advisorBob);

    // G. Grand Hallway Double Doors (South Wall, x: 440 to 560)
    ctx.fillStyle = '#451a03';
    ctx.fillRect(440, 600, 120, 50);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 4;
    ctx.strokeRect(440, 600, 120, 50);
    // Brass door handles
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(495, 620, 4, 12);
    ctx.fillRect(501, 620, 4, 12);
    // Frosted glass panel
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(455, 605, 90, 12);

    // ==========================================
    // 5. EXECUTIVE DESK & CHAIR (The Core Station)
    // ==========================================
    const deskX = 410;
    const deskY = 220;
    const deskW = 180;
    const deskH = 75;

    // Chair (Behind the desk)
    // High-back burgundy tufted executive leather chair
    ctx.fillStyle = '#450a0a';
    ctx.fillRect(475, 185, 50, 36);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3;
    ctx.strokeRect(475, 185, 50, 36);
    // Chair tufting
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.arc(490, 198, 3, 0, Math.PI * 2);
    ctx.arc(510, 198, 3, 0, Math.PI * 2);
    ctx.fill();

    // If the Mayor is sitting down, draw him in the chair!
    if (isSitting) {
      // Mayor Torso sitting
      ctx.fillStyle = '#0f172a'; // Navy Suit
      ctx.fillRect(484, 186, 32, 28);
      // Red Tie
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(498, 194, 4, 14);
      // Mayor Head
      ctx.fillStyle = '#fcd34d';
      ctx.beginPath();
      ctx.arc(500, 178, 10, 0, Math.PI * 2);
      ctx.fill();
      // Slicked gray hair
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(500, 174, 10, Math.PI, Math.PI * 2);
      ctx.fill();
    }

    // Desk shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(deskX - 5, deskY + deskH - 5, deskW + 10, 18);

    // Desk Base (Rich Mahogany)
    ctx.fillStyle = '#381406';
    ctx.fillRect(deskX, deskY, deskW, deskH);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 4;
    ctx.strokeRect(deskX, deskY, deskW, deskH);

    // Green Leather Desk Blotter in center
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(deskX + 35, deskY + 12, deskW - 70, deskH - 24);
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(deskX + 35, deskY + 12, deskW - 70, deskH - 24);

    // Computer Terminal Monitor (Glowing Green CRT)
    const monitorX = deskX + 65;
    const monitorY = deskY + 16;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(monitorX, monitorY, 50, 32);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(monitorX, monitorY, 50, 32);

    // Monitor screen glowing with city grid radar
    ctx.fillStyle = '#022c22';
    ctx.fillRect(monitorX + 3, monitorY + 3, 44, 26);
    // Grid lines on screen
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1;
    ctx.strokeRect(monitorX + 6, monitorY + 6, 38, 20);
    ctx.beginPath();
    ctx.moveTo(monitorX + 6, monitorY + 16);
    ctx.lineTo(monitorX + 44, monitorY + 16);
    ctx.moveTo(monitorX + 25, monitorY + 6);
    ctx.lineTo(monitorX + 25, monitorY + 26);
    ctx.stroke();
    // Blinking phosphor cursor
    if (Math.sin(t * 5) > 0) {
      ctx.fillStyle = '#34d399';
      ctx.fillRect(monitorX + 36, monitorY + 19, 4, 4);
    }

    // Green Banker's Lamp (Left of desk)
    ctx.fillStyle = '#b45309'; // Brass stand
    ctx.fillRect(deskX + 16, deskY + 28, 4, 18);
    ctx.fillStyle = '#047857'; // Green glass shade
    ctx.beginPath();
    ctx.ellipse(deskX + 18, deskY + 26, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Soft golden light glow from lamp
    const lampGlow = ctx.createRadialGradient(deskX + 18, deskY + 26, 2, deskX + 18, deskY + 26, 40);
    lampGlow.addColorStop(0, 'rgba(253, 224, 71, 0.25)');
    lampGlow.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = lampGlow;
    ctx.beginPath();
    ctx.arc(deskX + 18, deskY + 26, 40, 0, Math.PI * 2);
    ctx.fill();

    // Red Direct Phone Hotline (Right of desk)
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(deskX + 145, deskY + 28, 16, 14);
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.arc(deskX + 153, deskY + 25, 5, 0, Math.PI * 2);
    ctx.fill();

    // Coffee mug with steam
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(deskX + 125, deskY + 42, 8, 10);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    const steamY = deskY + 38 - ((t * 8) % 12);
    ctx.beginPath();
    ctx.arc(deskX + 129 + Math.sin(t * 3) * 2, steamY, 2, 0, Math.PI * 2);
    ctx.fill();

    // ==========================================
    // 6. CLICK-TO-MOVE TARGET INDICATOR
    // ==========================================
    if (targetPos && !isSitting) {
      const pulse = (Math.sin(t * 6) + 1) * 0.5;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(targetPos.x, targetPos.y, 8 + pulse * 4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
      ctx.fill();
    }

    // ==========================================
    // 7. MAYOR CHARACTER (If not sitting)
    // ==========================================
    if (!isSitting) {
      const mx = mayorPos.x;
      const my = mayorPos.y;
      const walkBob = isWalking ? Math.sin(t * 12) * 2.5 : Math.sin(t * 2) * 0.8;
      const legStride = isWalking ? Math.sin(t * 12) * 6 : 0;

      // Drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(mx, my + 14, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Legs / Polished shoes
      ctx.fillStyle = '#090d16';
      if (facing === 'S' || facing === 'N') {
        ctx.fillRect(mx - 8, my + 3, 6, 12 + legStride);
        ctx.fillRect(mx + 2, my + 3, 6, 12 - legStride);
      } else {
        // Side profile legs
        ctx.fillRect(mx - 4 + legStride, my + 3, 6, 12);
        ctx.fillRect(mx - 4 - legStride, my + 3, 6, 12);
      }

      // Torso / Suit Jacket
      ctx.fillStyle = '#0f172a'; // Tailored Navy Blue Suit
      ctx.fillRect(mx - 11, my - 14 + walkBob, 22, 22);

      // Suit Details based on direction
      if (facing === 'S') {
        // White shirt collar
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(mx - 4, my - 14 + walkBob);
        ctx.lineTo(mx + 4, my - 14 + walkBob);
        ctx.lineTo(mx, my - 6 + walkBob);
        ctx.closePath();
        ctx.fill();

        // Red Power Tie
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(mx - 2, my - 10 + walkBob, 4, 14);

        // Mayoral Gold Pin
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(mx + 6, my - 8 + walkBob, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (facing === 'N') {
        // Back of jacket collar
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(mx - 8, my - 14 + walkBob, 16, 4);
      } else if (facing === 'E') {
        // Side profile facing right
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(mx + 5, my - 12 + walkBob, 3, 6);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(mx + 6, my - 8 + walkBob, 2, 10);
      } else if (facing === 'W') {
        // Side profile facing left
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(mx - 8, my - 12 + walkBob, 3, 6);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(mx - 8, my - 8 + walkBob, 2, 10);
      }

      // Head
      ctx.fillStyle = '#fcd34d';
      ctx.beginPath();
      ctx.arc(mx, my - 22 + walkBob, 9, 0, Math.PI * 2);
      ctx.fill();

      // Hair (Distinguished graying hair)
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      if (facing === 'S') {
        ctx.arc(mx, my - 26 + walkBob, 9, Math.PI, Math.PI * 2);
      } else if (facing === 'N') {
        ctx.arc(mx, my - 23 + walkBob, 9, 0, Math.PI * 2);
      } else if (facing === 'E') {
        ctx.arc(mx - 2, my - 24 + walkBob, 8, 0, Math.PI * 2);
      } else {
        ctx.arc(mx + 2, my - 24 + walkBob, 8, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    // ==========================================
    // 8. INTERACTIVE PROXIMITY HIGHLIGHTS
    // ==========================================
    if (nearbyInteractable && !isSitting) {
      // Draw subtle pulsing interaction indicator ring on the floor
      const ringPulse = (Math.sin(t * 4) + 1) * 0.5;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(nearbyInteractable.x, nearbyInteractable.y, nearbyInteractable.radius - 10 + ringPulse * 6, 0, Math.PI * 2);
      ctx.stroke();

      // Draw floating icon bubble over the object
      const bubbleY = nearbyInteractable.y - 45 + Math.sin(t * 4) * 4;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(nearbyInteractable.x - 30, bubbleY - 14, 60, 24, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('[E] ACT', nearbyInteractable.x, bubbleY - 2);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-950 overflow-hidden select-none flex items-center justify-center">
      {/* Canvas Layer */}
      <canvas
        ref={canvasRef}
        width={ROOM_W}
        height={ROOM_H}
        onClick={handleCanvasClick}
        className="w-full h-full object-contain cursor-pointer shadow-2xl block"
        style={{ aspectRatio: `${ROOM_W}/${ROOM_H}` }}
      />

      {/* Office HUD (Top bar, bottom ticker, touch controls, sound) */}
      <OfficeHUD
        onSitAtDesk={handleTriggerSitAtDesk}
        onInteract={handleInteract}
        canInteract={!!nearbyInteractable && !isSitting}
        interactionPrompt={nearbyInteractable?.prompt || null}
        onDirectionInput={handleDirectionInput}
        onReturnToMenu={onReturnToMenu}
        onStepDown={() => setShowStepDownModal(true)}
      />

      {/* Interactive Detail Modal (Advisor dialogue, window panoramic view, newspaper, safe, etc.) */}
      <OfficeModal
        type={activeModal}
        onClose={() => setActiveModal(null)}
        onSitAtDesk={handleTriggerSitAtDesk}
        onGoOutside={onGoOutside}
      />

      {/* Step Down as Mayor Modal */}
      {showStepDownModal && (
        <StepDownModal onClose={() => setShowStepDownModal(false)} />
      )}
    </div>
  );
};
