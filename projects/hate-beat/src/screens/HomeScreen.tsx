import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useLevelStore, formatXP } from '../store/levelStore';
import LevelProgress from '../components/LevelProgress';
import AchievementsList from '../components/AchievementsList';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { level, stats, achievements } = useLevelStore();
  
  const unlockedAchievements = achievements.filter(a => a.unlocked).length;
  const totalAchievements = achievements.length;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>HATE BEAT</Text>
        <Text style={styles.subtitle}>Love to Hate. Hate to Play.</Text>
      </View>

      {/* Level Progress Card */}
      <LevelProgress showDetails={false} compact={true} />

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalGamesPlayed}</Text>
          <Text style={styles.statLabel}>Games</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.highestCombo}x</Text>
          <Text style={styles.statLabel}>Best Combo</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{unlockedAchievements}/{totalAchievements}</Text>
          <Text style={styles.statLabel}>Achievements</Text>
        </View>
      </View>

      {/* Achievements Preview */}
      <AchievementsList compact={true} />

      {/* Main Menu */}
      <View style={styles.menu}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('SongSelect')}
        >
          <Text style={styles.buttonText}>PLAY</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>PROFILE</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.secondaryButton]}>
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>SETTINGS</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.version}>v1.0.0 - Level {level}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    paddingTop: 80,
    paddingBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 4,
    textShadowColor: '#ff006e',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginTop: 10,
    letterSpacing: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  statCard: {
    backgroundColor: '#252542',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    minWidth: 90,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ff006e',
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  menu: {
    padding: 20,
    gap: 15,
    marginTop: 10,
  },
  button: {
    backgroundColor: '#ff006e',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#ff006e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#3d3d5c',
    shadowOpacity: 0,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 3,
  },
  secondaryButtonText: {
    color: '#888',
  },
  footer: {
    paddingBottom: 30,
    alignItems: 'center',
  },
  version: {
    color: '#444',
    fontSize: 12,
  },
});
