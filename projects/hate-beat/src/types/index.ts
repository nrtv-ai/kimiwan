export type RootStackParamList = {
  Home: undefined;
  SongSelect: undefined;
  Game: { songId: string };
  Results: { score: number; maxCombo: number; accuracy: number; songId: string };
};

export interface Song {
  id: string;
  title: string;
  artist: string;
  duration: number;
  bpm: number;
  hateRating: number;
  difficulty: 'easy' | 'medium' | 'hard';
  color: string;
  audioUrl?: string;
}

export interface Note {
  id: string;
  time: number;
  lane: number;
  type: 'tap' | 'hold';
  duration?: number;
  text?: string; // Hate comment text
  hp?: number; // Hit points (how many taps to destroy)
}

export interface HitResult {
  timing: 'perfect' | 'good' | 'miss';
  points: number;
}

export interface GameState {
  score: number;
  combo: number;
  maxCombo: number;
  health: number;
  notes: Note[];
  currentTime: number;
  isPlaying: boolean;
}
