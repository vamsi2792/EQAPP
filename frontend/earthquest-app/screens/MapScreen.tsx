import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Modal,
  Pressable,
} from "react-native";
import { WebView } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MapScreen({ route, navigation }: any) {
  const [menuVisible, setMenuVisible] = useState(false);

  const adventure = route.params?.adventure;

  const MAP_URL =
    "https://fructuously-predegenerate-florance.ngrok-free.dev/earthquestMap.html";

  return (
    <View style={styles.container}>
      {/* 🌍 WebView */}
      <WebView
        source={{
          uri: MAP_URL,
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
        }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#74B08A" />
          </View>
        )}
      />

      {/* 🍔 Hamburger Button */}
      <TouchableOpacity
        style={styles.hamburger}
        onPress={() => setMenuVisible(true)}
      >
        <Text style={styles.hamburgerText}>☰</Text>
      </TouchableOpacity>

      {/* 📂 Side Menu */}
      <Modal visible={menuVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          {/* 👈 Click outside to close */}
          <Pressable
            style={styles.backdrop}
            onPress={() => setMenuVisible(false)}
          />

          {/* 📦 Right Side Menu with Safe Area */}
          <SafeAreaView style={styles.menu}>
            <Text style={styles.menuTitle}>
              {adventure?.title || "EarthQuest"}
            </Text>

            <Text style={styles.menuSubtitle}>
              {adventure?.subtitle || "Select a mission"}
            </Text>

            {/* 📜 Mission Brief */}
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate("MissionBrief", { adventure });
              }}
            >
              <Text style={styles.menuButtonText}>
                Vanguardian Mission Brief
              </Text>
            </TouchableOpacity>

            {/* 🔮 Future Features */}
            <TouchableOpacity style={styles.menuButton}>
              <Text style={styles.menuButtonText}>Vanguardian Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuButton}>
              <Text style={styles.menuButtonText}>
                EarthQuest Adventure 1 Booklet
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuButton}>
              <Text style={styles.menuButtonText}>Become a Member</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0E1A14",
  },

  webview: {
    flex: 1,
  },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0E1A14",
  },

  // 🍔 Hamburger
  hamburger: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 10,
  },

  hamburgerText: {
    color: "#E8F5E9",
    fontSize: 24,
    fontWeight: "bold",
  },

  // 📂 Overlay
  overlay: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  // 👈 Clickable outside area
  backdrop: {
    flex: 1,
  },

  // 📦 Menu
  menu: {
    width: "75%",
    height: "100%",
    backgroundColor: "#0E1A14",
    paddingHorizontal: 20,
    paddingTop: 10,
    borderLeftWidth: 2,
    borderColor: "#74B08A",
  },

  menuTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#E8F5E9",
    marginBottom: 5,
  },

  menuSubtitle: {
    fontSize: 14,
    color: "#8DBFA1",
    marginBottom: 20,
  },

  menuButton: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#1E5F3A",
  },

  menuButtonText: {
    color: "#EAF4EE",
    fontSize: 16,
    fontWeight: "600",
  },
});
