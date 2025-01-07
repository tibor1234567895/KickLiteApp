import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type FollowContextType = {
  followedChannels: string[];
  isFollowing: (username: string) => boolean;
  toggleFollow: (username: string) => Promise<void>;
};

const FollowContext = createContext<FollowContextType | undefined>(undefined);

export function FollowProvider({ children }: { children: React.ReactNode }) {
  const [followedChannels, setFollowedChannels] = useState<string[]>([]);

  useEffect(() => {
    loadFollowedChannels();
  }, []);

  const loadFollowedChannels = async () => {
    try {
      const data = await AsyncStorage.getItem('followedChannels');
      console.log('Loaded followed channels:', data);
      if (data) {
        const parsed = JSON.parse(data);
        console.log('Parsed followed channels:', parsed);
        setFollowedChannels(parsed);
      }
    } catch (error) {
      console.error('Error loading followed channels:', error);
    }
  };

  const isFollowing = (username: string) => {
    const following = followedChannels.includes(username);
    console.log(`Checking if following ${username}:`, following);
    return following;
  };

  const toggleFollow = async (username: string) => {
    try {
      console.log('Toggling follow for:', username);
      console.log('Current followed channels:', followedChannels);
      
      let newFollowedChannels: string[];
      if (isFollowing(username)) {
        console.log('Unfollowing channel');
        newFollowedChannels = followedChannels.filter(
          (channel) => channel !== username
        );
      } else {
        console.log('Following channel');
        newFollowedChannels = [...followedChannels, username];
      }
      
      console.log('New followed channels:', newFollowedChannels);
      await AsyncStorage.setItem(
        'followedChannels',
        JSON.stringify(newFollowedChannels)
      );
      
      setFollowedChannels(newFollowedChannels);
      console.log('Updated followed channels in state');
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  return (
    <FollowContext.Provider value={{ followedChannels, isFollowing, toggleFollow }}>
      {children}
    </FollowContext.Provider>
  );
}

export function useFollow() {
  const context = useContext(FollowContext);
  if (context === undefined) {
    throw new Error('useFollow must be used within a FollowProvider');
  }
  return context;
} 