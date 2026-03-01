import React, { useEffect, useRef, useCallback, useState } from 'react';
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
import { Audio } from 'expo-av';
import { RootStackParamList, Note } from '../types';
import { useGameStore } from '../store/gameStore';
import { useLevelStore, Difficulty } from '../store/levelStore';
import { generateNotes, formatScore, formatTime } from '../utils/gameHelpers';
import { useAudioAnalyzer } from '../utils/audioAnalysis';
import { SONGS, LANES, HIT_WINDOW } from '../constants/songs';
import AudioVisualizer from '../components/AudioVisualizer';
import { gameHaptics } from '../utils/haptics';

type GameScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Game'>;
  route: RouteProp<RootStackParamList, 'Game'>;
};

const { width, height } = Dimensions.get('window');
const LANE_WIDTH = width / LANES;
const HIT_LINE_Y = height * 0.72;
const NOTE_SIZE = LANE_WIDTH * 0.7;
const NOTE_SPEED_PPS = 350;

interface NoteWithPosition extends Note {
  position: Animated.Value;
  hit: boolean;
}

export default function GameScreen({ navigation, route }: GameScreenProps) {
  const { songId } = route.params;
  const song = SONGS.find(s => s.id === songId) || SONGS[0];
  
  const {
    score,
    combo,
    maxCombo,
    health,
    isPlaying,
    startGame,
    endGame,
    hitNote,
    missNote,
    updateTime,
    resetGame,
  } = useGameStore();

  const { recordGame, isSongUnlocked } = useLevelStore();

  const [notes, setNotes] = useState<NoteWithPosition[]>([]);
  const [gameTime, setGameTime] = useState(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [feedback, setFeedback] = useState<{text: string, color: string} | null>(null);
  const [perfectHits, setPerfectHits] = useState(0);
  const [goodHits, setGoodHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [showVisualizer, setShowVisualizer] = useState(true);
  
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Audio analysis hook
  const { analysisData } = useAudioAnalyzer(sound, showVisualizer);

  // Check if song is unlocked
  useEffect(() => {
    if (!isSongUnlocked(songId)) {
      navigation.navigate('SongSelect');
    }
  }, [songId, isSongUnlocked, navigation]);

  // Initialize game
  useEffect(() => {
    const initGame = async () => {
      resetGame();
      setPerfectHits(0);
      setGoodHits(0);
      setMisses(0);
      
      const generatedNotes = generateNotes(songId);
      const notesWithPosition = generatedNotes.map(note => ({
        ...note,
        position: new Animated.Value(-NOTE_SIZE),
        hit: false,
      }));
      setNotes(notesWithPosition);
      startGame(generatedNotes);
      
      if (song.audioUrl) {
        try {
          const { sound: audioSound } = await Audio.Sound.createAsync(
            { uri: song.audioUrl },
            { shouldPlay: true }
          );
          setSound(audioSound);
        } catch (error) {
          console.log('Audio load error:', error);
        }
      }
      
      startTimeRef.current = Date.now();
      gameHaptics.gameStart();
    };
    
    initGame();
    
    return () => {
      if (sound) sound.unloadAsync();
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [songId]);

  // Game loop
  useEffect(() => {
    if (!isPlaying) return;
    
    gameLoopRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setGameTime(elapsed);
      updateTime(elapsed);
      
      notes.forEach(note => {
        if (!note.hit) {
          const noteY = NOTE_SPEED_PPS * (elapsed - note.time) + 50;
          note.position.setValue(noteY);
          
          if (noteY > HIT_LINE_Y + 100 && !note.hit) {
            missNote(note.id);
            note.hit = true;
            setMisses(prev => prev + 1);
            showFeedback('MISS', '#f87171');
            gameHaptics.miss();
          }
        }
      });
      
      if (elapsed > song.duration + 2) {
        endGameAndSave();
      }
    }, 16);
    
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [isPlaying, notes, score, maxCombo]);

  const calculateAccuracy = () => {
    const totalNotes = notes.length;
    const hitNotes = perfectHits + goodHits;
    return totalNotes > 0 ? Math.round((hitNotes / totalNotes) * 100) : 0;
  };

  const getRank = (): 'S' | 'A' | 'B' | 'C' | 'D' | 'F' => {
    const accuracy = calculateAccuracy();
    if (accuracy >= 95) return 'S';
    if (accuracy >= 90) return 'A';
    if (accuracy >= 80) return 'B';
    if (accuracy >= 70) return 'C';
    if (accuracy >= 60) return 'D';
    return 'F';
  };

  const endGameAndSave = () => {
    endGame();
    
    // Record game for level progression
    const gameResult = {
      songId,
      score,
      maxCombo,
      accuracy: calculateAccuracy(),
      perfectHits,
      goodHits,
      misses,
      rank: getRank(),
      difficulty: song.difficulty as Difficulty,
    };
    
    recordGame(gameResult);
    
    navigation.navigate('Results', {
      score,
      maxCombo,
      accuracy: calculateAccuracy(),
      songId,
    });
  };

  const showFeedback = (text: string, color: string) => {
    setFeedback({ text, color });
    setTimeout(() => setFeedback(null), 150);
  };

  const handleLanePress = useCallback((lane: number) => {
    if (!isPlaying) return;
    
    const currentTime = (Date.now() - startTimeRef.current) / 1000;
    
    const laneNotes = notes.filter(
      n => n.lane === lane && !n.hit && Math.abs(n.time - currentTime) < HIT_WINDOW.miss
    );
    
    if (laneNotes.length === 0) return;
    
    const closestNote = laneNotes.reduce((closest, note) =>
      Math.abs(note.time - currentTime) < Math.abs(closest.time - currentTime) ? note : closest
    );
    
    const timeDiff = Math.abs(closestNote.time - currentTime);
    
    if (timeDiff <= HIT_WINDOW.perfect) {
      hitNote(closestNote.id, 'perfect');
      closestNote.hit = true;
      setPerfectHits(prev => prev + 1);
      showFeedback('PERFECT!', '#4ade80');
      gameHaptics.perfect();
    } else if (timeDiff <= HIT_WINDOW.good) {
      hitNote(closestNote.id, 'good');
      closestNote.hit = true;
      setGoodHits(prev => prev + 1);
      showFeedback('GOOD!', '#fbbf24');
      gameHaptics.good();
    } else {
      missNote(closestNote.id);
      closestNote.hit = true;
      setMisses(prev => prev + 1);
      showFeedback('MISS', '#f87171');
      gameHaptics.miss();
    }
  }, [isPlaying, notes]);

  const renderNote = (note: NoteWithPosition) => {
    if (note.hit) return null;
    
    return (
      <Animated.View
        key={note.id}
        style={[
          styles.note,
          {
            left: note.lane * LANE_WIDTH + (LANE_WIDTH - NOTE_SIZE) / 2,
            top: note.position,
            backgroundColor: song.color,
          },
        ]}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.songTitle}>{song.title}</Text>
          <Text style={styles.songArtist}>{song.artist}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.score}>{formatScore(score)}</Text>
          <Text style={styles.time}>{formatTime(gameTime)}</Text>
        </View>
      </View>

      {/* Health Bar */}
      <View style={styles.healthBarContainer}>
        <View style={[styles.healthBar, { width: `${health}%`, backgroundColor: health > 30 ? '#4ade80' : '#f87171' }]} />
      </View>

      {/* Audio Visualizer */}
      {showVisualizer && (
        <View style={styles.visualizerContainer}>
          <AudioVisualizer
            analysisData={analysisData}
            width={width}
            height={40}
            barCount={20}
            style="bars"
          />
        </View>
      )}

      {/* Game Area */}
      <View style={styles.gameArea}>
        {/* Lanes */}
        {Array.from({ length: LANES }).map((_, i) => (
          <View key={i} style={[styles.lane, { left: i * LANE_WIDTH }]} />
        ))}
        
        {/* Notes */}
        <View style={styles.notesContainer}>
          {notes.map(renderNote)}
        </View>

        {/* Hit Line */}
        <View style={[styles.hitLine, { top: HIT_LINE_Y }]} />

        {/* Feedback */}
        {feedback && (
          <View style={styles.feedbackContainer}>
            <Text style={[styles.feedbackText, { color: feedback.color }]}>
              {feedback.text}
            </Text>
          </View>
        )}

        {/* Combo */}
        {combo > 0 && (
          <View style={styles.comboContainer}>
            <Text style={styles.comboCount}>{combo}</Text>
            <Text style={styles.comboText}>COMBO</Text>
          </View>
        )}
      </View>

      {/* Lane Buttons */}
      <View style={styles.laneButtons}>
        {Array.from({ length: LANES }).map((_, i) => (
          <TouchableOpacity
            key={i}
            style={styles.laneButton}
            onPress={() => handleLanePress(i)}
            activeOpacity={0.5}
          >
            <View style={styles.laneButtonInner} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Pause Button */}
      <TouchableOpacity
        style={styles.pauseButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.pauseText}>⏸</Text>
      </TouchableOpacity>

      {/* Visualizer Toggle */}
      <TouchableOpacity
        style={styles.visualizerToggle}
        onPress={() => setShowVisualizer(!showVisualizer)}
      >
        <Text style={styles.visualizerToggleText}>
          {showVisualizer ? '📊' : '📈'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a14',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    paddingTop: 50,
    backgroundColor: '#1a1a2e',
  },
  headerLeft: {
    flex: 1,
  },
  songTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  songArtist: {
    fontSize: 12,
    color: '#888',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ff006e',
    fontVariant: ['tabular-nums'],
  },
  time: {
    fontSize: 14,
    color: '#666',
    fontVariant: ['tabular-nums'],
  },
  healthBarContainer: {
    height: 4,
    backgroundColor: '#2d2d44',
  },
  healthBar: {
    height: '100%',
  },
  visualizerContainer: {
    backgroundColor: '#1a1a2e',
    paddingVertical: 5,
  },
  gameArea: {
    flex: 1,
    position: 'relative',
  },
  lane: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: LANE_WIDTH,
    borderRightWidth: 1,
    borderRightColor: '#2d2d44',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  notesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  note: {
    position: 'absolute',
    width: NOTE_SIZE,
    height: NOTE_SIZE,
    borderRadius: 8,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  hitLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#ff006e',
    shadowColor: '#ff006e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  feedbackContainer: {
    position: 'absolute',
    top: HIT_LINE_Y - 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  feedbackText: {
    fontSize: 32,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  comboContainer: {
    position: 'absolute',
    top: HIT_LINE_Y - 150,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  comboCount: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: '#ff006e',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  comboText: {
    fontSize: 14,
    color: '#888',
    letterSpacing: 4,
  },
  laneButtons: {
    flexDirection: 'row',
    height: 100,
    backgroundColor: '#1a1a2e',
  },
  laneButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#2d2d44',
  },
  laneButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,0,110,0.3)',
    borderWidth: 2,
    borderColor: '#ff006e',
  },
  pauseButton: {
    position: 'absolute',
    top: 50,
    right: 15,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseText: {
    fontSize: 24,
    color: '#fff',
  },
  visualizerToggle: {
    position: 'absolute',
    top: 50,
    right: 65,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visualizerToggleText: {
    fontSize: 20,
  },
});
