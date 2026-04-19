// tutorial/TutorialContext.tsx — global tutorial state, ref measurement, navigation
import React, {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TUTORIAL_STEPS, TutorialStep } from './steps';
import { useAppStore } from '../store/app.store';

const STORAGE_KEY = '@tileviz_tutorial_done_v2';

export interface SpotlightRect {
  x: number; y: number; width: number; height: number;
}

interface TutorialCtx {
  active:         boolean;
  step:           TutorialStep | null;
  stepIndex:      number;
  totalSteps:     number;
  spotlightRect:  SpotlightRect | null;
  registerTarget: (key: string, ref: React.RefObject<any>) => void;
  unregisterTarget: (key: string) => void;
  completeStep:   (key: string) => void;   // called by element when tapped
  skip:           () => void;
  startTutorial:  () => void;
}

const Ctx = createContext<TutorialCtx>({} as TutorialCtx);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive]         = useState(false);
  const [stepIndex, setStepIndex]   = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const refs = useRef<Map<string, React.RefObject<any>>>(new Map());
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const measureTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { setActivePage, setRoomType, setDimensions } = useAppStore();

  const totalSteps = TUTORIAL_STEPS.length;
  const step: TutorialStep | null =
    active && stepIndex < totalSteps ? TUTORIAL_STEPS[stepIndex] : null;

  // ── Check if tutorial was already seen ───────────────────────
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val === null) {
        // First launch — start after short delay so app is ready
        setTimeout(() => setActive(true), 2000);
      }
    }).catch(() => {});
  }, []);

  // ── When step changes: navigate + measure target ──────────────
  useEffect(() => {
    if (!active || !step) return;

    // Clear any running timers
    if (autoTimer.current)    clearTimeout(autoTimer.current);
    if (measureTimer.current) clearTimeout(measureTimer.current);
    setSpotlightRect(null);

    // On first step, set default bathroom design
    if (stepIndex === 0) {
      setRoomType('bathroom' as any);
      setDimensions({ width: 10, length: 8, height: 10 });
    }

    // Navigate to required screen
    if (step.screen) setActivePage(step.screen as any);

    // Measure after navigation + layout settles
    measureTimer.current = setTimeout(() => {
      measureTarget(step.key);
    }, 500);

    // Auto-advance steps (welcome card)
    if (step.autoAdvance) {
      autoTimer.current = setTimeout(() => {
        advance();
      }, step.autoAdvance);
    }
  }, [active, stepIndex]);

  function measureTarget(key: string) {
    const ref = refs.current.get(key);
    if (!ref?.current) return;

    if (Platform.OS === 'web') {
      // Web: use getBoundingClientRect
      try {
        const node = (ref.current as any)?._nativeTag
          ? undefined
          : (ref.current as unknown as HTMLElement);
        if (node && node.getBoundingClientRect) {
          const r = node.getBoundingClientRect();
          setSpotlightRect({ x: r.left, y: r.top, width: r.width, height: r.height });
          return;
        }
      } catch {}
    }

    // Native: measureInWindow
    if (typeof ref.current.measureInWindow === 'function') {
      ref.current.measureInWindow((x: number, y: number, w: number, h: number) => {
        if (w > 0 && h > 0) setSpotlightRect({ x, y, width: w, height: h });
      });
    }
  }

  function advance() {
    setStepIndex(i => {
      const next = i + 1;
      if (next >= totalSteps) {
        // Tutorial finished
        setActive(false);
        setSpotlightRect(null);
        AsyncStorage.setItem(STORAGE_KEY, '1').catch(() => {});
        return i;
      }
      return next;
    });
  }

  const registerTarget = useCallback((key: string, ref: React.RefObject<any>) => {
    refs.current.set(key, ref);
    // If this key is the current step's target, measure immediately
    if (active && step?.key === key) {
      setTimeout(() => measureTarget(key), 200);
    }
  }, [active, step]);

  const unregisterTarget = useCallback((key: string) => {
    refs.current.delete(key);
  }, []);

  const completeStep = useCallback((key: string) => {
    if (!active || !step) return;
    if (step.key === key) advance();
  }, [active, step]);

  const skip = useCallback(() => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    setActive(false);
    setSpotlightRect(null);
    AsyncStorage.setItem(STORAGE_KEY, '1').catch(() => {});
  }, []);

  const startTutorial = useCallback(() => {
    setStepIndex(0);
    setActive(true);
  }, []);

  // Cleanup
  useEffect(() => () => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    if (measureTimer.current) clearTimeout(measureTimer.current);
  }, []);

  return (
    <Ctx.Provider value={{
      active, step, stepIndex, totalSteps, spotlightRect,
      registerTarget, unregisterTarget, completeStep, skip, startTutorial,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useTutorial = () => useContext(Ctx);

// ── Hook for elements to register themselves as tutorial targets ──
export function useTutorialTarget(key: string) {
  const { registerTarget, unregisterTarget, completeStep, active, step } = useTutorial();
  const ref = useRef<any>(null);

  useEffect(() => {
    registerTarget(key, ref);
    return () => unregisterTarget(key);
  }, [key]);

  const isCurrentTarget = active && step?.key === key;

  const onTutorialPress = useCallback(() => {
    completeStep(key);
  }, [key, completeStep]);

  return { ref, isCurrentTarget, onTutorialPress };
}
