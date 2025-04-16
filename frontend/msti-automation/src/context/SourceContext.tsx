import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Source {
  id: string;
  name: string;
}

interface SourceContextType {
  selectedSource: Source;
  setSelectedSource: (source: Source) => void;
}

const SourceContext = createContext<SourceContextType | undefined>(undefined);

export const useSource = () => {
  const context = useContext(SourceContext);
  if (!context) {
    throw new Error('useSource must be used within a SourceProvider');
  }
  return context;
};

interface SourceProviderProps {
  children: ReactNode;
}

export const SourceProvider: React.FC<SourceProviderProps> = ({ children }) => {
  const [selectedSource, setSelectedSource] = useState<Source>({
    id: 'leaf-1',
    name: 'LEAF-1'
  });

  return (
    <SourceContext.Provider value={{ selectedSource, setSelectedSource }}>
      {children}
    </SourceContext.Provider>
  );
}; 