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
  damageNote: (noteId: string, damage: number) => boolean; // Returns true if destroyed
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

  damageNote: (noteId, damage) => {
    const { score, combo, maxCombo, notes } = get();
    const noteIndex = notes.findIndex(n => n.id === noteId);
    
    if (noteIndex === -1) return false;
    
    const note = notes[noteIndex];
    const newHp = (note.hp || 1) - damage;
    
    if (newHp <= 0) {
      // Note destroyed
      const newCombo = combo + 1;
      set({
        score: score + 100 + Math.floor(newCombo / 10) * 10,
        combo: newCombo,
        maxCombo: Math.max(maxCombo, newCombo),
        notes: notes.filter(n => n.id !== noteId),
      });
      return true;
    } else {
      // Note damaged but not destroyed
      const updatedNotes = [...notes];
      updatedNotes[noteIndex] = { ...note, hp: newHp };
      set({ notes: updatedNotes });
      return false;
    }
  },

  resetGame: () => {
    set(initialState);
  },
}));
