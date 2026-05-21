import React, { forwardRef, useMemo } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { useFontScale } from '@/contexts/FontScaleContext';

function scaleTextStyle(style: TextProps['style'], scale: number) {
  if (style == null) return style;
  const flat = StyleSheet.flatten(style);
  if (!flat || typeof flat !== 'object') return style;
  const next: Record<string, unknown> = { ...flat };
  if (typeof next.fontSize === 'number') {
    next.fontSize = Math.round(next.fontSize * scale * 10) / 10;
  }
  if (typeof next.lineHeight === 'number') {
    next.lineHeight = Math.round(next.lineHeight * scale * 10) / 10;
  }
  return next;
}

export const ScaledText = forwardRef<Text, TextProps>(({ style, ...props }, ref) => {
  const { scale } = useFontScale();
  const scaledStyle = useMemo(() => scaleTextStyle(style, scale), [style, scale]);
  return <Text ref={ref} style={scaledStyle} {...props} />;
});

ScaledText.displayName = 'ScaledText';
