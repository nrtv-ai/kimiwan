import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export type HapticFeedbackType = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

/**
 * Trigger haptic feedback based on the platform
 */
export async function touchFeedback(type: HapticFeedbackType = 'light'): Promise<void> {
  if (Platform.OS === 'ios') {
    switch (type) {
      case 'light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
    }
  } else if (Platform.OS === 'android') {
    // Android uses different haptic API
    switch (type) {
      case 'light':
      case 'medium':
      case 'heavy':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'error':
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  }
}

/**
 * Haptic feedback for game events
 */
export const gameHaptics = {
  perfect: () => touchFeedback('light'),
  good: () => touchFeedback('medium'),
  miss: () => touchFeedback('error'),
  combo: (combo: number) => {
    if (combo % 50 === 0) return touchFeedback('success');
    if (combo % 10 === 0) return touchFeedback('medium');
    return touchFeedback('light');
  },
  gameOver: () => touchFeedback('error'),
  gameStart: () => touchFeedback('success'),
};
