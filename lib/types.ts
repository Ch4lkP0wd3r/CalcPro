export type EvidenceType = 'photo' | 'video' | 'audio' | 'note';

export interface ForensicMetadata {
  captureTimestampISO: string;
  captureTimestampUnix: number;
  timezone: string;
  deviceBrand?: string;
  deviceModel?: string;
  deviceOS?: string;
  deviceOSVersion?: string;
  deviceName?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAccuracy?: number;
  locationAddress?: string;
  fileSize?: number;
  mimeType?: string;
  duration?: number;
  codec?: string;
  sampleRate?: number;
  channels?: number;
  resolution?: string;
  integrityHash?: string;
  chainOfCustodyId: string;
  evidenceClassification: string;
  collectionMethod: string;
  isOriginal: boolean;
  hasBeenModified: boolean;
  tags: string[];
}

export interface EvidenceItem {
  id: string;
  type: EvidenceType;
  title: string;
  content: string;
  timestamp: number;
  metadata: ForensicMetadata;
  encrypted: boolean;
}

export interface AppConfig {
  secretPinHash: string;
  decoyPinHash: string;
  isSetup: boolean;
}

export type AppMode = 'calculator' | 'vault' | 'setup';
