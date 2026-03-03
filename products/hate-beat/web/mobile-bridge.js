/**
 * Hate Beat - Mobile Bridge
 * Handles Capacitor native plugin integration for enhanced mobile features
 */

// Wait for Capacitor to be ready
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof window.Capacitor !== 'undefined') {
        await initMobileFeatures();
    }
});

async function initMobileFeatures() {
    const { Capacitor } = window;
    
    // Initialize StatusBar
    if (Capacitor.Plugins.StatusBar) {
        const { StatusBar } = Capacitor.Plugins;
        await StatusBar.setStyle({ style: 'DARK' });
        await StatusBar.setBackgroundColor({ color: '#1a1a2e' });
        await StatusBar.hide();
    }
    
    // Initialize Keyboard
    if (Capacitor.Plugins.Keyboard) {
        const { Keyboard } = Capacitor.Plugins;
        await Keyboard.setStyle({ style: 'dark' });
        
        // Handle keyboard show/hide for layout adjustments
        Keyboard.addListener('keyboardWillShow', (info) => {
            document.body.classList.add('keyboard-open');
        });
        
        Keyboard.addListener('keyboardWillHide', () => {
            document.body.classList.remove('keyboard-open');
        });
    }
    
    // Initialize App plugin for lifecycle events
    if (Capacitor.Plugins.App) {
        const { App } = Capacitor.Plugins;
        
        App.addListener('backButton', () => {
            // Use a single back-button handler from the web app for consistency.
            const handled = (typeof window.handleBackButton === 'function')
                ? window.handleBackButton()
                : false;
            if (!handled && typeof history !== 'undefined' && history.length > 1) {
                history.back();
            }
        });
        
        App.addListener('appStateChange', (state) => {
            const currentGameState = (typeof gameState !== 'undefined') ? gameState : null;
            if (!currentGameState) return;
            if (!state.isActive && currentGameState.isPlaying && !currentGameState.isPaused) {
                // App went to background - pause the game
                if (typeof togglePause === 'function') {
                    togglePause();
                }
            }
        });
    }
    
    console.log('Mobile features initialized');
}

// Enhanced haptic feedback using Capacitor Haptics
async function triggerHaptic(type = 'light') {
    if (typeof window.Capacitor !== 'undefined' && window.Capacitor.Plugins.Haptics) {
        const { Haptics } = window.Capacitor.Plugins;
        const hapticTypes = {
            light: 'light',
            medium: 'medium',
            heavy: 'heavy',
            success: 'success',
            error: 'error'
        };
        
        try {
            if (type === 'success' || type === 'error') {
                await Haptics.notification({ type: hapticTypes[type] });
            } else {
                await Haptics.impact({ style: hapticTypes[type] || 'light' });
            }
        } catch (e) {
            // Fallback to vibration API
            if (window.navigator && window.navigator.vibrate) {
                const patterns = {
                    light: 10,
                    medium: 20,
                    heavy: 30,
                    success: [10, 50, 10],
                    error: [30, 30, 30]
                };
                window.navigator.vibrate(patterns[type] || 10);
            }
        }
    } else {
        // Fallback to vibration API
        if (window.navigator && window.navigator.vibrate) {
            const patterns = {
                light: 10,
                medium: 20,
                heavy: 30,
                success: [10, 50, 10],
                error: [30, 30, 30]
            };
            window.navigator.vibrate(patterns[type] || 10);
        }
    }
}

