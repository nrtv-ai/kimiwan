import { Note } from '../types';
import { SONGS, HATE_COMMENTS } from '../constants/songs';

export function generateNotes(songId: string): Note[] {
  const song = SONGS.find(s => s.id === songId);
  if (!song) return [];

  const notes: Note[] = [];
  const beatInterval = 60 / song.bpm;
  const totalBeats = Math.floor(song.duration / beatInterval);

  for (let i = 0; i < totalBeats; i++) {
    // Skip some beats for variety
    if (Math.random() > 0.65) continue;

    const time = i * beatInterval;
    const lane = Math.floor(Math.random() * 4);
    
    // Get random hate comment
    const text = HATE_COMMENTS[Math.floor(Math.random() * HATE_COMMENTS.length)];
    
    // HP based on difficulty and text length
    const baseHp = song.difficulty === 'easy' ? 1 : song.difficulty === 'medium' ? 2 : 3;
    const hp = baseHp + Math.floor(text.length / 20);
    
    notes.push({
      id: `note-${i}`,
      time,
      lane,
      type: 'tap',
      text,
      hp,
    });
  }

  return notes;
}

export function calculateAccuracy(hitTime: number, noteTime: number): number {
  return Math.abs(hitTime - noteTime);
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatScore(score: number): string {
  return score.toString().padStart(7, '0');
}

export function truncateText(text: string, maxLength: number = 20): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
