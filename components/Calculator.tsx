import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/app-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BUTTON_MARGIN = 10;
const BUTTON_SIZE = (SCREEN_WIDTH - BUTTON_MARGIN * 5) / 4;

type ButtonType = 'number' | 'operator' | 'function' | 'equals';

interface CalcButton {
  label: string;
  type: ButtonType;
  wide?: boolean;
  action: string;
}

const BUTTONS: CalcButton[][] = [
  [
    { label: 'AC', type: 'function', action: 'clear' },
    { label: '+/-', type: 'function', action: 'negate' },
    { label: '%', type: 'function', action: 'percent' },
    { label: '\u00F7', type: 'operator', action: '/' },
  ],
  [
    { label: '7', type: 'number', action: '7' },
    { label: '8', type: 'number', action: '8' },
    { label: '9', type: 'number', action: '9' },
    { label: '\u00D7', type: 'operator', action: '*' },
  ],
  [
    { label: '4', type: 'number', action: '4' },
    { label: '5', type: 'number', action: '5' },
    { label: '6', type: 'number', action: '6' },
    { label: '-', type: 'operator', action: '-' },
  ],
  [
    { label: '1', type: 'number', action: '1' },
    { label: '2', type: 'number', action: '2' },
    { label: '3', type: 'number', action: '3' },
    { label: '+', type: 'operator', action: '+' },
  ],
  [
    { label: '0', type: 'number', action: '0', wide: true },
    { label: '.', type: 'number', action: '.' },
    { label: '=', type: 'equals', action: '=' },
  ],
];

