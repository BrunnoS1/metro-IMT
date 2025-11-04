
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface WorksiteContextProps {
  selectedWorksite: string;
  setSelectedWorksite: (worksite: string) => void;
}

const WorksiteContext = createContext<WorksiteContextProps | undefined>(undefined);

export const WorksiteProvider = ({ children }: { children: ReactNode }) => {
  const [selectedWorksite, setSelectedWorksite] = useState('');

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