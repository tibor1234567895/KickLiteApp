import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { getChannelInfo } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useFollow } from '../context/FollowContext';
import type { Channel, RootStackParamList } from '../types';

type StreamScreenRouteProp = RouteProp<RootStackParamList, 'Stream'>;

const { width, height } = Dimensions.get('window');
const VIDEO_ASPECT_RATIO = 16 / 9;
const VIDEO_HEIGHT = width / VIDEO_ASPECT_RATIO;

export default function StreamScreen() {
  const route = useRoute<StreamScreenRouteProp>();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { isFollowing, toggleFollow } = useFollow();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChatVisible, setIsChatVisible] = useState(true);

  useEffect(() => {
    loadChannel();
  }, []);

  useEffect(() => {
    if (channel) {
      navigation.setOptions({
        headerRight: () => (
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setIsChatVisible(!isChatVisible)}
            >
              <Ionicons
                name={isChatVisible ? 'chatbubble' : 'chatbubble-outline'}
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => toggleFollow(channel.user.username)}
            >
              <Ionicons
                name={isFollowing(channel.user.username) ? 'heart' : 'heart-outline'}
                size={24}
                color={isFollowing(channel.user.username) ? colors.heart : colors.heartOutline}
              />
            </TouchableOpacity>
          </View>
        ),
      });
    }
  }, [channel, isFollowing, colors, isChatVisible]);

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
        useNativeControls
        style={[
          styles.video,
          !isChatVisible && { height: height - 150 } // Increase video height when chat is hidden
        ]}
      />
      <View style={[
        styles.infoContainer,
        !isChatVisible && { flex: 1 }
      ]}>
        <Text style={[styles.title, { color: colors.text }]}>
          {channel.livestream.session_title}
        </Text>
        <Text style={[styles.viewerCount, { color: colors.tertiaryText }]}>
          {channel.livestream.viewer_count.toLocaleString()} viewers
        </Text>
      </View>
      {isChatVisible && (
        <View style={styles.chatContainer}>
          <WebView
            source={{ uri: `https://kick.com/${route.params.username}/chatroom` }}
            style={styles.webview}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={[styles.webviewLoader, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  video: {
    width: width,
    height: VIDEO_HEIGHT,
  },
  infoContainer: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  viewerCount: {
    fontSize: 14,
  },
  chatContainer: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  webview: {
    flex: 1,
  },
  webviewLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  headerButton: {
    marginRight: 15,
    padding: 4,
  },
}); 