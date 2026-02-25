import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { SONGS } from '../constants/songs';

type ResultsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Results'>;
  route: RouteProp<RootStackParamList, 'Results'>;
};

const { width } = Dimensions.get('window');

export default function ResultsScreen({ navigation, route }: ResultsScreenProps) {
  const { score, maxCombo, accuracy, songId } = route.params;
  const song = SONGS.find(s => s.id === songId) || SONGS[0];

  const getRank = () => {
    if (accuracy >= 95) return { letter: 'S', color: '#fbbf24', text: 'LEGENDARY!' };
    if (accuracy >= 90) return { letter: 'A', color: '#4ade80', text: 'EXCELLENT!' };
    if (accuracy >= 80) return { letter: 'B', color: '#60a5fa', text: 'GREAT JOB!' };
    if (accuracy >= 70) return { letter: 'C', color: '#fbbf24', text: 'GOOD!' };
    if (accuracy >= 60) return { letter: 'D', color: '#fb923c', text: 'OKAY!' };
    return { letter: 'F', color: '#f87171', text: 'KEEP TRYING!' };
  };

  const rank = getRank();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SONG COMPLETE</Text>
        <Text style={styles.subtitle}>{song.title} - {song.artist}</Text>
      </View>

      <View style={styles.rankContainer}>
        <View style={[styles.rankCircle, { borderColor: rank.color }]}>
          <Text style={[styles.rankLetter, { color: rank.color }]}>{rank.letter}</Text>
        </View>
        <Text style={[styles.rankText, { color: rank.color }]}>{rank.text}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>SCORE</Text>
          <Text style={styles.statValue}>{score.toLocaleString()}</Text>
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
      </View>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 30,
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
    marginBottom: 40,
  },
  rankCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  rankLetter: {
    fontSize: 72,
    fontWeight: '900',
  },
  rankText: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 15,
    letterSpacing: 2,
  },
  statsContainer: {
    backgroundColor: '#252542',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statLabel: {
    fontSize: 14,
    color: '#888',
    letterSpacing: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  statDivider: {
    height: 1,
    backgroundColor: '#3d3d5c',
  },
  buttonsContainer: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#ff006e',
    paddingVertical: 18,
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
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 3,
  },
  secondaryButton: {
    backgroundColor: '#3d3d5c',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 2,
  },
  tertiaryButton: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  tertiaryButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 2,
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingBottom: 20,
  },
  hateText: {
    fontSize: 14,
    color: '#ff006e',
  },
});