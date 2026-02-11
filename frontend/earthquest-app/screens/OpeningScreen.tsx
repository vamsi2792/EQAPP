import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { useEffect, useRef } from "react";
import FloatingOrb from "../components/FloatingOrb";

export default function OpeningScreen({ navigation }: any) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 0,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Ambient background animation */}
      <FloatingOrb />

      {/* Overlay for contrast */}
      <View style={styles.overlay} />

      {/* Main content */}
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

        <Text style={styles.tagline}>
          Sustainability · Strategy · Storytelling
        </Text>

        <Text style={styles.description}>
          Step into a near-future world where your choices shape communities,
          ecosystems, and the story of our planet.
        </Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.primaryText}>Login</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("Signup")}
        >
          <Text style={styles.secondaryText}>Sign Up</Text>
        </Pressable>

        <Pressable>
          <Text style={styles.link}>About EarthQuest</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E2A24",
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  content: {
    width: "85%",
    alignItems: "center",
  },
  title: {
    fontSize: 38,
    fontWeight: "700",
    color: "#E9F3ED",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 15,
    color: "#CFE3D6",
    marginBottom: 20,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: "#B7CEC1",
    textAlign: "center",
    marginBottom: 36,
    lineHeight: 20,
  },
  primaryButton: {
    width: "100%",
    paddingVertical: 14,
    backgroundColor: "#74B08A",
    borderRadius: 12,
    marginBottom: 14,
  },
  primaryText: {
    textAlign: "center",
    color: "#0E1A14",
    fontWeight: "600",
    fontSize: 16,
  },
  secondaryButton: {
    width: "100%",
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#74B08A",
    borderRadius: 12,
    marginBottom: 22,
  },
  secondaryText: {
    textAlign: "center",
    color: "#E9F3ED",
    fontSize: 16,
  },
  link: {
    color: "#9ED3B2",
    fontSize: 13,
    textDecorationLine: "underline",
  },
});
