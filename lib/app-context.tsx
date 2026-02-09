// Made by Dhairya Singh Dhaila
import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import { AppMode, EvidenceItem } from './types';
import { isAppSetup, verifyPin, loadEvidence, addEvidence, deleteEvidence, saveConfig } from './storage';
import { hashPin } from './encryption';
import { deleteMedia } from './media';
import { Platform, Alert } from 'react-native';
import { Accelerometer } from 'expo-sensors';

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
  vaultType: 'secret' | 'decoy' | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppMode>('calculator');
  const [isLoading, setIsLoading] = useState(true);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [currentPin, setCurrentPin] = useState('');
  const [vaultType, setVaultType] = useState<'secret' | 'decoy' | null>(null);

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
    if (result === 'secret' || result === 'decoy') {
      setCurrentPin(pin);
      setVaultType(result);
      const items = await loadEvidence(pin, result);
      setEvidence(items || []); // Handle null case
      setMode('vault');
      return true;
    }
    return false;
  }, []);

  const lockVault = useCallback(() => {
    setMode('calculator');
    setCurrentPin('');
    setEvidence([]);
    setVaultType(null);
  }, []);

  // Feature: Auto-Lock on Background - DISABLED
  // This feature conflicts with media capture (camera/audio recorder)
  // Users can still use shake-to-lock (accelerometer) or manual double-tap to lock the vault

  // Feature: Shake-to-Lock Panic Gesture
  useEffect(() => {
    let subscription: any;
    if (mode === 'vault' && Platform.OS !== 'web') {
      subscription = Accelerometer.addListener(({ x, y, z }) => {
        const acceleration = Math.sqrt(x * x + y * y + z * z);
        if (acceleration > 1.5) { // Ultra-sensitive: approx 0.5G above gravity
          lockVault();
        }
      });
      Accelerometer.setUpdateInterval(100);
    }
    return () => {
      if (subscription) subscription.remove();
    };
  }, [mode, lockVault]);

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
    if (!currentPin || !vaultType) {
      console.error('addNewEvidence: missing pin or vaultType');
      return;
    }
    try {
      console.log('[addNewEvidence] Starting save for:', item.type, item.title);
      await addEvidence(item, currentPin, vaultType);
      console.log('[addNewEvidence] Save successful, reloading evidence...');
      const items = await loadEvidence(currentPin, vaultType);
      console.log('[addNewEvidence] Loaded items:', items ? items.length : 'null');
      if (items === null) {
        console.error('[addNewEvidence] loadEvidence returned null!');
        Alert.alert('Error', 'Failed to reload vault after saving. Please lock and unlock the vault to refresh.');
        return;
      }
      setEvidence(items);
      console.log('[addNewEvidence] Evidence state updated with', items.length, 'items');
    } catch (err) {
      console.error('addNewEvidence error:', err);
      Alert.alert('Save Failed', `Could not save evidence: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [currentPin, vaultType]);

  const removeEvidence = useCallback(async (id: string) => {
    if (!currentPin || !vaultType) return;

    // Find the item to get its URI before deleting
    const item = evidence.find(i => i.id === id);
    if (item && item.content && (item.type === 'photo' || item.type === 'video' || item.type === 'audio')) {
      await deleteMedia(item.content);
    }

    await deleteEvidence(id, currentPin, vaultType);
    const items = await loadEvidence(currentPin, vaultType);
    setEvidence(items || []); // Handle null case
  }, [currentPin, evidence, vaultType]);

  const refreshEvidence = useCallback(async () => {
    if (!currentPin || !vaultType) return;
    const items = await loadEvidence(currentPin, vaultType);
    setEvidence(items || []); // Handle null case
  }, [currentPin, vaultType]);

  const value = useMemo(() => ({
    mode,
    setMode,
    isLoading,
    evidence,
    currentPin,
    vaultType,
    unlockVault,
    lockVault,
    setupPins,
    addNewEvidence,
    removeEvidence,
    refreshEvidence,
  }), [mode, isLoading, evidence, currentPin, vaultType, unlockVault, lockVault, setupPins, addNewEvidence, removeEvidence, refreshEvidence]);

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
