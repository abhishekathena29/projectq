import { ScaledText } from '@/components/ScaledText';
import { ScaledTextInput } from '@/components/ScaledTextInput';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Dimensions,
    Modal,
    StyleSheet,
    TouchableOpacity,
    Vibration,
    View,
} from 'react-native';
import useRecentActivities from '../hooks/useRecentActivities';

const { width } = Dimensions.get('window');

export default function TimerModal({ visible, onClose }) {
  const [minutes, setMinutes] = useState('5');
  const [seconds, setSeconds] = useState('0');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [alertSound, setAlertSound] = useState('Bell');
  const [originalTime, setOriginalTime] = useState(300); // Store original time for activity logging
  const intervalRef = useRef(null);
  const { addTimerActivity } = useRecentActivities();

  // Update timeLeft when minutes/seconds change
  useEffect(() => {
    const totalSeconds = parseInt(minutes) * 60 + parseInt(seconds);
    setTimeLeft(totalSeconds);
    setOriginalTime(totalSeconds);
  }, [minutes, seconds]);

  // Timer countdown logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft]);

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (timeLeft > 0) {
      setIsRunning(true);
      // Log timer start activity
      addTimerActivity(originalTime, 'started');
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    const totalSeconds = parseInt(minutes) * 60 + parseInt(seconds);
    setTimeLeft(totalSeconds);
  };

  const handleAddTime = (additionalMinutes) => {
    const additionalSeconds = additionalMinutes * 60;
    setTimeLeft(prev => prev + additionalSeconds);
    
    // Update minutes display
    const newTotalMinutes = Math.floor((timeLeft + additionalSeconds) / 60);
    const newSeconds = (timeLeft + additionalSeconds) % 60;
    setMinutes(newTotalMinutes.toString());
    setSeconds(newSeconds.toString());
    
    // Log time addition activity
    addTimerActivity(additionalSeconds, 'added');
  };

  const handleQuickPreset = (presetMinutes) => {
    setMinutes(presetMinutes.toString());
    setSeconds('0');
  };

  const handleTimerComplete = async () => {
    // Log timer completion activity
    addTimerActivity(originalTime, 'completed');

    // Vibrate device
    Vibration.vibrate([0, 500, 200, 500]);

    Alert.alert('Timer Complete!', 'Your timer has finished.', [
      { text: 'OK', onPress: () => handleReset() }
    ]);
  };

  const handleTestSound = () => {
    // Test vibration pattern
    Vibration.vibrate([0, 200, 100, 200]);
    Alert.alert('Sound Test', 'Vibration test completed!');
  };

  const handleClose = () => {
    setIsRunning(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Main Timer Panel */}
          <View style={styles.timerPanel}>
            <ScaledText style={styles.timerDisplay}>{formatTime(timeLeft)}</ScaledText>
            <View style={styles.timerLine} />
            
            <View style={styles.timerControls}>
              <TouchableOpacity 
                style={[styles.controlButton, styles.startButton]} 
                onPress={handleStart}
                disabled={isRunning || timeLeft === 0}
              >
                <ScaledText style={styles.controlButtonText}>
                  {isRunning ? '⏸️' : '▶️'} {isRunning ? 'Pause' : 'Start'}
                </ScaledText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.controlButton, styles.resetButton]} 
                onPress={handleReset}
              >
                <ScaledText style={styles.resetButtonText}>🔄 Reset</ScaledText>
              </TouchableOpacity>
            </View>

            <View style={styles.addTimeButtons}>
              <TouchableOpacity 
                style={styles.addTimeButton} 
                onPress={() => handleAddTime(1)}
              >
                <ScaledText style={styles.addTimeText}>+ 1m</ScaledText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.addTimeButton} 
                onPress={() => handleAddTime(5)}
              >
                <ScaledText style={styles.addTimeText}>+ 5m</ScaledText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.addTimeButton} 
                onPress={() => handleAddTime(10)}
              >
                <ScaledText style={styles.addTimeText}>+ 10m</ScaledText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Panels */}
          <View style={styles.bottomPanels}>
            {/* Set Time Panel */}
            <View style={styles.setTimePanel}>
              <ScaledText style={styles.panelTitle}>Set Time</ScaledText>
              
              <View style={styles.timeInputs}>
                <View style={styles.timeInputGroup}>
                  <ScaledText style={styles.inputLabel}>Minutes</ScaledText>
                  <ScaledTextInput
                    style={styles.timeInput}
                    value={minutes}
                    onChangeText={setMinutes}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>
                <View style={styles.timeInputGroup}>
                  <ScaledText style={styles.inputLabel}>Seconds</ScaledText>
                  <ScaledTextInput
                    style={styles.timeInput}
                    value={seconds}
                    onChangeText={setSeconds}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>
              </View>

              <ScaledText style={styles.presetTitle}>Quick Presets</ScaledText>
              <View style={styles.presetButtons}>
                {['1', '5', '10', '15', '20', '30'].map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={styles.presetButton}
                    onPress={() => handleQuickPreset(parseInt(preset))}
                  >
                    <ScaledText style={styles.presetText}>{preset}m</ScaledText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sound & Alerts Panel */}
            <View style={styles.soundPanel}>
              <ScaledText style={styles.panelTitle}>Sound & Alerts</ScaledText>
              
              <View style={styles.soundControl}>
                <ScaledText style={styles.inputLabel}>Alert Sound</ScaledText>
                <TouchableOpacity style={styles.dropdown}>
                  <ScaledText style={styles.dropdownText}>{alertSound}</ScaledText>
                  <ScaledText style={styles.dropdownArrow}>▼</ScaledText>
                </TouchableOpacity>
              </View>

              <View style={styles.volumeControl}>
                <ScaledText style={styles.inputLabel}>Volume</ScaledText>
                <View style={styles.volumeContainer}>
                  <ScaledText style={styles.volumeIcon}>🔊</ScaledText>
                  <View style={styles.volumeSlider}>
                    <View 
                      style={[
                        styles.volumeFill, 
                        { width: `${volume * 100}%` }
                      ]} 
                    />
                  </View>
                  <View style={styles.volumeButtons}>
                    <TouchableOpacity 
                      style={styles.volumeButton}
                      onPress={() => setVolume(Math.max(0, volume - 0.1))}
                    >
                      <ScaledText style={styles.volumeButtonText}>-</ScaledText>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.volumeButton}
                      onPress={() => setVolume(Math.min(1, volume + 0.1))}
                    >
                      <ScaledText style={styles.volumeButtonText}>+</ScaledText>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.testSoundButton} 
                onPress={handleTestSound}
              >
                <ScaledText style={styles.testSoundText}>Test Sound</ScaledText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <ScaledText style={styles.closeButtonText}>✕</ScaledText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    padding: 20,
    width: width * 0.9,
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  timerPanel: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timerDisplay: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#20B2AA',
    marginBottom: 10,
  },
  timerLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#e9ecef',
    marginBottom: 20,
  },
  timerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 15,
  },
  controlButton: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 100,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#20B2AA',
  },
  resetButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#6c757d',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '600',
  },
  addTimeButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  addTimeButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  addTimeText: {
    color: '#6c757d',
    fontSize: 14,
    fontWeight: '500',
  },
  bottomPanels: {
    flexDirection: 'row',
    gap: 15,
  },
  setTimePanel: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  soundPanel: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  timeInputs: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  timeInputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
    fontWeight: '500',
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: '#f8f9fa',
  },
  presetTitle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 10,
    fontWeight: '500',
  },
  presetButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  presetText: {
    color: '#6c757d',
    fontSize: 12,
    fontWeight: '500',
  },
  soundControl: {
    marginBottom: 15,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
  },
  dropdownText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#6c757d',
  },
  volumeControl: {
    marginBottom: 15,
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  volumeIcon: {
    fontSize: 16,
  },
  volumeSlider: {
    flex: 1,
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    position: 'relative',
  },
  volumeFill: {
    height: '100%',
    backgroundColor: '#20B2AA',
    borderRadius: 2,
  },
  volumeButtons: {
    flexDirection: 'row',
    gap: 5,
  },
  volumeButton: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  volumeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6c757d',
  },
  testSoundButton: {
    backgroundColor: '#20B2AA',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  testSoundText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: 'bold',
  },
});
