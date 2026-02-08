import React, { useState, useCallback, useRef } from 'react';
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
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
  FadeOut,
  SlideInRight,
} from 'react-native-reanimated';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/app-context';
import { EvidenceItem, EvidenceType } from '@/lib/types';
import { generateId } from '@/lib/encryption';

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
            <View style={styles.cardDot} />
            <Text style={styles.cardTime}>{formatDate(item.timestamp)}</Text>
          </View>
          {item.type === 'note' && item.content ? (
            <Text style={styles.cardPreview} numberOfLines={2}>
              {item.content}
            </Text>
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

  const options: { type: EvidenceType; icon: React.ReactNode; label: string }[] = [
    { type: 'photo', icon: <Ionicons name="camera" size={24} color={Colors.vault.accent} />, label: 'Take Photo' },
    { type: 'note', icon: <MaterialCommunityIcons name="note-text" size={24} color="#7B68EE" />, label: 'Add Note' },
  ];

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.menuOverlay} onPress={onClose}>
        <Animated.View
          style={styles.menuContainer}
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(100)}
        >
          {options.map((opt) => (
            <Pressable
              key={opt.type}
              style={styles.menuItem}
              onPress={() => {
                onClose();
                onSelect(opt.type);
              }}
            >
              {opt.icon}
              <Text style={styles.menuLabel}>{opt.label}</Text>
            </Pressable>
          ))}
        </Animated.View>
      </Pressable>
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
  onSave: (title: string, content: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSave = () => {
    if (!content.trim()) return;
    onSave(title.trim() || 'Untitled Note', content.trim());
    setTitle('');
    setContent('');
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
            <Text style={styles.noteModalTitle}>New Note</Text>
            <Pressable onPress={handleSave}>
              <Feather name="check" size={24} color={Colors.vault.accent} />
            </Pressable>
          </View>
          <TextInput
            style={styles.noteInput}
            placeholder="Title"
            placeholderTextColor={Colors.vault.textMuted}
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={[styles.noteInput, styles.noteContentInput]}
            placeholder="Write your note here..."
            placeholderTextColor={Colors.vault.textMuted}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
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

  const formatFullDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <Modal transparent animationType="slide" visible={!!item} onRequestClose={onClose}>
      <View style={styles.detailOverlay}>
        <View style={styles.detailModal}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>{item.title}</Text>
            <Pressable onPress={onClose}>
              <Feather name="x" size={24} color={Colors.vault.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.detailBody}>
            <View style={styles.detailRow}>
              <Feather name="clock" size={16} color={Colors.vault.textSecondary} />
              <Text style={styles.detailText}>{formatFullDate(item.timestamp)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Feather name="lock" size={16} color={Colors.vault.accent} />
              <Text style={styles.detailText}>AES-256 Encrypted</Text>
            </View>
            <View style={styles.detailRow}>
              <Feather name="tag" size={16} color={Colors.vault.textSecondary} />
              <Text style={styles.detailText}>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</Text>
            </View>
          </View>

          {item.type === 'note' && (
            <View style={styles.detailContent}>
              <Text style={styles.detailContentText}>{item.content}</Text>
            </View>
          )}
          {item.type === 'photo' && (
            <View style={styles.detailContent}>
              <View style={styles.photoPlaceholder}>
                <Ionicons name="image" size={48} color={Colors.vault.accent} />
                <Text style={styles.detailText}>Photo captured and encrypted</Text>
              </View>
            </View>
          )}
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
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const item: EvidenceItem = {
        id: generateId(),
        type: 'photo',
        title: 'Photo Evidence',
        content: asset.uri,
        timestamp: Date.now(),
        metadata: {
          fileSize: asset.fileSize,
          mimeType: asset.mimeType || 'image/jpeg',
        },
        encrypted: true,
      };
      await addNewEvidence(item);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  }, [addNewEvidence]);

  const handleAddNote = useCallback(async (title: string, content: string) => {
    const item: EvidenceItem = {
      id: generateId(),
      type: 'note',
      title,
      content,
      timestamp: Date.now(),
      metadata: {},
      encrypted: true,
    };
    await addNewEvidence(item);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [addNewEvidence]);

  const handleSelectType = useCallback((type: EvidenceType) => {
    switch (type) {
      case 'photo':
        handleTakePhoto();
        break;
      case 'note':
        setShowNoteModal(true);
        break;
    }
  }, [handleTakePhoto]);

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
        Tap the + button to add evidence
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
        <Text style={styles.securityText}>AES-256 encrypted storage active</Text>
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
    fontWeight: '700',
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
    fontSize: 12,
    color: Colors.vault.accent,
    fontWeight: '500',
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
    fontWeight: '600',
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
    fontWeight: '500',
  },
  cardDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.vault.textMuted,
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
    fontWeight: '600',
    color: Colors.vault.textSecondary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.vault.textMuted,
    textAlign: 'center',
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: Colors.vault.surface,
    borderRadius: 16,
    padding: 8,
    width: SCREEN_WIDTH * 0.7,
    borderWidth: 1,
    borderColor: Colors.vault.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  menuLabel: {
    fontSize: 16,
    color: Colors.vault.text,
    fontWeight: '500',
  },
  noteModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  noteModal: {
    backgroundColor: Colors.vault.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '60%',
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
    fontWeight: '600',
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
    flex: 1,
    minHeight: 200,
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  detailModal: {
    backgroundColor: Colors.vault.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    minHeight: '50%',
    borderWidth: 1,
    borderColor: Colors.vault.border,
    borderBottomWidth: 0,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.vault.text,
    flex: 1,
    marginRight: 12,
  },
  detailBody: {
    gap: 14,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailText: {
    fontSize: 14,
    color: Colors.vault.textSecondary,
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
  photoPlaceholder: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 20,
  },
});
