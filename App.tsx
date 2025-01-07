import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './src/screens/HomeScreen';
import StreamScreen from './src/screens/StreamScreen';

export type RootStackParamList = {
  Home: undefined;
  Stream: { username: string };
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#121212',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Kick Lite' }}
        />
        <Stack.Screen
          name="Stream"
          component={StreamScreen}
          options={({ route }) => ({ title: route.params.username })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
