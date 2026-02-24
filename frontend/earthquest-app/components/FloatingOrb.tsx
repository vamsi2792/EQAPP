import { Animated, StyleSheet } from "react-native";
import { useEffect, useRef } from "react";

export default function FloatingOrb() {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -20,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.orb,
        { transform: [{ translateY }] },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  orb: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(120, 180, 140, 0.25)",
    top: "20%",
    left: "10%",
  },
});
