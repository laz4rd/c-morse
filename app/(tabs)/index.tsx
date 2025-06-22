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
  Clipboard,
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

const reverseMorseMap: Record<string, string> = Object.fromEntries(
  Object.entries(morseMap).map(([key, value]) => [value, key])
);

const toMorse = (text: string) =>
  text.toLowerCase().split('').map(char => morseMap[char] || '').join(' ');

const fromMorse = (morse: string) =>
  morse.split(' ').map(code => reverseMorseMap[code] || '').join('').replace(/\//g, ' ');

export default function HomeScreen() {
  const [text, setText] = useState('');
  const [morseInput, setMorseInput] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBeeping, setIsBeeping] = useState(false);
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [speed, setSpeed] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const settingsAnim = useRef(new Animated.Value(0)).current;

  useKeepAwake();

  useEffect(() => {
    if (isBeeping) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.4,
            duration: 300 / speed,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 300 / speed,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isBeeping, speed]);

  useEffect(() => {
    Animated.timing(settingsAnim, {
      toValue: showSettings ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [showSettings]);

  const wait = (ms: number) => new Promise(res => setTimeout(res, ms / speed));

  const flashMorse = async () => {
    const morse = mode === 'encode' ? toMorse(text) : morseInput;

    if (!morse || morse.trim() === '') {
      Alert.alert('No message', 'Please enter text to play as Morse code.');
      return;
    }

    setIsPlaying(true);

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
          await wait(300);
        }
        await wait(150);
      }

      await sound.unloadAsync();
    } catch (err) {
      console.error('Playback error:', err);
      Alert.alert('Sound error', 'Failed to play beep.wav');
    } finally {
      setIsBeeping(false);
      setIsPlaying(false);
    }
  };

  const copyToClipboard = async (content: string) => {
    await Clipboard.setString(content);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied', 'Text copied to clipboard');
  };

  const clearAll = () => {
    setText('');
    setMorseInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleMode = () => {
    setMode(mode === 'encode' ? 'decode' : 'encode');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const currentMorse = mode === 'encode' ? toMorse(text) : morseInput;
  const currentText = mode === 'decode' ? fromMorse(morseInput) : text;

  const theme = {
    background: isDarkMode ? '#000000' : '#ececec',
    surface: isDarkMode ? '#111111' : '#eee',
    surfaceVariant: isDarkMode ? '#222222' : '#ddd',
    text: isDarkMode ? '#ffffff' : '#111',
    textSecondary: isDarkMode ? '#cccccc' : '#888',
    button: isDarkMode ? '#ffffff' : '#111',
    buttonText: isDarkMode ? '#000000' : '#eee',
    border: isDarkMode ? '#333333' : '#aaa',
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>c-morse</Text>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => setShowSettings(!showSettings)}
        >
          <Text style={[styles.settingsText, { color: theme.text }]}>⚙</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={[
        styles.settingsPanel,
        {
          backgroundColor: theme.surfaceVariant,
          height: settingsAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 160],
          }),
          opacity: settingsAnim,
        }
      ]}>
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: theme.text }]}>Speed: {speed}x</Text>
          <View style={styles.speedControls}>
            <TouchableOpacity 
              style={[styles.speedButton, { backgroundColor: theme.button }]}
              onPress={() => setSpeed(Math.max(0.5, speed - 0.5))}
            >
              <Text style={[styles.speedButtonText, { color: theme.buttonText }]}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.speedButton, { backgroundColor: theme.button }]}
              onPress={() => setSpeed(Math.min(3, speed + 0.5))}
            >
              <Text style={[styles.speedButtonText, { color: theme.buttonText }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: theme.text }]}>Dark Mode</Text>
          <TouchableOpacity 
            style={[styles.toggleButton, { backgroundColor: isDarkMode ? theme.button : theme.border }]}
            onPress={toggleDarkMode}
          >
            <Animated.View style={[
              styles.toggleCircle,
              { 
                backgroundColor: isDarkMode ? theme.buttonText : '#fff',
                transform: [{ translateX: isDarkMode ? 20 : 0 }]
              }
            ]} />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={[styles.clearButton, { backgroundColor: theme.textSecondary }]} onPress={clearAll}>
          <Text style={[styles.clearButtonText, { color: isDarkMode ? '#000' : '#eee' }]}>Clear All</Text>
        </TouchableOpacity>
      </Animated.View>
      
      <View style={styles.content}>
        {!isPlaying ? (
          <>
            <View style={[styles.modeSelector, { backgroundColor: theme.surfaceVariant }]}>
              <TouchableOpacity 
                style={[
                  styles.modeButton, 
                  mode === 'encode' && { backgroundColor: theme.button }
                ]}
                onPress={toggleMode}
              >
                <Text style={[
                  styles.modeButtonText, 
                  { color: mode === 'encode' ? theme.buttonText : theme.text }
                ]}>
                  Text → Morse
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.modeButton, 
                  mode === 'decode' && { backgroundColor: theme.button }
                ]}
                onPress={toggleMode}
              >
                <Text style={[
                  styles.modeButtonText, 
                  { color: mode === 'decode' ? theme.buttonText : theme.text }
                ]}>
                  Morse → Text
                </Text>
              </TouchableOpacity>
            </View>

            {mode === 'encode' ? (
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surface,
                    color: theme.text,
                    borderBottomColor: theme.border,
                  }
                ]}
                placeholder="Type your message..."
                placeholderTextColor={theme.textSecondary}
                value={text}
                onChangeText={setText}
                multiline
              />
            ) : (
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surface,
                    color: theme.text,
                    borderBottomColor: theme.border,
                  }
                ]}
                placeholder="Enter morse code (.- -... -.-.)"
                placeholderTextColor={theme.textSecondary}
                value={morseInput}
                onChangeText={setMorseInput}
                multiline
              />
            )}

            <TouchableOpacity 
              style={[styles.morseDisplay, { backgroundColor: theme.surfaceVariant }]}
              onPress={() => copyToClipboard(mode === 'encode' ? currentMorse : currentText)}
              disabled={!currentMorse && !currentText}
            >
              <Text style={[styles.morse, { color: theme.text }]}>
                {mode === 'encode' ? currentMorse : currentText || 'Decoded text will appear here'}
              </Text>
            </TouchableOpacity>

            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.button, styles.playButton, { backgroundColor: theme.button, borderColor: theme.border }]} 
                onPress={flashMorse}
                disabled={!currentMorse}
              >
                <Text style={[styles.buttonText, { color: theme.buttonText }]}>▶ Play</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.copyButton, { backgroundColor: theme.textSecondary, borderColor: theme.border }]} 
                onPress={() => copyToClipboard(mode === 'encode' ? currentMorse : currentText)}
                disabled={!currentMorse && !currentText}
              >
                <Text style={[styles.buttonText, { color: isDarkMode ? '#000' : '#eee' }]}>📋 Copy</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </View>

      {isPlaying && (
        <Animated.View
          style={[
            styles.circleOverlay,
            { 
              backgroundColor: theme.button,
              transform: [{ scale: pulseAnim }],
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.4],
                outputRange: [0.8, 1],
              })
            },
          ]}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: 'monospace',
  },
  settingsButton: {
    padding: 8,
  },
  settingsText: {
    fontSize: 20,
  },
  settingsPanel: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingLabel: {
    fontFamily: 'monospace',
    fontSize: 16,
  },
  speedControls: {
    flexDirection: 'row',
    gap: 8,
  },
  speedButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedButtonText: {
    fontSize: 18,
    fontFamily: 'monospace',
  },
  clearButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  clearButtonText: {
    fontFamily: 'monospace',
    fontSize: 14,
  },
  toggleButton: {
    width: 50,
    height: 26,
    borderRadius: 13,
    padding: 2,
    justifyContent: 'center',
  },
  toggleCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeSelector: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  modeButtonText: {
    fontFamily: 'monospace',
    fontSize: 12,
    textAlign: 'center',
  },
  input: {
    fontSize: 18,
    borderBottomWidth: 1,
    marginBottom: 20,
    width: width - 48,
    fontFamily: 'monospace',
    padding: 12,
    borderRadius: 6,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  morseDisplay: {
    padding: 16,
    borderRadius: 8,
    width: width - 48,
    marginBottom: 24,
    minHeight: 60,
  },
  morse: {
    fontSize: 20,
    fontFamily: 'monospace',
    textAlign: 'center',
    lineHeight: 28,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 80,
    borderWidth: 1,
  },
  playButton: {
    // Dynamic colors applied inline
  },
  copyButton: {
    // Dynamic colors applied inline
  },
  buttonText: {
    fontFamily: 'monospace',
    fontSize: 14,
    textAlign: 'center',
  },
  circleOverlay: {
    width: 120,
    height: 120,
    borderRadius: 60,
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -60,  // Half of height to center vertically
    marginLeft: -40, // Half of width to center horizontally
  },
});