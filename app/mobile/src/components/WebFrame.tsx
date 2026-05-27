import React from 'react';
import { Platform, View, StyleSheet, useWindowDimensions, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export function WebFrame({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  if (Platform.OS !== 'web' || width <= 600) return <>{children}</>;
  return (
    <View style={styles.outer}>
      <LinearGradient
        colors={['#0a0707', '#1a0f0a', '#0a0707']}
        style={styles.gradient}
      >
        <View style={styles.inner}>{children}</View>
        <Text style={styles.hint}>Melhor experiência no app mobile (iOS / Android)</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  gradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  inner: {
    width: 560,
    height: '100%',
    maxHeight: 920,
    backgroundColor: '#000',
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 12 },
  },
  hint: {
    position: 'absolute',
    bottom: 20,
    color: '#8a7a6a',
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
