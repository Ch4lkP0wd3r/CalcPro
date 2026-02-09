// Made by Dhairya Singh Dhaila
import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  FlatList,
  Alert,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import Colors from '@/constants/colors';
import { useApp } from '@/lib/app-context';
import { EvidenceItem, EvidenceType } from '@/lib/types';
import { generateId } from '@/lib/encryption';
import { buildForensicMetadata } from '@/lib/forensics';
import { persistMedia } from '@/lib/media';

// Refactored Components
import EvidenceCard from './vault/EvidenceCard';
import AddMenu from './vault/AddMenu';
import NoteModal from './vault/NoteModal';
import AudioRecorderPanel from './vault/AudioRecorderPanel';
import DetailModal from './vault/DetailModal';


export default function EvidenceVault() {
  const insets = useSafeAreaInsets();
  const { evidence, lockVault, addNewEvidence, removeEvidence, vaultType } = useApp();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [viewingItem, setViewingItem] = useState<EvidenceItem | null>(null);

  const doubleTapRef = useRef<number>(0);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - doubleTapRef.current < 400) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      lockVault();
    }
    doubleTapRef.current = now;
  }, [lockVault]);

  const handleTakePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Grant photo access to collect evidence.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const persistentUri = await persistMedia(asset.uri, 'photo');
      const metadata = await buildForensicMetadata('photo', { uri: asset.uri });

      const item: EvidenceItem = {
        id: generateId(),
        type: 'photo',
        title: `Photo Evidence ${new Date().toLocaleDateString()}`,
        content: persistentUri,
        timestamp: Date.now(),
        metadata,
        encrypted: true,
      };
      await addNewEvidence(item);
    }
  }, [addNewEvidence]);

  const handleRecordVideo = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Grant camera access to record evidence.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const persistentUri = await persistMedia(asset.uri, 'video');
      const metadata = await buildForensicMetadata('video', { uri: asset.uri });

      const item: EvidenceItem = {
        id: generateId(),
        type: 'video',
        title: `Video Evidence ${new Date().toLocaleDateString()}`,
        content: persistentUri,
        timestamp: Date.now(),
        metadata,
        encrypted: true,
      };
      await addNewEvidence(item);
    }
  }, [addNewEvidence]);

  const handleAudioSaved = useCallback(async (uri: string, durationMs: number) => {
    const persistentUri = await persistMedia(uri, 'audio');
    const metadata = await buildForensicMetadata('audio', { uri, duration: durationMs });

    const item: EvidenceItem = {
      id: generateId(),
      type: 'audio',
      title: `Audio Recording ${new Date().toLocaleDateString()}`,
      content: persistentUri,
      timestamp: Date.now(),
      metadata,
      encrypted: true,
    };
    await addNewEvidence(item);
  }, [addNewEvidence]);

  const handleAddNote = useCallback(async (title: string, content: string, tags: string[]) => {
    const metadata = await buildForensicMetadata('note', { tags });

    const item: EvidenceItem = {
      id: generateId(),
      type: 'note',
      title,
      content,
      timestamp: Date.now(),
      metadata,
      encrypted: true,
    };
    await addNewEvidence(item);
  }, [addNewEvidence]);

  const handleSelectType = useCallback((type: EvidenceType) => {
    switch (type) {
      case 'photo':
        handleTakePhoto();
        break;
      case 'video':
        handleRecordVideo();
        break;
      case 'audio':
        setShowAudioRecorder(true);
        break;
      case 'note':
        setShowNoteModal(true);
        break;
    }
  }, [handleTakePhoto, handleRecordVideo]);

  const handleDelete = useCallback(async (id: string) => {
    await removeEvidence(id);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [removeEvidence]);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Feather name="shield" size={48} color={Colors.vault.textMuted} />
      <Text style={styles.emptyTitle}>Vault is Empty</Text>
      <Text style={styles.emptySubtitle}>
        Tap + to collect photo, video, audio, or text evidence
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <Pressable onPress={handleDoubleTap} style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="shield" size={20} color={Colors.vault.accent} />
          <Text style={styles.headerTitle}>
            {vaultType === 'decoy' ? 'Evidence Vault (Safe)' : 'Evidence Vault'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerCount}>{evidence.length} items</Text>
          <Pressable onPress={lockVault} style={styles.lockButton}>
            <Feather name="lock" size={18} color={Colors.vault.danger} />
          </Pressable>
        </View>
      </Pressable>

      <View style={styles.securityBanner}>
        <Feather name="shield" size={14} color={Colors.vault.accent} />
        <Text style={styles.securityText}>AES-256 encrypted  |  SHA-256 integrity  |  Chain of Custody active</Text>
      </View>

      <FlatList
        data={evidence}
        keyExtractor={(item) => item.id}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={10}
        renderItem={({ item }) => (
          <EvidenceCard
            item={item}
            onDelete={handleDelete}
            onView={setViewingItem}
          />
        )}
        contentContainerStyle={[
          styles.list,
          evidence.length === 0 && styles.listEmpty,
          { paddingBottom: insets.bottom + webBottomInset + 80 },
        ]}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={() => (
          <View style={styles.footer}>
            <Text style={styles.footerText}>Made By Dhairya Singh Dhaila , Stay Safe !</Text>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + webBottomInset + 20 }]}
        onPress={() => {
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          setShowAddMenu(true);
        }}
      >
        <Feather name="plus" size={28} color="#000" />
      </Pressable>

      <AddMenu
        visible={showAddMenu}
        onClose={() => setShowAddMenu(false)}
        onSelect={handleSelectType}
      />
      <NoteModal
        visible={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        onSave={handleAddNote}
      />
      <AudioRecorderPanel
        visible={showAudioRecorder}
        onClose={() => setShowAudioRecorder(false)}
        onSave={handleAudioSaved}
      />
      <DetailModal
        item={viewingItem}
        onClose={() => setViewingItem(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.vault.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.vault.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerCount: {
    fontSize: 13,
    color: Colors.vault.textSecondary,
  },
  lockButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 71, 87, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(0, 212, 170, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 170, 0.15)',
    marginBottom: 8,
  },
  securityText: {
    fontSize: 11,
    color: Colors.vault.accent,
    fontWeight: '500' as const,
    flex: 1,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  listEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.vault.textSecondary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.vault.textMuted,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  fab: {
    position: 'absolute',
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.vault.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.vault.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  footer: {
    paddingVertical: 30,
    alignItems: 'center' as const,
    opacity: 0.5,
  },
  footerText: {
    fontSize: 12,
    color: Colors.vault.textSecondary,
    letterSpacing: 0.5,
  },
});
