import AsyncStorage from '@react-native-async-storage/async-storage';
import { encrypt, decrypt, hashPin } from './encryption';
import { EvidenceItem, AppConfig } from './types';

const KEYS = {
  CONFIG: '@silentshield_config',
  EVIDENCE: '@silentshield_evidence',
};

export async function saveConfig(config: AppConfig): Promise<void> {
  await AsyncStorage.setItem(KEYS.CONFIG, JSON.stringify(config));
}

export async function getConfig(): Promise<AppConfig | null> {
  const data = await AsyncStorage.getItem(KEYS.CONFIG);
  if (!data) return null;
  return JSON.parse(data);
}

export async function isAppSetup(): Promise<boolean> {
  const config = await getConfig();
  return config?.isSetup === true;
}

export async function verifyPin(pin: string): Promise<'secret' | 'decoy' | 'invalid'> {
  const config = await getConfig();
  if (!config) return 'invalid';

  const pinHash = await hashPin(pin);

  if (pinHash === config.secretPinHash) return 'secret';
  if (pinHash === config.decoyPinHash) return 'decoy';
  return 'invalid';
}

export async function saveEvidence(items: EvidenceItem[], pin: string): Promise<void> {
  const data = JSON.stringify(items);
  const encrypted = encrypt(data, pin);
  await AsyncStorage.setItem(KEYS.EVIDENCE, encrypted);
}

export async function loadEvidence(pin: string): Promise<EvidenceItem[]> {
  const encrypted = await AsyncStorage.getItem(KEYS.EVIDENCE);
  if (!encrypted) return [];

  const decrypted = decrypt(encrypted, pin);
  if (!decrypted) return [];

  try {
    return JSON.parse(decrypted);
  } catch {
    return [];
  }
}

export async function addEvidence(item: EvidenceItem, pin: string): Promise<void> {
  const items = await loadEvidence(pin);
  items.unshift(item);
  await saveEvidence(items, pin);
}

export async function deleteEvidence(id: string, pin: string): Promise<void> {
  const items = await loadEvidence(pin);
  const filtered = items.filter(i => i.id !== id);
  await saveEvidence(filtered, pin);
}

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.CONFIG, KEYS.EVIDENCE]);
}
