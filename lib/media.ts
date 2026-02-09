import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

// Use a type-safe way to access FileSystem properties to avoid lint issues with some Expo versions
const fs: any = FileSystem;
const VAULT_DIRECTORY = fs.documentDirectory ? `${fs.documentDirectory}vault/` : null;

export async function ensureVaultDirectory() {
    if (!VAULT_DIRECTORY || Platform.OS === 'web') return;
    try {
        const dirInfo = await fs.getInfoAsync(VAULT_DIRECTORY);
        if (!dirInfo.exists) {
            await fs.makeDirectoryAsync(VAULT_DIRECTORY, { intermediates: true });
        }
    } catch (error) {
        console.error('[Media] Failed to ensure vault directory:', error);
    }
}

/**
 * Persists media from a temp URI to the vault directory
 * Returns the relative filename for persistence
 */
export async function persistMedia(tempUri: string, type: 'photo' | 'video' | 'audio'): Promise<string> {
    if (Platform.OS === 'web') return tempUri;

    await ensureVaultDirectory();
    if (!VAULT_DIRECTORY) return tempUri;

    let finalUri = tempUri;

    // For photos, we might want to do some processing, but for now we just copy
    const extension = type === 'photo' ? 'jpg' : type === 'video' ? 'mp4' : 'm4a';
    const filename = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${extension}`;
    const persistentUri = `${VAULT_DIRECTORY}${filename}`;

    try {
        await fs.copyAsync({
            from: finalUri,
            to: persistentUri,
        });
        // Return only the filename to ensure persistence across app movements
        return filename;
    } catch (error) {
        console.error('[Media] Failed to persist media:', error);
        return tempUri;
    }
}

export async function deleteMedia(uri: string): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
        const fullUri = getAbsoluteUri(uri);
        const info = await fs.getInfoAsync(fullUri);
        if (info.exists) {
            await fs.deleteAsync(fullUri);
        }
    } catch (error) {
        console.error('[Media] Failed to delete media:', error);
    }
}

/**
 * Gets the absolute URI from a stored relative filename
 */
export function getAbsoluteUri(relativeUri: string): string {
    if (!relativeUri) return '';
    if (relativeUri.startsWith('file://') || relativeUri.startsWith('content://') || relativeUri.startsWith('http')) {
        return relativeUri;
    }
    if (!VAULT_DIRECTORY) return relativeUri;
    return `${VAULT_DIRECTORY}${relativeUri}`;
}
