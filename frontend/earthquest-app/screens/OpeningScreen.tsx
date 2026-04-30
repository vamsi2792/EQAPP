import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Image,
} from "react-native";
import { useEffect, useRef } from "react";
import logo from "../assets/EarthQuest Logo.png";

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
      {/* 🌳 BACKGROUND */}
      <Image
        source={require("../assets/bg2.png")}
        style={styles.backgroundImage}
      />
      <Image
        source={require("../assets/tree-bg.png")}
        style={styles.treeOverlay}
      />
      <View style={styles.gradientOverlay} />

      <View style={styles.uiLayer}>
        {/* 🔥 LOGO */}
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              opacity: fadeAnim,
              transform: [{ translateY: translateAnim }],
            },
          ]}
        >
          <View style={styles.logoGlow}>
            <Image source={logo} style={styles.logo} />
          </View>
        </Animated.View>

        {/* 🔥 MENU */}
        <Animated.View
          style={[
            styles.menuContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: translateAnim }],
            },
          ]}
        >
          <MenuButton
            source={require("../assets/buttons/abt-btn.png")}
            onPress={() => navigation.navigate("AboutEarthQuest")}
          />

          <MenuButton
            source={require("../assets/buttons/howto-btn.png")}
            onPress={() => navigation.navigate("HowToPlayEarthQuest")}
          />

          <MenuButton
            source={require("../assets/buttons/auth-btn.png")}
            onPress={() => navigation.navigate("Login")}
          />

          <MenuButton
            source={require("../assets/buttons/memb-btn.png")}
            onPress={() => navigation.navigate("Membership")}
          />

          <MenuButton
            source={require("../assets/buttons/store-btn.png")}
            onPress={() => navigation.navigate("Storefront")}
          />

          {/* 🚀 PLAY BUTTON */}
          <MenuButton
            source={require("../assets/buttons/Play EQ.png")}
            onPress={() => navigation.navigate("Map")}
            large
          />
        </Animated.View>
      </View>
    </View>
  );
}

/* 🔘 BUTTON COMPONENT */
function MenuButton({
  source,
  onPress,
  large = false,
}: {
  source: any;
  onPress?: () => void;
  large?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.buttonWrapper,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.buttonGlow}>
        <Image
          source={source}
          style={[styles.button, large && styles.playButton]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0E1A14",
  },

  backgroundImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0.8,
  },

  treeOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0.45,
  },

  gradientOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(88,157,88,0.1)",
  },

  uiLayer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  /* LOGO */
  logoWrapper: {
    position: "absolute",
    top: 60,
    alignItems: "center",
  },

  logoGlow: {
    padding: 10,
    borderRadius: 20,
    shadowColor: "#FFC857",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  logo: {
    width: 340,
    height: 110,
    resizeMode: "contain",
  },

  /* MENU */
  menuContainer: {
    position: "absolute",
    top: 240,
    alignItems: "center",
  },

  buttonWrapper: {
    alignItems: "center",
    marginBottom: 6,
  },

  buttonGlow: {
    backgroundColor: "rgba(255,220,120,0.06)",
    shadowColor: "#FFC857",
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 6,
    borderRadius: 10,
    padding: 1,
  },

  button: {
    width: 200,
    height: 77,
    resizeMode: "stretch",
  },

  playButton: {
    width: 350,
    height: 130,
    marginTop: 5,
  },

  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
});