import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Modal,
  TouchableOpacity,
} from "react-native";
import { useEffect, useRef, useContext, useState } from "react";
import { AuthContext } from "../App";

export default function LandingScreen({ navigation }: any) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(30)).current;
  const { logout } = useContext(AuthContext);
  const [menuVisible, setMenuVisible] = useState(false);

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

  const handleLogout = () => {
    setMenuVisible(false);
    logout();
  };

  return (
    <View style={styles.container}>
      {/* ☰ Hamburger Icon */}
      <TouchableOpacity
        style={styles.hamburger}
        onPress={() => setMenuVisible(true)}
      >
        <Text style={styles.hamburgerText}>☰</Text>
      </TouchableOpacity>

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
          <MenuItem
            text="About EarthQuest"
            onPress={() => navigation.navigate("AboutEarthQuest")}
          />

          <MenuItem
            text="How to Play EarthQuest"
            onPress={() => navigation.navigate("HowToPlayEarthQuest")}
          />
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

      {/* Modal for Hamburger Menu */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate("MyProfileScreen");
              }}
            >
              <Text style={styles.modalButtonText}>My Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.logoutModalButton]}
              onPress={handleLogout}
            >
              <Text style={styles.logoutModalButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    backgroundColor: "#0E1A14",
    paddingHorizontal: 28,
    justifyContent: "center",
  },

  hamburger: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },

  hamburgerText: {
    fontSize: 28,
    color: "#E8F5E9",
    fontWeight: "bold",
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

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },

  modalContent: {
    backgroundColor: "#0E1A14",
    borderRadius: 12,
    width: "60%",
    marginTop: 100,
    marginRight: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#74B08A",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },

  modalButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1E5F3A",
  },

  logoutModalButton: {
    borderBottomWidth: 0,
  },

  modalButtonText: {
    fontSize: 16,
    color: "#EAF4EE",
    fontWeight: "600",
  },

  logoutModalButtonText: {
    fontSize: 16,
    color: "#FF6B6B",
    fontWeight: "600",
  },
});
