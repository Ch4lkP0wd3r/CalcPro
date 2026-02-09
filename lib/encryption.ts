import CryptoJS from 'crypto-js';
// Made by Dhairya Singh Dhaila
import * as Crypto from 'expo-crypto';

const SALT_LENGTH = 16;

function generateSalt(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let salt = '';
  for (let i = 0; i < SALT_LENGTH; i++) {
    salt += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return salt;
}

function deriveKey(pin: string, salt: string): string {
  return CryptoJS.PBKDF2(pin, salt, {
    keySize: 256 / 32,
    iterations: 10000,
  }).toString();
}

export function encrypt(data: string, pin: string): string {
  const salt = generateSalt();
  const key = deriveKey(pin, salt);
  const encrypted = CryptoJS.AES.encrypt(data, key).toString();
  return JSON.stringify({ salt, data: encrypted });
}

export function decrypt(encryptedPayload: string, pin: string): string | null {
  try {
    const { salt, data } = JSON.parse(encryptedPayload);
    const key = deriveKey(pin, salt);
    const bytes = CryptoJS.AES.decrypt(data, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) return null;
    return decrypted;
  } catch {
    return null;
  }
}

export async function hashPin(pin: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    pin + 'silentshield_salt_v1'
  );
}

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}
