
import React, { createContext, useContext, useState, useMemo } from 'react';

interface OmniContextType {
  isThinking: boolean;
  setIsThinking: (val: boolean) => void;
  isExecuting: boolean;
  setIsExecuting: (val: boolean) => void;
  uploadProgress: number;
  setUploadProgress: (val: number) => void;
  authError: boolean;
  setAuthError: (val: boolean) => void;
  lastCommand: string;
  setLastCommand: (val: string) => void;
}

const OmniContext = createContext<OmniContextType | undefined>(undefined);

export const OmniProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isThinking, setIsThinking] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [authError, setAuthError] = useState(false);
  const [lastCommand, setLastCommand] = useState('');

  const value = useMemo(() => ({
    isThinking,
    setIsThinking,
    isExecuting,
    setIsExecuting,
    uploadProgress,
    setUploadProgress,
    authError,
    setAuthError,
    lastCommand,
    setLastCommand
  }), [isThinking, isExecuting, uploadProgress, authError, lastCommand]);

  return (
    <OmniContext.Provider value={value}>
      {children}
    </OmniContext.Provider>
  );
};

export const useOmni = () => {
  const context = useContext(OmniContext);
  if (!context) throw new Error('useOmni must be used within an OmniProvider');
  return context;
};
