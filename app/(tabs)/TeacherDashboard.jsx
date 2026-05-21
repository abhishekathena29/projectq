import { ScaledText } from "@/components/ScaledText";
import { useFocusEffect } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import TimerModal from "../../components/TimerModal";
import EmojiIcon from "../../components/EmojiIcon";
import { useNavigationData } from "../../contexts/NavigationContext";
import useRecentActivities from "../../hooks/useRecentActivities";
import useSchedules from "../../hooks/useSchedules";
import useUser from "../../hooks/useUser";

export default function TeacherDashboard({ navigation }) {
  const { userData, loading: userLoading } = useUser();
  const { schedules, loading: schedulesLoading, getPublishedSchedules, getDraftSchedules, refreshSchedules } = useSchedules();
  const { activities: recentActivities, loading: activitiesLoading } = useRecentActivities();
  const { setRoutineData } = useNavigationData();
  const userName = userData?.name || "User";
  const [displaySchedules, setDisplaySchedules] = useState([]);
  const [timerModalVisible, setTimerModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refresh schedules when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log("TeacherDashboard focused - schedules should auto-refresh via onSnapshot");
    }, [])
  );

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Trigger refresh of schedules
      await refreshSchedules();
      console.log("Manual refresh triggered");
      
      // Add a small delay to show the refresh animation
      setTimeout(() => {
        setIsRefreshing(false);
      }, 1500);
    } catch (error) {
      console.error("Error refreshing schedules:", error);
      setIsRefreshing(false);
    }
  };

  // Update display schedules when schedules change
  useEffect(() => {
    console.log("Schedules changed, re-rendering dashboard");
    
    // Get schedules from Firebase
    const publishedSchedules = getPublishedSchedules();
    const draftSchedules = getDraftSchedules();
    const allFirebaseSchedules = [...publishedSchedules, ...draftSchedules];
    
    console.log("CaregiverDashboard - All schedules:", schedules);
    console.log("Published schedules:", publishedSchedules);
    console.log("Draft schedules:", draftSchedules);
    console.log("All Firebase schedules:", allFirebaseSchedules);
    
    // Calculate display schedules
    const predefinedRoutines = scheduleCards;
    const firebaseSchedules = allFirebaseSchedules.map(schedule => {
      console.log(`Schedule ${schedule.name}:`, {
        id: schedule.id,
        steps: schedule.steps?.length || 0,
        isPublished: schedule.isPublished,
        stepsData: schedule.steps
      });
      
      return {
        id: `firebase_${schedule.id}`,
        title: schedule.name,
        icon: getRoutineIcon(schedule.routineType),
        steps: `${schedule.steps?.length || 0} steps`,
        color: getRoutineColor(schedule.routineType),
        scheduleName: schedule.name,
        predefinedSteps: schedule.steps || [],
        isFirebaseSchedule: true,
        firebaseData: schedule,
        isDraft: !schedule.isPublished,
        creatorRole: schedule.creatorRole,
        isOwnSchedule: schedule.userId === userData?.uid
      };
    });
    
    // Show all Firebase schedules first, then predefined routines that don't have Firebase equivalents
    const predefinedRoutinesWithoutFirebase = predefinedRoutines.filter(routine => {
      return !allFirebaseSchedules.some(schedule => 
        schedule.routineType === routine.title || schedule.name === routine.title
      );
    });
    
    const finalSchedules = [...firebaseSchedules, ...predefinedRoutinesWithoutFirebase];
    console.log("Final display schedules:", finalSchedules);
    setDisplaySchedules(finalSchedules);
  }, [schedules]);

  const handleRoutineClick = (routine) => {
    console.log("Routine clicked:", routine);
    // Set the routine data in context
    setRoutineData(routine, true, routine.scheduleName || routine.title);
    console.log("Routine data set in context, navigating to ScheduleBuilder");
    // Navigate to ScheduleBuilder tab
    navigation.navigate("ScheduleBuilder");
  };

  const handleExistingScheduleClick = (schedule) => {
    console.log("Existing schedule clicked:", schedule);
    // Set the schedule data in context
    setRoutineData(schedule, true, schedule.name);
    console.log("Schedule data set in context, navigating to ScheduleBuilder");
    // Navigate to ScheduleBuilder tab
    navigation.navigate("ScheduleBuilder");
  };

  const scheduleCards = [
    {
      id: 1,
      title: "Morning Routine",
      icon: "☀️",
      steps: "6 steps",
      color: "#FFD700",
      scheduleName: "Morning Routine",
      predefinedSteps: [
        { id: 1, name: "Wake up", icon: "☀️", duration: "02:00", stepNumber: 1, notes: "" },
        { id: 2, name: "Brush teeth", icon: "🦷", duration: "03:00", stepNumber: 2, notes: "" },
        { id: 3, name: "Get dressed", icon: "👕", duration: "05:00", stepNumber: 3, notes: "" },
        { id: 4, name: "Eat breakfast", icon: "🍎", duration: "10:00", stepNumber: 4, notes: "" },
        { id: 5, name: "Pack school bag", icon: "🎒", duration: "03:00", stepNumber: 5, notes: "" },
        { id: 6, name: "Leave for school", icon: "🚂", duration: "02:00", stepNumber: 6, notes: "" }
      ]
    },
    {
      id: 2,
      title: "Afternoon Routine", 
      icon: "🌤️",
      steps: "5 steps",
      color: "#87CEEB",
      scheduleName: "Afternoon Routine",
      predefinedSteps: [
        { id: 1, name: "Lunch time", icon: "🍽️", duration: "15:00", stepNumber: 1, notes: "" },
        { id: 2, name: "Play time", icon: "🧸", duration: "30:00", stepNumber: 2, notes: "" },
        { id: 3, name: "Homework", icon: "📚", duration: "20:00", stepNumber: 3, notes: "" },
        { id: 4, name: "Snack time", icon: "🍎", duration: "10:00", stepNumber: 4, notes: "" },
        { id: 5, name: "Free time", icon: "🎯", duration: "15:00", stepNumber: 5, notes: "" }
      ]
    },
    {
      id: 3,
      title: "Evening Routine",
      icon: "🌅",
      steps: "4 steps", 
      color: "#FFA500",
      scheduleName: "Evening Routine",
      predefinedSteps: [
        { id: 1, name: "Dinner time", icon: "🍽️", duration: "20:00", stepNumber: 1, notes: "" },
        { id: 2, name: "Clean up", icon: "🧼", duration: "10:00", stepNumber: 2, notes: "" },
        { id: 3, name: "Play time", icon: "🎪", duration: "30:00", stepNumber: 3, notes: "" },
        { id: 4, name: "Prepare for bed", icon: "🛏️", duration: "15:00", stepNumber: 4, notes: "" }
      ]
    },
    {
      id: 4,
      title: "Bedtime",
      icon: "🌙",
      steps: "5 steps",
      color: "#9370DB",
      scheduleName: "Bedtime",
      predefinedSteps: [
        { id: 1, name: "Put on pajamas", icon: "👕", duration: "05:00", stepNumber: 1, notes: "" },
        { id: 2, name: "Brush teeth", icon: "🦷", duration: "03:00", stepNumber: 2, notes: "" },
        { id: 3, name: "Read bedtime story", icon: "📚", duration: "10:00", stepNumber: 3, notes: "" },
        { id: 4, name: "Say goodnight", icon: "❤️", duration: "02:00", stepNumber: 4, notes: "" },
        { id: 5, name: "Go to sleep", icon: "🌙", duration: "01:00", stepNumber: 5, notes: "" }
      ]
    }
  ];

  // Format time for display
  const formatActivityTime = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };


  const getRoutineIcon = (routineType) => {
    const iconMap = {
      "Morning Routine": "☀️",
      "Afternoon Routine": "🌤️", 
      "Evening Routine": "🌅",
      "Bedtime": "🌙",
      "Custom": "⭐"
    };
    return iconMap[routineType] || "⭐";
  };

  const getRoutineColor = (routineType) => {
    const colorMap = {
      "Morning Routine": "#FFD700",
      "Afternoon Routine": "#87CEEB",
      "Evening Routine": "#FFA500", 
      "Bedtime": "#9370DB",
      "Custom": "#20B2AA"
    };
    return colorMap[routineType] || "#20B2AA";
  };

  if (userLoading || schedulesLoading || activitiesLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#20B2AA" />
          <ScaledText style={styles.loadingText}>Loading...</ScaledText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <ScaledText style={styles.logo}>MyDayPal</ScaledText>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <ActivityIndicator size="small" color="#20B2AA" />
              ) : (
                <ScaledText style={styles.refreshIcon}>🔄</ScaledText>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Greeting and Main Actions */}
        <View style={styles.greetingSection}>
          <ScaledText style={styles.greeting}>Hello, {userName}! 👋</ScaledText>
          <ScaledText style={styles.subtitle}>Ready to start your day with MyDayPal?</ScaledText>
          
          <View style={styles.mainActions}>
          <TouchableOpacity
              style={[styles.mainButton, styles.newScheduleBtn]}
              onPress={() =>
                navigation.navigate("ScheduleBuilder", {
                  mode: "new",
                  resetKey: Date.now(),
                })
              }
            >
              <ScaledText style={styles.mainButtonIcon}>➕</ScaledText>
              <ScaledText style={styles.mainButtonText}>New Schedule</ScaledText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.mainButton, styles.quickTimerBtn]}
              onPress={() => setTimerModalVisible(true)}
            >
              <ScaledText style={styles.mainButtonIcon}>⏰</ScaledText>
              <ScaledText style={styles.mainButtonText}>Quick Timer</ScaledText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Your Schedules Section */}
          <View style={styles.schedulesSection}>
            <View style={styles.sectionHeader}>
              <ScaledText style={styles.sectionTitle}>Your Schedules</ScaledText>
              <TouchableOpacity>
                <ScaledText style={styles.viewAllLink}>View All</ScaledText>
      </TouchableOpacity>
    </View>
            
            <View style={styles.scheduleGrid}>
              {displaySchedules.map((card) => (
                <TouchableOpacity 
                  key={card.id} 
                  style={styles.scheduleCard}
                  onPress={() => 
                    card.isFirebaseSchedule 
                      ? handleExistingScheduleClick(card.firebaseData)
                      : handleRoutineClick(card)
                  }
                >
                  <View style={[styles.scheduleIcon, { backgroundColor: card.color }]}>
                    <EmojiIcon emoji={card.icon} size={24} color="#fff" />
                  </View>
                  <View style={styles.scheduleTitleContainer}>
                    <ScaledText style={styles.scheduleTitle}>{card.title}</ScaledText>
                    {card.isDraft && (
                      <ScaledText style={styles.draftBadge}>Draft</ScaledText>
                    )}
                    {card.isFirebaseSchedule && card.creatorRole && (
                      <ScaledText style={styles.creatorBadge}>
                        {card.isOwnSchedule ? 'Your routine' : `Created by ${card.creatorRole}`}
                      </ScaledText>
                    )}
                  </View>
                  <ScaledText style={styles.scheduleSteps}>{card.steps}</ScaledText>
                  <TouchableOpacity 
                    style={styles.startButton}
                    onPress={() => 
                      card.isFirebaseSchedule 
                        ? handleExistingScheduleClick(card.firebaseData)
                        : handleRoutineClick(card)
                    }
                  >
                    <View style={styles.startButtonContent}>
                      <EmojiIcon emoji="▶️" size={14} color="#fff" />
                      <ScaledText style={styles.startButtonText}> Start</ScaledText>
                    </View>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Recent Activity Section */}
          <View style={styles.activitySection}>
            <ScaledText style={styles.sectionTitle}>Recent Activity</ScaledText>
            <View style={styles.activityList}>
              {recentActivities.length > 0 ? (
                recentActivities.slice(0, 5).map((activity) => (
                  <View key={activity.id} style={styles.activityItem}>
                    <View style={styles.activityLeft}>
                      <ScaledText style={styles.activityIcon}>{activity.icon}</ScaledText>
                      <View>
                        <ScaledText style={styles.activityTitle}>{activity.title}</ScaledText>
                        <ScaledText style={styles.activityTime}>
                          {formatActivityTime(activity.timestamp)}
                        </ScaledText>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <ScaledText style={styles.noActivitiesText}>No recent activities</ScaledText>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
      
      {/* Timer Modal */}
      <TimerModal 
        visible={timerModalVisible} 
        onClose={() => setTimerModalVisible(false)} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#20B2AA",
    marginRight: 4,
  },
  wifiIcon: {
    fontSize: 16,
  },
  headerRight: {
    flexDirection: "row",
  },
  headerIcon: {
    marginLeft: 15,
    padding: 5,
  },
  iconText: {
    fontSize: 18,
  },
  refreshButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#dee2e6",
    justifyContent: "center",
    alignItems: "center",
    minWidth: 28,
    minHeight: 28,
  },
  refreshIcon: {
    fontSize: 12,
    color: "#20B2AA",
  },
  greetingSection: {
    padding: 8,
    backgroundColor: "#fff",
    marginBottom: 6,
  },
  greeting: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 11,
    color: "#6c757d",
    marginBottom: 8,
  },
  mainActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  mainButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 6,
    alignItems: "center",
    marginHorizontal: 2,
  },
  newScheduleBtn: {
    backgroundColor: "#20B2AA",
  },
  quickTimerBtn: {
    backgroundColor: "#FFD700",
  },
  mainButtonIcon: {
    fontSize: 14,
    marginBottom: 2,
  },
  mainButtonText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#2c3e50",
  },
  mainContent: {
    flexDirection: "row",
    paddingHorizontal: 8,
  },
  schedulesSection: {
    flex: 1,
    marginRight: 10,
  },
  activitySection: {
    flex: 1,
    marginLeft: 10,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  viewAllLink: {
    fontSize: 10,
    color: "#20B2AA",
    fontWeight: "600",
  },
  scheduleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  scheduleCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 6,
    padding: 6,
    marginBottom: 6,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scheduleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  scheduleIconText: {
    fontSize: 14,
  },
  scheduleTitleContainer: {
    alignItems: "center",
    marginBottom: 5,
  },
  scheduleTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2c3e50",
    textAlign: "center",
  },
  draftBadge: {
    fontSize: 10,
    color: "#6c757d",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
    fontWeight: "500",
  },
  creatorBadge: {
    fontSize: 10,
    color: "#20B2AA",
    backgroundColor: "#e8f5f5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
    fontWeight: "500",
  },
  scheduleSteps: {
    fontSize: 9,
    color: "#20B2AA",
    marginBottom: 4,
    fontWeight: "600",
    backgroundColor: "rgba(32, 178, 170, 0.1)",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    textAlign: "center",
  },
  startButton: {
    backgroundColor: "#20B2AA",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  startButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  startButtonText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "600",
  },
  activityList: {
    backgroundColor: "#fff",
    borderRadius: 6,
    padding: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  activityLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  activityIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  activityTitle: {
    fontSize: 10,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 0,
  },
  activityTime: {
    fontSize: 8,
    color: "#6c757d",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#6c757d",
  },
  noActivitiesText: {
    textAlign: 'center',
    color: '#6c757d',
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
});
