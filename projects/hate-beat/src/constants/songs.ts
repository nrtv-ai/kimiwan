import { Song } from '../types';

export const SONGS: Song[] = [
  {
    id: 'baby-shark',
    title: 'Baby Shark',
    artist: 'Pinkfong',
    duration: 136,
    bpm: 120,
    hateRating: 9.8,
    difficulty: 'easy',
    color: '#FF6B9D',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    id: 'crazy-frog',
    title: 'Axel F',
    artist: 'Crazy Frog',
    duration: 172,
    bpm: 140,
    hateRating: 8.9,
    difficulty: 'medium',
    color: '#4ECDC4',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    id: 'gangnam-style',
    title: 'Gangnam Style',
    artist: 'PSY',
    duration: 219,
    bpm: 132,
    hateRating: 7.5,
    difficulty: 'hard',
    color: '#FFE66D',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  },
];

export const LANES = 4;
export const NOTE_SPEED = 300; // pixels per second
export const HIT_WINDOW = {
  perfect: 0.05,
  good: 0.12,
  miss: 0.2,
};
export const POINTS = {
  perfect: 100,
  good: 50,
  miss: 0,
};
