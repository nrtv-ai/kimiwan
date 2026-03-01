import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useLevelStore, LEVELS, formatXP, getRankColor } from '../store/levelStore';
import LevelProgress from '../components/LevelProgress';
import AchievementsList from '../components/AchievementsList';

type ProfileScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Profile'>;
};

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { 
    level, 
    totalXP, 
    stats, 
    achievements, 
    unlockedSongs, 
    unlockedFeatures,
    resetProgress 
  } = useLevelStore();

  const currentLevel = LEVELS.find(l => l.id === level);
  const nextLevel = LEVELS.find(l => l.id === level + 1);
  
  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const lockedAchievements = achievements.filter(a => !a.unlocked);

  const handleReset = () => {
    // In a real app, you'd show a confirmation dialog
    resetProgress();
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.title}>PROFILE</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Level Section */}
      <View style={styles.levelSection}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelNumber}>{level}</Text>
        </View>
        
        <View style={styles.levelInfo}>
          <Text style={styles.levelName}>{currentLevel?.name}</Text>
          <Text style={styles.totalXP}>{formatXP(totalXP)} Total XP</Text>
        </View>
      </View>

      <LevelProgress showDetails={true} />

      {/* Stats Grid */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.totalGamesPlayed}</Text>
            <Text style={styles.statLabel}>Games Played</Text>
          </View>
          
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{formatXP(stats.totalScore)}</Text>
            <Text style={styles.statLabel}>Total Score</Text>
          </View>
          
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.highestCombo}x</Text>
            <Text style={styles.statLabel}>Highest Combo</Text>
          </View>
          
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.bestAccuracy}%</Text>
            <Text style={styles.statLabel}>Best Accuracy</Text>
          </View>
          
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.totalNotesHit}</Text>
            <Text style={styles.statLabel}>Notes Hit</Text>
          </View>
          
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.songsCompleted.length}</Text>
            <Text style={styles.statLabel}>Songs Completed</Text>
          </View>
        </View>
      </View>

      {/* Unlocked Content */}
      <View style={styles.unlocksSection}>
        <Text style={styles.sectionTitle}>Unlocked Content</Text>
        
        <View style={styles.unlockCategory}>
          <Text style={styles.unlockCategoryTitle}>Songs ({unlockedSongs.length})</Text>
          <View style={styles.unlockList}>
            {unlockedSongs.map(songId => (
              <View key={songId} style={styles.unlockItem}>
                <Text style={styles.unlockItemText}>
                  🎵 {songId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
              </View>
            ))}
          </View>
        </View>
        
        <View style={styles.unlockCategory}>
          <Text style={styles.unlockCategoryTitle}>Features ({unlockedFeatures.length})</Text>
          <View style={styles.unlockList}>
            {unlockedFeatures.map(feature => (
              <View key={feature} style={styles.unlockItem}>
                <Text style={styles.unlockItemText}>
                  ✨ {feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Achievements */}
      <View style={styles.achievementsSection}>
        <Text style={styles.sectionTitle}>Achievements ({unlockedAchievements.length}/{achievements.length})</Text>
        
        {unlockedAchievements.length > 0 && (
          <View style={styles.achievementCategory}>
            <Text style={styles.achievementCategoryTitle}>Unlocked</Text>
            {unlockedAchievements.map(achievement => (
              <View key={achievement.id} style={styles.achievementItem}>
                <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                <View style={styles.achievementInfo}>
                  <Text style={styles.achievementName}>{achievement.name}</Text>
                  <Text style={styles.achievementDesc}>{achievement.description}</Text>
                </View>
                <Text style={styles.achievementXP}>+{achievement.reward} XP</Text>
              </View>
            ))}
          </View>
        )}
        
        {lockedAchievements.length > 0 && (
          <View style={styles.achievementCategory}>
            <Text style={styles.achievementCategoryTitle}>Locked</Text>
            {lockedAchievements.slice(0, 3).map(achievement => (
              <View key={achievement.id} style={[styles.achievementItem, styles.achievementLocked]}>
                <Text style={styles.achievementIcon}>🔒</Text>
                <View style={styles.achievementInfo}>
                  <Text style={styles.achievementName}>{achievement.name}</Text>
                  <Text style={styles.achievementDesc}>{achievement.description}</Text>
                </View>
                <Text style={styles.achievementXP}>+{achievement.reward} XP</Text>
              </View>
            ))}
            {lockedAchievements.length > 3 && (
              <Text style={styles.moreAchievements}>
                +{lockedAchievements.length - 3} more...
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Reset Button */}
      <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
        <Text style={styles.resetButtonText}>Reset Progress</Text>
      </TouchableOpacity>

      <View style={styles.footer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: '#ff006e',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 2,
  },
  levelSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#252542',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 16,
  },
  levelBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ff006e',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ff006e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  levelNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
  },
  levelInfo: {
    marginLeft: 15,
  },
  levelName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  totalXP: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  statsSection: {
    marginTop: 15,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBox: {
    backgroundColor: '#252542',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    width: '31%',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ff006e',
  },
  statLabel: {
    fontSize: 10,
    color: '#888',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  unlocksSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  unlockCategory: {
    marginBottom: 15,
  },
  unlockCategoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
  },
  unlockList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  unlockItem: {
    backgroundColor: '#252542',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  unlockItemText: {
    fontSize: 12,
    color: '#4ade80',
  },
  achievementsSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  achievementCategory: {
    marginBottom: 15,
  },
  achievementCategoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252542',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  achievementLocked: {
    opacity: 0.5,
  },
  achievementIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  achievementDesc: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  achievementXP: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fbbf24',
  },
  moreAchievements: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  resetButton: {
    margin: 20,
    padding: 15,
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#f87171',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    height: 30,
  },
});
