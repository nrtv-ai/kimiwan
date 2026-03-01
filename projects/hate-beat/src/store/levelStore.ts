import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface Level {
  id: number;
  name: string;
  requiredXP: number;
  unlockedSongs: string[];
  unlockedFeatures: string[];
  difficultyMultiplier: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: 'score' | 'combo' | 'accuracy' | 'songs' | 'perfect';
  threshold: number;
  reward: number;
  unlocked: boolean;
  unlockedAt?: number;
}

export interface PlayerStats {
  totalScore: number;
  totalGamesPlayed: number;
  totalNotesHit: number;
  totalPerfectHits: number;
  totalGoodHits: number;
  totalMisses: number;
  highestCombo: number;
  bestAccuracy: number;
  songsCompleted: string[];
  favoriteSong?: string;
}

export interface LevelState {
  // Player progression
  level: number;
  xp: number;
  totalXP: number;
  
  // Stats
  stats: PlayerStats;
  
  // Achievements
  achievements: Achievement[];
  
  // Unlocks
  unlockedSongs: string[];
  unlockedFeatures: string[];
  
  // Actions
  addXP: (amount: number, source: string) => void;
  recordGame: (result: GameResult) => void;
  checkAchievements: () => void;
  getLevelProgress: () => { current: number; required: number; percentage: number };
  getNextLevel: () => Level | null;
  isFeatureUnlocked: (feature: string) => boolean;
  isSongUnlocked: (songId: string) => boolean;
  resetProgress: () => void;
}

export interface GameResult {
  songId: string;
  score: number;
  maxCombo: number;
  accuracy: number;
  perfectHits: number;
  goodHits: number;
  misses: number;
  rank: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  difficulty: Difficulty;
}

// Level definitions
export const LEVELS: Level[] = [
  {
    id: 1,
    name: 'Novice Hater',
    requiredXP: 0,
    unlockedSongs: ['baby-shark', 'macarena'],
    unlockedFeatures: ['basic_mode'],
    difficultyMultiplier: 1.0,
  },
  {
    id: 2,
    name: 'Apprentice Hater',
    requiredXP: 1000,
    unlockedSongs: ['barbie-girl'],
    unlockedFeatures: ['combo_display'],
    difficultyMultiplier: 1.1,
  },
  {
    id: 3,
    name: 'Skilled Hater',
    requiredXP: 2500,
    unlockedSongs: ['crazy-frog'],
    unlockedFeatures: ['health_bar', 'feedback_text'],
    difficultyMultiplier: 1.2,
  },
  {
    id: 4,
    name: 'Expert Hater',
    requiredXP: 5000,
    unlockedSongs: ['gangnam-style'],
    unlockedFeatures: ['rank_display'],
    difficultyMultiplier: 1.3,
  },
  {
    id: 5,
    name: 'Master Hater',
    requiredXP: 10000,
    unlockedSongs: ['chicken-dance'],
    unlockedFeatures: ['hard_mode', 'expert_mode'],
    difficultyMultiplier: 1.5,
  },
  {
    id: 6,
    name: 'Legendary Hater',
    requiredXP: 20000,
    unlockedSongs: [],
    unlockedFeatures: ['custom_songs', 'leaderboard'],
    difficultyMultiplier: 2.0,
  },
];

// Achievement definitions
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_blood',
    name: 'First Blood',
    description: 'Complete your first song',
    icon: '🩸',
    condition: 'songs',
    threshold: 1,
    reward: 100,
    unlocked: false,
  },
  {
    id: 'combo_50',
    name: 'Combo Master',
    description: 'Achieve a 50x combo',
    icon: '🔥',
    condition: 'combo',
    threshold: 50,
    reward: 250,
    unlocked: false,
  },
  {
    id: 'combo_100',
    name: 'Combo God',
    description: 'Achieve a 100x combo',
    icon: '⚡',
    condition: 'combo',
    threshold: 100,
    reward: 500,
    unlocked: false,
  },
  {
    id: 'perfect_score',
    name: 'Perfectionist',
    description: 'Get an S rank on any song',
    icon: '💎',
    condition: 'accuracy',
    threshold: 95,
    reward: 1000,
    unlocked: false,
  },
  {
    id: 'score_100k',
    name: 'Centurion',
    description: 'Score 100,000 points in a single game',
    icon: '🏆',
    condition: 'score',
    threshold: 100000,
    reward: 500,
    unlocked: false,
  },
  {
    id: 'score_500k',
    name: 'Half Millionaire',
    description: 'Score 500,000 points in a single game',
    icon: '👑',
    condition: 'score',
    threshold: 500000,
    reward: 1000,
    unlocked: false,
  },
  {
    id: 'all_perfect',
    name: 'Flawless Victory',
    description: 'Hit all notes perfectly in a song',
    icon: '✨',
    condition: 'perfect',
    threshold: 100,
    reward: 2000,
    unlocked: false,
  },
  {
    id: 'song_collector',
    name: 'Song Collector',
    description: 'Complete all songs at least once',
    icon: '🎵',
    condition: 'songs',
    threshold: 6,
    reward: 1500,
    unlocked: false,
  },
];

