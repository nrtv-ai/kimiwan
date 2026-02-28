import { HapticFeedbackType, touchFeedback } from './haptics';

/**
 * Mobile-optimized touch handler with haptic feedback
 */
export class TouchHandler {
  private lastTapTime: number = 0;
  private readonly DEBOUNCE_MS = 50;

  /**
   * Handle a lane tap with debouncing and haptic feedback
   */
  async handleLaneTap(
    lane: number,
    onTap: (lane: number) => void,
    hapticType: HapticFeedbackType = 'light'
  ): Promise<void> {
    const now = Date.now();
    
    // Debounce rapid taps
    if (now - this.lastTapTime < this.DEBOUNCE_MS) {
      return;
    }
    this.lastTapTime = now;

    // Trigger haptic feedback
    await touchFeedback(hapticType);
    
    // Execute the tap handler
    onTap(lane);
  }

  /**
   * Check if touch is within a lane's bounds
   */
  isTouchInLane(touchX: number, laneWidth: number, lane: number): boolean {
    const laneStart = lane * laneWidth;
    const laneEnd = laneStart + laneWidth;
    return touchX >= laneStart && touchX < laneEnd;
  }
}

// Singleton instance
export const touchHandler = new TouchHandler();

/**
 * Multi-touch state tracker for handling simultaneous lane presses
 */
export class MultiTouchTracker {
  private activeTouches: Map<number, number> = new Map(); // touchId -> lane

  trackTouchStart(touchId: number, lane: number): void {
    this.activeTouches.set(touchId, lane);
  }

  trackTouchEnd(touchId: number): number | null {
    const lane = this.activeTouches.get(touchId);
    this.activeTouches.delete(touchId);
    return lane ?? null;
  }

  getActiveLanes(): number[] {
    return Array.from(this.activeTouches.values());
  }

  isLaneActive(lane: number): boolean {
    return Array.from(this.activeTouches.values()).includes(lane);
  }

  clear(): void {
    this.activeTouches.clear();
  }
}

// Singleton instance
export const multiTouchTracker = new MultiTouchTracker();
