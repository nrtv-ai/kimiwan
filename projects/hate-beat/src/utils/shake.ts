import { useEffect, useRef, useCallback, useState } from 'react';
import { Accelerometer } from 'expo-sensors';
import { gameHaptics } from './haptics';

export interface ShakeConfig {
  threshold?: number;
  cooldownMs?: number;
  minShakes?: number;
}

export interface ShakeState {
  isShaking: boolean;
  shakeCount: number;
  lastShakeTime: number;
}

/**
 * Hook for detecting shake gestures using accelerometer
 * @param onShake - Callback when shake is detected
 * @param config - Configuration options
 * @returns Shake state and control functions
 */
export function useShakeDetector(
  onShake: (intensity: number) => void,
  config: ShakeConfig = {}
) {
  const { threshold = 1.5, cooldownMs = 500, minShakes = 1 } = config;
  
  const [isAvailable, setIsAvailable] = useState(false);
  const [shakeState, setShakeState] = useState<ShakeState>({
    isShaking: false,
    shakeCount: 0,
    lastShakeTime: 0,
  });
  
  const shakeCountRef = useRef(0);
  const lastShakeTimeRef = useRef(0);
  const isShakingRef = useRef(false);
  const subscriptionRef = useRef<any>(null);

  // Check if accelerometer is available
  useEffect(() => {
    let isMounted = true;
    
    const checkAvailability = async () => {
      const available = await Accelerometer.isAvailableAsync();
      if (isMounted) {
        setIsAvailable(available);
      }
    };
    
    checkAvailability();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Subscribe to accelerometer data
  const subscribe = useCallback(() => {
    if (!isAvailable) return;
    
    // Set update interval to 100ms for responsive shake detection
    Accelerometer.setUpdateInterval(100);
    
    subscriptionRef.current = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      
      // Detect shake when magnitude exceeds threshold
      if (magnitude > threshold) {
        const timeSinceLastShake = now - lastShakeTimeRef.current;
        
        // Enforce cooldown between shakes
        if (timeSinceLastShake > cooldownMs) {
          shakeCountRef.current += 1;
          lastShakeTimeRef.current = now;
          isShakingRef.current = true;
          
          setShakeState({
            isShaking: true,
            shakeCount: shakeCountRef.current,
            lastShakeTime: now,
          });
          
          // Trigger haptic feedback
          gameHaptics.shake();
          
          // Call the shake handler with intensity
          const intensity = Math.min(magnitude / threshold, 3);
          onShake(intensity);
          
          // Reset shaking state after cooldown
          setTimeout(() => {
            isShakingRef.current = false;
            setShakeState(prev => ({ ...prev, isShaking: false }));
          }, cooldownMs);
        }
      }
    });
  }, [isAvailable, threshold, cooldownMs, onShake]);

  // Unsubscribe from accelerometer
  const unsubscribe = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
  }, []);

  // Reset shake count
  const resetShakeCount = useCallback(() => {
    shakeCountRef.current = 0;
    setShakeState(prev => ({ ...prev, shakeCount: 0 }));
  }, []);

  // Auto-subscribe when available
  useEffect(() => {
    if (isAvailable) {
      subscribe();
    }
    
    return () => {
      unsubscribe();
    };
  }, [isAvailable, subscribe, unsubscribe]);

  return {
    isAvailable,
    shakeState,
    subscribe,
    unsubscribe,
    resetShakeCount,
  };
}

/**
 * Hook for "Shake to Vent" game mechanic
 * @param onVent - Callback when vent is triggered (after sufficient shakes)
 * @param ventThreshold - Number of shakes needed to trigger vent
 * @returns Vent state and progress
 */
export function useShakeToVent(
  onVent: () => void,
  ventThreshold: number = 3
) {
  const [ventProgress, setVentProgress] = useState(0);
  const [isVented, setIsVented] = useState(false);
  const shakeCountRef = useRef(0);

  const handleShake = useCallback((intensity: number) => {
    if (isVented) return;
    
    shakeCountRef.current += 1;
    const progress = Math.min(shakeCountRef.current / ventThreshold, 1);
    setVentProgress(progress);
    
    if (shakeCountRef.current >= ventThreshold) {
      setIsVented(true);
      gameHaptics.vent();
      onVent();
      
      // Reset after a delay
      setTimeout(() => {
        shakeCountRef.current = 0;
        setVentProgress(0);
        setIsVented(false);
      }, 2000);
    }
  }, [isVented, ventThreshold, onVent]);

  const { isAvailable, shakeState } = useShakeDetector(handleShake, {
    threshold: 1.8,
    cooldownMs: 400,
  });

  return {
    isAvailable,
    shakeState,
    ventProgress,
    isVented,
    shakesNeeded: Math.max(0, ventThreshold - shakeCountRef.current),
  };
}
