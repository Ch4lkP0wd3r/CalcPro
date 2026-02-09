// Made by Dhairya Singh Dhaila
import * as Device from 'expo-device';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { ForensicMetadata } from './types';
import { generateId } from './encryption';

export function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'Unknown';
  }
}

export function getDeviceInfo(): {
  brand: string;
  model: string;
  os: string;
  osVersion: string;
  name: string;
} {
  if (Platform.OS === 'web') {
    return {
      brand: 'Web Browser',
      model: navigator?.userAgent?.substring(0, 50) || 'Unknown',
      os: 'Web',
      osVersion: Platform.OS,
      name: 'Web Client',
    };
  }
  return {
    brand: Device.brand || 'Unknown',
    model: Device.modelName || 'Unknown',
    os: Device.osName || Platform.OS,
    osVersion: Device.osVersion || 'Unknown',
    name: Device.deviceName || 'Unknown',
  };
}

export async function computeIntegrityHash(data: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    data + '_integrity_' + Date.now().toString()
  );
}

export function generateChainOfCustodyId(): string {
  const prefix = 'COC';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function getEvidenceClassification(type: string): string {
  switch (type) {
    case 'photo':
      return 'Digital Photograph - Original Capture';
    case 'video':
      return 'Digital Video Recording - Original Capture';
    case 'audio':
      return 'Digital Audio Recording - Original Capture';
    case 'note':
      return 'Written Statement / Observation Log';
    default:
      return 'Digital Evidence';
  }
}

export function getCollectionMethod(type: string): string {
  switch (type) {
    case 'photo':
      return 'Device Camera / Image Picker';
    case 'video':
      return 'Device Camera - Video Mode';
    case 'audio':
      return 'Device Microphone - Direct Recording';
    case 'note':
      return 'Manual Text Entry';
    default:
      return 'Digital Capture';
  }
}

export async function buildForensicMetadata(
  type: string,
  extras?: {
    fileSize?: number;
    mimeType?: string;
    duration?: number;
    codec?: string;
    sampleRate?: number;
    channels?: number;
    resolution?: string;
    uri?: string;
    gpsLatitude?: number;
    gpsLongitude?: number;
    gpsAccuracy?: number;
    tags?: string[];
  }
): Promise<ForensicMetadata> {
  const now = new Date();
  const device = getDeviceInfo();
  const hashInput = `${type}_${now.toISOString()}_${device.model}_${generateId()}`;
  const integrityHash = await computeIntegrityHash(hashInput);

  return {
    captureTimestampISO: now.toISOString(),
    captureTimestampUnix: now.getTime(),
    timezone: getTimezone(),
    deviceBrand: device.brand,
    deviceModel: device.model,
    deviceOS: device.os,
    deviceOSVersion: device.osVersion,
    deviceName: device.name,
    gpsLatitude: extras?.gpsLatitude,
    gpsLongitude: extras?.gpsLongitude,
    gpsAccuracy: extras?.gpsAccuracy,
    fileSize: extras?.fileSize,
    mimeType: extras?.mimeType,
    duration: extras?.duration,
    codec: extras?.codec,
    sampleRate: extras?.sampleRate,
    channels: extras?.channels,
    resolution: extras?.resolution,
    integrityHash,
    chainOfCustodyId: generateChainOfCustodyId(),
    evidenceClassification: getEvidenceClassification(type),
    collectionMethod: getCollectionMethod(type),
    isOriginal: true,
    hasBeenModified: false,
    tags: extras?.tags || [type, 'evidence', 'original'],
  };
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
