import React, { createContext, useContext, useState } from 'react';

const NavigationContext = createContext();

export const useNavigationData = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigationData must be used within a NavigationProvider');
  }
  return context;
};

export const NavigationProvider = ({ children }) => {
  const [navigationData, setNavigationData] = useState(null);

  const setRoutineData = (routine, isEditing = false, routineName = null) => {
    setNavigationData({
      routine,
      isEditing,
      routineName,
      timestamp: Date.now() // Add timestamp to force re-render
    });
  };

  const clearNavigationData = () => {
    setNavigationData(null);
  };

  return (
    <NavigationContext.Provider value={{
      navigationData,
      setRoutineData,
      clearNavigationData
    }}>
      {children}
    </NavigationContext.Provider>
  );
};