function CalcButtonComponent({
  button,
  onPress,
}: {
  button: CalcButton;
  onPress: (action: string) => void;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getBgColor = () => {
    switch (button.type) {
      case 'operator':
      case 'equals':
        return Colors.calculator.buttonOperator;
      case 'function':
        return Colors.calculator.buttonFunction;
      default:
        return Colors.calculator.buttonNumber;
    }
  };

  const getTextColor = () => {
    switch (button.type) {
      case 'function':
        return Colors.calculator.buttonFunctionText;
      default:
        return Colors.calculator.buttonNumberText;
    }
  };

  return (
    <Animated.View style={[animStyle, button.wide && { flex: 2 }]}>
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.92, { damping: 15 });
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15 });
        }}
        onPress={() => onPress(button.action)}
        style={[
          styles.button,
          {
            backgroundColor: getBgColor(),
            width: button.wide ? undefined : BUTTON_SIZE,
            height: BUTTON_SIZE,
          },
          button.wide && styles.wideButton,
        ]}
      >
        <Text
          style={[
            styles.buttonText,
            { color: getTextColor() },
            button.type === 'function' && styles.functionText,
          ]}
        >
          {button.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function Calculator() {
  const insets = useSafeAreaInsets();
  const { unlockVault } = useApp();
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [shouldResetDisplay, setShouldResetDisplay] = useState(false);
  const [pinBuffer, setPinBuffer] = useState('');
  const pinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayOpacity = useSharedValue(1);

  const displayAnimStyle = useAnimatedStyle(() => ({
    opacity: displayOpacity.value,
  }));

  const handleNumber = useCallback((num: string) => {
    setPinBuffer(prev => {
      const newBuffer = prev + num;
      if (pinTimeoutRef.current) clearTimeout(pinTimeoutRef.current);
      pinTimeoutRef.current = setTimeout(() => setPinBuffer(''), 5000);
      return newBuffer;
    });

    if (shouldResetDisplay) {
      setDisplay(num === '.' ? '0.' : num);
      setShouldResetDisplay(false);
    } else {
      if (num === '.' && display.includes('.')) return;
      if (display === '0' && num !== '.') {
        setDisplay(num);
      } else {
        setDisplay(prev => prev + num);
      }
    }
  }, [shouldResetDisplay, display]);

  const calculate = useCallback((a: number, op: string, b: number): number => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b !== 0 ? a / b : 0;
      default: return b;
    }
  }, []);

  const handleOperator = useCallback((op: string) => {
    const currentValue = parseFloat(display);

    if (previousValue !== null && operation && !shouldResetDisplay) {
      const result = calculate(previousValue, operation, currentValue);
      setDisplay(String(result));
      setPreviousValue(result);
    } else {
      setPreviousValue(currentValue);
    }

    setOperation(op);
    setShouldResetDisplay(true);
  }, [display, previousValue, operation, shouldResetDisplay, calculate]);

  const handleEquals = useCallback(async () => {
    const currentPinBuffer = pinBuffer;
    setPinBuffer('');

    if (currentPinBuffer.length >= 4) {
      const unlocked = await unlockVault(currentPinBuffer);
      if (unlocked) {
        setDisplay('0');
        setPreviousValue(null);
        setOperation(null);
        return;
      }
    }

    if (previousValue !== null && operation) {
      const currentValue = parseFloat(display);
      const result = calculate(previousValue, operation, currentValue);

      displayOpacity.value = withTiming(0.5, { duration: 50 }, () => {
        displayOpacity.value = withTiming(1, { duration: 150 });
      });

      const resultStr = String(result);
      if (resultStr.length > 12) {
        setDisplay(result.toExponential(6));
      } else {
        setDisplay(resultStr);
      }
      setPreviousValue(null);
      setOperation(null);
      setShouldResetDisplay(true);
    }
  }, [display, previousValue, operation, calculate, pinBuffer, unlockVault, displayOpacity]);

  const handleClear = useCallback(() => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setShouldResetDisplay(false);
    setPinBuffer('');
  }, []);

  const handleNegate = useCallback(() => {
    if (display !== '0') {
      setDisplay(prev => prev.startsWith('-') ? prev.slice(1) : '-' + prev);
    }
  }, [display]);

  const handlePercent = useCallback(() => {
    const value = parseFloat(display);
    setDisplay(String(value / 100));
  }, [display]);

  const handleButtonPress = useCallback((action: string) => {
    switch (action) {
      case 'clear':
        handleClear();
        break;
      case 'negate':
        handleNegate();
        break;
      case 'percent':
        handlePercent();
        break;
      case '=':
        handleEquals();
        break;
      case '+':
      case '-':
      case '*':
      case '/':
        handleOperator(action);
        break;
      default:
        handleNumber(action);
        break;
    }
  }, [handleClear, handleNegate, handlePercent, handleEquals, handleOperator, handleNumber]);

  const formatDisplay = (value: string) => {
    if (value.includes('e')) return value;
    const parts = value.split('.');
    const intPart = parts[0];
    const isNeg = intPart.startsWith('-');
    const absInt = isNeg ? intPart.slice(1) : intPart;
    const formatted = absInt.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const result = (isNeg ? '-' : '') + formatted;
    if (parts.length > 1) return result + '.' + parts[1];
    return result;
  };

  const displayFontSize = display.length > 8 ? (display.length > 12 ? 36 : 48) : 64;

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.displayContainer}>
        <Animated.Text
          style={[
            styles.displayText,
            { fontSize: displayFontSize },
            displayAnimStyle,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {formatDisplay(display)}
        </Animated.Text>
      </View>

      <View style={[styles.buttonsContainer, { paddingBottom: insets.bottom + webBottomInset + 8 }]}>
        {BUTTONS.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((button) => (
              <CalcButtonComponent
                key={button.label}
                button={button}
                onPress={handleButtonPress}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.calculator.background,
  },
  displayContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  displayText: {
    color: Colors.calculator.displayText,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
  },
  buttonsContainer: {
    paddingHorizontal: BUTTON_MARGIN / 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: BUTTON_MARGIN,
    marginBottom: BUTTON_MARGIN,
  },
  button: {
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wideButton: {
    flex: 2,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'flex-start',
    paddingLeft: BUTTON_SIZE * 0.36,
  },
  buttonText: {
    fontSize: 32,
    fontWeight: '400',
  },
  functionText: {
    fontSize: 26,
  },
});
