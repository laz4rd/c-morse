// app/(tabs)/index.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

const morseMap: Record<string, string> = {
  a: '.-', b: '-...', c: '-.-.', d: '-..', e: '.', f: '..-.',
  g: '--.', h: '....', i: '..', j: '.---', k: '-.-', l: '.-..',
  m: '--', n: '-.', o: '---', p: '.--.', q: '--.-', r: '.-.',
  s: '...', t: '-', u: '..-', v: '...-', w: '.--', x: '-..-',
  y: '-.--', z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  ' ': '/',
};

const toMorse = (text: string) =>
  text.toLowerCase().split('').map(char => morseMap[char] || '').join(' ');

export default function HomeScreen() {
  const [text, setText] = useState('');
  const [isBeeping, setIsBeeping] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useKeepAwake();

  useEffect(() => {
    if (isBeeping) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.4,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isBeeping]);

  const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

  const flashMorse = async () => {
    const morse = toMorse(text);

    if (!morse || morse.trim() === '') {
      Alert.alert('No message', 'Please enter text to play as Morse code.');
      return;
    }

    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/beep.wav')
      );

      for (const char of morse) {
        if (char === '.' || char === '-') {
          setIsBeeping(true);
          await sound.replayAsync();
          await Haptics.impactAsync(
            char === '.' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium
          );
          await wait(char === '.' ? 150 : 400);
          setIsBeeping(false);
        } else {
          setIsBeeping(false);
          await wait(300); // pause between characters/words
        }
        await wait(150); // inter-beep spacing
      }

      await sound.unloadAsync();
    } catch (err) {
      console.error('Playback error:', err);
      Alert.alert('Sound error', 'Failed to play beep.wav');
      setIsBeeping(false);
    }
  };

  return (
  <KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    style={styles.container}
  >
    <Text style={styles.title}>c-morse</Text>

    {isBeeping ? (
      <Animated.View
        style={[
          styles.circleOverlay,
          { transform: [{ scale: pulseAnim }] },
        ]}
      />
    ) : (
      <>
        <TextInput
          style={styles.input}
          placeholder="Type your message..."
          placeholderTextColor="#888"
          value={text}
          onChangeText={setText}
        />

        <Text style={styles.morse}>{toMorse(text)}</Text>

        <TouchableOpacity style={styles.button} onPress={flashMorse}>
          <Text style={styles.buttonText}>Play Morse</Text>
        </TouchableOpacity>
      </>
    )}
  </KeyboardAvoidingView>
);

}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ececec',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  input: {
    fontSize: 20,
    color: '#111',
    borderBottomColor: '#aaa',
    borderBottomWidth: 1,
    marginBottom: 20,
    width: width - 48,
    fontFamily: 'monospace',
    backgroundColor: '#eee',
    padding: 10,
    borderRadius: 6,
  },
  morse: {
    color: '#222',
    fontSize: 24,
    fontFamily: 'monospace',
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#222',
    borderColor: '#333',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#eee',
    fontFamily: 'monospace',
    fontSize: 16,
  },
  circleOverlay: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#222',
    position: 'absolute',
    top: '45%',
  },
  title: {
  fontSize: 28,
  fontFamily: 'monospace',
  color: '#111',
  top:0,
  textAlign: 'center',

},
});
