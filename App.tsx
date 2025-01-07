import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from './src/screens/HomeScreen';
import StreamScreen from './src/screens/StreamScreen';
import FollowedScreen from './src/screens/FollowedScreen';
import SearchScreen from './src/screens/SearchScreen';
import { FollowProvider } from './src/context/FollowContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
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
          </View>
        ),
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          headerRight: () => (
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Search')}
                style={{ marginRight: 15 }}
              >
                <Ionicons name="search" size={24} color={colors.text} />
              </TouchableOpacity>
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
      <NavigationContainer>
        <FollowProvider>
          <AppContent />
        </FollowProvider>
      </NavigationContainer>
    </ThemeProvider>
  );
}
