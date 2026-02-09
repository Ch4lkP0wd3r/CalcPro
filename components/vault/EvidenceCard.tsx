// Made by Dhairya Singh Dhaila
import React, { memo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Pressable,
    Alert,
    Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    SlideInRight,
} from 'react-native-reanimated';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { EvidenceItem } from '@/lib/types';
import { formatDuration } from '@/lib/forensics';
import { getAbsoluteUri } from '@/lib/media';
import { Image } from 'expo-image';

interface EvidenceCardProps {
    item: EvidenceItem;
    onDelete: (id: string) => void;
    onView: (item: EvidenceItem) => void;
}

const EvidenceCard = memo(({ item, onDelete, onView }: EvidenceCardProps) => {
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
                <View style={styles.cardIcon}>
                    {item.type === 'photo' && item.content ? (
                        <Image
                            source={{ uri: getAbsoluteUri(item.content) || undefined }}
                            style={styles.thumbnail}
                            contentFit="cover"
                            transition={200}
                        />
                    ) : getIcon()}
                </View>
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
});

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.vault.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.vault.border,
    },
    cardIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: Colors.vault.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        overflow: 'hidden',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
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
});

EvidenceCard.displayName = 'EvidenceCard';
export default EvidenceCard;
