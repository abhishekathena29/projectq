import { useColorScheme } from '@/hooks/useColorScheme';
import { useNavigation } from '@react-navigation/native';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { arrayUnion, doc, getDoc, getFirestore, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  ActivityIndicator, Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { ScaledText } from '@/components/ScaledText';
import { ScaledTextInput } from '@/components/ScaledTextInput';
import { auth } from '../../config/firebase';

export default function AuthPage() {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const [user] = useAuthState(auth);

  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState('login');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [role, setRole] = useState('caregiver');
  const [inviteCode, setInviteCode] = useState('');

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState('error'); // 'error' or 'success'

  const db = getFirestore();

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    if (password.length < 6) {
      return { valid: false, message: 'Password must be at least 6 characters long' };
    }
    return { valid: true };
  };

  const validateName = (name) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { valid: false, message: 'Name cannot be empty' };
    }
    if (trimmedName.length < 2) {
      return { valid: false, message: 'Name must be at least 2 characters long' };
    }
    if (trimmedName.length > 50) {
      return { valid: false, message: 'Name must be less than 50 characters' };
    }
    return { valid: true };
  };

  const validateInviteCode = (code) => {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      return { valid: false, message: 'Invite code cannot be empty' };
    }
    if (trimmedCode.length < 3) {
      return { valid: false, message: 'Invite code must be at least 3 characters long' };
    }
    return { valid: true };
  };

  // Show modal function
  const showModal = (title, message, type = 'error') => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);
  };

  // Close modal function
  const closeModal = () => {
    setModalVisible(false);
  };

  useEffect(() => {
    if (user) {
      navigation.replace('Drawer');
    }
  }, [user]);

  const handleLogin = async () => {
    // Validate email
    if (!loginEmail.trim()) {
      showModal('Email Required', 'Please enter your email address', 'error');
      return;
    }

    if (!validateEmail(loginEmail)) {
      showModal('Invalid Email', 'Please enter a valid email address', 'error');
      return;
    }

    // Validate password
    if (!loginPassword) {
      showModal('Password Required', 'Please enter your password', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
      setIsLoading(false);
      showModal('Login Successful', 'Welcome back!', 'success');
      setTimeout(() => {
        closeModal();
        // Navigation will happen automatically via useEffect when user state changes
      }, 1500);
    } catch (error) {
      setIsLoading(false);
      let errorMessage = 'An error occurred during login';
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later';
      } else if (error.message) {
        errorMessage = error.message;
      }

      showModal('Login Failed', errorMessage, 'error');
    }
  };

  const handleRegister = async () => {
    // Validate name
    const nameValidation = validateName(registerName);
    if (!nameValidation.valid) {
      showModal('Invalid Name', nameValidation.message, 'error');
      return;
    }

    // Validate email
    if (!registerEmail.trim()) {
      showModal('Email Required', 'Please enter your email address', 'error');
      return;
    }

    if (!validateEmail(registerEmail)) {
      showModal('Invalid Email', 'Please enter a valid email address', 'error');
      return;
    }

    // Validate password
    if (!registerPassword) {
      showModal('Password Required', 'Please enter a password', 'error');
      return;
    }

    const passwordValidation = validatePassword(registerPassword);
    if (!passwordValidation.valid) {
      showModal('Weak Password', passwordValidation.message, 'error');
      return;
    }

    // Validate invite code if needed
    if (role === 'child' || role === 'teacher') {
      if (!inviteCode.trim()) {
        showModal('Invite Code Required', 'Please enter the caregiver invite code', 'error');
        return;
      }

      const inviteValidation = validateInviteCode(inviteCode);
      if (!inviteValidation.valid) {
        showModal('Invalid Invite Code', inviteValidation.message, 'error');
        return;
      }
    }

    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, registerEmail.trim(), registerPassword);
      const uid = userCredential.user.uid;

      await updateProfile(userCredential.user, {
        displayName: registerName.trim(),
      });

      if (role === 'child' || role === 'teacher') {
        // validate invite
        const inviteRef = doc(db, 'invites', inviteCode.trim());
        const caregiverSnap = await getDoc(inviteRef);

        if (!caregiverSnap.exists()) {
          setIsLoading(false);
          showModal('Invalid Invite Code', 'This invite code does not exist', 'error');
          return;
        }

        const caregiverId = caregiverSnap.data().caregiverId;

        // create child or teacher user
        await setDoc(doc(db, 'users', uid), {
          uid,
          name: registerName.trim(),
          email: registerEmail.trim(),
          role,
          caregiverId,
        });

        // link child/teacher to caregiver
        const updateField = role === 'child' ? 'childs' : 'teachers';
        await updateDoc(doc(db, 'users', caregiverId), {
          [updateField]: arrayUnion(uid),
        });
      } else {
        // caregiver only
        await setDoc(doc(db, 'users', uid), {
          uid,
          name: registerName.trim(),
          email: registerEmail.trim(),
          role,
          childs: [],
          teachers: [],
        });
      }

      setIsLoading(false);
      showModal('Account Created', 'Your account has been created successfully!', 'success');
      setTimeout(() => {
        closeModal();
        navigation.replace('Drawer');
      }, 1500);
    } catch (error) {
      setIsLoading(false);
      let errorMessage = 'An error occurred during registration';
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection';
      } else if (error.message) {
        errorMessage = error.message;
      }

      showModal('Registration Failed', errorMessage, 'error');
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContainer,
        isDarkMode && { backgroundColor: '#121212' },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <ScaledText style={[styles.title, isDarkMode && { color: '#fff' }]}>
          Welcome to My Day Pal
        </ScaledText>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            onPress={() => setMode('login')}
            style={[styles.tab, mode === 'login' && styles.activeTabBackground]}
          >
            <ScaledText style={[styles.tabText, mode === 'login' && styles.activeTabText]}>Login</ScaledText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode('register')}
            style={[styles.tab, mode === 'register' && styles.activeTabBackground]}
          >
            <ScaledText style={[styles.tabText, mode === 'register' && styles.activeTabText]}>Register</ScaledText>
          </TouchableOpacity>
        </View>

        {/* Forms */}
        {mode === 'login' ? (
          <View style={styles.form}>
            <ScaledText style={styles.label}>Email</ScaledText>
            <ScaledTextInput
              placeholder="name@example.com"
              style={styles.input}
              value={loginEmail}
              onChangeText={setLoginEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <ScaledText style={styles.label}>Password</ScaledText>
            <ScaledTextInput
              placeholder="••••••••"
              secureTextEntry
              style={styles.input}
              value={loginPassword}
              onChangeText={setLoginPassword}
            />
            <TouchableOpacity
              onPress={handleLogin}
              style={styles.button}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ScaledText style={styles.buttonText}>Sign in</ScaledText>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <ScaledText style={styles.label}>Full Name</ScaledText>
            <ScaledTextInput
              placeholder="Enter your name"
              style={styles.input}
              value={registerName}
              onChangeText={setRegisterName}
            />
            <ScaledText style={styles.label}>Email</ScaledText>
            <ScaledTextInput
              placeholder="Enter your email"
              style={styles.input}
              value={registerEmail}
              onChangeText={setRegisterEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <ScaledText style={styles.label}>Password</ScaledText>
            <ScaledTextInput
              placeholder="Enter your password"
              secureTextEntry
              style={styles.input}
              value={registerPassword}
              onChangeText={setRegisterPassword}
            />

            <ScaledText style={styles.label}>Select Role</ScaledText>
            <View style={styles.roleContainer}>
              {['caregiver', 'teacher', 'child'].map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRole(r)}
                  style={[styles.roleOption, role === r && styles.selectedRole]}
                >
                  <ScaledText style={styles.roleText}>{r.charAt(0).toUpperCase() + r.slice(1)}</ScaledText>
                </TouchableOpacity>
              ))}
            </View>

            {(role === 'child' || role === 'teacher') && (
              <>
                <ScaledText style={styles.label}>Caregiver Invite Code</ScaledText>
                <ScaledTextInput
                  placeholder="Enter invite code"
                  style={styles.input}
                  value={inviteCode}
                  onChangeText={setInviteCode}
                />
              </>
            )}

            <TouchableOpacity
              onPress={handleRegister}
              style={styles.button}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ScaledText style={styles.buttonText}>Create account</ScaledText>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Message Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContainer,
            isDarkMode && styles.modalContainerDark,
            modalType === 'success' && styles.modalContainerSuccess
          ]}>
            <View style={styles.modalHeader}>
              <ScaledText style={[
                styles.modalTitle,
                isDarkMode && styles.modalTitleDark,
                modalType === 'success' && styles.modalTitleSuccess
              ]}>
                {modalType === 'success' ? '✓' : '✕'} {modalTitle}
              </ScaledText>
            </View>
            <View style={styles.modalContent}>
              <ScaledText style={[
                styles.modalMessage,
                isDarkMode && styles.modalMessageDark
              ]}>
                {modalMessage}
              </ScaledText>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  modalType === 'success' ? styles.modalButtonSuccess : styles.modalButtonError
                ]}
                onPress={closeModal}
              >
                <ScaledText style={styles.modalButtonText}>OK</ScaledText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: Platform.OS === 'web' ? 10 : 5,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 8,
    minHeight: Platform.OS === 'web' ? '100vh' : undefined,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: Platform.OS === 'web' ? 16 : 6,
    padding: Platform.OS === 'web' ? 24 : 10,
    maxWidth: Platform.OS === 'web' ? 700 : 400,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: Platform.OS === 'web' ? 0.15 : 0.1,
    shadowRadius: Platform.OS === 'web' ? 12 : 4,
    shadowOffset: { width: 0, height: Platform.OS === 'web' ? 4 : 2 },
    elevation: 3,
  },
  logoContainer: { alignItems: 'center', marginBottom: Platform.OS === 'web' ? 8 : 8 },
  logo: { 
    width: Platform.OS === 'web' ? 60 : 50, 
    height: Platform.OS === 'web' ? 60 : 50 
  },
  title: { 
    fontSize: Platform.OS === 'web' ? 24 : 14, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginBottom: Platform.OS === 'web' ? 12 : 6 
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'web' ? 16 : 8,
    backgroundColor: '#f0f0f0',
    borderRadius: Platform.OS === 'web' ? 12 : 6,
    overflow: 'hidden',
    padding: Platform.OS === 'web' ? 4 : 0,
  },
  tab: { 
    flex: 1, 
    paddingVertical: Platform.OS === 'web' ? 10 : 6, 
    alignItems: 'center' 
  },
  activeTabBackground: { backgroundColor: '#e6f0ff' },
  tabText: { 
    fontSize: Platform.OS === 'web' ? 15 : 10, 
    color: '#6c757d', 
    fontWeight: '600' 
  },
  activeTabText: { color: '#007bff' },
  label: { 
    marginBottom: Platform.OS === 'web' ? 4 : 2, 
    fontWeight: '500', 
    color: '#212529', 
    fontSize: Platform.OS === 'web' ? 14 : 10 
  },
  form: { marginBottom: Platform.OS === 'web' ? 8 : 6 },
  input: {
    backgroundColor: '#fff',
    padding: Platform.OS === 'web' ? 10 : 6,
    borderRadius: Platform.OS === 'web' ? 8 : 4,
    marginBottom: Platform.OS === 'web' ? 10 : 6,
    borderWidth: 1,
    borderColor: '#ced4da',
    color: '#212529',
    fontSize: Platform.OS === 'web' ? 14 : 11,
    minHeight: Platform.OS === 'web' ? 40 : undefined,
  },
  button: {
    backgroundColor: '#007bff',
    padding: Platform.OS === 'web' ? 12 : 6,
    borderRadius: Platform.OS === 'web' ? 8 : 4,
    alignItems: 'center',
    marginTop: Platform.OS === 'web' ? 4 : 4,
    minHeight: Platform.OS === 'web' ? 40 : undefined,
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: Platform.OS === 'web' ? 15 : 10 
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Platform.OS === 'web' ? 10 : 4,
    gap: Platform.OS === 'web' ? 12 : 6,
  },
  roleOption: {
    flex: 1,
    padding: Platform.OS === 'web' ? 10 : 6,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: Platform.OS === 'web' ? 8 : 4,
    alignItems: 'center',
    minHeight: Platform.OS === 'web' ? 40 : undefined,
  },
  selectedRole: { backgroundColor: '#e6f0ff', borderColor: '#007bff' },
  roleText: { 
    fontSize: Platform.OS === 'web' ? 13 : 9, 
    fontWeight: '500' 
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: Platform.OS === 'web' ? 16 : 8,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 450 : 350,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalContainerDark: {
    backgroundColor: '#2c2c2c',
  },
  modalContainerSuccess: {
    borderTopWidth: 3,
    borderTopColor: '#28a745',
  },
  modalHeader: {
    padding: Platform.OS === 'web' ? 24 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: Platform.OS === 'web' ? 24 : 16,
    fontWeight: 'bold',
    color: '#212529',
    textAlign: 'center',
  },
  modalTitleDark: {
    color: '#fff',
  },
  modalTitleSuccess: {
    color: '#28a745',
  },
  modalContent: {
    padding: Platform.OS === 'web' ? 24 : 16,
  },
  modalMessage: {
    fontSize: Platform.OS === 'web' ? 18 : 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: Platform.OS === 'web' ? 28 : 20,
  },
  modalMessageDark: {
    color: '#d0d0d0',
  },
  modalFooter: {
    padding: Platform.OS === 'web' ? 24 : 16,
    paddingTop: 0,
  },
  modalButton: {
    backgroundColor: '#007bff',
    padding: Platform.OS === 'web' ? 16 : 10,
    borderRadius: Platform.OS === 'web' ? 8 : 6,
    alignItems: 'center',
    minHeight: Platform.OS === 'web' ? 52 : undefined,
  },
  modalButtonSuccess: {
    backgroundColor: '#28a745',
  },
  modalButtonError: {
    backgroundColor: '#dc3545',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 18 : 14,
    fontWeight: 'bold',
  },
});
