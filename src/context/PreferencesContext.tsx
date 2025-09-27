import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const CHAT_PREFERENCES_STORAGE_KEY = '@kicklite/chat-preferences';

export type ChatPreferences = {
  enableSevenTvEmotes: boolean;
};

const DEFAULT_CHAT_PREFERENCES: ChatPreferences = {
  enableSevenTvEmotes: true,
};

type PreferencesContextValue = {
  chatPreferences: ChatPreferences;
  setChatPreference: <K extends keyof ChatPreferences>(key: K, value: ChatPreferences[K]) => void;
  toggleChatPreference: <K extends keyof ChatPreferences>(key: K) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

async function loadStoredChatPreferences(): Promise<ChatPreferences> {
  try {
    const storedValue = await AsyncStorage.getItem(CHAT_PREFERENCES_STORAGE_KEY);
    if (!storedValue) {
      return DEFAULT_CHAT_PREFERENCES;
    }

    const parsed = JSON.parse(storedValue);
    if (parsed && typeof parsed === 'object') {
      return {
        ...DEFAULT_CHAT_PREFERENCES,
        ...parsed,
      } as ChatPreferences;
    }
  } catch (error) {
    console.error('Error loading chat preferences:', error);
  }

  return DEFAULT_CHAT_PREFERENCES;
}

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [chatPreferences, setChatPreferences] = useState<ChatPreferences>(DEFAULT_CHAT_PREFERENCES);

  useEffect(() => {
    let mounted = true;

    loadStoredChatPreferences().then((stored) => {
      if (mounted) {
        setChatPreferences(stored);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const persistChatPreferences = useCallback((next: ChatPreferences) => {
    AsyncStorage.setItem(CHAT_PREFERENCES_STORAGE_KEY, JSON.stringify(next)).catch((error) => {
      console.error('Error saving chat preferences:', error);
    });
  }, []);

  const setChatPreference = useCallback<PreferencesContextValue['setChatPreference']>(
    (key, value) => {
      setChatPreferences((previous) => {
        const next = { ...previous, [key]: value };
        persistChatPreferences(next);
        return next;
      });
    },
    [persistChatPreferences]
  );

  const toggleChatPreference = useCallback<PreferencesContextValue['toggleChatPreference']>(
    (key) => {
      setChatPreferences((previous) => {
        const next = { ...previous, [key]: !previous[key] } as ChatPreferences;
        persistChatPreferences(next);
        return next;
      });
    },
    [persistChatPreferences]
  );

  const value = useMemo<PreferencesContextValue>(
    () => ({ chatPreferences, setChatPreference, toggleChatPreference }),
    [chatPreferences, setChatPreference, toggleChatPreference]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
