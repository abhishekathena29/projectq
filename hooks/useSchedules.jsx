import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getFirestore,
    onSnapshot,
    orderBy,
    query,
    updateDoc,
    where
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth } from "../config/firebase";

export default function useSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const db = getFirestore();

  // Fetch all schedules for the current user and their associated caregiver/teacher
  useEffect(() => {
    if (!auth.currentUser) {
      setSchedules([]);
      setLoading(false);
      return;
    }

    let unsubscribes = [];
    let isMounted = true;

    const fetchSchedules = async () => {
      try {
        // Get user data to determine caregiverId
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        const userData = userDocSnap.exists() ? userDocSnap.data() : {};
        
        const caregiverId = userData.caregiverId || (userData.role === 'caregiver' ? auth.currentUser.uid : null);
        
        // Create queries for both user's own schedules and shared schedules
        const queries = [
          query(
            collection(db, "schedules"),
            where("userId", "==", auth.currentUser.uid),
            orderBy("updatedAt", "desc")
          )
        ];
        
        // If user has a caregiverId, also fetch schedules from that caregiver
        if (caregiverId && caregiverId !== auth.currentUser.uid) {
          queries.push(
            query(
              collection(db, "schedules"),
              where("caregiverId", "==", caregiverId),
              orderBy("updatedAt", "desc")
            )
          );
        }
        
        // If user is a caregiver, also fetch schedules from their teachers
        if (userData.role === 'caregiver' && userData.teachers && userData.teachers.length > 0) {
          for (const teacherId of userData.teachers) {
            queries.push(
              query(
                collection(db, "schedules"),
                where("userId", "==", teacherId),
                orderBy("updatedAt", "desc")
              )
            );
          }
        }

        // Execute all queries and combine results
        const allSchedules = new Map(); // Use Map to avoid duplicates
        
        const updateSchedules = () => {
          if (!isMounted) return;
          const sortedSchedules = Array.from(allSchedules.values()).sort((a, b) => 
            new Date(b.updatedAt) - new Date(a.updatedAt)
          );
          console.log("Processed schedules:", sortedSchedules);
          setSchedules(sortedSchedules);
          setLoading(false);
          setError(null);
        };
        
        for (const q of queries) {
          const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!isMounted) return;
            const schedulesData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate?.() || new Date(),
              updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
            }));
            
            // Update the map with new/updated schedules
            schedulesData.forEach(schedule => {
              allSchedules.set(schedule.id, schedule);
            });
            
            // Update the state with all schedules
            updateSchedules();
          }, (error) => {
            if (!isMounted) return;
            console.error("Error fetching schedules:", error);
            setError(error.message);
            setLoading(false);
          });
          
          unsubscribes.push(unsubscribe);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("Error setting up schedule queries:", error);
        setError(error.message);
        setLoading(false);
      }
    };

    fetchSchedules();
    
    return () => {
      isMounted = false;
      unsubscribes.forEach(unsubscribe => {
        if (unsubscribe && typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      unsubscribes = [];
    };
  }, [refreshTrigger]);

  // Create a new schedule
  const createSchedule = async (scheduleData) => {
    try {
      if (!auth.currentUser) {
        throw new Error("User must be logged in");
      }

      // Get user data to determine caregiverId and creatorRole
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      const userData = userDocSnap.exists() ? userDocSnap.data() : {};
      
      const newSchedule = {
        ...scheduleData,
        userId: auth.currentUser.uid,
        creatorRole: userData.role || 'user',
        caregiverId: userData.caregiverId || (userData.role === 'caregiver' ? auth.currentUser.uid : null),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log("Creating schedule with data:", newSchedule);
      const docRef = await addDoc(collection(db, "schedules"), newSchedule);
      console.log("Schedule created with ID:", docRef.id);
      return { id: docRef.id, ...newSchedule };
    } catch (error) {
      console.error("Error creating schedule:", error);
      throw error;
    }
  };

  // Update an existing schedule
  const updateSchedule = async (scheduleId, updateData) => {
    try {
      // Validate scheduleId is a non-empty string
      if (!scheduleId || typeof scheduleId !== 'string' || scheduleId.trim() === '') {
        throw new Error("Invalid schedule ID: must be a non-empty string");
      }
      
      const scheduleRef = doc(db, "schedules", scheduleId);
      const updatePayload = {
        ...updateData,
        updatedAt: new Date(),
      };
      
      await updateDoc(scheduleRef, updatePayload);
      return { id: scheduleId, ...updatePayload };
    } catch (error) {
      console.error("Error updating schedule:", error);
      throw error;
    }
  };

  // Delete a schedule
  const deleteSchedule = async (scheduleId) => {
    try {
      // Validate scheduleId is a non-empty string
      if (!scheduleId || typeof scheduleId !== 'string' || scheduleId.trim() === '') {
        throw new Error("Invalid schedule ID: must be a non-empty string");
      }
      
      await deleteDoc(doc(db, "schedules", scheduleId));
      return true;
    } catch (error) {
      console.error("Error deleting schedule:", error);
      throw error;
    }
  };

  // Get a specific schedule by ID
  const getScheduleById = async (scheduleId) => {
    try {
      // Validate scheduleId is a non-empty string
      if (!scheduleId || typeof scheduleId !== 'string' || scheduleId.trim() === '') {
        throw new Error("Invalid schedule ID: must be a non-empty string");
      }
      
      const scheduleRef = doc(db, "schedules", scheduleId);
      const scheduleSnap = await getDoc(scheduleRef);
      
      if (scheduleSnap.exists()) {
        return {
          id: scheduleSnap.id,
          ...scheduleSnap.data(),
          createdAt: scheduleSnap.data().createdAt?.toDate?.() || new Date(),
          updatedAt: scheduleSnap.data().updatedAt?.toDate?.() || new Date(),
        };
      }
      return null;
    } catch (error) {
      console.error("Error fetching schedule:", error);
      throw error;
    }
  };

  // Get schedules by type (published/draft)
  const getSchedulesByType = (isPublished) => {
    return schedules.filter(schedule => schedule.isPublished === isPublished);
  };

  // Get published schedules
  const getPublishedSchedules = () => {
    return getSchedulesByType(true);
  };

  // Get draft schedules
  const getDraftSchedules = () => {
    return getSchedulesByType(false);
  };

  // Check if current user can edit a schedule
  const canEditSchedule = async (schedule) => {
    if (!auth.currentUser || !schedule) {
      console.log("canEditSchedule: No auth user or schedule");
      return false;
    }
    
    // Get current user's role
    let currentUserRole = null;
    try {
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      currentUserRole = userDocSnap.exists() ? userDocSnap.data().role : null;
    } catch (error) {
      console.error("Error getting user role:", error);
    }
    
    console.log("canEditSchedule check:", {
      currentUserId: auth.currentUser.uid,
      currentUserRole: currentUserRole,
      scheduleUserId: schedule.userId,
      scheduleCreatorRole: schedule.creatorRole,
      scheduleCaregiverId: schedule.caregiverId,
      isOwnSchedule: schedule.userId === auth.currentUser.uid
    });
    
    // User can edit their own schedules
    if (schedule.userId === auth.currentUser.uid) {
      console.log("canEditSchedule: User can edit own schedule");
      return true;
    }
    
    // Caregivers can edit any schedule they have access to (their own or from their teachers)
    if (currentUserRole === 'caregiver') {
      console.log("canEditSchedule: Caregiver can edit any accessible schedule");
      return true;
    }
    
    // Teachers cannot edit caregiver-created schedules
    if (currentUserRole === 'teacher' && schedule.creatorRole === 'caregiver' && schedule.userId !== auth.currentUser.uid) {
      console.log("canEditSchedule: Teacher cannot edit caregiver-created schedule");
      return false;
    }
    
    // For any other case (like children), they can only edit their own schedules
    console.log("canEditSchedule: No permission to edit");
    return false;
  };

  // Manual refresh function
  const refreshSchedules = async () => {
    console.log("Manually refreshing schedules...");
    try {
      // Force a refresh by incrementing the refresh trigger
      // This will cause the useEffect to re-run and re-establish the listeners
      setRefreshTrigger(prev => prev + 1);
      console.log("Manual refresh triggered - listeners will be re-established");
    } catch (error) {
      console.error("Error during manual refresh:", error);
    }
  };

  return {
    schedules,
    loading,
    error,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    getScheduleById,
    getPublishedSchedules,
    getDraftSchedules,
    getSchedulesByType,
    canEditSchedule,
    refreshSchedules,
  };
}
