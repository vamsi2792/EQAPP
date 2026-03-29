import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect, useState, createContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, ActivityIndicator } from "react-native";

import OpeningScreen from "./screens/OpeningScreen";
import LoginScreen from "./screens/Auth/LoginScreen";
import SignupScreen from "./screens/Auth/SignupScreen";
import LandingScreen from "./screens/LandingScreen";
import MyProfileScreen from "./screens/MyProfileScreen";
import VerifyEmailScreen from "./screens/Auth/VerifyEmailScreen";
import ForgotPasswordScreen from "./screens/Auth/ForgotPasswordScreen";
import ResetPasswordScreen from "./screens/Auth/ResetPasswordScreen";
import MapScreen from "./screens/MapScreen";
import AboutEarthQuest from "./screens/AboutEarthQuest";
import HowToPlayEarthQuest from "./screens/HowToPlayEarthQuest";

/* 🔥 NEW SCREENS */
import AdventureSelectScreen from "./screens/AdventureSelectScreen";
import MissionBriefScreen from "./screens/MissionBriefScreen";
import BecomeAMemberScreen from "./screens/BecomeAMemberScreen"; // ✅ Added Import

const Stack = createNativeStackNavigator();

export const AuthContext = createContext<any>(null);

export default function App() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = async (token: string) => {
    await AsyncStorage.setItem("authToken", token);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await AsyncStorage.removeItem("authToken");
    await AsyncStorage.removeItem("user");
    setIsAuthenticated(false);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem("authToken");
      setIsAuthenticated(!!token);
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: "#0E1A14" }}>
        <ActivityIndicator size="large" color="#74B08A" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ login, logout }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          
          {/* 🔐 AUTH FLOW */}
          {!isAuthenticated ? (
            <>
              <Stack.Screen name="Opening" component={OpeningScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Signup" component={SignupScreen} />
              <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
              <Stack.Screen
                name="ForgotPassword"
                component={ForgotPasswordScreen}
              />
              <Stack.Screen
                name="ResetPassword"
                component={ResetPasswordScreen}
              />
            </>
          ) : (
            <>
              {/* 🏠 MAIN GAME FLOW */}
              <Stack.Screen name="Landing" component={LandingScreen} />
              
              {/* 🔥 NEW FLOW */}
              <Stack.Screen
                name="AdventureSelect"
                component={AdventureSelectScreen}
              />

              <Stack.Screen name="Map" component={MapScreen} />

              <Stack.Screen
                name="MissionBrief"
                component={MissionBriefScreen}
              />

              <Stack.Screen
                name="MyProfileScreen"
                component={MyProfileScreen}
              />

              {/* ✅ ADDED: Become a Member Screen */}
              <Stack.Screen 
                name="BecomeMember" 
                component={BecomeAMemberScreen} 
              />
            </>
          )}

          {/* 🌍 GLOBAL SCREENS (accessible anytime) */}
          <Stack.Screen name="AboutEarthQuest" component={AboutEarthQuest} />
          <Stack.Screen
            name="HowToPlayEarthQuest"
            component={HowToPlayEarthQuest}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}