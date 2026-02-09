// Made by Dhairya Singh Dhaila
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import { encrypt, decrypt, hashPin } from './encryption';
import { EvidenceItem, AppConfig } from './types';

const KEYS = {
  CONFIG: '@silentshield_config',
  EVIDENCE_SECRET: '@silentshield_evidence_secret',
  EVIDENCE_DECOY: '@silentshield_evidence_decoy',
  SECURE_PREFIX: 'secure_shield_',
};

const SECURE_KEYS = {
  SECRET_HASH: `${KEYS.SECURE_PREFIX}secret_hash`,
  DECOY_HASH: `${KEYS.SECURE_PREFIX}decoy_hash`,
  IS_SETUP: `${KEYS.SECURE_PREFIX}is_setup`,
};

function getEvidenceKey(type: 'secret' | 'decoy') {
  return type === 'secret' ? KEYS.EVIDENCE_SECRET : KEYS.EVIDENCE_DECOY;
}

function getEvidenceFilePath(type: 'secret' | 'decoy'): string | null {
  const fs: any = FileSystem;
  if (!fs.documentDirectory) return null;
  return `${fs.documentDirectory}vault_data_${type}.enc`;
}

export async function saveConfig(config: AppConfig): Promise<void> {
  await SecureStore.setItemAsync(SECURE_KEYS.SECRET_HASH, config.secretPinHash);
  await SecureStore.setItemAsync(SECURE_KEYS.DECOY_HASH, config.decoyPinHash);
  await SecureStore.setItemAsync(SECURE_KEYS.IS_SETUP, 'true');
}

export async function getConfig(): Promise<AppConfig | null> {
  const isSetup = await SecureStore.getItemAsync(SECURE_KEYS.IS_SETUP);
  if (!isSetup) return null;

  const secretHash = await SecureStore.getItemAsync(SECURE_KEYS.SECRET_HASH).catch(() => null);
  const decoyHash = await SecureStore.getItemAsync(SECURE_KEYS.DECOY_HASH).catch(() => null);

  return {
    secretPinHash: secretHash || '',
    decoyPinHash: decoyHash || '',
    isSetup: true,
  };
}

export async function isAppSetup(): Promise<boolean> {
  try {
    const isSetup = await SecureStore.getItemAsync(SECURE_KEYS.IS_SETUP);
    return isSetup === 'true';
  } catch {
    return false;
  }
}

export async function verifyPin(pin: string): Promise<'secret' | 'decoy' | 'invalid'> {
  try {
    const isSetup = await isAppSetup();
    if (!isSetup) return 'invalid';

    const pinHash = await hashPin(pin);

    const secretHash = await SecureStore.getItemAsync(SECURE_KEYS.SECRET_HASH).catch(() => null);
    const decoyHash = await SecureStore.getItemAsync(SECURE_KEYS.DECOY_HASH).catch(() => null);

    if (pinHash === secretHash) return 'secret';
    if (pinHash === decoyHash) return 'decoy';
  } catch (error) {
    console.error('[Storage] PIN verification error:', error);
  }
  return 'invalid';
}

export async function saveEvidence(items: EvidenceItem[], pin: string, type: 'secret' | 'decoy'): Promise<void> {
  try {
    const filePath = getEvidenceFilePath(type);
    if (!filePath) {
      throw new Error('[Storage] FileSystem.documentDirectory is null');
    }

    const data = JSON.stringify(items);
    const encrypted = encrypt(data, pin);

    // Write to FileSystem (Primary for capacity)
    await FileSystem.writeAsStringAsync(filePath, encrypted);

    // Backup indicator in AsyncStorage
    await AsyncStorage.setItem(`${getEvidenceKey(type)}_fs_ok`, 'true');

    console.log(`[Storage] Saved ${items.length} items to ${type} vault via FileSystem.`);
  } catch (error) {
    console.error(`[Storage] Failed to save ${type} evidence:`, error);
    throw error;
  }
}

/**
 * Loads evidence, returning null if a system error occurred.
 * Returning [] indicates the vault is empty but functional.
 */
export async function loadEvidence(pin: string, type: 'secret' | 'decoy'): Promise<EvidenceItem[] | null> {
  try {
    const filePath = getEvidenceFilePath(type);
    if (!filePath) {
      console.error('[Storage] loadEvidence failed: FileSystem available');
      return null;
    }

    const fileInfo = await FileSystem.getInfoAsync(filePath);

    let encrypted: string | null = null;

    if (fileInfo.exists) {
      encrypted = await FileSystem.readAsStringAsync(filePath);
    } else {
      // Fallback to legacy AsyncStorage for migration cases
      console.log(`[Storage] File not found, checking legacy AsyncStorage for ${type}...`);
      encrypted = await AsyncStorage.getItem(getEvidenceKey(type));
    }

    if (!encrypted) {
      console.log(`[Storage] No evidence found for ${type} vault.`);
      return [];
    }

    const decrypted = decrypt(encrypted, pin);
    if (!decrypted) {
      console.warn(`[Storage] Decryption failed for ${type} vault. Wrong PIN or corrupted data?`);
      return null; // Return null to indicate error, avoid overwriting
    }

    let items: EvidenceItem[];
    try {
      items = JSON.parse(decrypted);
    } catch (e) {
      console.error('[Storage] JSON parse failed during load:', e);
      return null;
    }

    console.log(`[Storage] Loaded ${items.length} items from ${type} vault.`);

    // Auto-Migration
    if (!fileInfo.exists) {
      console.log(`[Storage] Migrating legacy data to FileSystem for ${type}...`);
      await FileSystem.writeAsStringAsync(filePath, encrypted).catch(e => {
        console.error('[Storage] Migration write failed:', e);
      });
    }

    return items;
  } catch (error) {
    console.error(`[Storage] Error loading ${type} evidence:`, error);
    return null; // Safety: return null on crash
  }
}

export async function addEvidence(item: EvidenceItem, pin: string, type: 'secret' | 'decoy'): Promise<void> {
  const items = await loadEvidence(pin, type);
  if (items === null) {
    console.error(`[Storage] addEvidence ABORTED for ${type} to prevent data loss.`);
    throw new Error('Storage load failed - aborting write');
  }
  items.unshift(item);
  await saveEvidence(items, pin, type);
}

export async function deleteEvidence(id: string, pin: string, type: 'secret' | 'decoy'): Promise<void> {
  const items = await loadEvidence(pin, type);
  if (items === null) {
    console.error(`[Storage] deleteEvidence ABORTED for ${type} to prevent data loss.`);
    return;
  }
  const filtered = items.filter(i => i.id !== id);
  await saveEvidence(filtered, pin, type);
}

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.CONFIG, KEYS.EVIDENCE_SECRET, KEYS.EVIDENCE_DECOY]);
  await SecureStore.deleteItemAsync(SECURE_KEYS.SECRET_HASH).catch(() => { });
  await SecureStore.deleteItemAsync(SECURE_KEYS.DECOY_HASH).catch(() => { });
  await SecureStore.deleteItemAsync(SECURE_KEYS.IS_SETUP).catch(() => { });
}
