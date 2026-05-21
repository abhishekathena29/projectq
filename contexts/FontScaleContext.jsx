import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const STORAGE_KEY = '@mydaypal/fontScaleMultiplier';
export const FONT_SCALE_MIN = 0.8;
export const FONT_SCALE_MAX = 1.5;
const STEP = 0.1;

const FontScaleContext = createContext({
  scale: 1,
  increase: () => {},
  decrease: () => {},
  canIncrease: true,
  canDecrease: true,
});

export function FontScaleProvider({ children }) {
  const [scale, setScale] = useState(1);

  React.useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem(STORAGE_KEY);
        if (v != null) {
          const n = parseFloat(v);
          if (!Number.isNaN(n)) {
            const clamped = Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, n));
            setScale(clamped);
          }
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const persist = useCallback((next) => {
    AsyncStorage.setItem(STORAGE_KEY, String(next)).catch(() => {});
  }, []);

  const increase = useCallback(() => {
    setScale((s) => {
      const next = Math.min(FONT_SCALE_MAX, Math.round((s + STEP) * 10) / 10);
      if (next !== s) persist(next);
      return next;
    });
  }, [persist]);

  const decrease = useCallback(() => {
    setScale((s) => {
      const next = Math.max(FONT_SCALE_MIN, Math.round((s - STEP) * 10) / 10);
      if (next !== s) persist(next);
      return next;
    });
  }, [persist]);

  const value = useMemo(
    () => ({
      scale,
      increase,
      decrease,
      canIncrease: scale < FONT_SCALE_MAX - 0.001,
      canDecrease: scale > FONT_SCALE_MIN + 0.001,
    }),
    [scale, increase, decrease]
  );

  return <FontScaleContext.Provider value={value}>{children}</FontScaleContext.Provider>;
}

export function useFontScale() {
  return useContext(FontScaleContext);
}
