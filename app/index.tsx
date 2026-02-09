// Made by Dhairya Singh Dhaila
import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useApp } from '@/lib/app-context';
import Calculator from '@/components/Calculator';
import PinSetup from '@/components/PinSetup';
import EvidenceVault from '@/components/EvidenceVault';
import Colors from '@/constants/colors';

export default function HomeScreen() {
  const { mode, isLoading } = useApp();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.vault.accent} />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {mode === 'setup' && <PinSetup />}
      {mode === 'calculator' && <Calculator />}
      {mode === 'vault' && <EvidenceVault />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loading: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
