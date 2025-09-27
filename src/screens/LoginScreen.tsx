import React from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const LoginScreen: React.FC = () => {
  const { signIn, loading, error } = useAuth();
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>Kick Lite</Text>
        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>Sign in to continue</Text>

        {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: colors.primary,
              opacity: loading || pressed ? 0.7 : 1,
              borderColor: colors.border,
            },
          ]}
          disabled={loading}
          onPress={signIn}>
          <Text style={[styles.buttonText, { color: '#ffffff' }]}>
            {loading ? 'Connecting…' : 'Continue with Kick'}
          </Text>
        </Pressable>

        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.activityIndicator} />
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    minWidth: 220,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  activityIndicator: {
    marginTop: 24,
  },
});

export default LoginScreen;
