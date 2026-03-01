import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useLevelStore, Achievement, getRankColor } from '../store/levelStore';

interface AchievementsListProps {
  compact?: boolean;
  onAchievementPress?: (achievement: Achievement) => void;
}

function AchievementCard({ 
  achievement, 
  onPress 
}: { 
  achievement: Achievement; 
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        achievement.unlocked && styles.cardUnlocked
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{achievement.unlocked ? achievement.icon : '🔒'}</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={[
          styles.name,
          achievement.unlocked && styles.nameUnlocked
        ]}>
          {achievement.name}
        </Text>
        
        <Text style={styles.description}>{achievement.description}</Text>
        
        <View style={styles.footer}>
          <Text style={styles.condition}>
            {achievement.condition === 'score' && `Score ${achievement.threshold.toLocaleString()}`}
            {achievement.condition === 'combo' && `${achievement.threshold}x Combo`}
            {achievement.condition === 'accuracy' && `${achievement.threshold}% Accuracy`}
            {achievement.condition === 'songs' && `${achievement.threshold} Songs`}
            {achievement.condition === 'perfect' && 'All Perfect'}
          </Text>
          
          {achievement.unlocked && (
            <Text style={styles.reward}>+{achievement.reward} XP</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function AchievementsList({ 
  compact = false, 
  onAchievementPress 
}: AchievementsListProps) {
  const { achievements } = useLevelStore();
  
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;
  
  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Text style={styles.compactTitle}>Achievements</Text>
        <View style={styles.progressRow}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(unlockedCount / totalCount) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {unlockedCount}/{totalCount}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Achievements</Text>
        <Text style={styles.subtitle}>
          {unlockedCount} of {totalCount} unlocked
        </Text>
      </View>
      
      <FlatList
        data={achievements}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AchievementCard
            achievement={item}
            onPress={() => onAchievementPress?.(item)}
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
  compactContainer: {
    backgroundColor: '#252542',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 10,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#1a1a2e',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fbbf24',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
  },
  list: {
    padding: 15,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#252542',
    borderRadius: 12,
    padding: 15,
    opacity: 0.6,
  },
  cardUnlocked: {
    opacity: 1,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  icon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#888',
  },
  nameUnlocked: {
    color: '#fff',
  },
  description: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  condition: {
    fontSize: 11,
    color: '#888',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  reward: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fbbf24',
  },
});
