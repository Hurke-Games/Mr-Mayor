import React, { useState, useEffect, useCallback } from 'react';
import { GameProvider, useGame } from '../../context/GameContext';
import GameCanvas from '../GameCanvas';
import Dashboard from '../Dashboard';
import Sidebar from '../Sidebar';
import { DeskNewsTicker } from '../DeskNewsTicker';
import { MayorsOffice } from '../office/MayorsOffice';
import { OutdoorWorld } from '../world/OutdoorWorld';
import { ElectionModal } from '../office/ElectionModal';
import { StartMenu } from '../StartMenu';
import { TileType, GamePhase } from '../../types';
import { BUILD_COSTS } from '../../constants';
import { officeAudio } from '../office/officeAudio';

export type ActiveGameView = 'MENU' | 'OFFICE' | 'OUTSIDE' | 'DESK';

interface GameSimulationContentProps {
  onReturnToSiteHeader?: () => void;
}

const GameSimulationContent: React.FC<GameSimulationContentProps> = () => {
  const { state, dispatch } = useGame();
  const [view, setView] = useState<ActiveGameView>('MENU');
  const [activeTool, setActiveTool] = useState<TileType | null>(null);

  // Start game as Mayor from main start menu
  const handleStartMayor = useCallback(() => {
    setView('OFFICE');
    dispatch({ type: 'SET_ROLE', payload: GamePhase.MAYOR });
    dispatch({ type: 'SET_VIEW', payload: 'OFFICE' });
    dispatch({ type: 'SET_SPEED', payload: 1 });
  }, [dispatch]);

  // Start game as Businessman from main start menu
  const handleStartBusinessman = useCallback(() => {
    setView('OUTSIDE');
    dispatch({ type: 'START_BUSINESSMAN_MODE' });
  }, [dispatch]);

  // Synchronize view state if state.activeView changes (e.g. election win or stepping down)
  useEffect(() => {
    if (state.activeView && state.activeView !== view) {
      setView(state.activeView);
    }
  }, [state.activeView, view]);

  // Return to main start menu
  const handleReturnToMenu = useCallback(() => {
    setView('MENU');
    dispatch({ type: 'SET_VIEW', payload: 'MENU' });
    dispatch({ type: 'SET_SPEED', payload: 0 });
  }, [dispatch]);

  // Transition to desk city management terminal
  const handleSitAtDesk = useCallback(() => {
    setView('DESK');
    dispatch({ type: 'SET_VIEW', payload: 'DESK' });
    if (state.speed === 0) {
      dispatch({ type: 'SET_SPEED', payload: 1 });
    }
  }, [state.speed, dispatch]);

  // Transition back to office free-roam
  const handleReturnToOffice = useCallback(() => {
    officeAudio.playStandUp();
    setView('OFFICE');
    dispatch({ type: 'SET_VIEW', payload: 'OFFICE' });
  }, [dispatch]);

  // Transition outside to city streets exploration
  const handleGoOutside = useCallback(() => {
    officeAudio.playStandUp();
    setView('OUTSIDE');
    dispatch({ type: 'SET_VIEW', payload: 'OUTSIDE' });
    if (state.speed === 0) {
      dispatch({ type: 'SET_SPEED', payload: 1 });
    }
  }, [state.speed, dispatch]);

  // Listen for Escape key to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeTool !== null) {
          setActiveTool(null);
        } else if (state.selectedTileIndex !== null) {
          dispatch({ type: 'SELECT_TILE', payload: null });
        } else if (view === 'DESK') {
          handleReturnToOffice();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, activeTool, state.selectedTileIndex, dispatch, handleReturnToOffice]);

  const handleToolSelect = (tool: TileType | null) => {
    setActiveTool(tool);
  };

  const handleTileClick = (index: number) => {
    if (activeTool && state.role === GamePhase.MAYOR) {
      const cost = BUILD_COSTS[activeTool] || 0;
      if (state.money >= cost) {
        dispatch({ type: 'ZONE_TILE', payload: { index, type: activeTool } });
      } else {
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            id: `insufficient_funds_${Date.now()}`,
            title: 'Treasury Alert',
            message: `Insufficient municipal funds to build ($${cost} required). Current treasury: $${state.money.toLocaleString()}`,
            date: state.date,
            source: 'City Treasurer',
            bias: 0,
          },
        });
      }
    }
  };

  return (
    <div className="w-full h-full bg-slate-950 text-slate-200 overflow-hidden relative select-none">
      {/* 0. START MENU (Game Boot / Role Selection) */}
      {view === 'MENU' && (
        <StartMenu onStartMayor={handleStartMayor} onStartBusinessman={handleStartBusinessman} />
      )}

      {/* 1. MAYOR'S EXECUTIVE OFFICE (Physical Office Suite) */}
      {view === 'OFFICE' && (
        <div className="h-full w-full animate-in fade-in duration-300">
          <MayorsOffice 
            onSitAtDesk={handleSitAtDesk} 
            onGoOutside={handleGoOutside} 
            onReturnToMenu={handleReturnToMenu}
          />
        </div>
      )}

      {/* 2. OUTDOOR CITY STREETS (Real-World Character Exploration) */}
      {view === 'OUTSIDE' && (
        <div className="h-full w-full animate-in fade-in duration-300 relative">
          <OutdoorWorld 
            onEnterCityHall={handleReturnToOffice} 
            onOpenDesk={handleSitAtDesk} 
            onTileClick={handleTileClick}
            onReturnToMenu={handleReturnToMenu}
          />
        </div>
      )}

      {/* 3. DESK INTERFACE: CITY MANAGEMENT (Overview Simulation Grid & Zoning) */}
      {view === 'DESK' && (
        <div className="flex flex-col h-full w-full animate-in fade-in zoom-in-95 duration-300">
          <Dashboard 
            onReturnToOffice={handleReturnToOffice} 
            onGoOutside={handleGoOutside} 
          />

          {/* Real-Time Live News Ticker Overlay */}
          <DeskNewsTicker />
          
          <div className="flex flex-1 overflow-hidden relative">
            <Sidebar onToolSelect={handleToolSelect} activeTool={activeTool} />
            <GameCanvas onTileClick={handleTileClick} activeTool={activeTool} onToolSelect={handleToolSelect} />
          </div>
        </div>
      )}

      {/* 4. 5-YEAR GENERAL ELECTION MODAL */}
      {state.showElectionModal && <ElectionModal />}
    </div>
  );
};

export const GameSimulation: React.FC = () => {
  return (
    <GameProvider>
      <GameSimulationContent />
    </GameProvider>
  );
};

export default GameSimulation;