// XP calculation
function calculateXP(result: GameResult): number {
  let baseXP = 10;
  
  // Score contribution (diminishing returns)
  baseXP += Math.sqrt(result.score) / 10;
  
  // Combo bonus
  baseXP += result.maxCombo * 2;
  
  // Accuracy bonus
  baseXP += result.accuracy * 5;
  
  // Rank multiplier
  const rankMultipliers: Record<string, number> = {
    'S': 2.0,
    'A': 1.5,
    'B': 1.25,
    'C': 1.0,
    'D': 0.75,
    'F': 0.5,
  };
  baseXP *= rankMultipliers[result.rank] || 1.0;
  
  // Difficulty multiplier
  const difficultyMultipliers: Record<Difficulty, number> = {
    'easy': 1.0,
    'medium': 1.2,
    'hard': 1.5,
    'expert': 2.0,
  };
  baseXP *= difficultyMultipliers[result.difficulty];
  
  return Math.floor(baseXP);
}

// Check if achievement is unlocked
function checkAchievementCondition(
  achievement: Achievement,
  result: GameResult,
  stats: PlayerStats
): boolean {
  if (achievement.unlocked) return false;
  
  switch (achievement.condition) {
    case 'score':
      return result.score >= achievement.threshold;
    case 'combo':
      return result.maxCombo >= achievement.threshold;
    case 'accuracy':
      return result.accuracy >= achievement.threshold;
    case 'songs':
      return stats.songsCompleted.length >= achievement.threshold;
    case 'perfect':
      return result.perfectHits >= achievement.threshold && result.misses === 0;
    default:
      return false;
  }
}

const initialStats: PlayerStats = {
  totalScore: 0,
  totalGamesPlayed: 0,
  totalNotesHit: 0,
  totalPerfectHits: 0,
  totalGoodHits: 0,
  totalMisses: 0,
  highestCombo: 0,
  bestAccuracy: 0,
  songsCompleted: [],
};

