import { ScaledText } from '@/components/ScaledText';
import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const HomePage = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        {/* <Image source={require('../../assets/images/Logo.png')} style={styles.logo} />  */}

        {/* Title and Subtitle */}
        <ScaledText style={styles.title}>Welcome to</ScaledText>
        <ScaledText style={styles.subtitle}>Alt Play</ScaledText>
        <ScaledText style={styles.description}>
          Alt Play is a mobile app to connect with NGOs offering free skill-building classes, workshops, and training programs. Build your future, one skill at a time.
        </ScaledText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#DCE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#567396',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#567396',
    marginBottom: 8,
  },
  author: {
    fontSize: 10,
    color: '#567396',
    marginBottom: 8,
  },
  description: {
    fontSize: 11,
    color: '#567396',
    textAlign: 'center',
    lineHeight: 14,
  },
});

export default HomePage;
