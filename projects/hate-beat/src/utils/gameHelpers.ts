import { Note } from '../types';
import { SONGS } from '../constants/songs';

export function generateNotes(songId: string): Note[] {
  const song = SONGS.find(s => s.id === songId);
  if (!song) return [];

  const notes: Note[] = [];
  const beatInterval = 60 / song.bpm;
  const totalBeats = Math.floor(song.duration / beatInterval);

  for (let i = 0; i < totalBeats; i++) {
    // Skip some beats for variety
    if (Math.random() > 0.7) continue;

    const time = i * beatInterval;
    const lane = Math.floor(Math.random() * 4);
    
    notes.push({
      id: `note-${i}`,
      time,
      lane,
      type: 'tap',
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
