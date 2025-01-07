import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { RouteProp } from '@react-navigation/native';
import HomeScreen from './src/screens/HomeScreen';
import StreamScreen from './src/screens/StreamScreen';
import FollowedScreen from './src/screens/FollowedScreen';
import { FollowProvider } from './src/context/FollowContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { RootStackParamList } from './src/types';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

type TabParamList = {
  Home: undefined;
  Followed: undefined;
};

function HomeTabs() {
  const { theme, colors, toggleTheme } = useTheme();

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
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.secondaryText,
        headerStyle: {
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
          shadowColor: colors.shadow,
        },
        headerTintColor: colors.text,
        headerRight: () => (
          <TouchableOpacity
            onPress={toggleTheme}
            style={{ marginRight: 15 }}
          >
            <Ionicons
              name={theme === 'light' ? 'moon' : 'sunny'}
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Followed" component={FollowedScreen} />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { colors } = useTheme();

  return (
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
          headerStyle: {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
            shadowColor: colors.shadow,
          },
          headerTintColor: colors.text,
        })}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <NavigationContainer>
        <FollowProvider>
          <AppContent />
        </FollowProvider>
      </NavigationContainer>
    </ThemeProvider>
  );
}
