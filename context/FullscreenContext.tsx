import React, { createContext, useContext } from 'react';

interface FullscreenContextType {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

const FullscreenContext = createContext<FullscreenContextType>({
  isFullscreen: false,
  toggleFullscreen: () => {},
});

export const useFullscreen = () => useContext(FullscreenContext);

export const FullscreenProvider: React.FC<{
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  children: React.ReactNode;
}> = ({ isFullscreen, toggleFullscreen, children }) => {
  return (
    <FullscreenContext.Provider value={{ isFullscreen, toggleFullscreen }}>
      {children}
    </FullscreenContext.Provider>
  );
};
