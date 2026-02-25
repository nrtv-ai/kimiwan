import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Song } from '../types';
import { SONGS } from '../constants/songs';

type SongSelectScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SongSelect'>;
};

const { width } = Dimensions.get('window');

function SongCard({ song, onPress }: { song: Song; onPress: () => void }) {
  const difficultyColor = {
    easy: '#4ade80',
    medium: '#fbbf24',
    hard: '#f87171',
  }[song.difficulty];

  return (
    <TouchableOpacity
      style={[styles.songCard, { borderLeftColor: song.color }]}
      onPress={onPress}
    >
      <View style={styles.songInfo}>
        <Text style={styles.songTitle}>{song.title}</Text>
        <Text style={styles.songArtist}>{song.artist}</Text>
        
        <View style={styles.songMeta}>
          <View style={[styles.difficultyBadge, { backgroundColor: difficultyColor }]}>
            <Text style={styles.difficultyText}>{song.difficulty.toUpperCase()}</Text>
          </View>
          <Text style={styles.bpmText}>{song.bpm} BPM</Text>
        </View>
      </View>

      <View style={styles.hateContainer}>
        <Text style={styles.hateLabel}>HATE RATING</Text>
        <Text style={styles.hateValue}>{song.hateRating.toFixed(1)}</Text>
        <Text style={styles.hateEmoji}>{getHateEmoji(song.hateRating)}</Text>
      </View>
    </TouchableOpacity>
  );
}

function getHateEmoji(rating: number): string {
  if (rating >= 9) return '🤮';
  if (rating >= 8) return '😤';
  if (rating >= 7) return '🙄';
  return '😐';
}

export default function SongSelectScreen({ navigation }: SongSelectScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.title}>SELECT SONG</Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={SONGS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SongCard
            song={item}
            onPress={() => navigation.navigate('Game', { songId: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
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
  list: {
    padding: 15,
    gap: 15,
  },
  songCard: {
    flexDirection: 'row',
    backgroundColor: '#252542',
    borderRadius: 12,
    padding: 15,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  songArtist: {
    fontSize: 14,
    color: '#888',
    marginBottom: 10,
  },
  songMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  bpmText: {
    fontSize: 12,
    color: '#666',
  },
  hateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 15,
    borderLeftWidth: 1,
    borderLeftColor: '#3d3d5c',
  },
  hateLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 4,
    letterSpacing: 1,
  },
  hateValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ff006e',
  },
  hateEmoji: {
    fontSize: 24,
    marginTop: 4,
  },
});
