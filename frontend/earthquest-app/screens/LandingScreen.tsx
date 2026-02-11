import { View, Text, Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useContext } from "react";
import { AuthContext } from "../App";

export default function LandingScreen() {
  const { checkAuth } = useContext(AuthContext);

  const handleLogout = async () => {
    await AsyncStorage.removeItem("authToken");
    await checkAuth(); // 🔥 instantly switches to Login
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Welcome to EarthQuest 🌍</Text>

      <Pressable onPress={handleLogout} style={{ marginTop: 20 }}>
        <Text style={{ color: "red" }}>Logout</Text>
      </Pressable>
    </View>
  );
}
