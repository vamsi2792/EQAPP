import { View, Text, StyleSheet, Pressable, Animated, Image, ImageBackground} from "react-native";
import { useEffect, useRef } from "react";
import logo from "../assets/EarthQuest Logo.png";



export default function OpeningScreen({ navigation }: any) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(30)).current;


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
      <Image 
      source={require("../assets/bg2.png")} // 🌳 your full background image
      style={styles.backgroundImage}
      resizeMode="stretch"
      />
      <Image
        source={require("../assets/tree-bg.png")} // 🌿 your semi-transparent overlay
        style={styles.treeOverlay}
      />
      <View style={styles.gradientOverlay} />
      <View style={styles.uiLayer}>
        {/* LOGO */}
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              opacity: fadeAnim,
              transform: [{ translateY: translateAnim }],
            },
          ]}
        >
          <View style={styles.logoWrapper}>
            <View style={styles.logoGlow}>
             <Image source={logo} style={styles.logo} />
            </View>
          </View>

        </Animated.View>

        {/* MENU */}
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
            onPress={() => {}}
          />

          <MenuButton
            source={require("../assets/buttons/howto-btn.png")}
            onPress={() => {}}
          />

          <MenuButton
            source={require("../assets/buttons/auth-btn.png")}
            onPress={() => navigation.navigate("Login")}
          />

          <MenuButton
            source={require("../assets/buttons/memb-btn.png")}
            onPress={() => {}}
          />

          <MenuButton
            source={require("../assets/buttons/store-btn.png")}
            onPress={() => {}}
          />

          {/* PLAY BUTTON (BIG CTA) */}
          <MenuButton
            source={require("../assets/buttons/Play EQ.png")}
            onPress={() => {}}
            large
          />
        </Animated.View>
      </View>
    </View>
  );
}
/* BUTTON COMPONENT */
function MenuButton({
  source,
  onPress,
  large = false,
}: {
  source: any;
  onPress: () => void;
  large?: boolean;
}) {
  return (
    <Pressable
     onPress={onPress} 
     style={({ pressed }) => [
      styles.buttonWrapper,
      pressed && styles.pressed]}
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
    backgroundColor: "#e2dcc7",
  },
  gradientOverlay:{
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(88, 157, 88, 0.1)",
  },
  backgroundImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
    resizeMode: "stretch",
    opacity: .8,
  },
  treeOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    resizeMode: "stretch",
    opacity: .45,
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
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 2, 
},

logoGlow: {
  padding: 10,
  borderRadius: 20,

  shadowColor: "#FFC857",
  shadowOpacity: 0.35,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 10,

  backgroundColor: "rgba(255, 255, 255, 0.06)",
},
logo: {
    width: 340,
    height: 110,
    resizeMode: "contain",
    margin:0,
 },

  /*  MENU STACK */
  menuContainer: {
    position: "absolute",
    top: 240,
    left: 0,
    right: 0,
    alignItems: "center",
  },

  /* STANDARD BUTTONS */
  button: {
    width: 200,
    height: 77,
    resizeMode: "stretch",
    
  },
  buttonWrapper: {
  alignItems: "center",
  marginBottom: 4,
},

buttonGlow: {
  backgroundColor: "rgba(255, 220, 120, 0.06)",
  shadowColor: "#FFC857",
  shadowOpacity: 0.7,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 0 },
  elevation: 6, 
  borderRadius: 10,
  padding: 1
},

  /* BIG PLAY BUTTON */
  playButton: {
    width: 350,
    height: 130,
    marginTop: 3,
  },

  /* PRESS FEEDBACK */
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});