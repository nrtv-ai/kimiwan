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
            // Handle back button - will be processed by the game's togglePause function
            if (typeof togglePause === 'function' && gameState.isPlaying) {
                togglePause();
            } else if (typeof history !== 'undefined' && history.length > 1) {
                history.back();
            }
        });
        
        App.addListener('appStateChange', (state) => {
            if (!state.isActive && gameState.isPlaying && !gameState.isPaused) {
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