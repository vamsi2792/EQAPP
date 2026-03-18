import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { useEffect, useRef } from "react";

export default function OpeningScreen({ navigation }: any) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(30)).current;

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
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: translateAnim }],
          },
        ]}
      >
        <Text style={styles.title}>EarthQuest</Text>
        <Text style={styles.subtitle}>The Game</Text>

        <View style={styles.menuContainer}>
          <MenuItem
            text="About EarthQuest"
            onPress={() => navigation.navigate("AboutEarthQuest")}
          />
          <MenuItem
            text="How to Play EarthQuest"
            onPress={() => navigation.navigate("HowToPlayEarthQuest")}
          />
          <MenuItem
            text="Register or Login"
            onPress={() => navigation.navigate("Login")}
          />
          <MenuItem text="Become a Member" />
          <MenuItem text="EarthQuest Storefront" />
        </View>
      </Animated.View>
    </View>
  );
}

function MenuItem({ text, onPress }: { text: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <Text style={styles.buttonText}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0E1A14", // deep forest tone
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
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
});
