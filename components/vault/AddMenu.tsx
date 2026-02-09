// Made by Dhairya Singh Dhaila
import React, { memo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Pressable,
    Modal,
    Dimensions,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeOut,
} from 'react-native-reanimated';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { EvidenceType } from '@/lib/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AddMenuProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (type: EvidenceType) => void;
}

const AddMenu = memo(({ visible, onClose, onSelect }: AddMenuProps) => {
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
});

const styles = StyleSheet.create({
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
});

AddMenu.displayName = 'AddMenu';
export default AddMenu;
