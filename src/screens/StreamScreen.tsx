import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { Video, ResizeMode } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  AppState,
  Platform,
} from 'react-native';

import ChatView from '../components/ChatView';
import { useFollow } from '../context/FollowContext';
import { useTheme } from '../context/ThemeContext';
import { getChannelInfo } from '../services/api';
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    loadChannel();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Enable PiP when app goes to background if video is playing
        if (Platform.OS === 'ios') {
          videoRef.current?.presentFullscreenPlayer();
        }
      }
    });

    // Lock to portrait by default
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);

    return () => {
      subscription.remove();
      videoRef.current?.pauseAsync();
      // Reset orientation when component unmounts
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  useEffect(() => {
    if (channel) {
      navigation.setOptions({
        headerRight: () => (
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setIsChatVisible(!isChatVisible)}>
              <Ionicons
                name={isChatVisible ? 'chatbubble' : 'chatbubble-outline'}
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => toggleFollow(channel.user.username)}>
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

  const handleFullscreenUpdate = async ({ fullscreenUpdate }: { fullscreenUpdate: number }) => {
    switch (fullscreenUpdate) {
      case 1: // Video.FULLSCREEN_UPDATE_PLAYER_WILL_PRESENT
        setIsFullscreen(true);
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        break;
      case 3: // Video.FULLSCREEN_UPDATE_PLAYER_WILL_DISMISS
        setIsFullscreen(false);
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        break;
    }
  };

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
        ref={videoRef}
        source={{ uri: channel.playback_url }}
        rate={1.0}
        volume={1.0}
        isMuted={false}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay
        useNativeControls
        onFullscreenUpdate={handleFullscreenUpdate}
        style={[styles.video, !isChatVisible && { height: height - 150 }]}
        isLooping={false}
        usePoster
        posterSource={{ uri: channel.livestream.thumbnail.url }}
        posterStyle={styles.poster}
      />
      {!isFullscreen && (
        <>
          <View style={[styles.infoContainer, !isChatVisible && { flex: 1 }]}>
            <Text style={[styles.title, { color: colors.text }]}>
              {channel.livestream.session_title}
            </Text>
            <Text style={[styles.viewerCount, { color: colors.tertiaryText }]}>
              {channel.livestream.viewer_count.toLocaleString()} viewers
            </Text>
          </View>
          {isChatVisible && (
            <View style={styles.chatContainer}>
              <ChatView channelId={channel.id} username={route.params.username} />
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  video: {
    width,
    height: VIDEO_HEIGHT,
  },
  poster: {
    resizeMode: 'cover',
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
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  headerButton: {
    marginRight: 15,
    padding: 4,
  },
});
