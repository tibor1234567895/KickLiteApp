import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

export type Theme = 'light' | 'dark';

export const Colors = {
  light: {
    background: '#FFFFFF',
    text: '#000000',
    secondaryText: '#666666',
    tertiaryText: '#888888',
    card: '#FFFFFF',
    border: '#E0E0E0',
    primary: '#0000ff',
    error: '#ff0000',
    offline: '#999999',
    heart: '#ff0000',
    heartOutline: '#666666',
    shadow: '#000000',
  },
  dark: {
    background: '#121212',
    text: '#FFFFFF',
    secondaryText: '#CCCCCC',
    tertiaryText: '#999999',
    card: '#1E1E1E',
    border: '#333333',
    primary: '#4040ff',
    error: '#ff4444',
    offline: '#666666',
    heart: '#ff4444',
    heartOutline: '#999999',
    shadow: '#000000',
  },
};

type ThemeContextType = {
  theme: Theme;
  colors: typeof Colors.light;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>(systemColorScheme || 'light');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme) {
        setTheme(savedTheme as Theme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      await AsyncStorage.setItem('theme', newTheme);
      setTheme(newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colors: Colors[theme],
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 