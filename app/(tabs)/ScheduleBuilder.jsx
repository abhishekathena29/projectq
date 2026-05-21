import { ScaledText } from "@/components/ScaledText";
import { ScaledTextInput } from "@/components/ScaledTextInput";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRoute } from "@react-navigation/native";
import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import EmojiIcon from "../../components/EmojiIcon";
import { auth, storage } from "../../config/firebase";
import { useNavigationData } from "../../contexts/NavigationContext";
import useSchedules from "../../hooks/useSchedules";
import useUser from "../../hooks/useUser";

export default function ScheduleBuilder() {
  const { userData, loading: userLoading } = useUser();
  const { createSchedule, updateSchedule, deleteSchedule, getScheduleById, canEditSchedule } = useSchedules();
  const { navigationData, setRoutineData, clearNavigationData } = useNavigationData();
  const route = useRoute();
  const { routine, isEditing, scheduleId: existingScheduleId, existingSchedule, routineName, mode, resetKey } = route.params || {};
  
  // Use context data if available, otherwise fall back to route params
  const currentRoutine = navigationData?.routine || routine;
  const currentIsEditing = navigationData?.isEditing || isEditing;
  const currentRoutineName = navigationData?.routineName || routineName;
  const currentExistingSchedule = navigationData?.routine || existingSchedule;
  
  // Debug: Log the received parameters
  console.log("ScheduleBuilder received params:", { 
    routeParams: { routine, isEditing, existingScheduleId, existingSchedule, routineName },
    contextData: navigationData,
    current: { currentRoutine, currentIsEditing, currentRoutineName, currentExistingSchedule }
  });
  
  const [scheduleName, setScheduleName] = useState(
    currentRoutineName || currentExistingSchedule?.name || currentRoutine?.scheduleName || "Morning"
  );
  const [steps, setSteps] = useState([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteAudioModal, setShowDeleteAudioModal] = useState(false);
  const [selectedStep, setSelectedStep] = useState(null);
  const [newStepName, setNewStepName] = useState("");
  const [newStepDuration, setNewStepDuration] = useState("2");
  const [newStepNotes, setNewStepNotes] = useState("");
  const [newStepTime, setNewStepTime] = useState(null);
  const [showAddStepForm, setShowAddStepForm] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [scheduleId, setScheduleId] = useState(existingScheduleId || null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const recordingRef = useRef(null); // single source of truth for active recording
  // Web-only: MediaRecorder + stream + collected chunks. On native this is unused.
  const webRecorderRef = useRef(null);
  const webStreamRef = useRef(null);
  const webChunksRef = useRef([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState(null); // 'selectedStep' or 'newStep'

  // Handle explicit "New Schedule" navigation requests (e.g., from dashboards)
  useEffect(() => {
    if (mode === "new" && resetKey) {
      console.log("ScheduleBuilder resetting for New Schedule action");
      
      // Clear any previous navigation context / editing state
      clearNavigationData();
      
      // Reset local builder state to represent a brand new schedule
      setScheduleId(null);
      setIsInitialized(false);
      setSelectedStep(null);
      setScheduleName("Morning");
      setSteps([]);
    }
  }, [mode, resetKey, clearNavigationData]);

  // Load schedule data from Firebase when editing existing schedule
  useEffect(() => {
    const loadScheduleData = async () => {
      // If we have an existing schedule ID, load it from Firebase
      if (existingScheduleId && !currentExistingSchedule) {
        setIsLoadingSchedule(true);
        try {
          console.log("Loading schedule from Firebase:", existingScheduleId);
          const scheduleData = await getScheduleById(existingScheduleId);
          if (scheduleData) {
            console.log("Loaded schedule data:", scheduleData);
            setScheduleName(scheduleData.name || "Morning");
            const loadedSteps = Array.isArray(scheduleData.steps) ? scheduleData.steps : [];
            setSteps(normalizeSteps(loadedSteps));
            setScheduleId(existingScheduleId);
            
            // Check if user can edit this schedule
            const editPermission = await canEditSchedule(scheduleData);
            setCanEdit(editPermission);
            console.log("Can edit schedule:", editPermission);
          } else {
            console.log("No schedule found, using defaults");
            setSteps([
              {
                id: 1,
                name: "Wake up",
                icon: "☀️",
                duration: "02:00",
                stepNumber: 1,
                notes: ""
              },
              {
                id: 2,
                name: "Brush teeth",
                icon: "🦷",
                duration: "03:00", 
                stepNumber: 2,
                notes: ""
              }
            ]);
          }
        } catch (error) {
          console.error("Error loading schedule:", error);
          // Fall back to default steps
          setSteps([
            {
              id: 1,
              name: "Wake up",
              icon: "☀️",
              duration: "02:00",
              stepNumber: 1,
              notes: ""
            },
            {
              id: 2,
              name: "Brush teeth",
              icon: "🦷",
              duration: "03:00", 
              stepNumber: 2,
              notes: ""
            }
          ]);
        } finally {
          setIsLoadingSchedule(false);
        }
      } else if (currentExistingSchedule?.steps) {
        // Use data from navigation context
        console.log("Using schedule data from navigation context:", currentExistingSchedule);
        setScheduleName(currentExistingSchedule.name || "Morning");
        const contextSteps = Array.isArray(currentExistingSchedule.steps) ? currentExistingSchedule.steps : [];
        setSteps(normalizeSteps(contextSteps));
        if (currentExistingSchedule.id) {
          setScheduleId(currentExistingSchedule.id);
        }
        
        // Check if user can edit this schedule
        const editPermission = await canEditSchedule(currentExistingSchedule);
        setCanEdit(editPermission);
        console.log("Can edit schedule from context:", editPermission);
      } else if (currentRoutine?.predefinedSteps) {
        // Use predefined steps from routine
        console.log("Using predefined steps from routine:", currentRoutine);
        console.log("User role:", userData?.role, "- Can create new schedule from routine:", true);
        setScheduleName(currentRoutine.scheduleName || currentRoutine.title || "Morning");
        const routineSteps = Array.isArray(currentRoutine.predefinedSteps) ? currentRoutine.predefinedSteps : [];
        setSteps(normalizeSteps(routineSteps));
        setCanEdit(true); // New schedules can always be edited
      } else {
        // Default steps for new schedule
        console.log("Using default steps for new schedule");
        console.log("User role:", userData?.role, "- Can create new schedule:", true);
        setCanEdit(true); // New schedules can always be edited
        setSteps([
          {
            id: 1,
            name: "Wake up",
            icon: "☀️",
            duration: "02:00",
            stepNumber: 1,
            notes: ""
          },
          {
            id: 2,
            name: "Brush teeth",
            icon: "🦷",
            duration: "03:00", 
            stepNumber: 2,
            notes: ""
          }
        ]);
      }
      
      setIsInitialized(true);
    };

    // Only load if not already initialized or if we have new data
    if (!isInitialized || (currentRoutine && !isInitialized)) {
      loadScheduleData();
    }
  }, [existingScheduleId, currentExistingSchedule, currentRoutine]);

  // Set initial selected step when steps are loaded
  useEffect(() => {
    if ((steps || []).length > 0 && !selectedStep) {
      setSelectedStep(steps[0]);
    }
  }, [steps]);

  // NOTE: We no longer auto-stop recordings when switching steps to avoid
  // double-unloading issues. The user explicitly controls start/stop.

  // Update state when navigation data changes
  useEffect(() => {
    if (navigationData) {
      console.log("Navigation data changed, updating state:", navigationData);
      
      // Reset initialization to allow re-processing
      setIsInitialized(false);
      
      // Process routine data from navigation context
      const routine = navigationData.routine;
      if (routine) {
        // Set schedule name
        const routineName = navigationData.routineName || routine.scheduleName || routine.title || "Morning";
        setScheduleName(routineName);
        
        // Set steps from predefined steps or existing steps
        const newSteps = routine.predefinedSteps || routine.steps || [];
        if (Array.isArray(newSteps) && newSteps.length > 0) {
          setSteps(normalizeSteps(newSteps));
          
          // Set the first step as selected if there are steps and no current selection
          if (!selectedStep) {
            setSelectedStep(newSteps[0]);
          }
        }
        
        // If this is an existing schedule with an ID, set it
        if (routine.id) {
          setScheduleId(routine.id);
        } else {
          // Reset schedule ID for new routines
          setScheduleId(null);
        }
      }
      
      setIsInitialized(true);
    }
  }, [navigationData]);

  // Reload schedule data when scheduleId changes (after adding steps)
  useEffect(() => {
    const reloadScheduleData = async () => {
      if (scheduleId && typeof scheduleId === 'string' && isInitialized && !isReloading) {
        console.log("Reloading schedule data for ID:", scheduleId);
        setIsReloading(true);
        try {
          const scheduleData = await getScheduleById(scheduleId);
          if (scheduleData) {
            console.log("Reloaded schedule data:", scheduleData);
            const reloadedSteps = Array.isArray(scheduleData.steps) ? scheduleData.steps : [];
            setSteps(normalizeSteps(reloadedSteps));
            setScheduleName(scheduleData.name || "Morning");
          }
        } catch (error) {
          console.error("Error reloading schedule data:", error);
        } finally {
          setIsReloading(false);
        }
      }
    };

    reloadScheduleData();
  }, [scheduleId, isInitialized]);

  // Cleanup navigation data when component unmounts
  useEffect(() => {
    return () => {
      // Only clear if we're not in the middle of editing
      if (!isInitialized || steps.length === 0) {
        clearNavigationData();
      }
    };
  }, [clearNavigationData, isInitialized, steps.length]);

  const icons = [
    "☀️", "🦷", "👕", "🎒", "🎁", "🚂", "📚", "❤️", "🛏️", "⭐", "🎵", "🎨",
    "🍎", "🚿", "🧼", "👟", "📱", "🍽️", "🧸", "🎯", "🎪", "🌈", "🔍", "💡"
  ];

  // Helper function to ensure steps have default colorTag and voicePrompt
  const normalizeSteps = (stepsArray) => {
    const colors = ["#FF6B6B", "#4ECDC4", "#95E1D3", "#FFE66D", "#A8E6CF"];
    return stepsArray.map((step, index) => ({
      ...step,
      colorTag: step.colorTag || colors[index % colors.length],
      voicePrompt: step.voicePrompt || `Time for ${step.name}! Come on, let's go!`,
      audioNote: step.audioNote || null,
      time: step.time || null
    }));
  };

  // Web-only time input using native browser clock/time UI
  const WebTimeInput = ({ value, onChange, disabled }) => {
    if (Platform.OS !== "web") return null;

    return (
      <input
        type="time"
        value={value || ""}
        disabled={disabled}
        onChange={(e) => {
          if (onChange) {
            onChange(e.target.value);
          }
        }}
        style={{
          width: "100%",
          padding: 6,
          borderRadius: 4,
          border: "1px solid #dee2e6",
          fontSize: 11,
          boxSizing: "border-box",
          backgroundColor: disabled ? "#f5f5f5" : "#ffffff",
          color: "#2c3e50",
        }}
      />
    );
  };

  const parseTimeToDate = (timeString) => {
    const date = new Date();
    if (!timeString || typeof timeString !== "string") {
      date.setSeconds(0);
      date.setMilliseconds(0);
      return date;
    }
    const [hourStr, minuteStr] = timeString.split(":");
    const hours = parseInt(hourStr, 10);
    const minutes = parseInt(minuteStr, 10);
    if (!isNaN(hours)) {
      date.setHours(hours);
    }
    if (!isNaN(minutes)) {
      date.setMinutes(minutes);
    }
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
  };

  const formatDateToTimeString = (date) => {
    if (!(date instanceof Date)) return null;
    const hours = `${date.getHours()}`.padStart(2, "0");
    const minutes = `${date.getMinutes()}`.padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const handleTimeChange = (event, selectedDate) => {
    // On Android, user can dismiss the picker
    if (Platform.OS !== "ios") {
      setShowTimePicker(false);
    }

    // For iOS, the picker stays open; we don't auto-close
    if (event.type !== "set" || !selectedDate) {
      return;
    }

    const timeString = formatDateToTimeString(selectedDate);
    if (!timeString) return;

    if (timePickerTarget === "selectedStep" && selectedStep) {
      updateSelectedStep("time", timeString);
    } else if (timePickerTarget === "newStep") {
      setNewStepTime(timeString);
    }
  };

  // Request audio permissions (native only — on web the browser prompts on getUserMedia)
  useEffect(() => {
    if (Platform.OS === "web") return;
    (async () => {
      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      } catch (err) {
        console.error("Failed to set up audio:", err);
      }
    })();
  }, []);

  // Cleanup recording on unmount - guard against double unload
  useEffect(() => {
    return () => {
      const activeRecording = recordingRef.current;
      if (activeRecording) {
        activeRecording.stopAndUnloadAsync().catch(() => {
          console.log("Recording already unloaded on unmount");
        });
      }
      // Also tear down any web mic stream that may still be live
      if (webStreamRef.current) {
        webStreamRef.current.getTracks().forEach((t) => t.stop());
        webStreamRef.current = null;
      }
      webRecorderRef.current = null;
      webChunksRef.current = [];
    };
  }, []);

  // Pick the first MIME type the browser actually supports. Pi Chromium
  // supports webm/opus; other browsers may prefer ogg or mp4.
  const pickWebRecorderMimeType = () => {
    if (typeof window === "undefined" || !window.MediaRecorder) return "";
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/ogg",
      "audio/mp4",
      "",
    ];
    for (const t of candidates) {
      if (!t) return ""; // last resort — let the browser pick
      try {
        if (window.MediaRecorder.isTypeSupported(t)) return t;
      } catch {
        // fall through
      }
    }
    return "";
  };

  const startWebRecording = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      Alert.alert(
        "Recording Not Supported",
        "This browser does not expose a microphone API. Try a different browser."
      );
      return;
    }
    if (typeof window === "undefined" || !window.MediaRecorder) {
      Alert.alert(
        "Recording Not Supported",
        "This browser does not support audio recording (MediaRecorder is missing)."
      );
      return;
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error("getUserMedia failed:", err);
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        Alert.alert(
          "Microphone Blocked",
          "Allow microphone access for this site in your browser settings, then try again."
        );
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        Alert.alert(
          "No Microphone Found",
          "No microphone is connected. Plug one in and try again."
        );
      } else if (name === "NotReadableError") {
        Alert.alert(
          "Microphone In Use",
          "Another app is using the microphone. Close it and try again."
        );
      } else {
        Alert.alert("Recording Error", err?.message || "Could not access the microphone.");
      }
      return;
    }

    try {
      const mimeType = pickWebRecorderMimeType();
      const recorder = mimeType
        ? new window.MediaRecorder(stream, { mimeType })
        : new window.MediaRecorder(stream);

      webChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          webChunksRef.current.push(event.data);
        }
      };
      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event?.error || event);
        Alert.alert("Recording Error", event?.error?.message || "Recording failed.");
      };

      webRecorderRef.current = recorder;
      webStreamRef.current = stream;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start MediaRecorder:", err);
      stream.getTracks().forEach((t) => t.stop());
      Alert.alert("Recording Error", err?.message || "Could not start recording.");
    }
  };

  const startRecording = async () => {
    if (!selectedStep) {
      Alert.alert("Error", "Please select a step first");
      return;
    }

    if (Platform.OS === "web") {
      await startWebRecording();
      return;
    }

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant microphone permission to record audio"
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
      Alert.alert("Error", err?.message || "Failed to start recording. Please try again.");
    }
  };

  const stopWebRecording = async () => {
    const recorder = webRecorderRef.current;
    if (!recorder) return;

    const blob = await new Promise((resolve) => {
      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        resolve(new Blob(webChunksRef.current, { type }));
      };
      try {
        recorder.stop();
      } catch (err) {
        console.error("MediaRecorder.stop() failed:", err);
        resolve(new Blob(webChunksRef.current, { type: "audio/webm" }));
      }
    });

    if (webStreamRef.current) {
      webStreamRef.current.getTracks().forEach((t) => t.stop());
      webStreamRef.current = null;
    }
    webRecorderRef.current = null;
    webChunksRef.current = [];

    // Hand the recorded blob to the existing upload path via a blob URL.
    const uri = URL.createObjectURL(blob);
    setRecordingUri(uri);
    setIsRecording(false);
    await uploadRecordedAudio(uri);
    // Revoke after upload to free memory.
    try {
      URL.revokeObjectURL(uri);
    } catch {
      // ignore
    }
  };

  const stopRecording = async () => {
    if (Platform.OS === "web") {
      try {
        await stopWebRecording();
      } catch (err) {
        console.error("Failed to stop web recording:", err);
        Alert.alert("Error", err?.message || "Failed to stop recording");
        setIsRecording(false);
      }
      return;
    }

    const activeRecording = recordingRef.current;
    if (!activeRecording) return;

    try {
      setIsRecording(false);
      await activeRecording.stopAndUnloadAsync();
      const uri = activeRecording.getURI();
      setRecordingUri(uri);
      recordingRef.current = null;

      if (uri) {
        await uploadRecordedAudio(uri);
      }
    } catch (err) {
      console.error("Failed to stop recording:", err);
      Alert.alert("Error", "Failed to stop recording");
    }
  };

  const uploadRecordedAudio = async (uri) => {
    if (!selectedStep || !uri) return;

    setIsUploading(true);
    try {
      // On web, MediaRecorder produces webm/opus (or similar), not m4a/AAC.
      // Using the right extension matters for cross-browser playback —
      // e.g. Chromium on Raspberry Pi OS lacks AAC support but plays webm/opus.
      const extension = Platform.OS === "web" ? "webm" : "m4a";
      const audioUri = await uploadAudioToFirebase(
        uri,
        `recording_${Date.now()}.${extension}`
      );
      if (audioUri) {
        updateSelectedStep('audioNote', audioUri);
        setRecordingUri(null);
        Alert.alert("Success", "Audio note recorded and saved!");
      }
    } catch (error) {
      console.error("Error uploading recorded audio:", error);
      Alert.alert("Error", "Failed to upload audio. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const pickAudioFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileUri = result.assets[0].uri;
        setIsUploading(true);
        
        try {
          const fileName = result.assets[0].name || `audio_${Date.now()}.${result.assets[0].mimeType?.split('/')[1] || 'm4a'}`;
          const audioUri = await uploadAudioToFirebase(fileUri, fileName);
          
          if (audioUri) {
            updateSelectedStep('audioNote', audioUri);
            Alert.alert("Success", "Audio file uploaded successfully!");
          }
        } catch (error) {
          console.error("Error uploading audio file:", error);
          Alert.alert("Error", "Failed to upload audio file. Please try again.");
        } finally {
          setIsUploading(false);
        }
      }
    } catch (err) {
      console.error("Error picking audio file:", err);
      Alert.alert("Error", "Failed to pick audio file. Please try again.");
    }
  };

  const uploadAudioToFirebase = async (localUri, fileName) => {
    try {
      if (!auth.currentUser) {
        throw new Error("User not authenticated");
      }

      // Fetch the file as a blob
      const response = await fetch(localUri);
      const blob = await response.blob();

      // Create a unique path for the audio file
      const audioRef = ref(storage, `audio-notes/${auth.currentUser.uid}/${scheduleId || 'temp'}/${selectedStep.id}/${fileName}`);

      // Upload the file
      await uploadBytes(audioRef, blob);

      // Get the download URL
      const downloadURL = await getDownloadURL(audioRef);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading to Firebase:", error);
      throw error;
    }
  };

  const deleteAudioNote = () => {
    // Open confirmation modal; actual delete happens on confirm
    setShowDeleteAudioModal(true);
  };

  const confirmDeleteAudioNote = () => {
    // Remove audio note from the selected step
    updateSelectedStep('audioNote', null);
    setRecordingUri(null);
    setShowDeleteAudioModal(false);
  };

  const cancelDeleteAudioNote = () => {
    setShowDeleteAudioModal(false);
  };

  const addStep = async () => {
    if (newStepName.trim() === "") return;
    
    if (!userData) {
      Alert.alert("Error", "You must be logged in to add steps.");
      return;
    }
    
    const newStep = {
      id: Date.now(), // Use timestamp for unique ID
      name: newStepName,
      icon: "⭐",
      duration: `${newStepDuration.padStart(2, '0')}:00`,
      stepNumber: (steps || []).length + 1,
      notes: newStepNotes,
      colorTag: "#FF6B6B", // Default to first color
      voicePrompt: `Time for ${newStepName}! Come on, let's go!`,
      audioNote: null,
      time: newStepTime || null
    };
    
    const updatedSteps = [...(steps || []), newStep];
    setSteps(updatedSteps);
    setSelectedStep(newStep); // Select the newly created step
    
    console.log("Added new step:", newStep);
    console.log("Updated steps array after adding:", updatedSteps);
    setNewStepName("");
    setNewStepDuration("2");
    setNewStepNotes("");
    setNewStepTime(null);
    setShowAddStepForm(false);

    // Auto-save to Firebase
    setIsAutoSaving(true);
    try {
      const currentScheduleId = scheduleId || existingScheduleId;
      if (currentScheduleId && typeof currentScheduleId === 'string' && currentScheduleId.trim() !== '') {
        // Update existing schedule
        console.log("Updating existing schedule:", currentScheduleId);
        await updateSchedule(currentScheduleId, {
          name: scheduleName,
          steps: updatedSteps,
          isPublished: false, // Keep as draft when adding steps
          routineType: currentRoutine?.title || currentRoutine?.scheduleName || "Custom"
        });
        console.log("Schedule updated successfully");
      } else {
        // Create new schedule if none exists
        const routineType = currentRoutine?.title || currentRoutine?.scheduleName || "Custom";
        console.log("Creating new schedule with steps:", updatedSteps.length, "routineType:", routineType);
        const newSchedule = await createSchedule({
          name: scheduleName,
          steps: updatedSteps,
          isPublished: false, // Keep as draft when adding steps
          routineType: routineType
        });
        console.log("New schedule created:", newSchedule.id);
        setScheduleId(newSchedule.id);
        
        // Also update the navigation data with the new schedule ID
        if (navigationData) {
          setRoutineData({
            ...navigationData.routine,
            id: newSchedule.id
          }, navigationData.isEditing, navigationData.routineName);
        }
      }
    } catch (error) {
      console.error("Error auto-saving step:", error);
      Alert.alert("Error", `Failed to save step: ${error.message}`);
    } finally {
      setIsAutoSaving(false);
    }
  };

  const cancelAddStep = () => {
    setNewStepName("");
    setNewStepDuration("2");
    setNewStepNotes("");
    setNewStepTime(null);
    setShowAddStepForm(false);
  };

  const publishSchedule = async () => {
    if (!userData) {
      Alert.alert("Error", "You must be logged in to publish a schedule.");
      return;
    }

    if (scheduleName.trim() === "") {
      Alert.alert("Error", "Please enter a schedule name.");
      return;
    }

    if ((steps || []).length === 0) {
      Alert.alert("Error", "Please add at least one step to the schedule.");
      return;
    }

    setIsPublishing(true);

    try {
      const scheduleData = {
        name: scheduleName.trim(),
        steps: steps,
        isPublished: true,
        routineType: routine?.title || "Custom"
      };

      const currentScheduleId = scheduleId || existingScheduleId;
      if (currentScheduleId && typeof currentScheduleId === 'string' && currentScheduleId.trim() !== '') {
        // Update existing schedule
        await updateSchedule(currentScheduleId, scheduleData);
        Alert.alert("Success", "Schedule updated successfully!");
      } else {
        // Create new schedule
        const newSchedule = await createSchedule(scheduleData);
        setScheduleId(newSchedule.id);
        Alert.alert("Success", "Schedule published successfully!");
      }
    } catch (error) {
      console.error("Error publishing schedule:", error);
      Alert.alert("Error", "Failed to publish schedule. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUpdateSchedule = async () => {
    if (!userData) {
      Alert.alert("Error", "You must be logged in to update a schedule.");
      return;
    }

    if (scheduleName.trim() === "") {
      Alert.alert("Error", "Please enter a schedule name.");
      return;
    }

    if ((steps || []).length === 0) {
      Alert.alert("Error", "Please add at least one step to the schedule.");
      return;
    }

    const currentScheduleId = scheduleId || existingScheduleId;
    if (!currentScheduleId || typeof currentScheduleId !== 'string' || currentScheduleId.trim() === '') {
      Alert.alert("Error", "No schedule ID found. Please create a new schedule first.");
      return;
    }

    try {
      const scheduleData = {
        name: scheduleName.trim(),
        steps: steps,
        isPublished: false, // Keep as draft when updating
        routineType: routine?.title || "Custom"
      };

      await updateSchedule(currentScheduleId, scheduleData);
      Alert.alert("Success", "Schedule updated successfully!");
    } catch (error) {
      console.error("Error updating schedule:", error);
      Alert.alert("Error", "Failed to update schedule. Please try again.");
    }
  };

  const handleDeleteSchedule = async () => {
    if (!userData) {
      Alert.alert("Error", "You must be logged in to delete a schedule.");
      return;
    }

    const currentScheduleId = scheduleId || existingScheduleId;
    if (!currentScheduleId || typeof currentScheduleId !== 'string' || currentScheduleId.trim() === '') {
      Alert.alert("Error", "No schedule ID found. Cannot delete schedule.");
      return;
    }

    try {
      await deleteSchedule(currentScheduleId);
      Alert.alert("Success", "Schedule deleted successfully!");
      // Navigate back or reset the form
      setSteps([]);
      setScheduleName("Morning");
      setScheduleId(null);
      setSelectedStep(null);
      setShowDeleteModal(false);
    } catch (error) {
      console.error("Error deleting schedule:", error);
      Alert.alert("Error", "Failed to delete schedule. Please try again.");
    }
  };

  const deleteStep = async (stepId) => {
    const updatedSteps = (steps || []).filter(step => step.id !== stepId);
    const renumberedSteps = updatedSteps.map((step, index) => ({
      ...step,
      stepNumber: index + 1
    }));
    setSteps(renumberedSteps);
    if (selectedStep?.id === stepId && renumberedSteps.length > 0) {
      setSelectedStep(renumberedSteps[0]);
    }

    // Auto-save to Firebase
    try {
      const currentScheduleId = scheduleId || existingScheduleId;
      if (currentScheduleId && typeof currentScheduleId === 'string' && currentScheduleId.trim() !== '') {
        // Update existing schedule
        await updateSchedule(currentScheduleId, {
          name: scheduleName,
          steps: renumberedSteps,
          isPublished: false, // Keep as draft when deleting steps
          routineType: currentRoutine?.title || currentRoutine?.scheduleName || "Custom"
        });
      } else if (renumberedSteps.length > 0) {
        // Create new schedule if none exists and there are still steps
        const newSchedule = await createSchedule({
          name: scheduleName,
          steps: renumberedSteps,
          isPublished: false, // Keep as draft when deleting steps
          routineType: currentRoutine?.title || currentRoutine?.scheduleName || "Custom"
        });
        setScheduleId(newSchedule.id);
        
        // Also update the navigation data with the new schedule ID
        if (navigationData) {
          setRoutineData({
            ...navigationData.routine,
            id: newSchedule.id
          }, navigationData.isEditing, navigationData.routineName);
        }
      }
    } catch (error) {
      console.error("Error auto-saving step deletion:", error);
      Alert.alert("Warning", "Step deleted locally but failed to save to cloud. Please save manually.");
    }
  };

  const updateSelectedStep = async (field, value) => {
    if (!selectedStep) return; // Safety check
    
    const updatedStep = { ...selectedStep, [field]: value };
    setSelectedStep(updatedStep);
    const updatedSteps = (steps || []).map(step => 
      step.id === selectedStep?.id ? updatedStep : step
    );
    setSteps(updatedSteps);
    
    console.log("Updated step:", updatedStep);
    console.log("Updated steps array:", updatedSteps);

    // Auto-save to Firebase
    try {
      const currentScheduleId = scheduleId || existingScheduleId;
      if (currentScheduleId && typeof currentScheduleId === 'string' && currentScheduleId.trim() !== '') {
        // Update existing schedule
        await updateSchedule(currentScheduleId, {
          name: scheduleName,
          steps: updatedSteps,
          isPublished: false, // Keep as draft when editing steps
          routineType: currentRoutine?.title || currentRoutine?.scheduleName || "Custom"
        });
      } else {
        // Create new schedule if none exists
        const newSchedule = await createSchedule({
          name: scheduleName,
          steps: updatedSteps,
          isPublished: false, // Keep as draft when editing steps
          routineType: currentRoutine?.title || currentRoutine?.scheduleName || "Custom"
        });
        setScheduleId(newSchedule.id);
        
        // Also update the navigation data with the new schedule ID
        if (navigationData) {
          setRoutineData({
            ...navigationData.routine,
            id: newSchedule.id
          }, navigationData.isEditing, navigationData.routineName);
        }
      }
    } catch (error) {
      console.error("Error auto-saving step update:", error);
      // Don't show alert for every keystroke, just log the error
    }
  };

  if (userLoading || isLoadingSchedule) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#20B2AA" />
          <ScaledText style={styles.loadingText}>
            {isLoadingSchedule ? "Loading schedule..." : "Loading..."}
          </ScaledText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ScaledText style={styles.logo}>MyDayPal</ScaledText>
          <ScaledText style={styles.pageTitle}>
            {currentIsEditing ? `Edit ${currentRoutineName || scheduleName}` : "Create Schedule"}
          </ScaledText>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Read-only indicator - show for teachers and children viewing caregiver-created routines */}
        {!canEdit && (userData?.role === 'teacher' || userData?.role === 'child') && (
          <View style={styles.readOnlyBanner}>
            <View style={styles.readOnlyBannerContent}>
              <EmojiIcon emoji="📖" size={12} color="#856404" />
              <ScaledText style={styles.readOnlyText}>
                {userData?.role === 'child' 
                  ? ' Read-only mode - You can view this schedule but cannot edit it'
                  : ' Read-only mode - You can view this caregiver-created routine but cannot edit it'}
              </ScaledText>
            </View>
          </View>
        )}
        
        {/* Schedule Name and Actions */}
        <View style={styles.scheduleSection}>
          <View style={styles.scheduleNameContainer}>
        <ScaledTextInput
              style={[styles.scheduleNameInput, !canEdit && styles.readOnlyInput]}
              value={scheduleName}
              onChangeText={canEdit ? setScheduleName : undefined}
              placeholder="Schedule name (e.g., Morning)"
              placeholderTextColor="#999"
              editable={canEdit}
        />
            {isAutoSaving && (
              <View style={styles.autoSaveIndicator}>
                <ActivityIndicator size="small" color="#20B2AA" />
                <ScaledText style={styles.autoSaveText}>Saving...</ScaledText>
              </View>
            )}
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.publishButton, (isPublishing || !canEdit) && styles.disabledButton]}
              onPress={canEdit ? publishSchedule : undefined}
              disabled={isPublishing || !canEdit}
            >
              {isPublishing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <EmojiIcon emoji="▶️" size={10} color="#fff" />
              )}
              <ScaledText style={[styles.actionButtonText, styles.publishButtonText]}>
                {isPublishing ? "Publishing..." : "Publish"}
              </ScaledText>
            </TouchableOpacity>
            
            {(scheduleId || existingScheduleId) && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.updateButton, !canEdit && styles.disabledButton]}
                onPress={canEdit ? () => setShowUpdateModal(true) : undefined}
                disabled={!canEdit}
              >
                <EmojiIcon emoji="✏️" size={10} color="#fff" />
                <ScaledText style={[styles.actionButtonText, styles.updateButtonText]}>Update</ScaledText>
              </TouchableOpacity>
            )}
            
            {(scheduleId || existingScheduleId) && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteButton, !canEdit && styles.disabledButton]}
                onPress={canEdit ? () => setShowDeleteModal(true) : undefined}
                disabled={!canEdit}
              >
                <EmojiIcon emoji="🗑️" size={10} color="#fff" />
                <ScaledText style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</ScaledText>
              </TouchableOpacity>
            )}
          </View>
      </View>

        <View style={styles.mainContent}>
          {/* Steps Panel */}
          <View style={styles.stepsPanel}>
            <View style={styles.panelHeader}>
              <ScaledText style={styles.panelTitle}>Steps ({(steps || []).length})</ScaledText>
            </View>
            
            <ScrollView style={styles.stepsList}>
              {(steps || []).map((step) => (
                <TouchableOpacity
                  key={step.id}
                  style={[
                    styles.stepItem,
                    selectedStep?.id === step.id && styles.selectedStepItem
                  ]}
                  onPress={canEdit ? () => setSelectedStep(step) : undefined}
                >
                  <ScaledText style={styles.dragHandle}>⋮⋮</ScaledText>
                  <View
                    style={[
                      styles.stepColorTag,
                      { backgroundColor: step.colorTag || "#FF6B6B" },
                    ]}
                  />
                  <View style={styles.stepIconContainer}>
                    <EmojiIcon emoji={step.icon} size={14} />
                  </View>
                  <View style={styles.stepInfo}>
                    <ScaledText style={styles.stepName}>{step.name}</ScaledText>
                    <ScaledText style={styles.stepDuration}>{step.duration}</ScaledText>
                    {step.time && (
                      <ScaledText style={styles.stepTime}>⏰ {step.time}</ScaledText>
                    )}
                    <ScaledText style={styles.stepNumber}>Step {step.stepNumber}</ScaledText>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteStepBtn}
                    onPress={() => deleteStep(step.id)}
                  >
                    <EmojiIcon emoji="🗑️" size={12} color="#dc3545" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity
              style={[styles.addStepButton, !canEdit && styles.disabledButton]} 
              onPress={canEdit ? () => setShowAddStepForm(true) : undefined}
              disabled={!canEdit}
            >
              <ScaledText style={[styles.addStepButtonText, !canEdit && styles.disabledButtonText]}>+ Add Step</ScaledText>
            </TouchableOpacity>

            {/* Add Step Form */}
            {showAddStepForm && (
              <View style={styles.addStepForm}>
                <ScaledText style={styles.addStepFormTitle}>Add New Step</ScaledText>
                
                <View style={styles.inputGroup}>
                  <ScaledText style={styles.inputLabel}>Step Name</ScaledText>
                  <ScaledTextInput
                    style={styles.textInput}
                    value={newStepName}
                    onChangeText={setNewStepName}
                    placeholder="Enter step name"
                    autoFocus
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ScaledText style={styles.inputLabel}>Duration (minutes)</ScaledText>
                  <ScaledTextInput
                    style={styles.textInput}
                    value={newStepDuration}
                    onChangeText={setNewStepDuration}
                    placeholder="2"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ScaledText style={styles.inputLabel}>Time of Day</ScaledText>
                  {Platform.OS === "web" ? (
                    <WebTimeInput
                      value={newStepTime || ""}
                      onChange={setNewStepTime}
                    />
                  ) : (
                    <TouchableOpacity
                      style={styles.timeButton}
                      onPress={() => {
                        setTimePickerTarget("newStep");
                        setShowTimePicker(true);
                      }}
                    >
                      <ScaledText style={styles.timeButtonText}>
                        {newStepTime ? `⏰ ${newStepTime}` : "Set time using clock"}
                      </ScaledText>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <ScaledText style={styles.inputLabel}>Notes (optional)</ScaledText>
                  <ScaledTextInput
                    style={styles.notesInput}
                    value={newStepNotes}
                    onChangeText={setNewStepNotes}
                    placeholder="Additional instructions or notes..."
                    multiline
                    numberOfLines={2}
                  />
                </View>

                <View style={styles.addStepFormButtons}>
                  <TouchableOpacity 
                    style={[styles.formButton, styles.cancelButton]} 
                    onPress={cancelAddStep}
                  >
                    <ScaledText style={styles.cancelButtonText}>Cancel</ScaledText>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.formButton, styles.saveButton]} 
                    onPress={addStep}
                  >
                    <ScaledText style={styles.saveButtonText}>Add Step</ScaledText>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Edit Step Panel */}
          <View style={styles.editPanel}>
            <ScaledText style={styles.panelTitle}>Edit Step</ScaledText>
            
            {selectedStep ? (
              <>
                {/* Step Name */}
                <View style={styles.inputGroup}>
                  <ScaledText style={styles.inputLabel}>Step Name</ScaledText>
                  <ScaledTextInput
                    style={[styles.textInput, !canEdit && styles.readOnlyInput]}
                    value={selectedStep.name || ''}
                    onChangeText={canEdit ? (value) => updateSelectedStep('name', value) : undefined}
                    placeholder="Enter step name"
                    editable={canEdit}
                  />
                </View>

            {/* Icon Selection */}
            <View style={styles.inputGroup}>
              <ScaledText style={styles.inputLabel}>Icon</ScaledText>
              <View style={styles.iconSearchContainer}>
                <EmojiIcon emoji="🔍" size={14} color="#999" style={styles.iconSearchIcon} />
                <ScaledTextInput
                  style={styles.iconSearchInput}
                  placeholder="Search Icons"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.iconGrid}>
                {icons.map((icon, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.iconButton,
                      selectedStep.icon === icon && styles.selectedIconButton
                    ]}
                    onPress={canEdit ? () => updateSelectedStep('icon', icon) : undefined}
                  >
                    <EmojiIcon emoji={icon} size={16} color={selectedStep.icon === icon ? "#fff" : undefined} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Timer Duration */}
            <View style={styles.inputGroup}>
              <ScaledText style={styles.inputLabel}>Timer Duration</ScaledText>
              <View style={styles.durationInput}>
                <ScaledTextInput
                  style={[styles.durationTextInput, !canEdit && styles.readOnlyInput]}
                  value={selectedStep.duration?.split(':')[0] || '2'}
                  onChangeText={canEdit ? (value) => updateSelectedStep('duration', `${value.padStart(2, '0')}:00`) : undefined}
                  keyboardType="numeric"
                  editable={canEdit}
                />
                <ScaledText style={styles.durationLabel}>minutes</ScaledText>
              </View>
            </View>

            {/* Time of Day */}
            <View style={styles.inputGroup}>
              <ScaledText style={styles.inputLabel}>Time of Day</ScaledText>
              {Platform.OS === "web" ? (
                <WebTimeInput
                  value={selectedStep.time || ""}
                  onChange={canEdit ? (value) => updateSelectedStep("time", value) : undefined}
                  disabled={!canEdit}
                />
              ) : (
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={canEdit ? () => {
                    setTimePickerTarget("selectedStep");
                    setShowTimePicker(true);
                  } : undefined}
                  disabled={!canEdit}
                >
                  <ScaledText style={styles.timeButtonText}>
                    {selectedStep.time ? `⏰ ${selectedStep.time}` : "Set time using clock"}
                  </ScaledText>
                </TouchableOpacity>
              )}
            </View>

            {/* Color Tag */}
            <View style={styles.inputGroup}>
              <ScaledText style={styles.inputLabel}>Color Tag</ScaledText>
              <View style={styles.colorGrid}>
                {[
                  { name: "Red", value: "#FF6B6B" },
                  { name: "Blue", value: "#4ECDC4" },
                  { name: "Green", value: "#95E1D3" },
                  { name: "Yellow", value: "#FFE66D" },
                  { name: "Purple", value: "#A8E6CF" }
                ].map((color) => (
                  <TouchableOpacity
                    key={color.value}
                    style={[
                      styles.colorButton,
                      selectedStep.colorTag === color.value && styles.selectedColorButton,
                      { backgroundColor: color.value }
                    ]}
                    onPress={canEdit ? () => updateSelectedStep('colorTag', color.value) : undefined}
                  >
                    {selectedStep.colorTag === color.value && (
                      <ScaledText style={styles.colorCheckmark}>✓</ScaledText>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Caregiver Voice Prompt */}
            <View style={styles.inputGroup}>
              <ScaledText style={styles.inputLabel}>Caregiver Voice Prompt</ScaledText>
              <ScaledTextInput
                style={[styles.voicePromptInput, !canEdit && styles.readOnlyInput]}
                value={selectedStep.voicePrompt || ''}
                onChangeText={canEdit ? (value) => updateSelectedStep('voicePrompt', value) : undefined}
                placeholder="Time for this activity! Come on, let's go play now."
                placeholderTextColor="#999"
                editable={canEdit}
                multiline
                numberOfLines={2}
              />
              <ScaledText style={styles.inputHint}>
                This encouraging message will be spoken when the activity starts
              </ScaledText>
            </View>

            {/* Audio Note */}
            <View style={styles.inputGroup}>
              <ScaledText style={styles.inputLabel}>Audio Note (Optional)</ScaledText>
              <View style={styles.audioButtons}>
                <TouchableOpacity 
                  style={[styles.audioButton, (isUploading || isRecording) && styles.disabledButton]}
                  onPress={canEdit && !isUploading && !isRecording ? pickAudioFile : undefined}
                  disabled={!canEdit || isUploading || isRecording}
                >
                  {isUploading ? (
                    <ActivityIndicator size="small" color="#2c3e50" />
                  ) : (
                    <EmojiIcon emoji="📤" size={10} />
                  )}
                  <ScaledText style={styles.audioButtonText}>
                    {isUploading ? "Uploading..." : "Upload Audio"}
                  </ScaledText>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.audioButton,
                    isRecording && styles.recordingButton,
                    isUploading && styles.disabledButton
                  ]}
                  onPress={canEdit && !isUploading ? (isRecording ? stopRecording : startRecording) : undefined}
                  disabled={!canEdit || isUploading}
                >
                  {isRecording ? (
                    <View style={styles.recordingIndicator} />
                  ) : (
                    <EmojiIcon emoji="🎤" size={10} />
                  )}
                  <ScaledText style={styles.audioButtonText}>
                    {isRecording ? "Stop Recording" : "Record"}
                  </ScaledText>
                </TouchableOpacity>
              </View>
              {(selectedStep.audioNote || recordingUri) && (
                <View style={styles.audioNoteContainer}>
                  <View style={styles.audioNoteIndicator}>
                    <EmojiIcon emoji="🔊" size={12} />
                    <ScaledText style={styles.audioNoteText}>
                      {recordingUri ? "Recording ready to save" : "Audio note attached"}
                    </ScaledText>
                  </View>
                  <View style={styles.audioNoteActions}>
                    {recordingUri && !selectedStep.audioNote && (
                      <TouchableOpacity
                        style={styles.cancelRecordingButton}
                        onPress={canEdit ? () => {
                          setRecordingUri(null);
                          Alert.alert("Info", "Recording discarded. You can record again.");
                        } : undefined}
                        disabled={!canEdit}
                      >
                        <EmojiIcon emoji="❌" size={12} />
                        <ScaledText style={styles.cancelRecordingText}>Discard</ScaledText>
                      </TouchableOpacity>
                    )}
                    {selectedStep.audioNote && (
                      <TouchableOpacity
                        style={styles.deleteAudioButton}
                        onPress={canEdit ? deleteAudioNote : undefined}
                        disabled={!canEdit}
                      >
                        <EmojiIcon emoji="🗑️" size={12} />
                        <ScaledText style={styles.deleteAudioText}>Remove</ScaledText>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <ScaledText style={styles.inputLabel}>Notes</ScaledText>
              <ScaledTextInput
                style={[styles.notesInput, !canEdit && styles.readOnlyInput]}
                value={selectedStep.notes || ''}
                onChangeText={canEdit ? (value) => updateSelectedStep('notes', value) : undefined}
                placeholder="Additional instructions or notes..."
                editable={canEdit}
                placeholderTextColor="#999"
                multiline
                numberOfLines={2}
      />
    </View>

                {/* Submit Step Button */}
                <TouchableOpacity 
                  style={[styles.testStepButton, isAutoSaving && styles.disabledButton]}
                  onPress={async () => {
                    if (!selectedStep) return;
                    
                    try {
                      // Force save the current step changes
                      const updatedSteps = (steps || []).map(step => 
                        step.id === selectedStep?.id ? selectedStep : step
                      );
                      
                      const currentScheduleId = scheduleId || existingScheduleId;
                      if (currentScheduleId && typeof currentScheduleId === 'string' && currentScheduleId.trim() !== '') {
                        // Update existing schedule
                        await updateSchedule(currentScheduleId, {
                          name: scheduleName,
                          steps: updatedSteps,
                          isPublished: false,
                          routineType: currentRoutine?.title || currentRoutine?.scheduleName || "Custom"
                        });
                      } else {
                        // Create new schedule if none exists
                        const newSchedule = await createSchedule({
                          name: scheduleName,
                          steps: updatedSteps,
                          isPublished: false,
                          routineType: currentRoutine?.title || currentRoutine?.scheduleName || "Custom"
                        });
                        setScheduleId(newSchedule.id);
                      }
                      
                      Alert.alert("Success", "Step changes have been saved successfully!");
                    } catch (error) {
                      console.error("Error saving step:", error);
                      Alert.alert("Error", "Failed to save step changes. Please try again.");
                    }
                  }}
                  disabled={isAutoSaving}
                >
                  <ScaledText style={styles.testStepButtonText}>
                    {isAutoSaving ? "Saving..." : "✓ Submit Step"}
                  </ScaledText>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.noStepSelected}>
                <ScaledText style={styles.noStepSelectedText}>
                  Select a step to edit or add a new step
                </ScaledText>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Delete Audio Note Modal */}
      {showDeleteAudioModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <ScaledText style={styles.modalTitle}>Remove Audio Note</ScaledText>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={cancelDeleteAudioNote}
              >
                <ScaledText style={styles.modalCloseText}>✕</ScaledText>
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <ScaledText style={styles.modalMessage}>
                Are you sure you want to remove this audio note from this activity?
              </ScaledText>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={cancelDeleteAudioNote}
              >
                <ScaledText style={styles.modalCancelText}>Cancel</ScaledText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalDeleteButton]}
                onPress={confirmDeleteAudioNote}
              >
                <ScaledText style={styles.modalDeleteText}>Remove</ScaledText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Update Confirmation Modal */}
      {showUpdateModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <ScaledText style={styles.modalTitle}>Update Schedule</ScaledText>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowUpdateModal(false)}
              >
                <ScaledText style={styles.modalCloseText}>✕</ScaledText>
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <ScaledText style={styles.modalMessage}>
                Are you sure you want to update this schedule? All changes will be saved.
              </ScaledText>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowUpdateModal(false)}
              >
                <ScaledText style={styles.modalCancelText}>Cancel</ScaledText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={async () => {
                  await handleUpdateSchedule();
                  setShowUpdateModal(false);
                }}
              >
                <ScaledText style={styles.modalConfirmText}>Update</ScaledText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <ScaledText style={styles.modalTitle}>Delete Schedule</ScaledText>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowDeleteModal(false)}
              >
                <ScaledText style={styles.modalCloseText}>✕</ScaledText>
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <ScaledText style={styles.modalMessage}>
                Are you sure you want to delete this schedule? This action cannot be undone.
              </ScaledText>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowDeleteModal(false)}
              >
                <ScaledText style={styles.modalCancelText}>Cancel</ScaledText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalDeleteButton]}
                onPress={handleDeleteSchedule}
              >
                <ScaledText style={styles.modalDeleteText}>Delete</ScaledText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {showTimePicker && Platform.OS !== "web" && (
        <DateTimePicker
          value={
            timePickerTarget === "selectedStep"
              ? parseTimeToDate(selectedStep?.time)
              : parseTimeToDate(newStepTime)
          }
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleTimeChange}
        />
      )}
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
  pageTitle: {
    fontSize: 12,
    color: "#6c757d",
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
  scheduleSection: {
    padding: 8,
    backgroundColor: "#fff",
    marginBottom: 6,
  },
  scheduleNameContainer: {
    position: "relative",
  },
  scheduleNameInput: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#dee2e6",
    padding: 6,
    borderRadius: 4,
    fontSize: 12,
    marginBottom: 6,
  },
  autoSaveIndicator: {
    position: "absolute",
    right: 8,
    top: 6,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(32, 178, 170, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  autoSaveText: {
    fontSize: 10,
    color: "#20B2AA",
    marginLeft: 3,
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginHorizontal: 2,
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#dee2e6",
  },
  publishButton: {
    backgroundColor: "#007bff",
    borderColor: "#007bff",
  },
  updateButton: {
    backgroundColor: "#28a745",
    borderColor: "#28a745",
  },
  deleteButton: {
    backgroundColor: "#dc3545",
    borderColor: "#dc3545",
  },
  actionButtonIcon: {
    marginRight: 3,
  },
  actionButtonText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#2c3e50",
  },
  publishButtonText: {
    color: "#fff",
  },
  updateButtonText: {
    color: "#fff",
  },
  deleteButtonText: {
    color: "#fff",
  },
  disabledButton: {
    opacity: 0.6,
  },
  mainContent: {
    flexDirection: "row",
    paddingHorizontal: 8,
    flex: 1,
  },
  stepsPanel: {
    flex: 1,
    marginRight: 4,
    backgroundColor: "#fff",
    borderRadius: 6,
    padding: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  editPanel: {
    flex: 1,
    marginLeft: 4,
    backgroundColor: "#fff",
    borderRadius: 6,
    padding: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  panelHeader: {
    marginBottom: 4,
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  stepsList: {
    maxHeight: 150,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 5,
    borderRadius: 4,
    marginBottom: 3,
    backgroundColor: "#f8f9fa",
  },
  selectedStepItem: {
    backgroundColor: "#e3f2fd",
  },
  dragHandle: {
    fontSize: 10,
    color: "#6c757d",
    marginRight: 4,
  },
  stepColorTag: {
    width: 4,
    borderRadius: 2,
    marginRight: 6,
  },
  stepIconContainer: {
    marginRight: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  stepInfo: {
    flex: 1,
  },
  stepName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 0,
  },
  stepDuration: {
    fontSize: 9,
    color: "#6c757d",
    marginBottom: 0,
  },
  stepTime: {
    fontSize: 9,
    color: "#555",
    marginBottom: 0,
  },
  stepNumber: {
    fontSize: 8,
    color: "#6c757d",
  },
  deleteStepBtn: {
    padding: 3,
  },
  addStepButton: {
    backgroundColor: "#20B2AA",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignItems: "center",
    marginTop: 4,
  },
  addStepButtonText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  inputGroup: {
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 3,
  },
  textInput: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#dee2e6",
    padding: 6,
    borderRadius: 4,
    fontSize: 11,
  },
  iconSearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 4,
    marginBottom: 4,
    paddingLeft: 6,
  },
  iconSearchIcon: {
    marginRight: 4,
  },
  iconSearchInput: {
    flex: 1,
    padding: 6,
    fontSize: 11,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  iconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 3,
    borderWidth: 1,
    borderColor: "#dee2e6",
  },
  selectedIconButton: {
    backgroundColor: "#20B2AA",
    borderColor: "#20B2AA",
  },
  durationInput: {
    flexDirection: "row",
    alignItems: "center",
  },
  durationTextInput: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#dee2e6",
    padding: 6,
    borderRadius: 4,
    fontSize: 11,
    width: 50,
    marginRight: 4,
    textAlign: "center",
  },
  durationLabel: {
    fontSize: 10,
    color: "#6c757d",
  },
  timeButton: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#dee2e6",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  timeButtonText: {
    fontSize: 11,
    color: "#2c3e50",
  },
  audioButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  audioButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginHorizontal: 2,
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#dee2e6",
  },
  audioButtonText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#2c3e50",
  },
  colorGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#dee2e6",
  },
  selectedColorButton: {
    borderColor: "#2c3e50",
    borderWidth: 3,
  },
  colorCheckmark: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  voicePromptInput: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#dee2e6",
    padding: 6,
    borderRadius: 4,
    fontSize: 11,
    textAlignVertical: "top",
    minHeight: 50,
    marginBottom: 4,
  },
  inputHint: {
    fontSize: 9,
    color: "#6c757d",
    fontStyle: "italic",
  },
  audioNoteIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    padding: 6,
    backgroundColor: "#e3f2fd",
    borderRadius: 4,
  },
  audioNoteContainer: {
    marginTop: 8,
  },
  audioNoteIndicator: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#e3f2fd",
    borderRadius: 6,
    marginBottom: 4,
  },
  audioNoteText: {
    fontSize: 10,
    color: "#1976d2",
    marginLeft: 4,
    fontWeight: "500",
  },
  audioNoteActions: {
    flexDirection: "row",
    gap: 8,
  },
  deleteAudioButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 6,
    backgroundColor: "#ffebee",
    borderRadius: 6,
    marginTop: 4,
  },
  deleteAudioText: {
    fontSize: 10,
    color: "#c62828",
    marginLeft: 4,
    fontWeight: "500",
  },
  cancelRecordingButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 6,
    backgroundColor: "#fff3e0",
    borderRadius: 6,
    marginTop: 4,
  },
  cancelRecordingText: {
    fontSize: 10,
    color: "#e65100",
    marginLeft: 4,
    fontWeight: "500",
  },
  recordingButton: {
    backgroundColor: "#ffebee",
    borderColor: "#c62828",
  },
  recordingIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#c62828",
    marginRight: 4,
  },
  notesInput: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#dee2e6",
    padding: 6,
    borderRadius: 4,
    fontSize: 11,
    textAlignVertical: "top",
    minHeight: 40,
  },
  testStepButton: {
    backgroundColor: "#20B2AA",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignItems: "center",
    marginTop: 4,
  },
  testStepButtonText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
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
  addStepForm: {
    backgroundColor: "#f8f9fa",
    borderRadius: 4,
    padding: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#dee2e6",
  },
  addStepFormTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 4,
    textAlign: "center",
  },
  addStepFormButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  formButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginHorizontal: 2,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#6c757d",
  },
  saveButton: {
    backgroundColor: "#20B2AA",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  noStepSelected: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
  },
  noStepSelectedText: {
    fontSize: 10,
    color: "#6c757d",
    textAlign: "center",
  },
  // Modal Styles
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 0,
    margin: 20,
    minWidth: 300,
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  modalCloseButton: {
    padding: 5,
  },
  modalCloseText: {
    fontSize: 20,
    color: "#6c757d",
    fontWeight: "bold",
  },
  modalContent: {
    padding: 20,
  },
  modalMessage: {
    fontSize: 16,
    color: "#6c757d",
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 20,
    gap: 10,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  modalCancelButton: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#dee2e6",
  },
  modalConfirmButton: {
    backgroundColor: "#28a745",
  },
  modalDeleteButton: {
    backgroundColor: "#dc3545",
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6c757d",
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  modalDeleteText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  readOnlyInput: {
    backgroundColor: "#f5f5f5",
    color: "#666",
  },
  disabledButton: {
    backgroundColor: "#ccc",
    opacity: 0.6,
  },
  disabledButtonText: {
    color: "#999",
  },
  readOnlyBanner: {
    backgroundColor: "#fff3cd",
    borderColor: "#ffeaa7",
    borderWidth: 1,
    padding: 6,
    margin: 6,
    borderRadius: 4,
    alignItems: "center",
  },
  readOnlyBannerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  readOnlyText: {
    color: "#856404",
    fontSize: 9,
    fontWeight: "500",
    textAlign: "center",
  },
});
