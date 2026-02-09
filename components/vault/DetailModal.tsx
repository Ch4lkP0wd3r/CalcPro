// Made by Dhairya Singh Dhaila
import React, { memo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Pressable,
    Modal,
    ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { EvidenceItem } from '@/lib/types';
import { formatDuration } from '@/lib/forensics';
import { getAbsoluteUri } from '@/lib/media';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAudioPlayer } from 'expo-audio';

interface DetailModalProps {
    item: EvidenceItem | null;
    onClose: () => void;
}

const DetailModal = memo(({ item, onClose }: DetailModalProps) => {
    const absUri = item?.content ? getAbsoluteUri(item.content) : '';

    const videoPlayer = useVideoPlayer(item?.type === 'video' ? absUri : null, (player) => {
        player.loop = false;
    });

    const audioPlayer = useAudioPlayer(item?.type === 'audio' ? absUri : null);

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

    const renderMediaPreview = () => {
        if (!item.content) return null;

        switch (item.type) {
            case 'photo':
                return (
                    <View style={styles.mediaPreviewContainer}>
                        <Image
                            source={{ uri: absUri }}
                            style={styles.imagePreview}
                            contentFit="contain"
                            transition={200}
                        />
                    </View>
                );
            case 'video':
                return (
                    <View style={styles.mediaPreviewContainer}>
                        <VideoView
                            player={videoPlayer}
                            style={styles.videoPreview}
                            contentFit="contain"
                            allowsFullscreen
                            allowsPictureInPicture
                        />
                    </View>
                );
            case 'audio':
                return (
                    <View style={styles.mediaPreviewContainer}>
                        <Pressable
                            style={styles.audioPlayer}
                            onPress={() => {
                                if (audioPlayer.playing) {
                                    audioPlayer.pause();
                                } else {
                                    audioPlayer.play();
                                }
                            }}
                        >
                            <Feather
                                name={audioPlayer.playing ? "pause-circle" : "play-circle"}
                                size={48}
                                color={Colors.vault.accent}
                            />
                            <Text style={styles.audioPlayerText}>
                                {audioPlayer.playing ? 'Playing Recording...' : 'Tap to Play Recording'}
                            </Text>
                        </Pressable>
                    </View>
                );
            default:
                return null;
        }
    };

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
                        {renderMediaPreview()}

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
});

const styles = StyleSheet.create({
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
    mediaPreviewContainer: {
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: Colors.vault.surfaceLight,
        borderRadius: 12,
        marginBottom: 24,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.vault.border,
    },
    imagePreview: {
        width: '100%',
        height: '100%',
    },
    videoPreview: {
        width: '100%',
        height: '100%',
    },
    audioPlayer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        padding: 20,
    },
    audioPlayerText: {
        fontSize: 16,
        color: Colors.vault.text,
        fontWeight: '500',
    },
});

DetailModal.displayName = 'DetailModal';
export default DetailModal;
