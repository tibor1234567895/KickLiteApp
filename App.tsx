import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { RouteProp } from '@react-navigation/native';
import HomeScreen from './src/screens/HomeScreen';
import StreamScreen from './src/screens/StreamScreen';
import FollowedScreen from './src/screens/FollowedScreen';
import { FollowProvider } from './src/context/FollowContext';
import { RootStackParamList } from './src/types';
import { Ionicons } from '@expo/vector-icons';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

type TabParamList = {
  Home: undefined;
  Followed: undefined;
};

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Followed') {
            iconName = focused ? 'heart' : 'heart-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Followed" component={FollowedScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <FollowProvider>
        <Stack.Navigator>
          <Stack.Screen
            name="Home"
            component={HomeTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Stream"
            component={StreamScreen}
            options={({ route }) => ({
              title: route.params.username,
            })}
          />
        </Stack.Navigator>
      </FollowProvider>
    </NavigationContainer>
  );
}
