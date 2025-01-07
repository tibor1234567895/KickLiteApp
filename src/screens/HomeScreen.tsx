import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../context/ThemeContext';
import { Channel, RootStackParamList, LivestreamItem } from '../types';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { colors } = useTheme();
  const [streams, setStreams] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadStreams = async (page: number = 1, isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      }
      if (page === 1) {
        setLoading(true);
      }
      setError(null);

      const response = await fetch(
        `https://kick.com/stream/livestreams/tr?page=${page}&limit=24&sort=desc`
      );
      const data = await response.json();

      const newStreams = data.data.map((stream: LivestreamItem) => ({
        id: stream.id,
        user: {
          id: stream.channel.user.id,
          username: stream.channel.user.username,
          profile_pic: stream.channel.user.profile_pic
        },
        livestream: {
          id: stream.id,
          session_title: stream.session_title,
          viewer_count: stream.viewer_count,
          thumbnail: {
            url: stream.thumbnail.src
          }
        }
      }));

      if (page === 1) {
        setStreams(newStreams);
      } else {
        setStreams((prev) => [...prev, ...newStreams]);
      }

      setHasNextPage(data.next_page_url !== null);
      setCurrentPage(page);
    } catch (error) {
      setError('Failed to load streams');
      console.error('Error loading streams:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadStreams();
  }, []);

  const onRefresh = () => {
    loadStreams(1, true);
  };

  const loadMore = () => {
    if (!loadingMore && hasNextPage) {
      setLoadingMore(true);
      loadStreams(currentPage + 1);
    }
  };

  const renderItem = ({ item }: { item: Channel }) => (
    <TouchableOpacity
      style={[styles.item, { backgroundColor: colors.card }]}
      onPress={() => navigation.navigate('Stream', { username: item.user.username })}
    >
      <Image
        source={{ uri: item.livestream?.thumbnail?.url || item.user.profile_pic }}
        style={styles.thumbnail}
      />
      <View style={styles.itemContent}>
        <Text style={[styles.username, { color: colors.text }]}>
          {item.user.username}
        </Text>
        {item.livestream && (
          <View>
            <Text style={[styles.title, { color: colors.secondaryText }]}>
              {item.livestream.session_title}
            </Text>
            <Text style={[styles.viewers, { color: colors.tertiaryText }]}>
              {item.livestream.viewer_count} viewers
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
        <TouchableOpacity
          onPress={() => loadStreams()}
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={streams}
        renderItem={renderItem}
        keyExtractor={(item) => item.user.username}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 10,
  },
  item: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  thumbnail: {
    width: 120,
    height: 67.5,
    borderRadius: 4,
  },
  itemContent: {
    marginLeft: 10,
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 14,
  },
  viewers: {
    fontSize: 12,
    marginTop: 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    marginBottom: 10,
  },
  retryButton: {
    padding: 10,
    borderRadius: 5,
  },
  retryText: {
    color: '#fff',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
}); 