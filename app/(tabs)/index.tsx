// app/(tabs)/index.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View, StyleSheet, Dimensions } from 'react-native';
import { Camera } from 'expo-camera';
import * as Permissions from 'expo-permissions';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';

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
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraComponentType | null>(null);

  useKeepAwake(); // Keep the screen on

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

  const flashMorse = async () => {
    if (!cameraRef.current) return;

    const morse = toMorse(text);
    for (const char of morse) {
      if (char === '.') {
        await cameraRef.current.setTorchModeAsync('on');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await wait(100);
      } else if (char === '-') {
        await cameraRef.current.setTorchModeAsync('on');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await wait(300);
      } else {
        await wait(300); // Space or pause
      }
      await cameraRef.current.setTorchModeAsync('off');
      await wait(150);
    }
  };

  return (
    <View style={styles.container}>
      <Camera style={styles.hiddenCamera} ref={cameraRef} />

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
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  hiddenCamera: {
    width: 1,
    height: 1,
    position: 'absolute',
    top: -1000,
  },
  input: {
    fontSize: 20,
    color: '#fff',
    borderBottomColor: '#444',
    borderBottomWidth: 1,
    marginBottom: 20,
    width: width - 48,
    fontFamily: 'monospace',
  },
  morse: {
    color: '#0f0',
    fontSize: 24,
    fontFamily: 'monospace',
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#111',
    borderColor: '#0f0',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#0f0',
    fontFamily: 'monospace',
    fontSize: 16,
  },
});
