import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { getLivestreams } from '../services/api';
import type { LivestreamItem } from '../types';

type RootStackParamList = {
  Home: undefined;
  Stream: { username: string };
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [streams, setStreams] = useState<LivestreamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadStreams = async (showRefresh = false, page = 1) => {
    try {
      setError(null);
      if (!showRefresh && page === 1) setLoading(true);
      if (page > 1) setLoadingMore(true);

      const response = await getLivestreams(page);
      console.log('API Response:', response);
      
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid response format');
      }

      // Update hasNextPage based on the response
      setHasNextPage(!!response.next_page_url);

      // If it's a refresh or first page, replace the streams
      // Otherwise, append the new streams to the existing ones
      if (page === 1) {
        setStreams(response.data);
      } else {
        setStreams(prevStreams => [...prevStreams, ...response.data]);
      }
      setCurrentPage(page);
    } catch (err) {
      console.error('Error loading streams:', err);
      setError(err instanceof Error ? err.message : 'Failed to load streams');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      if (showRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStreams();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadStreams(true, 1);
  };

  const loadMore = () => {
    if (!loadingMore && hasNextPage && !refreshing) {
      loadStreams(false, currentPage + 1);
    }
  };

  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#00ff00" />
      </View>
    );
  };

  const renderItem = ({ item }: { item: LivestreamItem }) => (
    <TouchableOpacity
      style={styles.streamItem}
      onPress={() => navigation.navigate('Stream', { username: item.channel.slug })}
    >
      <Image
        source={{ uri: item.thumbnail.src }}
        style={styles.thumbnail}
        resizeMode="cover"
      />
      <View style={styles.streamInfo}>
        <Text style={styles.title} numberOfLines={2}>
          {item.session_title}
        </Text>
        <Text style={styles.username}>{item.channel.user.username}</Text>
        <Text style={styles.viewerCount}>
          {item.viewer_count.toLocaleString()} viewers
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00ff00" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadStreams()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={streams}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  list: {
    padding: 10,
  },
  streamItem: {
    flexDirection: 'row',
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
  thumbnail: {
    width: 120,
    height: 67.5, // 16:9 aspect ratio
  },
  streamInfo: {
    flex: 1,
    padding: 10,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  username: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 2,
  },
  viewerCount: {
    color: '#888',
    fontSize: 12,
  },
  error: {
    color: '#ff4444',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#00ff00',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
  },
  retryText: {
    color: '#000',
    fontWeight: 'bold',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
}); 