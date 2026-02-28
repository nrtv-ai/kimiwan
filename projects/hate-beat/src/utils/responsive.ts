import { Dimensions, Platform, StatusBar } from 'react-native';

const { width, height } = Dimensions.get('window');

// Responsive sizing helpers
export const SCREEN_WIDTH = width;
export const SCREEN_HEIGHT = height;
export const IS_IOS = Platform.OS === 'ios';
export const IS_ANDROID = Platform.OS === 'android';
export const STATUS_BAR_HEIGHT = StatusBar.currentHeight || (IS_IOS ? 44 : 0);

// Scale factors for different screen sizes
const BASE_WIDTH = 375; // iPhone 8 width as base
const BASE_HEIGHT = 812; // iPhone X height as base

export const scaleWidth = (size: number) => (width / BASE_WIDTH) * size;
export const scaleHeight = (size: number) => (height / BASE_HEIGHT) * size;

// Touch target sizes (minimum 44x44 for accessibility)
export const TOUCH_TARGET_MIN = 44;
export const TOUCH_TARGET_LARGE = 60;

// Game-specific responsive values
export const RESPONSIVE = {
  // Lane button sizes based on screen width
  laneButtonHeight: Math.max(80, height * 0.12),
  laneButtonWidth: width / 4,
  
  // Note sizing
  noteSize: Math.min(70, (width / 4) * 0.7),
  
  // Hit line position
  hitLineY: height * 0.72,
  
  // Safe area padding
  safeTop: STATUS_BAR_HEIGHT + (IS_IOS ? 10 : 20),
  safeBottom: IS_IOS ? 34 : 20,
  
  // Font sizes
  titleSize: Math.min(48, width * 0.12),
  subtitleSize: Math.min(16, width * 0.04),
  scoreSize: Math.min(32, width * 0.08),
  comboSize: Math.min(48, width * 0.12),
  feedbackSize: Math.min(36, width * 0.09),
};

// Haptic feedback availability
export const HAPTICS_AVAILABLE = IS_IOS || (IS_ANDROID && Number(Platform.Version) >= 26);

// Screen size categories
export const isSmallScreen = width < 350;
export const isLargeScreen = width > 414;
export const isTablet = width > 600;