export const useLevelStore = create<LevelState>()(
  persist(
    (set, get) => ({
      level: 1,
      xp: 0,
      totalXP: 0,
      stats: { ...initialStats },
      achievements: ACHIEVEMENTS.map(a => ({ ...a })),
      unlockedSongs: LEVELS[0].unlockedSongs,
      unlockedFeatures: LEVELS[0].unlockedFeatures,

      addXP: (amount: number, source: string) => {
        set(state => {
          let newXP = state.xp + amount;
          let newTotalXP = state.totalXP + amount;
          let newLevel = state.level;
          let newUnlockedSongs = [...state.unlockedSongs];
          let newUnlockedFeatures = [...state.unlockedFeatures];
          
          // Check for level up
          const nextLevel = LEVELS.find(l => l.id === newLevel + 1);
          if (nextLevel && newTotalXP >= nextLevel.requiredXP) {
            newLevel++;
            newUnlockedSongs = [...new Set([...newUnlockedSongs, ...nextLevel.unlockedSongs])];
            newUnlockedFeatures = [...new Set([...newUnlockedFeatures, ...nextLevel.unlockedFeatures])];
          }
          
          return {
            level: newLevel,
            xp: newXP,
            totalXP: newTotalXP,
            unlockedSongs: newUnlockedSongs,
            unlockedFeatures: newUnlockedFeatures,
          };
        });
      },

      recordGame: (result: GameResult) => {
        const xpGained = calculateXP(result);
        
        set(state => {
          // Update stats
          const newStats = {
            ...state.stats,
            totalScore: state.stats.totalScore + result.score,
            totalGamesPlayed: state.stats.totalGamesPlayed + 1,
            totalNotesHit: state.stats.totalNotesHit + result.perfectHits + result.goodHits,
            totalPerfectHits: state.stats.totalPerfectHits + result.perfectHits,
            totalGoodHits: state.stats.totalGoodHits + result.goodHits,
            totalMisses: state.stats.totalMisses + result.misses,
            highestCombo: Math.max(state.stats.highestCombo, result.maxCombo),
            bestAccuracy: Math.max(state.stats.bestAccuracy, result.accuracy),
            songsCompleted: result.accuracy >= 50 && !state.stats.songsCompleted.includes(result.songId)
              ? [...state.stats.songsCompleted, result.songId]
              : state.stats.songsCompleted,
          };
          
          // Check achievements
          const newAchievements = state.achievements.map(achievement => {
            if (!achievement.unlocked && checkAchievementCondition(achievement, result, newStats)) {
              return {
                ...achievement,
                unlocked: true,
                unlockedAt: Date.now(),
              };
            }
            return achievement;
          });
          
          // Calculate achievement XP
          const achievementXP = newAchievements
            .filter((a, i) => a.unlocked && !state.achievements[i].unlocked)
            .reduce((sum, a) => sum + a.reward, 0);
          
          // Add XP (game + achievements)
          const totalXP = xpGained + achievementXP;
          let newXP = state.xp + totalXP;
          let newTotalXP = state.totalXP + totalXP;
          let newLevel = state.level;
          let newUnlockedSongs = [...state.unlockedSongs];
          let newUnlockedFeatures = [...state.unlockedFeatures];
          
          // Check for level up
          const nextLevel = LEVELS.find(l => l.id === newLevel + 1);
          if (nextLevel && newTotalXP >= nextLevel.requiredXP) {
            newLevel++;
            newUnlockedSongs = [...new Set([...newUnlockedSongs, ...nextLevel.unlockedSongs])];
            newUnlockedFeatures = [...new Set([...newUnlockedFeatures, ...nextLevel.unlockedFeatures])];
          }
          
          return {
            level: newLevel,
            xp: newXP,
            totalXP: newTotalXP,
            stats: newStats,
            achievements: newAchievements,
            unlockedSongs: newUnlockedSongs,
            unlockedFeatures: newUnlockedFeatures,
          };
        });
      },

      checkAchievements: () => {
        // Manual achievement check (if needed)
      },

      getLevelProgress: () => {
        const state = get();
        const currentLevel = LEVELS.find(l => l.id === state.level) || LEVELS[0];
        const nextLevel = LEVELS.find(l => l.id === state.level + 1);
        
        if (!nextLevel) {
          return { current: state.totalXP, required: state.totalXP, percentage: 100 };
        }
        
        const levelXP = state.totalXP - currentLevel.requiredXP;
        const levelRequired = nextLevel.requiredXP - currentLevel.requiredXP;
        const percentage = Math.min(100, (levelXP / levelRequired) * 100);
        
        return {
          current: levelXP,
          required: levelRequired,
          percentage,
        };
      },

      getNextLevel: () => {
        const state = get();
        return LEVELS.find(l => l.id === state.level + 1) || null;
      },

      isFeatureUnlocked: (feature: string) => {
        return get().unlockedFeatures.includes(feature);
      },

      isSongUnlocked: (songId: string) => {
        return get().unlockedSongs.includes(songId);
      },

      resetProgress: () => {
        set({
          level: 1,
          xp: 0,
          totalXP: 0,
          stats: { ...initialStats },
          achievements: ACHIEVEMENTS.map(a => ({ ...a })),
          unlockedSongs: LEVELS[0].unlockedSongs,
          unlockedFeatures: LEVELS[0].unlockedFeatures,
        });
      },
    }),
    {
      name: 'hate-beat-level-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Helper to format XP numbers
export function formatXP(xp: number): string {
  if (xp >= 1000000) {
    return (xp / 1000000).toFixed(1) + 'M';
  }
  if (xp >= 1000) {
    return (xp / 1000).toFixed(1) + 'K';
  }
  return xp.toString();
}

// Helper to get rank color
export function getRankColor(rank: string): string {
  const colors: Record<string, string> = {
    'S': '#fbbf24', // Gold
    'A': '#4ade80', // Green
    'B': '#60a5fa', // Blue
    'C': '#a78bfa', // Purple
    'D': '#fb923c', // Orange
    'F': '#f87171', // Red
  };
  return colors[rank] || '#888';
}
