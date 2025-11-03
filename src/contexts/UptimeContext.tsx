import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UptimeContextType {
  uptime: number;
}

const UptimeContext = createContext<UptimeContextType | undefined>(undefined);

export const UptimeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [uptime, setUptime] = useState<number>(0);

  useEffect(() => {
    // Get or create start time in sessionStorage
    let startTime = sessionStorage.getItem('systemStartTime');
    
    if (!startTime) {
      startTime = Date.now().toString();
      sessionStorage.setItem('systemStartTime', startTime);
    }

    // Calculate initial uptime
    const calculateUptime = () => {
      const elapsed = Math.floor((Date.now() - parseInt(startTime!)) / 1000);
      setUptime(elapsed);
    };

    // Calculate immediately
    calculateUptime();

    // Update every second
    const interval = setInterval(calculateUptime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <UptimeContext.Provider value={{ uptime }}>
      {children}
    </UptimeContext.Provider>
  );
};

export const useUptime = () => {
  const context = useContext(UptimeContext);
  if (context === undefined) {
    throw new Error('useUptime must be used within an UptimeProvider');
  }
  return context;
};
