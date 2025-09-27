import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { useTheme } from '../context/ThemeContext';

export default function SettingsScreen() {
  const { theme, colors, toggleTheme } = useTheme();
  const { isAuthenticated, profile, signOut, signIn, loading } = useAuth();
  const { chatPreferences, toggleChatPreference } = usePreferences();

  const handleLogout = async () => {
    if (!isAuthenticated || loading) {
      return;
    }
    await signOut();
  };

  const handleLogin = async () => {
    if (!loading) {
      await signIn();
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
        <View style={[styles.row, { borderColor: colors.border }]}>
          <View style={styles.rowTextContainer}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Dark mode</Text>
            <Text style={[styles.rowSubtitle, { color: colors.secondaryText }]}>
              Use the dark theme.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Toggle dark mode"
            value={theme === 'dark'}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={theme === 'dark' ? '#f4f3f4' : '#ffffff'}
          />
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
        <View style={[styles.row, { borderColor: colors.border }]}>
          <View style={styles.rowTextContainer}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Kick OAuth</Text>
            <Text style={[styles.rowSubtitle, { color: colors.secondaryText }]}>
              {isAuthenticated && profile ? `Connected as ${profile.username}` : 'Not connected'}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: isAuthenticated ? colors.primary : colors.border },
            ]}>
            <Text
              style={[
                styles.statusText,
                { color: isAuthenticated ? '#ffffff' : colors.secondaryText },
              ]}>
              {isAuthenticated ? 'Connected' : 'Offline'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: isAuthenticated ? colors.error : colors.primary,
              opacity: loading ? 0.6 : 1,
            },
          ]}
          disabled={loading}
          onPress={isAuthenticated ? handleLogout : handleLogin}>
          <Text style={styles.buttonText}>{isAuthenticated ? 'Log out' : 'Log in with Kick'}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Chat preferences</Text>
        <View style={[styles.row, { borderColor: colors.border }]}>
          <View style={styles.rowTextContainer}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>7TV emotes</Text>
            <Text style={[styles.rowSubtitle, { color: colors.secondaryText }]}>
              Show 7TV emotes in chat.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Toggle 7TV emotes"
            value={chatPreferences.enableSevenTvEmotes}
            onValueChange={() => toggleChatPreference('enableSevenTvEmotes')}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={chatPreferences.enableSevenTvEmotes ? '#f4f3f4' : '#ffffff'}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  rowSubtitle: {
    fontSize: 14,
  },
  statusBadge: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});
