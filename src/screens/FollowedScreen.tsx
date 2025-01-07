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
import { useFollow } from '../context/FollowContext';
import { getChannelInfo } from '../services/api';
import { Channel, RootStackParamList } from '../types';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

type FollowedScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Followed'>;

export default function FollowedScreen() {
  const navigation = useNavigation<FollowedScreenNavigationProp>();
  const { followedChannels } = useFollow();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChannels = async () => {
    try {
      setError(null);
      console.log('Fetching details for channels:', followedChannels);
      const channelDetails = await Promise.all(
        followedChannels.map((username) => getChannelInfo(username))
      );
      console.log('Fetched channel details:', channelDetails);
      setChannels(channelDetails);
    } catch (error) {
      setError('Failed to load followed channels');
      console.error('Error loading followed channels:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    console.log('Loading channels for followed users:', followedChannels);
    loadChannels();
  }, [followedChannels]);

  const onRefresh = () => {
    setRefreshing(true);
    loadChannels();
  };

  const renderItem = ({ item }: { item: Channel }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => navigation.navigate('Stream', { username: item.user.username })}
    >
      <Image
        source={{ uri: item.user.profile_pic }}
        style={styles.profilePic}
      />
      <View style={styles.itemContent}>
        <Text style={styles.username}>{item.user.username}</Text>
        {item.livestream ? (
          <View>
            <Text style={styles.title}>{item.livestream.session_title}</Text>
            <Text style={styles.viewers}>
              {item.livestream.viewer_count} viewers
            </Text>
          </View>
        ) : (
          <Text style={styles.offline}>Offline</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity onPress={loadChannels} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (channels.length === 0) {
    return (
      <View style={styles.centered}>
        <Text>You haven't followed any channels yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={channels}
      renderItem={renderItem}
      keyExtractor={(item) => item.user.username}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 10,
  },
  item: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
    color: '#666',
    marginTop: 4,
  },
  viewers: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  offline: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    color: 'red',
    marginBottom: 10,
  },
  retryButton: {
    padding: 10,
    backgroundColor: '#0000ff',
    borderRadius: 5,
  },
  retryText: {
    color: '#fff',
  },
}); 