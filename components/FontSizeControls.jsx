import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFontScale } from '@/contexts/FontScaleContext';

export function FontSizeControls() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { scale, increase, decrease, canIncrease, canDecrease } = useFontScale();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colorScheme === 'dark' ? 'rgba(40,40,42,0.92)' : 'rgba(255,255,255,0.95)',
            borderColor: colorScheme === 'dark' ? '#3a3a3c' : '#e5e5ea',
          },
        ]}
      >
        <Pressable
          onPress={decrease}
          disabled={!canDecrease}
          style={({ pressed }) => [
            styles.btn,
            !canDecrease && styles.btnDisabled,
            pressed && canDecrease && styles.btnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Decrease text size"
        >
          <Text style={[styles.btnSymbol, { color: palette.text }]}>−</Text>
        </Pressable>
        <Text style={[styles.percent, { color: palette.icon }]}>
          {Math.round(scale * 100)}%
        </Text>
        <Pressable
          onPress={increase}
          disabled={!canIncrease}
          style={({ pressed }) => [
            styles.btn,
            !canIncrease && styles.btnDisabled,
            pressed && canIncrease && styles.btnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Increase text size"
        >
          <Text style={[styles.btnSymbol, { color: palette.text }]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 12,
    bottom: 0,
    zIndex: 9999,
    elevation: Platform.OS === 'android' ? 8 : 0,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnPressed: {
    opacity: 0.7,
  },
  btnDisabled: {
    opacity: 0.35,
  },
  btnSymbol: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 26,
  },
  percent: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
  },
});
