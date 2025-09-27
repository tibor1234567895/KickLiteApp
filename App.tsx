import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { FollowProvider } from './src/context/FollowContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import FollowedScreen from './src/screens/FollowedScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import SearchScreen from './src/screens/SearchScreen';
import StreamScreen from './src/screens/StreamScreen';
import { RootStackParamList } from './src/types';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

type TabParamList = {
  Home: undefined;
  Followed: undefined;
};

function HomeTabs() {
  const { theme, colors, toggleTheme } = useTheme();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { signOut } = useAuth();

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
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={signOut} style={{ marginRight: 15 }}>
              <Ionicons name="log-out-outline" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleTheme} style={{ marginRight: 15 }}>
              <Ionicons name={theme === 'light' ? 'moon' : 'sunny'} size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        ),
      })}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerRight: () => (
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Search')}
                style={{ marginRight: 15 }}>
                <Ionicons name="search" size={24} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={signOut} style={{ marginRight: 15 }}>
                <Ionicons name="log-out-outline" size={24} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleTheme} style={{ marginRight: 15 }}>
                <Ionicons
                  name={theme === 'light' ? 'moon' : 'sunny'}
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <Tab.Screen name="Followed" component={FollowedScreen} />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { colors } = useTheme();
  const { isAuthenticated, loading, tokens } = useAuth();

  if (loading && (isAuthenticated || tokens)) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeTabs} options={{ headerShown: false }} />
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
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{
          headerStyle: {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
            shadowColor: colors.shadow,
          },
          headerTintColor: colors.text,
        }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationContainer>
          <FollowProvider>
            <AppContent />
          </FollowProvider>
        </NavigationContainer>
      </AuthProvider>
    </ThemeProvider>
  );
}
