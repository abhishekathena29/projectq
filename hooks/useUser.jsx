import { doc, getDoc, getFirestore } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../config/firebase";

export default function useUser() {
  const [user] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setUserData(null);
        setLoading(false);
        return;
      }

      try {
        const db = getFirestore();
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          setUserData({
            uid: user.uid,
            name: userDocSnap.data().name || user.displayName || "User",
            email: user.email,
            role: userDocSnap.data().role,
            ...userDocSnap.data()
          });
        } else {
          // Fallback to auth user data
          setUserData({
            uid: user.uid,
            name: user.displayName || "User",
            email: user.email,
            role: "user"
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        // Fallback to auth user data
        setUserData({
          uid: user.uid,
          name: user.displayName || "User",
          email: user.email,
          role: "user"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  return { user, userData, loading };
}
