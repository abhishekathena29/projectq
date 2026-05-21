// CaregiverInviteScreen.jsx
import { ScaledText } from "@/components/ScaledText";
import React, { useState } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { db, auth } from "../../config/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import uuid from "react-native-uuid";

export default function CaregiverInviteScreen() {
  const [inviteCode, setInviteCode] = useState(null);

  const generateInvite = async () => {
    const code = uuid.v4().split("-")[0]; // short unique code
    const caregiverId = auth.currentUser.uid;

    await setDoc(doc(db, "invites", code), {
      caregiverId,
      createdAt: serverTimestamp(),
      used: false,
    });

    setInviteCode(code);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={generateInvite}>
        <ScaledText style={styles.buttonText}>Generate Invite</ScaledText>
      </TouchableOpacity>
      {inviteCode && (
        <ScaledText style={styles.code}>Your Invite Code: {inviteCode}</ScaledText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 10 },
  button: { backgroundColor: "#007AFF", padding: 8, borderRadius: 6 },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 10 },
  code: { marginTop: 8, fontSize: 12, fontWeight: "bold", textAlign: "center" },
});
