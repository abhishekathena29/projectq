import { ScaledText } from '@/components/ScaledText';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import EmojiIcon from '../../components/EmojiIcon';
import useSchedules from '../../hooks/useSchedules';
import useUser from '../../hooks/useUser';

const { width } = Dimensions.get('window');

export default function ProgressScreen() {
  const navigation = useNavigation();
  const { userData, loading: userLoading } = useUser();
  const { schedules, loading: schedulesLoading } = useSchedules();
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  // Mock progress data - in a real app, this would come from Firebase
  const progressData = {
    week: {
      completedSchedules: 12,
      totalSchedules: 15,
      completionRate: 80,
      streak: 5,
      totalTime: 180, // minutes
      mostActiveDay: 'Monday'
    },
    month: {
      completedSchedules: 45,
      totalSchedules: 60,
      completionRate: 75,
      streak: 12,
      totalTime: 720,
      mostActiveDay: 'Tuesday'
    },
    year: {
      completedSchedules: 520,
      totalSchedules: 650,
      completionRate: 80,
      streak: 25,
      totalTime: 8640,
      mostActiveDay: 'Wednesday'
    }
  };

  const currentData = progressData[selectedPeriod];

  // Calculate schedule statistics
  const publishedSchedules = schedules.filter(s => s.isPublished);
  const draftSchedules = schedules.filter(s => !s.isPublished);
  const totalSteps = publishedSchedules.reduce((sum, schedule) => sum + (schedule.steps?.length || 0), 0);

  // Recent activities mock data
  const recentActivities = [
    {
      id: 1,
      scheduleName: "Morning Routine",
      action: "completed",
      time: "8:30 AM",
      duration: "25 minutes",
      icon: "✅"
    },
    {
      id: 2,
      scheduleName: "Afternoon Routine", 
      action: "started",
      time: "2:15 PM",
      duration: "15 minutes",
      icon: "▶️"
    },
    {
      id: 3,
      scheduleName: "Bedtime",
      action: "completed",
      time: "Yesterday",
      duration: "18 minutes",
      icon: "✅"
    },
    {
      id: 4,
      scheduleName: "Evening Routine",
      action: "skipped",
      time: "Yesterday",
      duration: "0 minutes",
      icon: "⏭️"
    }
  ];

  if (userLoading || schedulesLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#20B2AA" />
          <ScaledText style={styles.loadingText}>Loading progress...</ScaledText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <ScaledText style={styles.headerTitle}>Progress Tracking</ScaledText>
          <ScaledText style={styles.headerSubtitle}>Track your schedule completion and progress</ScaledText>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {['week', 'month', 'year'].map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <ScaledText style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.periodButtonTextActive
              ]}>
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </ScaledText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Main Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <ScaledText style={styles.statNumber}>{currentData.completionRate}%</ScaledText>
            <ScaledText style={styles.statLabel}>Completion Rate</ScaledText>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${currentData.completionRate}%` }
                ]} 
              />
            </View>
          </View>

          <View style={styles.statCard}>
            <ScaledText style={styles.statNumber}>{currentData.streak}</ScaledText>
            <ScaledText style={styles.statLabel}>Day Streak</ScaledText>
            <ScaledText style={styles.statSubtext}>Keep it up! 🔥</ScaledText>
          </View>
        </View>

        {/* Detailed Stats */}
        <View style={styles.detailedStats}>
          <View style={styles.detailCard}>
            <ScaledText style={styles.detailNumber}>{currentData.completedSchedules}</ScaledText>
            <ScaledText style={styles.detailLabel}>Completed Schedules</ScaledText>
            <ScaledText style={styles.detailSubtext}>out of {currentData.totalSchedules}</ScaledText>
          </View>

          <View style={styles.detailCard}>
            <ScaledText style={styles.detailNumber}>{Math.floor(currentData.totalTime / 60)}h</ScaledText>
            <ScaledText style={styles.detailLabel}>Total Time</ScaledText>
            <ScaledText style={styles.detailSubtext}>{currentData.totalTime % 60}m this {selectedPeriod}</ScaledText>
          </View>

          <View style={styles.detailCard}>
            <ScaledText style={styles.detailNumber}>{currentData.mostActiveDay}</ScaledText>
            <ScaledText style={styles.detailLabel}>Most Active Day</ScaledText>
            <ScaledText style={styles.detailSubtext}>Your best day!</ScaledText>
          </View>
        </View>

        {/* Schedule Overview */}
        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>Schedule Overview</ScaledText>
          <View style={styles.overviewCards}>
            <View style={styles.overviewCard}>
              <ScaledText style={styles.overviewNumber}>{publishedSchedules.length}</ScaledText>
              <ScaledText style={styles.overviewLabel}>Published Schedules</ScaledText>
            </View>
            <View style={styles.overviewCard}>
              <ScaledText style={styles.overviewNumber}>{draftSchedules.length}</ScaledText>
              <ScaledText style={styles.overviewLabel}>Draft Schedules</ScaledText>
            </View>
            <View style={styles.overviewCard}>
              <ScaledText style={styles.overviewNumber}>{totalSteps}</ScaledText>
              <ScaledText style={styles.overviewLabel}>Total Steps</ScaledText>
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>Recent Activity</ScaledText>
          <View style={styles.activityList}>
            {recentActivities.map((activity) => (
              <View key={activity.id} style={styles.activityItem}>
                <View style={styles.activityIcon}>
                  <EmojiIcon emoji={activity.icon} size={16} color="#20B2AA" />
                </View>
                <View style={styles.activityContent}>
                  <ScaledText style={styles.activityTitle}>
                    {activity.scheduleName} {activity.action}
                  </ScaledText>
                  <ScaledText style={styles.activityTime}>{activity.time} • {activity.duration}</ScaledText>
                </View>
                <View style={styles.activityStatus}>
                  <ScaledText style={styles.activityStatusText}>
                    {activity.action === 'completed' ? 'Done' : 
                     activity.action === 'started' ? 'In Progress' : 'Skipped'}
        </ScaledText>
      </View>
    </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>Quick Actions</ScaledText>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('ScheduleBuilder')}
            >
              <EmojiIcon emoji="➕" size={20} color="#20B2AA" />
              <ScaledText style={styles.quickActionText}>Create Schedule</ScaledText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('CaregiverDashboard')}
            >
              <EmojiIcon emoji="📊" size={20} color="#20B2AA" />
              <ScaledText style={styles.quickActionText}>View Dashboard</ScaledText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6c757d',
  },
  header: {
    padding: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#6c757d',
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#fff',
    marginBottom: 6,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginHorizontal: 2,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#20B2AA',
  },
  periodButtonText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#6c757d',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 8,
    marginHorizontal: 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#20B2AA',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 9,
    color: '#6c757d',
    marginBottom: 4,
    textAlign: 'center',
  },
  statSubtext: {
    fontSize: 8,
    color: '#20B2AA',
    fontWeight: '500',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#20B2AA',
    borderRadius: 3,
  },
  detailedStats: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  detailCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 6,
    marginHorizontal: 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 2,
  },
  detailLabel: {
    fontSize: 8,
    color: '#6c757d',
    marginBottom: 1,
    textAlign: 'center',
  },
  detailSubtext: {
    fontSize: 7,
    color: '#20B2AA',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  overviewCards: {
    flexDirection: 'row',
  },
  overviewCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 6,
    marginHorizontal: 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overviewNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#20B2AA',
    marginBottom: 2,
  },
  overviewLabel: {
    fontSize: 8,
    color: '#6c757d',
    textAlign: 'center',
  },
  activityList: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  activityIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  activityIconText: {
    fontSize: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 1,
  },
  activityTime: {
    fontSize: 8,
    color: '#6c757d',
  },
  activityStatus: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
  },
  activityStatusText: {
    fontSize: 7,
    color: '#6c757d',
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 8,
    marginHorizontal: 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    fontSize: 14,
    marginBottom: 3,
  },
  quickActionText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
  },
});
