import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

const fs: any = FileSystem;

/**
 * Gets the base document directory safely.
 * On some Android versions/conditions, documentDirectory can be null initially.
 */
function getDocumentDirectory(): string | null {
    return fs.documentDirectory;
}

/**
 * Gets the vault directory path.
 */
export function getVaultDirectory(): string | null {
    const docDir = getDocumentDirectory();
    if (!docDir || Platform.OS === 'web') return null;
    return `${docDir}vault/`;
}

export async function ensureVaultDirectory() {
    const vaultDir = getVaultDirectory();
    if (!vaultDir) return;

    try {
        const dirInfo = await fs.getInfoAsync(vaultDir);
        if (!dirInfo.exists) {
            await fs.makeDirectoryAsync(vaultDir, { intermediates: true });
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

    const vaultDir = getVaultDirectory();
    if (!vaultDir) {
        console.error('[Media] Cannot persist: vault directory not available');
        return tempUri;
    }

    await ensureVaultDirectory();

    // For photos, we might want to do some processing, but for now we just copy
    const extension = type === 'photo' ? 'jpg' : type === 'video' ? 'mp4' : 'm4a';
    const filename = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${extension}`;
    const persistentUri = `${vaultDir}${filename}`;

    try {
        await fs.copyAsync({
            from: tempUri,
            to: persistentUri,
        });
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
        if (!fullUri) return;

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
export function getAbsoluteUri(relativeUri: string): string | null {
    if (!relativeUri) return null;
    if (relativeUri.startsWith('file://') || relativeUri.startsWith('content://') || relativeUri.startsWith('http')) {
        return relativeUri;
    }

    const vaultDir = getVaultDirectory();
    if (!vaultDir) {
        console.warn('[Media] getAbsoluteUri: Vault directory not available for', relativeUri);
        return null;
    }

    return `${vaultDir}${relativeUri}`;
}
