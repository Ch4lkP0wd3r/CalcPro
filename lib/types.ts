export type EvidenceType = 'photo' | 'video' | 'audio' | 'note';

export interface EvidenceItem {
  id: string;
  type: EvidenceType;
  title: string;
  content: string;
  timestamp: number;
  metadata: {
    location?: string;
    deviceInfo?: string;
    fileSize?: number;
    mimeType?: string;
  };
  encrypted: boolean;
}

export interface AppConfig {
  secretPinHash: string;
  decoyPinHash: string;
  isSetup: boolean;
}

export type AppMode = 'calculator' | 'vault' | 'setup';
