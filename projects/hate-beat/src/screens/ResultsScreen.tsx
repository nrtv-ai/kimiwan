import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { SONGS } from '../constants/songs';
import { useLevelStore, getRankColor, formatXP, LEVELS } from '../store/levelStore';
import { gameHaptics } from '../utils/haptics';

type ResultsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Results'>;
  route: RouteProp<RootStackParamList, 'Results'>;
};

const { width } = Dimensions.get('window');

export default function ResultsScreen({ navigation, route }: ResultsScreenProps) {
  const { score, maxCombo, accuracy, songId } = route.params;
  const song = SONGS.find(s => s.id === songId) || SONGS[0];
  
  const { 
    level, 
    totalXP, 
    getLevelProgress, 
    getNextLevel,
    stats,
    achievements 
  } = useLevelStore();
  
  const progress = getLevelProgress();
  const nextLevel = getNextLevel();
  const currentLevelData = LEVELS.find(l => l.id === level);
  
  // Animation values
  const scoreAnim = React.useRef(new Animated.Value(0)).current;
  const xpAnim = React.useRef(new Animated.Value(0)).current;
  const progressAnim = React.useRef(new Animated.Value(0)).current;
  
  // Calculate XP gained from this game
  const xpGained = calculateGameXP(score, maxCombo, accuracy, getRank());
  
  // Check for newly unlocked achievements
  const newAchievements = achievements.filter(a => {
    if (!a.unlocked || !a.unlockedAt) return false;
    // Show achievements unlocked in the last 5 seconds
    return Date.now() - a.unlockedAt < 5000;
  });

  useEffect(() => {
    // Animate score counting up
    Animated.spring(scoreAnim, {
      toValue: score,
      useNativeDriver: false,
      friction: 8,
    }).start();
    
    // Animate XP
    Animated.timing(xpAnim, {
      toValue: xpGained,
      duration: 1000,
      useNativeDriver: false,
    }).start();
    
    // Animate progress bar
    Animated.spring(progressAnim, {
      toValue: progress.percentage,
      useNativeDriver: false,
      friction: 8,
    }).start();
    
    // Haptic feedback based on rank
    const rank = getRank();
    if (rank === 'S') {
      gameHaptics.gameOver(); // Success
    }
  }, []);

  const getRank = (): 'S' | 'A' | 'B' | 'C' | 'D' | 'F' => {
    if (accuracy >= 95) return 'S';
    if (accuracy >= 90) return 'A';
    if (accuracy >= 80) return 'B';
    if (accuracy >= 70) return 'C';
    if (accuracy >= 60) return 'D';
    return 'F';
  };

  const rank = getRank();
  const rankData = {
    S: { text: 'LEGENDARY!', color: '#fbbf24' },
    A: { text: 'EXCELLENT!', color: '#4ade80' },
    B: { text: 'GREAT JOB!', color: '#60a5fa' },
    C: { text: 'GOOD!', color: '#a78bfa' },
    D: { text: 'OKAY!', color: '#fb923c' },
    F: { text: 'KEEP TRYING!', color: '#f87171' },
  }[rank];

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SONG COMPLETE</Text>
        <Text style={styles.subtitle}>{song.title} - {song.artist}</Text>
      </View>

      <View style={styles.rankContainer}>
        <View style={[styles.rankCircle, { borderColor: rankData.color }]}>
          <Text style={[styles.rankLetter, { color: rankData.color }]}>{rank}</Text>
        </View>
        <Text style={[styles.rankText, { color: rankData.color }]}>{rankData.text}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>SCORE</Text>
          <Animated.Text style={styles.statValue}>
            {scoreAnim.interpolate({
              inputRange: [0, score],
              outputRange: ['0', score.toLocaleString()],
            })}
          </Animated.Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>MAX COMBO</Text>
          <Text style={styles.statValue}>{maxCombo}x</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>ACCURACY</Text>
          <Text style={styles.statValue}>{accuracy}%</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>XP GAINED</Text>
          <Animated.Text style={[styles.statValue, { color: '#4ade80' }]}>
            +{xpAnim.interpolate({
              inputRange: [0, xpGained],
              outputRange: ['0', xpGained.toString()],
            })}
          </Animated.Text>
        </View>
      </View>

      {/* Level Progress */}
      <View style={styles.levelContainer}>
        <View style={styles.levelHeader}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelNumber}>{level}</Text>
          </View>
          <View style={styles.levelInfo}>
            <Text style={styles.levelName}>{currentLevelData?.name}</Text>
            <Text style={styles.totalXP}>Total: {formatXP(totalXP)} XP</Text>
          </View>
        </View>
        
        <View style={styles.progressBarBackground}>
          <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
        </View>
        
        <View style={styles.progressLabels}>
          <Text style={styles.progressText}>
            {formatXP(progress.current)} / {formatXP(progress.required)} XP
          </Text>
          <Text style={styles.progressPercentage}>
            {Math.floor(progress.percentage)}%
          </Text>
        </View>
        
        {nextLevel && progress.percentage >= 100 && (
          <View style={styles.levelUpBanner}>
            <Text style={styles.levelUpText}>🎉 LEVEL UP! 🎉</Text>
            <Text style={styles.levelUpSubtext}>Unlocked: {nextLevel.unlockedSongs.join(', ').replace(/-/g, ' ')}</Text>
          </View>
        )}
      </View>

      {/* New Achievements */}
      {newAchievements.length > 0 && (
        <View style={styles.achievementsContainer}>
          <Text style={styles.achievementsTitle}>New Achievements!</Text>
          {newAchievements.map(achievement => (
            <View key={achievement.id} style={styles.achievementCard}>
              <Text style={styles.achievementIcon}>{achievement.icon}</Text>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementName}>{achievement.name}</Text>
                <Text style={styles.achievementReward}>+{achievement.reward} XP</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Game', { songId })}
        >
          <Text style={styles.primaryButtonText}>RETRY</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('SongSelect')}
        >
          <Text style={styles.secondaryButtonText}>NEW SONG</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tertiaryButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.tertiaryButtonText}>MAIN MENU</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.hateText}>🤮 Hate Rating: {song.hateRating}/10</Text>
      </View>
    </View>
  );
}

