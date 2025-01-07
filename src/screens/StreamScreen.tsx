import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getChannelInfo } from '../services/api';
import { useFollow } from '../context/FollowContext';
import { useTheme } from '../context/ThemeContext';
import type { Channel, RootStackParamList } from '../types';

type StreamScreenRouteProp = RouteProp<RootStackParamList, 'Stream'>;

export default function StreamScreen() {
  const route = useRoute<StreamScreenRouteProp>();
  const { colors } = useTheme();
  const { isFollowing, toggleFollow } = useFollow();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChannel();
  }, []);

  const loadChannel = async () => {
    try {
      const data = await getChannelInfo(route.params.username);
      setChannel(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stream');
      setChannel(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      </View>
    );
  }

  if (!channel?.livestream?.is_live) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>Stream is offline</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Video
        source={{ uri: channel.playback_url }}
        rate={1.0}
        volume={1.0}
        isMuted={false}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay
        style={styles.video}
        useNativeControls
      />
      <View style={styles.infoContainer}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: colors.text }]}>
              {channel.livestream.session_title}
            </Text>
            <Text style={[styles.viewerCount, { color: colors.tertiaryText }]}>
              {channel.livestream.viewer_count.toLocaleString()} viewers
            </Text>
          </View>
          <TouchableOpacity
            style={styles.followButton}
            onPress={() => toggleFollow(channel.user.username)}
          >
            <Ionicons
              name={isFollowing(channel.user.username) ? 'heart' : 'heart-outline'}
              size={28}
              color={isFollowing(channel.user.username) ? colors.heart : colors.heartOutline}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  infoContainer: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  viewerCount: {
    fontSize: 14,
  },
  followButton: {
    padding: 8,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
}); 