import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  FlatList,
  Alert,
  Platform,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Dimensions,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  AudioModule,
} from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
  FadeIn,
  FadeOut,
  SlideInRight,
} from 'react-native-reanimated';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/app-context';
import { EvidenceItem, EvidenceType } from '@/lib/types';
import { generateId } from '@/lib/encryption';
import { buildForensicMetadata, formatDuration } from '@/lib/forensics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function EvidenceCard({
  item,
  onDelete,
  onView,
}: {
  item: EvidenceItem;
  onDelete: (id: string) => void;
  onView: (item: EvidenceItem) => void;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getIcon = () => {
    switch (item.type) {
      case 'photo': return <Ionicons name="image" size={22} color={Colors.vault.accent} />;
      case 'video': return <Ionicons name="videocam" size={22} color="#FF6B9D" />;
      case 'audio': return <Ionicons name="mic" size={22} color="#FFB800" />;
      case 'note': return <MaterialCommunityIcons name="note-text" size={22} color="#7B68EE" />;
    }
  };

  const getTypeLabel = () => {
    switch (item.type) {
      case 'photo': return 'Photo';
      case 'video': return 'Video';
      case 'audio': return 'Audio';
      case 'note': return 'Note';
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getDurationLabel = () => {
    if (item.metadata.duration && (item.type === 'audio' || item.type === 'video')) {
      return formatDuration(item.metadata.duration);
    }
    return null;
  };

  const durationLabel = getDurationLabel();

  return (
    <Animated.View style={animStyle} entering={SlideInRight.springify().damping(15)}>
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 15 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15 });
        }}
        onPress={() => onView(item)}
        onLongPress={() => {
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          Alert.alert(
            'Delete Evidence',
            'This will permanently delete this item. Continue?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => onDelete(item.id),
              },
            ],
          );
        }}
        style={styles.card}
      >
        <View style={styles.cardIcon}>{getIcon()}</View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title || getTypeLabel()}
          </Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardType}>{getTypeLabel()}</Text>
            {durationLabel ? (
              <>
                <View style={styles.cardDot} />
                <Text style={styles.cardDuration}>{durationLabel}</Text>
              </>
            ) : null}
            <View style={styles.cardDot} />
            <Text style={styles.cardTime}>{formatDate(item.timestamp)}</Text>
          </View>
          {item.type === 'note' && item.content ? (
            <Text style={styles.cardPreview} numberOfLines={2}>
              {item.content}
            </Text>
          ) : null}
          {item.metadata.tags && item.metadata.tags.length > 0 ? (
            <View style={styles.cardTags}>
              {item.metadata.tags.slice(0, 3).map((tag, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
        <View style={styles.cardEncrypted}>
          <Feather name="lock" size={12} color={Colors.vault.accent} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

function AddMenu({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (type: EvidenceType) => void;
}) {
  if (!visible) return null;

  const options: { type: EvidenceType; icon: React.ReactNode; label: string; subtitle: string }[] = [
    {
      type: 'photo',
      icon: <Ionicons name="camera" size={24} color={Colors.vault.accent} />,
      label: 'Capture Photo',
      subtitle: 'Camera or gallery with EXIF data',
    },
    {
      type: 'video',
      icon: <Ionicons name="videocam" size={24} color="#FF6B9D" />,
      label: 'Record Video',
      subtitle: 'Camera recording with full metadata',
    },
    {
      type: 'audio',
      icon: <Ionicons name="mic" size={24} color="#FFB800" />,
      label: 'Record Audio',
      subtitle: 'Live mic recording with timestamps',
    },
    {
      type: 'note',
      icon: <MaterialCommunityIcons name="note-text" size={24} color="#7B68EE" />,
      label: 'Written Statement',
      subtitle: 'Text observation with chain of custody',
    },
  ];

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.menuOverlay} onPress={onClose}>
        <Animated.View
          style={styles.menuContainer}
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(100)}
        >
          <Text style={styles.menuTitle}>Collect Evidence</Text>
          {options.map((opt) => (
            <Pressable
              key={opt.type}
              style={styles.menuItem}
              onPress={() => {
                onClose();
                setTimeout(() => onSelect(opt.type), 200);
              }}
            >
              <View style={styles.menuIconWrap}>{opt.icon}</View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuLabel}>{opt.label}</Text>
                <Text style={styles.menuSub}>{opt.subtitle}</Text>
              </View>
            </Pressable>
          ))}
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function AudioRecorderPanel({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (uri: string, durationMs: number) => void;
}) {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 200);
  const [hasPermission, setHasPermission] = useState(false);

  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  const isActive = recorderState.isRecording;
  const durationMs = recorderState.durationMillis || 0;

  useEffect(() => {
    if (visible) {
      (async () => {
        const status = await AudioModule.requestRecordingPermissionsAsync();
        setHasPermission(status.granted);
        if (!status.granted) {
          Alert.alert('Permission Required', 'Microphone access is needed to record audio evidence.');
        }
      })();
    }
  }, [visible]);

  useEffect(() => {
    if (isActive) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
        false,
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.2, { duration: 800 }),
          withTiming(0.6, { duration: 800 }),
        ),
        -1,
        false,
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
      pulseOpacity.value = withTiming(0.6, { duration: 200 });
    }
  }, [isActive]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const startRecording = async () => {
    if (!hasPermission) {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert('Permission Required', 'Microphone access is needed.');
        return;
      }
      setHasPermission(true);
    }
    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (err) {
      console.error('Failed to start recording:', err);
      Alert.alert('Error', 'Failed to start audio recording.');
    }
  };

  const stopAndSave = async () => {
    try {
      const finalDuration = durationMs;
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (uri) {
        onSave(uri, finalDuration);
      }
      onClose();
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error('Failed to stop recording:', err);
    }
  };

  const cancelRecording = async () => {
    if (isActive) {
      try {
        await audioRecorder.stop();
      } catch {}
    }
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={cancelRecording}>
      <View style={styles.recorderOverlay}>
        <View style={styles.recorderModal}>
          <View style={styles.recorderHeader}>
            <Pressable onPress={cancelRecording}>
              <Feather name="x" size={24} color={Colors.vault.textSecondary} />
            </Pressable>
            <Text style={styles.recorderTitle}>Audio Evidence</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.recorderBody}>
            <View style={styles.recorderVisual}>
              {isActive ? (
                <Animated.View style={[styles.pulseRing, pulseStyle]} />
              ) : null}
              <View style={[styles.recorderCircle, isActive && styles.recorderCircleActive]}>
                <Ionicons
                  name={isActive ? 'mic' : 'mic-outline'}
                  size={40}
                  color={isActive ? '#FF4757' : Colors.vault.textSecondary}
                />
              </View>
            </View>

            <Text style={styles.recorderTimer}>{formatDuration(durationMs)}</Text>
            <Text style={styles.recorderStatus}>
              {!isActive
                ? 'Tap to begin recording'
                : 'Recording in progress...'}
            </Text>

            <View style={styles.recorderControls}>
              {!isActive ? (
                <Pressable style={styles.recBtn} onPress={startRecording}>
                  <View style={styles.recBtnInner}>
                    <Ionicons name="mic" size={28} color="#FFF" />
                  </View>
                  <Text style={styles.recBtnLabel}>Record</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.recBtn} onPress={stopAndSave}>
                  <View style={[styles.recBtnInner, styles.recBtnStop]}>
                    <Ionicons name="stop" size={24} color="#FFF" />
                  </View>
                  <Text style={styles.recBtnLabel}>Save</Text>
                </Pressable>
              )}
            </View>
          </View>

          <View style={styles.recorderFooter}>
            <Feather name="shield" size={12} color={Colors.vault.accent} />
            <Text style={styles.recorderFooterText}>
              SHA-256 integrity hash generated on save
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function NoteModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (title: string, content: string, tags: string[]) => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['evidence', 'statement']);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags(prev => [...prev, t]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const handleSave = () => {
    if (!content.trim()) return;
    onSave(title.trim() || 'Written Statement', content.trim(), tags);
    setTitle('');
    setContent('');
    setTagInput('');
    setTags(['evidence', 'statement']);
    onClose();
  };

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.noteModalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.noteModal}>
          <View style={styles.noteModalHeader}>
            <Pressable onPress={onClose}>
              <Feather name="x" size={24} color={Colors.vault.textSecondary} />
            </Pressable>
            <Text style={styles.noteModalTitle}>Written Statement</Text>
            <Pressable onPress={handleSave}>
              <Feather name="check" size={24} color={Colors.vault.accent} />
            </Pressable>
          </View>
          <TextInput
            style={styles.noteInput}
            placeholder="Title / Subject"
            placeholderTextColor={Colors.vault.textMuted}
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={[styles.noteInput, styles.noteContentInput]}
            placeholder="Describe what you observed in detail..."
            placeholderTextColor={Colors.vault.textMuted}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
          <View style={styles.tagSection}>
            <Text style={styles.tagSectionLabel}>Tags</Text>
            <View style={styles.tagInputRow}>
              <TextInput
                style={styles.tagInputField}
                placeholder="Add tag..."
                placeholderTextColor={Colors.vault.textMuted}
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={addTag}
                returnKeyType="done"
              />
              <Pressable style={styles.tagAddBtn} onPress={addTag}>
                <Feather name="plus" size={18} color={Colors.vault.accent} />
              </Pressable>
            </View>
            <View style={styles.tagList}>
              {tags.map((tag) => (
                <Pressable key={tag} style={styles.tagRemovable} onPress={() => removeTag(tag)}>
                  <Text style={styles.tagRemovableText}>{tag}</Text>
                  <Feather name="x" size={12} color={Colors.vault.textSecondary} />
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DetailModal({
  item,
  onClose,
}: {
  item: EvidenceItem | null;
  onClose: () => void;
}) {
  if (!item) return null;

  const meta = item.metadata;

  const rows: { icon: string; label: string; value: string }[] = [
    { icon: 'clock', label: 'Captured', value: meta.captureTimestampISO },
    { icon: 'globe', label: 'Timezone', value: meta.timezone },
    { icon: 'smartphone', label: 'Device', value: `${meta.deviceBrand || ''} ${meta.deviceModel || ''}`.trim() || 'Unknown' },
    { icon: 'cpu', label: 'OS', value: `${meta.deviceOS || ''} ${meta.deviceOSVersion || ''}`.trim() || 'Unknown' },
    { icon: 'hash', label: 'Chain of Custody', value: meta.chainOfCustodyId },
    { icon: 'file-text', label: 'Classification', value: meta.evidenceClassification },
    { icon: 'tool', label: 'Collection Method', value: meta.collectionMethod },
    { icon: 'shield', label: 'Integrity Hash', value: meta.integrityHash ? meta.integrityHash.substring(0, 32) + '...' : 'N/A' },
    { icon: 'check-circle', label: 'Original', value: meta.isOriginal ? 'Yes - Unmodified' : 'Modified Copy' },
    { icon: 'lock', label: 'Encryption', value: 'AES-256-CBC' },
  ];

  if (meta.duration !== undefined && meta.duration > 0) {
    rows.push({ icon: 'watch', label: 'Duration', value: formatDuration(meta.duration) });
  }
  if (meta.mimeType) {
    rows.push({ icon: 'file', label: 'Format', value: meta.mimeType });
  }
  if (meta.codec) {
    rows.push({ icon: 'disc', label: 'Codec', value: meta.codec });
  }
  if (meta.sampleRate) {
    rows.push({ icon: 'activity', label: 'Sample Rate', value: `${meta.sampleRate} Hz` });
  }
  if (meta.resolution) {
    rows.push({ icon: 'maximize', label: 'Resolution', value: meta.resolution });
  }
  if (meta.fileSize) {
    const sizeKB = Math.round(meta.fileSize / 1024);
    const sizeMB = (meta.fileSize / (1024 * 1024)).toFixed(2);
    rows.push({ icon: 'hard-drive', label: 'File Size', value: sizeKB > 1024 ? `${sizeMB} MB` : `${sizeKB} KB` });
  }
  if (meta.gpsLatitude !== undefined && meta.gpsLongitude !== undefined) {
    rows.push({ icon: 'map-pin', label: 'GPS', value: `${meta.gpsLatitude.toFixed(6)}, ${meta.gpsLongitude.toFixed(6)}` });
    if (meta.gpsAccuracy !== undefined) {
      rows.push({ icon: 'crosshair', label: 'GPS Accuracy', value: `${meta.gpsAccuracy.toFixed(1)}m` });
    }
  }

  return (
    <Modal transparent animationType="slide" visible={!!item} onRequestClose={onClose}>
      <View style={styles.detailOverlay}>
        <View style={styles.detailModal}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle} numberOfLines={2}>{item.title}</Text>
            <Pressable onPress={onClose} style={styles.detailCloseBtn}>
              <Feather name="x" size={24} color={Colors.vault.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.detailScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.detailScrollContent}
          >
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Forensic Metadata</Text>
              {rows.map((row, i) => (
                <View key={i} style={styles.detailRow}>
                  <View style={styles.detailRowIcon}>
                    <Feather name={row.icon as any} size={14} color={Colors.vault.textSecondary} />
                  </View>
                  <Text style={styles.detailRowLabel}>{row.label}</Text>
                  <Text style={styles.detailRowValue} numberOfLines={2}>{row.value}</Text>
                </View>
              ))}
            </View>

            {meta.tags && meta.tags.length > 0 ? (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Evidence Tags</Text>
                <View style={styles.detailTags}>
                  {meta.tags.map((tag, i) => (
                    <View key={i} style={styles.detailTag}>
                      <Text style={styles.detailTagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {item.type === 'note' ? (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Statement Content</Text>
                <View style={styles.detailContent}>
                  <Text style={styles.detailContentText}>{item.content}</Text>
                </View>
              </View>
            ) : null}

            {(item.type === 'photo' || item.type === 'video' || item.type === 'audio') ? (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Media Status</Text>
                <View style={styles.detailContent}>
                  <View style={styles.mediaStatusRow}>
                    <Feather name="check-circle" size={16} color={Colors.vault.accent} />
                    <Text style={styles.mediaStatusText}>Captured and encrypted locally</Text>
                  </View>
                  <View style={styles.mediaStatusRow}>
                    <Feather name="shield" size={16} color={Colors.vault.accent} />
                    <Text style={styles.mediaStatusText}>SHA-256 integrity hash recorded</Text>
                  </View>
                  <View style={styles.mediaStatusRow}>
                    <Feather name="lock" size={16} color={Colors.vault.accent} />
                    <Text style={styles.mediaStatusText}>AES-256 at rest encryption</Text>
                  </View>
                </View>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function EvidenceVault() {
  const insets = useSafeAreaInsets();
  const { evidence, lockVault, addNewEvidence, removeEvidence } = useApp();
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
      exif: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const metadata = await buildForensicMetadata('photo', {
        fileSize: asset.fileSize,
        mimeType: asset.mimeType || 'image/jpeg',
        resolution: asset.width && asset.height ? `${asset.width}x${asset.height}` : undefined,
        tags: ['photo', 'evidence', 'original', 'visual'],
      });

      const item: EvidenceItem = {
        id: generateId(),
        type: 'photo',
        title: 'Photo Evidence',
        content: asset.uri,
        timestamp: Date.now(),
        metadata,
        encrypted: true,
      };
      await addNewEvidence(item);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  }, [addNewEvidence]);

  const handleRecordVideo = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is needed to record video evidence.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: 300,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const durationMs = asset.duration ? asset.duration * 1000 : 0;

      const metadata = await buildForensicMetadata('video', {
        fileSize: asset.fileSize,
        mimeType: asset.mimeType || 'video/mp4',
        duration: durationMs,
        codec: 'H.264/AAC',
        resolution: asset.width && asset.height ? `${asset.width}x${asset.height}` : undefined,
        tags: ['video', 'evidence', 'original', 'audiovisual', 'live-capture'],
      });

      const item: EvidenceItem = {
        id: generateId(),
        type: 'video',
        title: 'Video Evidence',
        content: asset.uri,
        timestamp: Date.now(),
        metadata,
        encrypted: true,
      };
      await addNewEvidence(item);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  }, [addNewEvidence]);

  const handleAudioSaved = useCallback(async (uri: string, durationMs: number) => {
    const metadata = await buildForensicMetadata('audio', {
      mimeType: Platform.OS === 'ios' ? 'audio/x-caf' : 'audio/mp4',
      duration: durationMs,
      codec: Platform.OS === 'ios' ? 'AAC (Core Audio)' : 'AAC',
      sampleRate: 44100,
      channels: 1,
      tags: ['audio', 'evidence', 'original', 'live-recording', 'microphone'],
    });

    const item: EvidenceItem = {
      id: generateId(),
      type: 'audio',
      title: 'Audio Recording',
      content: uri,
      timestamp: Date.now(),
      metadata,
      encrypted: true,
    };
    await addNewEvidence(item);
  }, [addNewEvidence]);

  const handleAddNote = useCallback(async (title: string, content: string, tags: string[]) => {
    try {
      const metadata = await buildForensicMetadata('note', {
        tags: ['note', ...tags],
      });

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
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error('handleAddNote error:', err);
    }
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
          <Text style={styles.headerTitle}>Vault</Text>
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.vault.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.vault.border,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.vault.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.vault.text,
    marginBottom: 3,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardType: {
    fontSize: 12,
    color: Colors.vault.textSecondary,
    fontWeight: '500' as const,
  },
  cardDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.vault.textMuted,
  },
  cardDuration: {
    fontSize: 12,
    color: '#FFB800',
    fontWeight: '600' as const,
  },
  cardTime: {
    fontSize: 12,
    color: Colors.vault.textMuted,
  },
  cardPreview: {
    fontSize: 13,
    color: Colors.vault.textSecondary,
    marginTop: 6,
    lineHeight: 18,
  },
  cardTags: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    color: Colors.vault.accent,
    fontWeight: '600' as const,
  },
  cardEncrypted: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
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
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: Colors.vault.surface,
    borderRadius: 20,
    padding: 16,
    width: SCREEN_WIDTH * 0.8,
    maxWidth: 340,
    borderWidth: 1,
    borderColor: Colors.vault.border,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.vault.text,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.vault.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTextWrap: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    color: Colors.vault.text,
    fontWeight: '600' as const,
  },
  menuSub: {
    fontSize: 12,
    color: Colors.vault.textMuted,
    marginTop: 2,
  },
  recorderOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  recorderModal: {
    backgroundColor: Colors.vault.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: Colors.vault.border,
    borderBottomWidth: 0,
  },
  recorderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  recorderTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.vault.text,
  },
  recorderBody: {
    alignItems: 'center',
  },
  recorderVisual: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FF4757',
  },
  recorderCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.vault.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.vault.border,
  },
  recorderCircleActive: {
    borderColor: '#FF4757',
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
  },
  recorderTimer: {
    fontSize: 48,
    fontWeight: '300' as const,
    color: Colors.vault.text,
    fontVariant: ['tabular-nums'],
    marginBottom: 8,
  },
  recorderStatus: {
    fontSize: 14,
    color: Colors.vault.textSecondary,
    marginBottom: 32,
  },
  recorderControls: {
    flexDirection: 'row',
    gap: 24,
  },
  recBtn: {
    alignItems: 'center',
    gap: 8,
  },
  recBtnInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF4757',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recBtnSecondary: {
    backgroundColor: Colors.vault.surfaceLight,
  },
  recBtnStop: {
    backgroundColor: Colors.vault.accent,
  },
  recBtnLabel: {
    fontSize: 13,
    color: Colors.vault.textSecondary,
    fontWeight: '500' as const,
  },
  recorderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
    justifyContent: 'center',
  },
  recorderFooterText: {
    fontSize: 11,
    color: Colors.vault.textMuted,
  },
  noteModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  noteModal: {
    backgroundColor: Colors.vault.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '65%',
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.vault.border,
    borderBottomWidth: 0,
  },
  noteModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  noteModalTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.vault.text,
  },
  noteInput: {
    fontSize: 16,
    color: Colors.vault.text,
    backgroundColor: Colors.vault.inputBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.vault.border,
  },
  noteContentInput: {
    minHeight: 140,
  },
  tagSection: {
    marginTop: 4,
  },
  tagSectionLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.vault.textSecondary,
    marginBottom: 8,
  },
  tagInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  tagInputField: {
    flex: 1,
    fontSize: 14,
    color: Colors.vault.text,
    backgroundColor: Colors.vault.inputBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.vault.border,
  },
  tagAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 212, 170, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagRemovable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagRemovableText: {
    fontSize: 12,
    color: Colors.vault.accent,
    fontWeight: '500' as const,
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  detailModal: {
    backgroundColor: Colors.vault.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: Colors.vault.border,
    borderBottomWidth: 0,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.vault.border,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.vault.text,
    flex: 1,
    marginRight: 12,
  },
  detailCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.vault.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailScroll: {
    flex: 1,
  },
  detailScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.vault.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(42, 42, 58, 0.5)',
  },
  detailRowIcon: {
    width: 28,
    alignItems: 'center',
  },
  detailRowLabel: {
    fontSize: 13,
    color: Colors.vault.textSecondary,
    width: 110,
    fontWeight: '500' as const,
  },
  detailRowValue: {
    fontSize: 13,
    color: Colors.vault.text,
    flex: 1,
    textAlign: 'right' as const,
  },
  detailTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailTag: {
    backgroundColor: 'rgba(0, 212, 170, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 170, 0.2)',
  },
  detailTagText: {
    fontSize: 12,
    color: Colors.vault.accent,
    fontWeight: '600' as const,
  },
  detailContent: {
    backgroundColor: Colors.vault.inputBg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.vault.border,
  },
  detailContentText: {
    fontSize: 15,
    color: Colors.vault.text,
    lineHeight: 22,
  },
  mediaStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  mediaStatusText: {
    fontSize: 13,
    color: Colors.vault.textSecondary,
  },
});