// Enhanced storage using Capacitor Preferences
const NativeStorage = {
    async get(key) {
        if (typeof window.Capacitor !== 'undefined' && window.Capacitor.Plugins.Preferences) {
            const { Preferences } = window.Capacitor.Plugins;
            const result = await Preferences.get({ key });
            return result.value ? JSON.parse(result.value) : null;
        }
        // Fallback to localStorage
        try {
            return JSON.parse(localStorage.getItem(key));
        } catch (e) {
            return null;
        }
    },
    
    async set(key, value) {
        if (typeof window.Capacitor !== 'undefined' && window.Capacitor.Plugins.Preferences) {
            const { Preferences } = window.Capacitor.Plugins;
            await Preferences.set({ key, value: JSON.stringify(value) });
            return;
        }
        // Fallback to localStorage
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {}
    },
    
    async remove(key) {
        if (typeof window.Capacitor !== 'undefined' && window.Capacitor.Plugins.Preferences) {
            const { Preferences } = window.Capacitor.Plugins;
            await Preferences.remove({ key });
            return;
        }
        // Fallback to localStorage
        localStorage.removeItem(key);
    }
};

// Export for use in main game
window.NativeStorage = NativeStorage;
window.triggerHaptic = triggerHaptic;

// ============================================
// SHAKE TO VENT FEATURE
// ============================================

const ShakeDetector = {
    isAvailable: false,
    threshold: 15, // Acceleration threshold for shake detection
    cooldownMs: 500,
    lastShakeTime: 0,
    shakeCount: 0,
    ventThreshold: 3, // Number of shakes to trigger vent
    isVented: false,
    onVentCallback: null,
    
    async init() {
        // Check if DeviceMotion is available
        if (typeof window.DeviceMotionEvent !== 'undefined') {
            // Request permission on iOS 13+
            if (typeof window.DeviceMotionEvent.requestPermission === 'function') {
                try {
                    const permission = await window.DeviceMotionEvent.requestPermission();
                    if (permission === 'granted') {
                        this.isAvailable = true;
                    }
                } catch (e) {
                    console.log('DeviceMotion permission denied');
                }
            } else {
                this.isAvailable = true;
            }
        }
        
        if (this.isAvailable) {
            window.addEventListener('devicemotion', this.handleMotion.bind(this));
            console.log('Shake detector initialized');
        }
        
        return this.isAvailable;
    },
    
    handleMotion(event) {
        if (!this.isAvailable || this.isVented) return;
        
        const acceleration = event.accelerationIncludingGravity;
        if (!acceleration) return;
        
        // Calculate total acceleration magnitude
        const magnitude = Math.sqrt(
            acceleration.x * acceleration.x +
            acceleration.y * acceleration.y +
            acceleration.z * acceleration.z
        );
        
        const now = Date.now();
        const timeSinceLastShake = now - this.lastShakeTime;
        
        // Detect shake when magnitude exceeds threshold
        if (magnitude > this.threshold && timeSinceLastShake > this.cooldownMs) {
            this.shakeCount++;
            this.lastShakeTime = now;
            
            // Trigger haptic feedback
            triggerHaptic('heavy');
            
            // Update UI if callback exists
            if (this.onShakeCallback) {
                this.onShakeCallback(this.shakeCount, this.ventThreshold);
            }
            
            // Check if vent threshold reached
            if (this.shakeCount >= this.ventThreshold) {
                this.triggerVent();
            }
        }
    },
    
    triggerVent() {
        this.isVented = true;
        
        // Special vent haptic pattern
        triggerHaptic('success');
        setTimeout(() => triggerHaptic('heavy'), 100);
        setTimeout(() => triggerHaptic('success'), 200);
        
        // Call the vent callback
        if (this.onVentCallback) {
            this.onVentCallback();
        }
        
        // Reset after delay
        setTimeout(() => {
            this.reset();
        }, 2000);
    },
    
    reset() {
        this.shakeCount = 0;
        this.isVented = false;
    },
    
    onShake(callback) {
        this.onShakeCallback = callback;
    },
    
    onVent(callback) {
        this.onVentCallback = callback;
    },
    
    getProgress() {
        return Math.min(this.shakeCount / this.ventThreshold, 1);
    },
    
    getShakesNeeded() {
        return Math.max(0, this.ventThreshold - this.shakeCount);
    }
};

// Initialize shake detector when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    await ShakeDetector.init();
});

// Export for use in main game
window.ShakeDetector = ShakeDetector;
