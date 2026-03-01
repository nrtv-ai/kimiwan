import { Audio } from 'expo-av';
import { useState, useEffect, useRef, useCallback } from 'react';

export interface AudioAnalysisData {
  frequencyData: Uint8Array;
  waveformData: Uint8Array;
  averageFrequency: number;
  bassLevel: number;
  midLevel: number;
  trebleLevel: number;
  volume: number;
  beatDetected: boolean;
  beatIntensity: number;
}

export interface BeatConfig {
  minBeatInterval: number;
  sensitivity: number;
  bassThreshold: number;
}

const DEFAULT_BEAT_CONFIG: BeatConfig = {
  minBeatInterval: 200,
  sensitivity: 0.6,
  bassThreshold: 0.3,
};

export function useAudioAnalyzer(
  sound: Audio.Sound | null,
  enabled: boolean = true,
  config: Partial<BeatConfig> = {}
) {
  const [analysisData, setAnalysisData] = useState<AudioAnalysisData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const lastBeatTimeRef = useRef<number>(0);
  const beatHistoryRef = useRef<number[]>([]);
  
  const beatConfig = { ...DEFAULT_BEAT_CONFIG, ...config };

  const detectBeat = useCallback((frequencyData: Uint8Array, currentTime: number): { detected: boolean; intensity: number } => {
    const bassEnd = Math.floor(frequencyData.length / 8);
    let bassSum = 0;
    
    for (let i = 0; i < bassEnd; i++) {
      bassSum += frequencyData[i];
    }
    
    const bassAverage = bassSum / bassEnd / 255;
    
    if (currentTime - lastBeatTimeRef.current < beatConfig.minBeatInterval) {
      return { detected: false, intensity: 0 };
    }
    
    if (bassAverage > beatConfig.bassThreshold) {
      const intensity = Math.min(1, (bassAverage - beatConfig.bassThreshold) / (1 - beatConfig.bassThreshold));
      
      beatHistoryRef.current.push(bassAverage);
      if (beatHistoryRef.current.length > 4) {
        beatHistoryRef.current.shift();
      }
      
      const avgHistory = beatHistoryRef.current.slice(0, -1).reduce((a, b) => a + b, 0) / (beatHistoryRef.current.length - 1);
      
      if (bassAverage > avgHistory * (1.1 - beatConfig.sensitivity * 0.2)) {
        lastBeatTimeRef.current = currentTime;
        return { detected: true, intensity };
      }
    }
    
    return { detected: false, intensity: 0 };
  }, [beatConfig]);

  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || !enabled) {
      animationFrameRef.current = requestAnimationFrame(analyzeAudio);
      return;
    }

    const frequencyData = new Uint8Array(analyserRef.current.frequencyBinCount);
    const waveformData = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    analyserRef.current.getByteFrequencyData(frequencyData);
    analyserRef.current.getByteTimeDomainData(waveformData);

    const third = Math.floor(frequencyData.length / 3);
    
    let bassSum = 0, midSum = 0, trebleSum = 0, totalSum = 0;
    
    for (let i = 0; i < frequencyData.length; i++) {
      const value = frequencyData[i];
      totalSum += value;
      
      if (i < third) {
        bassSum += value;
      } else if (i < third * 2) {
        midSum += value;
      } else {
        trebleSum += value;
      }
    }

    const bassLevel = bassSum / third / 255;
    const midLevel = midSum / third / 255;
    const trebleLevel = trebleSum / (frequencyData.length - third * 2) / 255;
    const averageFrequency = totalSum / frequencyData.length / 255;
    
    let volumeSum = 0;
    for (let i = 0; i < waveformData.length; i++) {
      volumeSum += Math.abs(waveformData[i] - 128);
    }
    const volume = volumeSum / waveformData.length / 128;

    const currentTime = Date.now();
    const { detected: beatDetected, intensity: beatIntensity } = detectBeat(frequencyData, currentTime);

    setAnalysisData({
      frequencyData,
      waveformData,
      averageFrequency,
      bassLevel,
      midLevel,
      trebleLevel,
      volume,
      beatDetected,
      beatIntensity,
    });

    animationFrameRef.current = requestAnimationFrame(analyzeAudio);
  }, [enabled, detectBeat]);

  const startAnalysis = useCallback(async () => {
    if (!sound || isAnalyzing) return;

    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('Web Audio API not supported');
        return;
      }

      audioContextRef.current = new AudioContextClass();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;

      setIsAnalyzing(true);
      analyzeAudio();
    } catch (error) {
      console.error('Failed to start audio analysis:', error);
    }
  }, [sound, isAnalyzing, analyzeAudio]);

  const stopAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    setIsAnalyzing(false);
    setAnalysisData(null);
  }, []);

  useEffect(() => {
    if (enabled && sound) {
      startAnalysis();
    } else {
      stopAnalysis();
    }

    return () => {
      stopAnalysis();
    };
  }, [enabled, sound, startAnalysis, stopAnalysis]);

  return {
    analysisData,
    isAnalyzing,
    startAnalysis,
    stopAnalysis,
  };
}

export function useSimpleBeatDetector(
  sound: Audio.Sound | null,
  onBeat: (intensity: number) => void,
  config: Partial<BeatConfig> = {}
) {
  const lastBeatRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const beatConfig = { ...DEFAULT_BEAT_CONFIG, ...config };

  useEffect(() => {
    if (!sound) return;

    const detectBeat = async () => {
      try {
        const status = await sound.getStatusAsync();
        if (!status.isLoaded || !status.isPlaying) return;

        const currentTime = Date.now();
        
        // Simulate beat detection based on song position
        // In production, this would analyze actual audio data
        const beatInterval = 60000 / 120; // Assuming 120 BPM
        const timeSinceLastBeat = currentTime - lastBeatRef.current;
        
        if (timeSinceLastBeat > beatInterval) {
          lastBeatRef.current = currentTime;
          onBeat(0.5 + Math.random() * 0.5);
        }
      } catch (error) {
        console.error('Beat detection error:', error);
      }
    };

    intervalRef.current = setInterval(detectBeat, 50);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [sound, onBeat, beatConfig]);
}

export function getFrequencyBars(
  frequencyData: Uint8Array,
  numBars: number = 16
): number[] {
  const bars: number[] = [];
  const samplesPerBar = Math.floor(frequencyData.length / numBars);
  
  for (let i = 0; i < numBars; i++) {
    let sum = 0;
    for (let j = 0; j < samplesPerBar; j++) {
      sum += frequencyData[i * samplesPerBar + j];
    }
    bars.push(sum / samplesPerBar / 255);
  }
  
  return bars;
}
