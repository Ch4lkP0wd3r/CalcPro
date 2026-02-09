// Made by Dhairya Singh Dhaila
import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/app-context';

type SetupStep = 'secret' | 'confirm_secret' | 'decoy' | 'confirm_decoy';

const PIN_LENGTH = 4;

function PinDot({ filled }: { filled: boolean }) {
  const scale = useSharedValue(filled ? 1 : 0.6);

  React.useEffect(() => {
    scale.value = withSpring(filled ? 1 : 0.6, { damping: 12 });
  }, [filled, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: filled ? Colors.pin.dotFilled : Colors.pin.dot,
  }));

  return <Animated.View style={[styles.dot, animStyle]} />;
}

function NumKey({ label, onPress }: { label: string; onPress: (key: string) => void }) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.88, { damping: 15 });
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15 });
        }}
        onPress={() => onPress(label)}
        style={styles.numKey}
      >
        <Text style={styles.numKeyText}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function PinSetup() {
  const insets = useSafeAreaInsets();
  const { setupPins } = useApp();
  const [step, setStep] = useState<SetupStep>('secret');
  const [pin, setPin] = useState('');
  const [secretPin, setSecretPin] = useState('');
  const [decoyPin, setDecoyPin] = useState('');
  const [error, setError] = useState('');

  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const shake = useCallback(() => {
    shakeX.value = withSequence(
      withTiming(-12, { duration: 50 }),
      withTiming(12, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [shakeX]);

  const getTitle = () => {
    switch (step) {
      case 'secret': return 'Set Secret PIN';
      case 'confirm_secret': return 'Confirm Secret PIN';
      case 'decoy': return 'Set Decoy PIN';
      case 'confirm_decoy': return 'Confirm Decoy PIN';
    }
  };

  const getSubtitle = () => {
    switch (step) {
      case 'secret': return 'This PIN unlocks the hidden vault';
      case 'confirm_secret': return 'Enter the same PIN again';
      case 'decoy': return 'This PIN shows fake calculator results';
      case 'confirm_decoy': return 'Enter the decoy PIN again';
    }
  };

  const handleKeyPress = useCallback(async (key: string) => {
    setError('');
    if (key === 'delete') {
      setPin(prev => prev.slice(0, -1));
      return;
    }

    const newPin = pin + key;
    if (newPin.length > PIN_LENGTH) return;

    setPin(newPin);

    if (newPin.length === PIN_LENGTH) {
      setTimeout(async () => {
        switch (step) {
          case 'secret':
            setSecretPin(newPin);
            setPin('');
            setStep('confirm_secret');
            break;
          case 'confirm_secret':
            if (newPin === secretPin) {
              setPin('');
              setStep('decoy');
            } else {
              shake();
              setPin('');
              setError('PINs do not match');
              setStep('secret');
              setSecretPin('');
            }
            break;
          case 'decoy':
            if (newPin === secretPin) {
              shake();
              setPin('');
              setError('Must differ from secret PIN');
              return;
            }
            setDecoyPin(newPin);
            setPin('');
            setStep('confirm_decoy');
            break;
          case 'confirm_decoy':
            if (newPin === decoyPin) {
              await setupPins(secretPin, newPin);
            } else {
              shake();
              setPin('');
              setError('PINs do not match');
              setStep('decoy');
              setDecoyPin('');
            }
            break;
        }
      }, 200);
    }
  }, [pin, step, secretPin, decoyPin, shake, setupPins]);

  const stepNumber = step === 'secret' || step === 'confirm_secret' ? 1 : 2;
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset + 40 }]}>
      <View style={styles.header}>
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, stepNumber >= 1 && styles.stepDotActive]} />
          <View style={[styles.stepLine, stepNumber >= 2 && styles.stepLineActive]} />
          <View style={[styles.stepDot, stepNumber >= 2 && styles.stepDotActive]} />
        </View>
        <Text style={styles.title}>{getTitle()}</Text>
        <Text style={styles.subtitle}>{getSubtitle()}</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <Animated.View style={[styles.dotsContainer, shakeStyle]}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <PinDot key={i} filled={i < pin.length} />
        ))}
      </Animated.View>

      <View style={[styles.keypad, { paddingBottom: insets.bottom + webBottomInset + 20 }]}>
        {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', 'delete']].map(
          (row, ri) => (
            <View key={ri} style={styles.keyRow}>
              {row.map((key, ki) =>
                key === '' ? (
                  <View key={ki} style={styles.numKey} />
                ) : key === 'delete' ? (
                  <Pressable
                    key={ki}
                    onPress={() => handleKeyPress('delete')}
                    style={styles.numKey}
                  >
                    <Feather name="delete" size={24} color={Colors.pin.textSecondary} />
                  </Pressable>
                ) : (
                  <NumKey key={ki} label={key} onPress={handleKeyPress} />
                ),
              )}
            </View>
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.pin.background,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 40,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.pin.dot,
  },
  stepDotActive: {
    backgroundColor: Colors.pin.accent,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: Colors.pin.dot,
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: Colors.pin.accent,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.pin.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.pin.textSecondary,
  },
  errorText: {
    fontSize: 13,
    color: '#FF4757',
    marginTop: 4,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 50,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  keypad: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
    maxWidth: 300,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  numKey: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.pin.keyBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numKeyText: {
    fontSize: 28,
    fontWeight: '400',
    color: Colors.pin.keyText,
  },
});
