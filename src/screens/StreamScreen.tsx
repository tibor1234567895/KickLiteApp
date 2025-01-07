import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { RouteProp, useRoute } from '@react-navigation/native';
import { getChannelInfo } from '../services/api';
import type { Channel } from '../types';

type RootStackParamList = {
  Stream: { username: string };
};

type StreamScreenRouteProp = RouteProp<RootStackParamList, 'Stream'>;

export default function StreamScreen() {
  const route = useRoute<StreamScreenRouteProp>();
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
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00ff00" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!channel?.livestream?.is_live) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Stream is offline</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Video
        source={{ uri: channel.playback_url }}
        rate={1.0}
        volume={1.0}
        isMuted={false}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay
        style={styles.video}
      />
      <View style={styles.infoContainer}>
        <Text style={styles.title}>{channel.livestream.session_title}</Text>
        <Text style={styles.viewerCount}>
          {channel.livestream.viewer_count.toLocaleString()} viewers
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  infoContainer: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  viewerCount: {
    fontSize: 14,
    color: '#aaa',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
  },
}); 