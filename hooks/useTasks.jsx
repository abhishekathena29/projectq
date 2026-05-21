// hooks/useTasks.js
import { useState, useEffect } from "react";
import { db, auth } from "../config/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

export default function useTasks() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Listen for tasks owned by this user
    const q = query(
      collection(db, "tasks"),
      where("userId", "==", auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newTasks = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setTasks(newTasks);
    });

    return () => unsubscribe();
  }, []);

  const addTask = async (task) => {
    if (!auth.currentUser) return;
    await addDoc(collection(db, "tasks"), {
      ...task,
      userId: auth.currentUser.uid,
      createdAt: Date.now(),
    });
  };

  const deleteTask = async (id) => {
    await deleteDoc(doc(db, "tasks", id));
  };

  const updateTask = async (id, updates) => {
    await updateDoc(doc(db, "tasks", id), updates);
  };

  return { tasks, addTask, deleteTask, updateTask };
}
