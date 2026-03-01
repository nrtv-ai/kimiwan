import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useLevelStore, formatXP, LEVELS } from '../store/levelStore';

interface LevelProgressProps {
  showDetails?: boolean;
  compact?: boolean;
}

export default function LevelProgress({ showDetails = true, compact = false }: LevelProgressProps) {
  const { level, totalXP, getLevelProgress, getNextLevel } = useLevelStore();
  const progress = getLevelProgress();
  const nextLevel = getNextLevel();
  const currentLevelData = LEVELS.find(l => l.id === level);
  
  const progressAnim = React.useRef(new Animated.Value(0)).current;
  
  React.useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: progress.percentage,
      useNativeDriver: false,
      friction: 8,
    }).start();
  }, [progress.percentage]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelNumber}>{level}</Text>
        </View>
        <View style={styles.compactBarContainer}>
          <View style={styles.compactBarBackground}>
            <Animated.View style={[styles.compactBarFill, { width: progressWidth }]} />
          </View>
          {nextLevel && (
            <Text style={styles.compactText}>
              {formatXP(progress.current)} / {formatXP(progress.required)} XP
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.levelInfo}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelNumber}>{level}</Text>
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.levelName}>{currentLevelData?.name || 'Unknown'}</Text>
            <Text style={styles.totalXP}>Total: {formatXP(totalXP)} XP
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.progressContainer}>
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
      </View>

      {showDetails && nextLevel && (
        <View style={styles.nextLevelContainer}>
          <Text style={styles.nextLevelTitle}>Next Level Unlocks:</Text>
          
          {nextLevel.unlockedSongs.length > 0 && (
            <View style={styles.unlockSection}>
              <Text style={styles.unlockLabel}>Songs:</Text>
              {nextLevel.unlockedSongs.map(songId => (
                <Text key={songId} style={styles.unlockItem}>
                  • {songId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
              ))}
            </View>
          )}
          
          {nextLevel.unlockedFeatures.length > 0 && (
            <View style={styles.unlockSection}>
              <Text style={styles.unlockLabel}>Features:</Text>
              {nextLevel.unlockedFeatures.map(feature => (
                <Text key={feature} style={styles.unlockItem}>
                  • {feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {!nextLevel && (
        <View style={styles.maxLevelContainer}>
          <Text style={styles.maxLevelText}>🏆 Max Level Reached!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#252542',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 15,
    marginVertical: 10,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252542',
    borderRadius: 12,
    padding: 10,
    marginHorizontal: 15,
  },
  header: {
    marginBottom: 15,
  },
  levelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ff006e',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ff006e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  levelNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
  },
  titleContainer: {
    marginLeft: 15,
  },
  levelName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  totalXP: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  progressContainer: {
    marginBottom: 15,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#1a1a2e',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ff006e',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressText: {
    fontSize: 12,
    color: '#888',
  },
  progressPercentage: {
    fontSize: 12,
    color: '#ff006e',
    fontWeight: '700',
  },
  compactBarContainer: {
    flex: 1,
    marginLeft: 10,
  },
  compactBarBackground: {
    height: 6,
    backgroundColor: '#1a1a2e',
    borderRadius: 3,
    overflow: 'hidden',
  },
  compactBarFill: {
    height: '100%',
    backgroundColor: '#ff006e',
    borderRadius: 3,
  },
  compactText: {
    fontSize: 10,
    color: '#888',
    marginTop: 4,
  },
  nextLevelContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 15,
  },
  nextLevelTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
  },
  unlockSection: {
    marginBottom: 10,
  },
  unlockLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  unlockItem: {
    fontSize: 12,
    color: '#4ade80',
    marginLeft: 8,
  },
  maxLevelContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  maxLevelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fbbf24',
  },
});
