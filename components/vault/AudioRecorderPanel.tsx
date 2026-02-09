// Made by Dhairya Singh Dhaila
import React, { useState, useEffect, memo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Pressable,
    Alert,
    Platform,
    Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
    useAudioRecorder,
    useAudioRecorderState,
    RecordingPresets,
    AudioModule,
} from 'expo-audio';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
    withSequence,
} from 'react-native-reanimated';
import { Feather, Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { formatDuration } from '@/lib/forensics';

interface AudioRecorderPanelProps {
    visible: boolean;
    onClose: () => void;
    onSave: (uri: string, durationMs: number) => void;
    setIsCapturingMedia: (capturing: boolean) => void;
}

const AudioRecorderPanel = memo(({ visible, onClose, onSave, setIsCapturingMedia }: AudioRecorderPanelProps) => {
    const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const recorderState = useAudioRecorderState(audioRecorder, 200);
    const [hasPermission, setHasPermission] = useState(false);

    const pulseScale = useSharedValue(1);
    const pulseOpacity = useSharedValue(0.6);

    const isActive = recorderState.isRecording;
    const durationMs = recorderState.durationMillis || 0;

    useEffect(() => {
        if (visible) {
            setIsCapturingMedia(true);
            (async () => {
                const status = await AudioModule.requestRecordingPermissionsAsync();
                setHasPermission(status.granted);
                if (!status.granted) {
                    Alert.alert('Permission Required', 'Microphone access is needed to record audio evidence.');
                }
            })();
        } else {
            setIsCapturingMedia(false);
        }
    }, [visible, setIsCapturingMedia]);

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
    }, [isActive, pulseOpacity, pulseScale]);

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
            } catch { }
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
});

const styles = StyleSheet.create({
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
});

AudioRecorderPanel.displayName = 'AudioRecorderPanel';
export default AudioRecorderPanel;
