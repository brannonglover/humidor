import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Landing from '../pages/Landing';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import { useAuth } from '../context/AuthContext';
import colors from '../theme/colors';

const Stack = createNativeStackNavigator();

export default function AuthStack({ onAuthenticated }) {
  const { supabase } = useAuth();
  const [signupTier, setSignupTier] = useState('free');

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.screenBg },
      }}
    >
      <Stack.Screen name="Landing">
        {({ navigation }) => (
          <Landing
            onGetStarted={() => {
              setSignupTier('free');
              navigation.navigate('Signup');
            }}
            onSubscribe={() => {
              setSignupTier('premium');
              navigation.navigate('Signup');
            }}
            onAlreadyHaveAccount={() => navigation.navigate('Login')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Login">
        {({ navigation }) => (
          <Login
            supabase={supabase}
            onSuccess={onAuthenticated}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Signup">
        {({ navigation }) => (
          <Signup
            supabase={supabase}
            tier={signupTier}
            onSuccess={onAuthenticated}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
