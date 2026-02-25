import { create } from 'zustand';
import { GameState, Note } from '../types';

interface GameStore extends GameState {
  // Actions
  startGame: (notes: Note[]) => void;
  endGame: () => void;
  updateTime: (time: number) => void;
  hitNote: (noteId: string, timing: 'perfect' | 'good') => void;
  missNote: (noteId: string) => void;
  resetGame: () => void;
}

const initialState: GameState = {
  score: 0,
  combo: 0,
  maxCombo: 0,
  health: 100,
  notes: [],
  currentTime: 0,
  isPlaying: false,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  startGame: (notes) => {
    set({
      ...initialState,
      notes,
      isPlaying: true,
    });
  },

  endGame: () => {
    set({ isPlaying: false });
  },

  updateTime: (time) => {
    set({ currentTime: time });
  },

  hitNote: (noteId, timing) => {
    const { score, combo, maxCombo } = get();
    const points = timing === 'perfect' ? 100 : 50;
    const newCombo = combo + 1;
    
    set({
      score: score + points + Math.floor(newCombo / 10) * 10,
      combo: newCombo,
      maxCombo: Math.max(maxCombo, newCombo),
      notes: get().notes.filter(n => n.id !== noteId),
    });
  },

  missNote: (noteId) => {
    const { health } = get();
    set({
      combo: 0,
      health: Math.max(0, health - 10),
      notes: get().notes.filter(n => n.id !== noteId),
    });
  },

  resetGame: () => {
    set(initialState);
  },
}));
