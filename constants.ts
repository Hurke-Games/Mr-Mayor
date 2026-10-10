import { TileType } from './types';

export const GRID_SIZE = 100;
export const TOTAL_TILES = GRID_SIZE * GRID_SIZE;
export const TILE_SIZE_PX = 24; // Base pixel size for canvas rendering

export const COLORS: Record<TileType, string> = {
  [TileType.EMPTY]: '#1a2333', // Deep slate ground
  [TileType.ROAD]: '#334155', // Slate asphalt
  [TileType.RESIDENTIAL]: '#10b981', // Emerald green
  [TileType.COMMERCIAL]: '#0284c7', // Sky blue
  [TileType.INDUSTRIAL]: '#f59e0b', // Amber
  [TileType.POLICE_STATION]: '#2563eb', // Royal blue
  [TileType.FIRE_STATION]: '#dc2626', // Fire engine red
  [TileType.SCHOOL]: '#d97706', // School bus amber
  [TileType.UNIVERSITY]: '#7c3aed', // Academic violet
  [TileType.POWER_PLANT]: '#ea580c', // High voltage orange
  [TileType.UNION_HALL]: '#f97316', // Labor orange
  [TileType.LUXURY_ESTATE]: '#a855f7', // Gilded purple
  [TileType.MAYORS_OFFICE]: '#fbbf24', // Civic gold
  [TileType.PARK]: '#22c55e', // Vibrant botanical park green
  [TileType.STATUE]: '#eab308', // Civic monument gold
  [TileType.HOSPITAL]: '#06b6d4', // Medical emergency cyan
  [TileType.DEMOLISH]: '#ef4444', // Hazard red
};

export const BUILD_COSTS: Record<TileType, number> = {
  [TileType.EMPTY]: 0,
  [TileType.ROAD]: 50,
  [TileType.RESIDENTIAL]: 100,
  [TileType.COMMERCIAL]: 200,
  [TileType.INDUSTRIAL]: 300,
  [TileType.POLICE_STATION]: 1000,
  [TileType.FIRE_STATION]: 800,
  [TileType.SCHOOL]: 1200,
  [TileType.POWER_PLANT]: 3000,
  [TileType.UNIVERSITY]: 4500,
  [TileType.UNION_HALL]: 500,
  [TileType.LUXURY_ESTATE]: 2000,
  [TileType.MAYORS_OFFICE]: 0, // Pre-built civic landmark
  [TileType.PARK]: 150, // Botanical park & gardens
  [TileType.STATUE]: 350, // Civic heroic monument
  [TileType.HOSPITAL]: 1500, // City General Hospital (2x2)
  [TileType.DEMOLISH]: 25,
};

export const MULTI_TILE_SIZES: Partial<Record<TileType, { w: number; h: number }>> = {
  [TileType.MAYORS_OFFICE]: { w: 3, h: 3 },
  [TileType.POWER_PLANT]: { w: 2, h: 2 },
  [TileType.UNIVERSITY]: { w: 2, h: 2 },
  [TileType.HOSPITAL]: { w: 2, h: 2 },
};

// ---------------------------------------------------------------------------
// Simulation Timing Calibration:
// 1 month = 30 days = 720 ticks (24 ticks per day = 24 in-game hours per day).
// 1 year = 12 months = 360 days = 8,640 ticks.
// 1 election term = 5 years = 60 months = 43,200 ticks.
// ---------------------------------------------------------------------------
export const TICKS_PER_DAY = 24; 
export const DAYS_PER_MONTH = 30;
export const TICKS_PER_MONTH = TICKS_PER_DAY * DAYS_PER_MONTH; // 720 ticks
export const MONTHS_PER_YEAR = 12;
export const TICKS_PER_YEAR = TICKS_PER_MONTH * MONTHS_PER_YEAR; // 8,640 ticks
export const ELECTION_TERM_YEARS = 5;
export const TICKS_PER_ELECTION = TICKS_PER_YEAR * ELECTION_TERM_YEARS; // 43,200 ticks

// 1. City Management (DESK view):
// "going through like a month in like 2 min and at double speed in 1minute"
// At 1x speed: 1 month takes 2 minutes (120 seconds).
// 120,000ms / 720 ticks = 166.67ms per tick (4.0 seconds per in-game day).
// At 2x speed: 1 month takes 1 minute (60 seconds) -> 83.33ms per tick (2.0s per day).
// At 4x speed: 1 month takes 30 seconds -> 41.67ms per tick (1.0s per day).
export const CITY_TICK_RATE_MS = 166.67; 
export const BASE_TICK_RATE_MS = 166.67; // Backward compatibility

// 2. Real World (OUTSIDE view):
// "when walking in the real world it should be about an hour total for both day and night by default"
// 1 full day and night = 24 in-game hours = 60 minutes real-world time = 3,600 seconds.
// 3,600,000ms / 24 hours = 150,000ms (150 seconds = 2.5 minutes) per in-game hour (tick).
// 150,000ms / 60 minutes = 2,500ms (2.5 seconds) per in-game minute.
export const REAL_WORLD_HOUR_RATE_MS = 150000;
export const REAL_WORLD_MINUTE_RATE_MS = 2500;

export const FACTION_IDS = {
  UNION: 'union',
  ELITE: 'elite',
  GRAY: 'gray',
};
