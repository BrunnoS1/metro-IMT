
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface WorksiteContextProps {
  selectedWorksite: string;
  setSelectedWorksite: (worksite: string) => void;
}

const WorksiteContext = createContext<WorksiteContextProps | undefined>(undefined);

export const WorksiteProvider = ({ children }: { children: ReactNode }) => {
  const [selectedWorksite, setSelectedWorksite] = useState('');

  // Restore worksite from sessionStorage on mount (e.g., after page reload from delete)
  useEffect(() => {
    const savedWorksite = sessionStorage.getItem('metro_worksite_after_delete');
    if (savedWorksite) {
      setSelectedWorksite(savedWorksite);
      sessionStorage.removeItem('metro_worksite_after_delete');
    }
  }, []);

  return (
    <WorksiteContext.Provider value={{ selectedWorksite, setSelectedWorksite }}>
      {children}
    </WorksiteContext.Provider>
  );
};

export const useWorksite = () => {
  const context = useContext(WorksiteContext);
  if (!context) {
    throw new Error('useWorksite must be used within a WorksiteProvider');
  }
  return context;
};