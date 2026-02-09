// Made by Dhairya Singh Dhaila
import React, { useState, memo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Pressable,
    TextInput,
    Modal,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/colors';

interface NoteModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (title: string, content: string, tags: string[]) => void;
}

const NoteModal = memo(({ visible, onClose, onSave }: NoteModalProps) => {
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
});

const styles = StyleSheet.create({
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
});

NoteModal.displayName = 'NoteModal';
export default NoteModal;
