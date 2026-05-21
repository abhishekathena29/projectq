import {
    addDoc,
    collection,
    limit,
    onSnapshot,
    orderBy,
    query,
    where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "../config/firebase";

export default function useRecentActivities() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    // Listen for recent activities owned by this user
    const q = query(
      collection(db, "recentActivities"),
      where("userId", "==", auth.currentUser.uid),
      orderBy("timestamp", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newActivities = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setActivities(newActivities);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addActivity = async (activityData) => {
    if (!auth.currentUser) return;

    try {
      await addDoc(collection(db, "recentActivities"), {
        ...activityData,
        userId: auth.currentUser.uid,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Error adding activity:", error);
    }
  };

  const addTimerActivity = async (duration, action = "started") => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    await addActivity({
      type: 'timer',
      title: `Timer ${action} (${timeString})`,
      icon: action === 'completed' ? '✅' : '⏰',
      duration: duration,
      action: action,
    });
  };

  return { activities, loading, addActivity, addTimerActivity };
}