function calculateGameXP(score: number, maxCombo: number, accuracy: number, rank: string): number {
  let baseXP = 10;
  
  // Score contribution
  baseXP += Math.sqrt(score) / 10;
  
  // Combo bonus
  baseXP += maxCombo * 2;
  
  // Accuracy bonus
  baseXP += accuracy * 5;
  
  // Rank multiplier
  const rankMultipliers: Record<string, number> = {
    'S': 2.0,
    'A': 1.5,
    'B': 1.25,
    'C': 1.0,
    'D': 0.75,
    'F': 0.5,
  };
  baseXP *= rankMultipliers[rank] || 1.0;
  
  return Math.floor(baseXP);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },
  rankContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  rankCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  rankLetter: {
    fontSize: 56,
    fontWeight: '900',
  },
  rankText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 10,
    letterSpacing: 2,
  },
  statsContainer: {
    backgroundColor: '#252542',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  statLabel: {
    fontSize: 14,
    color: '#888',
    letterSpacing: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  statDivider: {
    height: 1,
    backgroundColor: '#3d3d5c',
  },
  levelContainer: {
    backgroundColor: '#252542',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  levelBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ff006e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
  },
  levelInfo: {
    marginLeft: 12,
  },
  levelName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  totalXP: {
    fontSize: 11,
    color: '#888',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#1a1a2e',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ff006e',
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressText: {
    fontSize: 11,
    color: '#888',
  },
  progressPercentage: {
    fontSize: 11,
    color: '#ff006e',
    fontWeight: '700',
  },
  levelUpBanner: {
    backgroundColor: '#fbbf24',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  levelUpText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  levelUpSubtext: {
    fontSize: 11,
    color: '#1a1a2e',
    marginTop: 4,
  },
  achievementsContainer: {
    backgroundColor: '#252542',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
  },
  achievementsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fbbf24',
    marginBottom: 10,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  achievementIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  achievementReward: {
    fontSize: 11,
    color: '#4ade80',
  },
  buttonsContainer: {
    gap: 10,
    marginTop: 'auto',
  },
  primaryButton: {
    backgroundColor: '#ff006e',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#ff006e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 3,
  },
  secondaryButton: {
    backgroundColor: '#3d3d5c',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 2,
  },
  tertiaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  tertiaryButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 2,
  },
  footer: {
    marginTop: 15,
    alignItems: 'center',
  },
  hateText: {
    fontSize: 14,
    color: '#ff006e',
  },
});
