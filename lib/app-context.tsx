import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import { AppMode, EvidenceItem } from './types';
import { isAppSetup, verifyPin, loadEvidence, addEvidence, deleteEvidence, saveConfig } from './storage';
import { hashPin } from './encryption';

interface AppContextValue {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  isLoading: boolean;
  evidence: EvidenceItem[];
  currentPin: string;
  unlockVault: (pin: string) => Promise<boolean>;
  lockVault: () => void;
  setupPins: (secretPin: string, decoyPin: string) => Promise<void>;
  addNewEvidence: (item: EvidenceItem) => Promise<void>;
  removeEvidence: (id: string) => Promise<void>;
  refreshEvidence: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppMode>('calculator');
  const [isLoading, setIsLoading] = useState(true);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [currentPin, setCurrentPin] = useState('');

  useEffect(() => {
    checkSetup();
  }, []);

  async function checkSetup() {
    try {
      const setup = await isAppSetup();
      if (!setup) {
        setMode('setup');
      }
    } catch (e) {
      console.error('Setup check failed:', e);
    } finally {
      setIsLoading(false);
    }
  }

  const unlockVault = useCallback(async (pin: string): Promise<boolean> => {
    const result = await verifyPin(pin);
    if (result === 'secret') {
      setCurrentPin(pin);
      const items = await loadEvidence(pin);
      setEvidence(items);
      setMode('vault');
      return true;
    }
    return false;
  }, []);

  const lockVault = useCallback(() => {
    setMode('calculator');
    setCurrentPin('');
    setEvidence([]);
  }, []);

  const setupPins = useCallback(async (secretPin: string, decoyPin: string) => {
    const secretHash = await hashPin(secretPin);
    const decoyHash = await hashPin(decoyPin);
    await saveConfig({
      secretPinHash: secretHash,
      decoyPinHash: decoyHash,
      isSetup: true,
    });
    setMode('calculator');
  }, []);

  const addNewEvidence = useCallback(async (item: EvidenceItem) => {
    if (!currentPin) {
      console.error('addNewEvidence: no currentPin set');
      return;
    }
    try {
      await addEvidence(item, currentPin);
      const items = await loadEvidence(currentPin);
      setEvidence(items);
    } catch (err) {
      console.error('addNewEvidence error:', err);
    }
  }, [currentPin]);

  const removeEvidence = useCallback(async (id: string) => {
    if (!currentPin) return;
    await deleteEvidence(id, currentPin);
    const items = await loadEvidence(currentPin);
    setEvidence(items);
  }, [currentPin]);

  const refreshEvidence = useCallback(async () => {
    if (!currentPin) return;
    const items = await loadEvidence(currentPin);
    setEvidence(items);
  }, [currentPin]);

  const value = useMemo(() => ({
    mode,
    setMode,
    isLoading,
    evidence,
    currentPin,
    unlockVault,
    lockVault,
    setupPins,
    addNewEvidence,
    removeEvidence,
    refreshEvidence,
  }), [mode, isLoading, evidence, currentPin, unlockVault, lockVault, setupPins, addNewEvidence, removeEvidence, refreshEvidence]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
