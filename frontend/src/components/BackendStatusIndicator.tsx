import React, { useState, useEffect } from 'react';

const BackendStatusIndicator: React.FC = () => {
  const [backendConnected, setBackendConnected] = useState(false);

  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        const response = await fetch('http://localhost:8000/');
        setBackendConnected(response.ok);
      } catch (error) {
        setBackendConnected(false);
      }
    };

    // Check immediately
    checkBackendConnection();
    
    // Check every 5 seconds
    const interval = setInterval(checkBackendConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{
      backgroundColor: backendConnected ? '#065f46' : '#7f1d1d',
      border: `1px solid ${backendConnected ? '#10b981' : '#ef4444'}`
    }}>
      <div className={`w-2 h-2 rounded-full ${backendConnected ? 'bg-green-400' : 'bg-red-400'} ${backendConnected ? 'animate-pulse' : ''}`}></div>
      <span className="text-sm font-medium text-white">
        {backendConnected ? '🟢' : '🔴'}
      </span>
    </div>
  );
};

export default BackendStatusIndicator;
