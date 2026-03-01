import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Path } from 'react-native-svg';
import { AudioAnalysisData } from '../utils/audioAnalysis';

interface AudioVisualizerProps {
  analysisData: AudioAnalysisData | null;
  width?: number;
  height?: number;
  barCount?: number;
  color?: string;
  style?: 'bars' | 'waveform' | 'circular';
}

const { width: screenWidth } = Dimensions.get('window');

export default function AudioVisualizer({
  analysisData,
  width = screenWidth,
  height = 60,
  barCount = 16,
  color = '#ff006e',
  style = 'bars',
}: AudioVisualizerProps) {
  if (!analysisData) {
    return (
      <View style={[styles.container, { width, height }]}>
        <View style={styles.placeholder} />
      </View>
    );
  }

  const renderBars = () => {
    const barWidth = width / barCount;
    const bars: JSX.Element[] = [];
    
    const samplesPerBar = Math.floor(analysisData.frequencyData.length / barCount);
    
    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < samplesPerBar; j++) {
        sum += analysisData.frequencyData[i * samplesPerBar + j];
      }
      const normalizedValue = sum / samplesPerBar / 255;
      const barHeight = normalizedValue * height;
      
      // Color based on frequency (bass = darker, treble = lighter)
      const hue = 340 - (i / barCount) * 60; // Pink to purple
      const barColor = `hsl(${hue}, 100%, ${50 + normalizedValue * 30}%)`;
      
      bars.push(
        <Rect
          key={i}
          x={i * barWidth + 1}
          y={height - barHeight}
          width={barWidth - 2}
          height={barHeight}
          fill={barColor}
          rx={2}
        />
      );
    }
    
    return bars;
  };

  const renderWaveform = () => {
    const points: string[] = [];
    const step = analysisData.waveformData.length / width;
    
    for (let x = 0; x < width; x++) {
      const index = Math.floor(x * step);
      const value = analysisData.waveformData[index];
      const normalizedValue = (value - 128) / 128;
      const y = height / 2 + normalizedValue * (height / 2);
      
      if (x === 0) {
        points.push(`M ${x} ${y}`);
      } else {
        points.push(`L ${x} ${y}`);
      }
    }
    
    return (
      <Path
        d={points.join(' ')}
        stroke={color}
        strokeWidth={2}
        fill="none"
      />
    );
  };

  const renderCircular = () => {
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 5;
    const bars: JSX.Element[] = [];
    
    const samplesPerBar = Math.floor(analysisData.frequencyData.length / barCount);
    
    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < samplesPerBar; j++) {
        sum += analysisData.frequencyData[i * samplesPerBar + j];
      }
      const normalizedValue = sum / samplesPerBar / 255;
      const barHeight = normalizedValue * maxRadius;
      
      const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
      const x1 = centerX + Math.cos(angle) * 10;
      const y1 = centerY + Math.sin(angle) * 10;
      const x2 = centerX + Math.cos(angle) * (10 + barHeight);
      const y2 = centerY + Math.sin(angle) * (10 + barHeight);
      
      const hue = 340 - (i / barCount) * 60;
      const barColor = `hsl(${hue}, 100%, ${50 + normalizedValue * 30}%)`;
      
      bars.push(
        <Rect
          key={i}
          x={x1}
          y={y1 - 2}
          width={Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))}
          height={4}
          fill={barColor}
          rx={2}
          rotation={(angle * 180) / Math.PI}
          origin={`${x1}, ${y1}`}
        />
      );
    }
    
    return bars;
  };

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        {style === 'bars' && renderBars()}
        {style === 'waveform' && renderWaveform()}
        {style === 'circular' && renderCircular()}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
});
