import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { useEffect, useRef, useContext } from "react";
import { AuthContext } from "../App";

export default function LandingScreen({ navigation }: any) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(30)).current;
  const { logout } = useContext(AuthContext);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      
      {/* 🔓 Logout floating top-right */}
      <Pressable
        style={({ pressed }) => [
          styles.logoutButton,
          pressed && styles.logoutPressed,
        ]}
        onPress={logout}
      >
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: translateAnim }],
          },
        ]}
      >
        {/* 🌍 Centered Title */}
        <Text style={styles.title}>EarthQuest</Text>
        <Text style={styles.subtitle}>The Game</Text>

        <View style={styles.menuContainer}>
          <MenuItem text="About EarthQuest" />
          <MenuItem text="How to Play EarthQuest" />
          <MenuItem text="Become a Member" />
          <MenuItem text="EarthQuest Storefront" />
        </View>

        {/* 🔮 Play Button */}
        <Pressable
          style={({ pressed }) => [
            styles.playButton,
            pressed && styles.playPressed,
          ]}
          onPress={() => navigation.navigate("Map")}
        >
          <Text style={styles.playText}>Play EarthQuest</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function MenuItem({
  text,
  onPress,
}: {
  text: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={styles.buttonText}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0E1A14",
    paddingHorizontal: 28,
    justifyContent: "center",
  },

  logoutButton: {
    position: "absolute",
    top: 50,
    right: 25,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#74B08A",
    backgroundColor: "#123524",
    zIndex: 10,
  },

  logoutPressed: {
    backgroundColor: "#0C2F23",
    transform: [{ scale: 0.95 }],
  },

  logoutText: {
    color: "#EAF4EE",
    fontWeight: "600",
    fontSize: 14,
  },

  content: {
    width: "100%",
    alignItems: "center",
  },

  title: {
    fontSize: 42,
    fontWeight: "800",
    color: "#E8F5E9",
    letterSpacing: 1,
  },

  subtitle: {
    fontSize: 16,
    color: "#8DBFA1",
    marginBottom: 50,
    letterSpacing: 2,
  },

  menuContainer: {
    width: "100%",
  },

  button: {
    backgroundColor: "#1E5F3A",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginBottom: 18,
    borderWidth: 2,
    borderColor: "#74B08A",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    alignItems: "center",
  },

  buttonPressed: {
    backgroundColor: "#174D2E",
    transform: [{ scale: 0.97 }],
  },

  buttonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#EAF4EE",
    letterSpacing: 0.5,
  },

  playButton: {
    marginTop: 35,
    width: "100%",
    paddingVertical: 22,
    borderRadius: 20,
    backgroundColor: "#0F3D2E",
    borderWidth: 2,
    borderColor: "#74B08A",
    shadowColor: "#74B08A",
    shadowOpacity: 0.8,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
    alignItems: "center",
  },

  playPressed: {
    backgroundColor: "#0C2F23",
    transform: [{ scale: 0.96 }],
  },

  playText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#E8F5E9",
    letterSpacing: 1.5,
  },
});
